/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Player, PlayerPosition, MatchPhoto } from "../types";
import { Shield, Download, Loader2, Camera, User, RotateCcw, Move } from "lucide-react";
import { toJpeg } from "html-to-image";
import { MatchPhotosModal } from "./MatchPhotosModal";

interface FootballPitchProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
  onUpdatePlayerPhotos?: (playerId: string, photos: MatchPhoto[]) => void;
  onSetAsProfilePhoto?: (playerId: string, photoUrl: string) => void;
}

// Compute default balanced tactical coordinates (in % of pitch width/height)
function computeDefaultPositions(selectedPlayers: Player[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  const gks = selectedPlayers.filter((p) => p.position === PlayerPosition.PORTERO);
  const leftDefs = selectedPlayers.filter(
    (p) => p.position === PlayerPosition.LATERAL && p.lateralidad === "Izquierdo"
  );
  const rightDefs = selectedPlayers.filter(
    (p) => p.position === PlayerPosition.LATERAL && p.lateralidad !== "Izquierdo"
  );
  const centerDefs = selectedPlayers.filter((p) => p.position === PlayerPosition.DEFENSA);
  const mids = selectedPlayers.filter((p) => p.position === PlayerPosition.CENTROCAMPISTA);
  const leftExt = selectedPlayers.filter(
    (p) => p.position === PlayerPosition.EXTREMO && p.lateralidad === "Izquierdo"
  );
  const rightExt = selectedPlayers.filter(
    (p) => p.position === PlayerPosition.EXTREMO && p.lateralidad !== "Izquierdo"
  );
  const strikers = selectedPlayers.filter((p) => p.position === PlayerPosition.DELANTERO);

  // 1. Porteros (Zona inferior: y ~ 90%)
  gks.forEach((p, idx) => {
    const spacing = 100 / (gks.length + 1);
    positions[p.id] = { x: Math.round(spacing * (idx + 1)), y: 90 };
  });

  // 2. Defensas & Laterales (Zona defensiva: y ~ 70 - 78%)
  // Laterales izquierdos
  leftDefs.forEach((p, idx) => {
    positions[p.id] = { x: 12 + idx * 7, y: 73 + (idx % 2) * 5 };
  });
  // Centrales
  centerDefs.forEach((p, idx) => {
    const spacing = 46 / (centerDefs.length + 1);
    positions[p.id] = { x: Math.round(27 + spacing * (idx + 1)), y: 75 + (idx % 2) * 5 };
  });
  // Laterales derechos
  rightDefs.forEach((p, idx) => {
    positions[p.id] = { x: 88 - idx * 7, y: 73 + (idx % 2) * 5 };
  });

  // 3. Centrocampistas (Zona medular: y ~ 42 - 58%)
  mids.forEach((p, idx) => {
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    const countInRow = Math.min(3, mids.length - row * 3);
    const spacing = 60 / (countInRow + 1);
    positions[p.id] = { x: Math.round(20 + spacing * (col + 1)), y: 44 + row * 11 };
  });

  // 4. Extremos y Delanteros (Zona ofensiva: y ~ 12 - 28%)
  leftExt.forEach((p, idx) => {
    positions[p.id] = { x: 14 + idx * 7, y: 22 + (idx % 2) * 7 };
  });
  strikers.forEach((p, idx) => {
    const spacing = 42 / (strikers.length + 1);
    positions[p.id] = { x: Math.round(29 + spacing * (idx + 1)), y: 14 + (idx % 2) * 9 };
  });
  rightExt.forEach((p, idx) => {
    positions[p.id] = { x: 86 - idx * 7, y: 22 + (idx % 2) * 7 };
  });

  // Cualquier otro convocado
  selectedPlayers.forEach((p, idx) => {
    if (!positions[p.id]) {
      positions[p.id] = { x: 20 + ((idx * 17) % 60), y: 35 + ((idx * 12) % 40) };
    }
  });

  return positions;
}

export function FootballPitch({
  players,
  onSelectPlayer,
  onUpdatePlayerPhotos,
  onSetAsProfilePhoto,
}: FootballPitchProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [matchPhotosPlayerId, setMatchPhotosPlayerId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const pitchRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{
    playerId: string;
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);

  // Filter for only selected players
  const selectedPlayers = useMemo(
    () => players.filter((p) => p.status === "selected"),
    [players]
  );

  // Compute standard default layout
  const defaultPositions = useMemo(
    () => computeDefaultPositions(selectedPlayers),
    [selectedPlayers]
  );

  // Custom user-dragged coordinates stored in localStorage
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const saved = localStorage.getItem("martos_tactical_pitch_positions");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Active modal player
  const activeModalPlayer = matchPhotosPlayerId
    ? players.find((p) => p.id === matchPhotosPlayerId) || null
    : null;

  // Reset all positions to standard tactical formation
  const handleResetPositions = () => {
    setCustomPositions({});
    try {
      localStorage.removeItem("martos_tactical_pitch_positions");
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and drop handler using pointer events
  const handlePointerDown = (e: React.PointerEvent, player: Player) => {
    // Only primary mouse button or touch
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();

    draggingRef.current = {
      playerId: player.id,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false,
    };
    setDraggingId(player.id);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!draggingRef.current || !pitchRef.current) return;

      const deltaX = Math.abs(moveEvent.clientX - draggingRef.current.startX);
      const deltaY = Math.abs(moveEvent.clientY - draggingRef.current.startY);

      if (deltaX > 4 || deltaY > 4) {
        draggingRef.current.hasMoved = true;
      }

      const rect = pitchRef.current.getBoundingClientRect();
      const rawPctX = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const rawPctY = ((moveEvent.clientY - rect.top) / rect.height) * 100;

      // Clamp coordinates safely within the pitch area
      const clampedX = Math.max(6, Math.min(94, rawPctX));
      const clampedY = Math.max(6, Math.min(94, rawPctY));

      setCustomPositions((prev) => ({
        ...prev,
        [draggingRef.current!.playerId]: { x: clampedX, y: clampedY },
      }));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      if (draggingRef.current) {
        if (!draggingRef.current.hasMoved) {
          // Simple click without movement: select the player
          onSelectPlayer(player);
        } else {
          // Dragged: Persist new coordinates
          setCustomPositions((latest) => {
            try {
              localStorage.setItem("martos_tactical_pitch_positions", JSON.stringify(latest));
            } catch (err) {
              console.error("Could not persist pitch coordinates:", err);
            }
            return latest;
          });
        }
      }

      draggingRef.current = null;
      setDraggingId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleDownloadJPG = async () => {
    const element = document.getElementById("football-pitch-canvas");
    if (!element) return;

    try {
      setIsDownloading(true);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toJpeg(element, {
        quality: 0.95,
        backgroundColor: "#020617",
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = `pizarra-tactica-martos-b-${new Date().toISOString().slice(0, 10)}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error al descargar la imagen:", error);
      alert("Hubo un error al generar la imagen. Por favor, inténtalo de nuevo.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-600" />
            Pizarra Táctica Interactiva
          </h4>
          <p className="text-xs text-slate-500">
            Arrastra libremente cualquier jugador a la zona del campo que desees. Las posiciones se guardan automáticamente.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <button
            type="button"
            onClick={handleResetPositions}
            title="Restablecer disposición táctica automática"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 text-xs font-bold border border-slate-200 shadow-xs transition cursor-pointer select-none active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Restablecer</span>
          </button>

          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
            {selectedPlayers.length} Convocados
          </span>

          <button
            onClick={handleDownloadJPG}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm hover:shadow transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer select-none"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Descargar JPG</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* FOOTBALL PITCH CANVAS (CLEAN - NO POSITION LABELS, FULL FREE DRAG & DROP) */}
      <div
        id="football-pitch-canvas"
        ref={pitchRef}
        className="relative w-full aspect-[3/4] sm:aspect-[4/5] md:aspect-[3/4] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 select-none touch-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, transparent 65px, rgba(255, 255, 255, 0.05) 65px, rgba(255, 255, 255, 0.05) 67px, transparent 68px),
            linear-gradient(to bottom, #0a1120 50%, #030712 50%)
          `,
          backgroundSize: "100% 100%, 100% 20%",
        }}
      >
        {/* Outer pitch line */}
        <div className="absolute inset-0 border-2 border-white/10 pointer-events-none m-3 rounded-lg"></div>

        {/* Center line */}
        <div className="absolute left-3 right-3 top-1/2 h-0.5 bg-white/10 pointer-events-none transform -translate-y-1/2"></div>

        {/* Center circle */}
        <div className="absolute left-1/2 top-1/2 w-28 h-28 rounded-full border-2 border-white/10 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"></div>
        {/* Center spot */}
        <div className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full bg-white/20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"></div>

        {/* Area Superior (Campo Oponente) */}
        <div className="absolute left-1/4 right-1/4 top-3 h-16 border-b-2 border-x-2 border-white/10 pointer-events-none"></div>
        <div className="absolute left-[38%] right-[38%] top-3 h-7 border-b-2 border-x-2 border-white/10 pointer-events-none"></div>

        {/* Area Inferior (Portería Local) */}
        <div className="absolute left-1/4 right-1/4 bottom-3 h-16 border-t-2 border-x-2 border-white/10 pointer-events-none"></div>
        <div className="absolute left-[38%] right-[38%] bottom-3 h-7 border-t-2 border-x-2 border-white/10 pointer-events-none"></div>

        {/* DRAGGABLE PLAYERS LAYER */}
        {selectedPlayers.map((player) => {
          const pos = customPositions[player.id] || defaultPositions[player.id] || { x: 50, y: 50 };
          const isBeingDragged = draggingId === player.id;
          const photoCount = player.matchPhotos?.length || 0;

          const sideText = player.lateralidad
            ? player.lateralidad === "Izquierdo"
              ? "IZQ"
              : player.lateralidad === "Derecho"
              ? "DER"
              : "AMB"
            : "DER";

          return (
            <div
              key={player.id}
              onPointerDown={(e) => handlePointerDown(e, player)}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: `translate(-50%, -50%) ${isBeingDragged ? "scale(1.15)" : "scale(1)"}`,
                zIndex: isBeingDragged ? 40 : 20,
              }}
              className={`absolute cursor-grab active:cursor-grabbing transition-transform duration-75 flex flex-col items-center justify-center group touch-none select-none`}
            >
              {/* Token circular with photo and number */}
              <div className="relative">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden text-white flex items-center justify-center shadow-lg border-2 transition-all relative ${
                    isBeingDragged
                      ? "ring-4 ring-red-500 border-white shadow-2xl bg-red-700"
                      : "border-white bg-red-600 group-hover:border-red-400 group-hover:shadow-red-500/30"
                  }`}
                >
                  {player.photoUrl ? (
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      className="w-full h-full object-cover pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-5 h-5 text-white/90" />
                  )}

                  {player.number && (
                    <span className="absolute -top-1 -right-1 bg-white text-red-600 font-black text-[8px] sm:text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-red-200 shadow-xs">
                      {player.number}
                    </span>
                  )}
                </div>

                {/* Match photos camera pill */}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMatchPhotosPlayerId(player.id);
                  }}
                  className={`absolute -bottom-1 -left-1 z-10 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer shadow-md ${
                    photoCount > 0
                      ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[8px] px-1 py-0.5 border border-white gap-0.5 scale-100"
                      : "bg-slate-900/90 hover:bg-red-600 text-white w-3.5 h-3.5 border border-white/80 opacity-80 group-hover:opacity-100"
                  }`}
                  title={
                    photoCount > 0
                      ? `Ver ${photoCount} fotos de partido de ${player.name}`
                      : `Subir fotos de partido para ${player.name}`
                  }
                >
                  <Camera className="w-2 h-2 shrink-0" />
                  {photoCount > 0 && <span className="text-[7.5px]">{photoCount}</span>}
                </button>
              </div>

              {/* Player Name Tag */}
              <div className="mt-1 bg-slate-900/95 text-white px-1.5 py-0.5 rounded shadow text-[8.5px] sm:text-[9px] font-bold max-w-[75px] sm:max-w-[85px] truncate text-center border border-white/10 group-hover:border-red-400 group-hover:text-red-300 transition-colors pointer-events-none">
                {player.name}
              </div>

              {/* Position and lateralidad badge */}
              <div className="mt-0.5 text-[7px] font-bold text-slate-300 bg-black/80 px-1 py-0.2 rounded border border-white/10 truncate max-w-[75px] flex items-center gap-0.5 pointer-events-none">
                <span className="truncate">{player.position}</span>
                <span className="text-white/40">•</span>
                <span className="text-red-400 font-mono">{sideText}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER TIPS */}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3 text-[10px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200">
        <span className="flex items-center gap-1.5 font-medium">
          <Move className="w-3 h-3 text-red-600 inline-block" />
          Arrastra libremente cualquier jugador a cualquier zona
        </span>
        <span className="text-slate-300">•</span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
          Clic en jugador: Seleccionar ficha
        </span>
        <span className="text-slate-300">•</span>
        <span className="flex items-center gap-1.5 font-medium">
          <Camera className="w-3 h-3 text-amber-500 inline-block" />
          Icono cámara: Fotos de partido
        </span>
      </div>

      {/* MATCH PHOTOS MODAL */}
      <MatchPhotosModal
        player={activeModalPlayer}
        isOpen={Boolean(activeModalPlayer)}
        onClose={() => setMatchPhotosPlayerId(null)}
        onUpdatePlayerPhotos={(playerId, updatedPhotos) => {
          if (onUpdatePlayerPhotos) {
            onUpdatePlayerPhotos(playerId, updatedPhotos);
          }
        }}
        onSetAsProfilePhoto={(playerId, photoUrl) => {
          if (onSetAsProfilePhoto) {
            onSetAsProfilePhoto(playerId, photoUrl);
          }
        }}
      />
    </div>
  );
}
