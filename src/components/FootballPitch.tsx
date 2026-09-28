/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Player, PlayerPosition, MatchPhoto } from "../types";
import { Shield, ChevronRight, User, Download, Loader2, Camera, Sparkles } from "lucide-react";
import { toJpeg } from "html-to-image";
import { MatchPhotosModal } from "./MatchPhotosModal";

interface FootballPitchProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
  onUpdatePlayerPhotos?: (playerId: string, photos: MatchPhoto[]) => void;
  onSetAsProfilePhoto?: (playerId: string, photoUrl: string) => void;
}

export function FootballPitch({
  players,
  onSelectPlayer,
  onUpdatePlayerPhotos,
  onSetAsProfilePhoto,
}: FootballPitchProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [matchPhotosPlayerId, setMatchPhotosPlayerId] = useState<string | null>(null);

  const activeModalPlayer = matchPhotosPlayerId
    ? players.find((p) => p.id === matchPhotosPlayerId) || null
    : null;

  const handleDownloadJPG = async () => {
    const element = document.getElementById("football-pitch-canvas");
    if (!element) return;

    try {
      setIsDownloading(true);
      // Give a brief delay for UI state to update
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toJpeg(element, {
        quality: 0.95,
        backgroundColor: "#020617",
        pixelRatio: 2,
      });
      
      const link = document.createElement("a");
      link.download = `distribucion-tactica-${new Date().toISOString().slice(0, 10)}.jpg`;
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

  // Filter for only selected players
  const selectedPlayers = players.filter((p) => p.status === "selected");

  // Group selected players by position
  const goalkeepers = selectedPlayers.filter((p) => p.position === PlayerPosition.PORTERO);
  const defenders = selectedPlayers.filter(
    (p) => p.position === PlayerPosition.DEFENSA || p.position === PlayerPosition.LATERAL
  );
  const midfielders = selectedPlayers.filter((p) => p.position === PlayerPosition.CENTROCAMPISTA);
  const forwards = selectedPlayers.filter(
    (p) => p.position === PlayerPosition.DELANTERO || p.position === PlayerPosition.EXTREMO
  );

  // Helper to separate a line's players into Left, Center, and Right tactical lanes
  const getLinePlayers = (zonePlayers: Player[], lineType: "forwards" | "midfielders" | "defenders") => {
    const left: Player[] = [];
    const center: Player[] = [];
    const right: Player[] = [];

    let sideCounter = 0;

    zonePlayers.forEach((player) => {
      if (lineType === "defenders") {
        if (player.position === PlayerPosition.LATERAL) {
          const lateralidadNormalized = player.lateralidad || "Derecho";
          if (lateralidadNormalized === "Izquierdo") {
            left.push(player);
          } else if (lateralidadNormalized === "Derecho") {
            right.push(player);
          } else {
            // Ambidiestro or other
            if (sideCounter % 2 === 0) left.push(player);
            else right.push(player);
            sideCounter++;
          }
        } else {
          center.push(player);
        }
      } else if (lineType === "forwards") {
        if (player.position === PlayerPosition.EXTREMO) {
          const lateralidadNormalized = player.lateralidad || "Derecho";
          if (lateralidadNormalized === "Izquierdo") {
            left.push(player);
          } else if (lateralidadNormalized === "Derecho") {
            right.push(player);
          } else {
            // Ambidiestro or other
            if (sideCounter % 2 === 0) left.push(player);
            else right.push(player);
            sideCounter++;
          }
        } else {
          center.push(player);
        }
      } else {
        // Midfielders
        center.push(player);
      }
    });

    return { left, center, right };
  };

  const renderPlayerToken = (player: Player) => {
    const sideText = player.lateralidad
      ? player.lateralidad === "Izquierdo"
        ? "IZQ"
        : player.lateralidad === "Derecho"
        ? "DER"
        : "AMB"
      : "DER";

    const photoCount = player.matchPhotos?.length || 0;

    return (
      <div
        key={player.id}
        onClick={() => onSelectPlayer(player)}
        className="group relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105"
      >
        {/* Visual player token/shirt */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-red-600 overflow-hidden text-white flex items-center justify-center shadow-md border-2 border-white group-hover:border-red-500 transition-all relative">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="w-5 h-5 text-white/90" />
            )}
            {player.number && (
              <span className="absolute -top-1 -right-1 bg-white text-red-600 font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-red-200">
                {player.number}
              </span>
            )}
          </div>

          {/* Dedicated Match Photos Camera Button / Badge on token */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMatchPhotosPlayerId(player.id);
            }}
            className={`absolute -bottom-1 -left-1.5 z-10 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer shadow-md ${
              photoCount > 0
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[8.5px] px-1.5 py-0.5 border border-white gap-0.5 scale-100 ring-1 ring-amber-400/50"
                : "bg-slate-900/90 hover:bg-red-600 text-white w-4 h-4 border border-white/80 opacity-80 group-hover:opacity-100 group-hover:scale-110"
            }`}
            title={
              photoCount > 0
                ? `Ver ${photoCount} fotos de partido de ${player.name} (haz clic para ver o subir más)`
                : `Subir fotos de partido para ${player.name}`
            }
          >
            <Camera className="w-2.5 h-2.5 shrink-0" />
            {photoCount > 0 && <span>{photoCount}</span>}
          </button>
        </div>

        {/* Player Name */}
        <div className="mt-1 bg-white/95 px-1.5 py-0.5 rounded shadow text-[9px] font-bold text-slate-800 max-w-[85px] truncate text-center border border-slate-100 group-hover:border-red-300 group-hover:text-red-600 transition-colors">
          {player.name}
        </div>

        {/* Position + Lateralidad */}
        <div className="text-[7.5px] font-bold text-slate-500 bg-white/95 px-1.5 rounded truncate max-w-[80px] border border-stone-100 select-none shadow-xs flex items-center gap-0.5 mt-0.5">
          <span>{player.position}</span>
          <span className="text-stone-300">•</span>
          <span className="text-red-600">{sideText}</span>
        </div>

        {/* Quick Match Photos Action Pill below */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMatchPhotosPlayerId(player.id);
          }}
          className={`mt-0.5 text-[7px] font-extrabold px-1.5 py-0.5 rounded-full border transition-all duration-150 flex items-center gap-0.5 cursor-pointer select-none shadow-xs ${
            photoCount > 0
              ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
              : "bg-white/85 hover:bg-red-50 text-slate-600 hover:text-red-600 border-slate-200"
          }`}
          title="Abrir visor de fotos de partido"
        >
          <Camera className="w-2 h-2" />
          <span>{photoCount > 0 ? `${photoCount} fotos` : "Subir fotos"}</span>
        </button>
      </div>
    );
  };

  const renderTacticalLine = (
    title: string,
    lineType: "forwards" | "midfielders" | "defenders",
    zonePlayers: Player[]
  ) => {
    const { left, center, right } = getLinePlayers(zonePlayers, lineType);
    const hasPlayers = zonePlayers.length > 0;

    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[105px] py-1 bg-slate-950/20 rounded-xl my-0.5 border border-white/[0.02]">
        <span className="text-[10px] uppercase tracking-wider text-red-500 font-extrabold opacity-90 mb-1.5">
          {title} ({zonePlayers.length})
        </span>

        {!hasPlayers ? (
          <div className="text-[10px] text-stone-500 border border-dashed border-stone-800 rounded-lg py-1 px-3 italic bg-slate-900/30">
            Vacío
          </div>
        ) : (
          <div className="grid grid-cols-3 w-full gap-1 px-1">
            {/* Left Lane */}
            <div className="flex flex-wrap justify-center items-center content-center gap-1.5">
              {left.map((player) => renderPlayerToken(player))}
            </div>

            {/* Center Lane */}
            <div className="flex flex-wrap justify-center items-center content-center gap-1.5 border-x border-white/[0.03] px-1">
              {center.map((player) => renderPlayerToken(player))}
            </div>

            {/* Right Lane */}
            <div className="flex flex-wrap justify-center items-center content-center gap-1.5">
              {right.map((player) => renderPlayerToken(player))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGoalkeeperZone = (title: string, zonePlayers: Player[]) => {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[90px] py-1">
        <span className="text-[10px] uppercase tracking-wider text-red-500 font-bold opacity-80 mb-1">
          {title} ({zonePlayers.length})
        </span>
        <div className="flex flex-wrap justify-center gap-3 px-2 w-full">
          {zonePlayers.length === 0 ? (
            <div className="text-xs text-stone-500 border border-dashed border-stone-800 rounded-lg py-2 px-4 italic bg-slate-900/30">
              Vacío
            </div>
          ) : (
            zonePlayers.map((player) => renderPlayerToken(player))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-600" />
            Distribución Táctica Lateralizada
          </h4>
          <p className="text-xs text-slate-500">
            Esquema táctico interactivo. Haz clic en la cámara <span className="font-bold text-red-600">📷</span> de cada jugador para subir y visualizar sus fotos de partido.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
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

      {/* FOOTBALL PITCH DRAWING */}
      <div
        id="football-pitch-canvas"
        className="relative w-full aspect-[3/4] sm:aspect-[4/5] md:aspect-[3/4] bg-slate-950 rounded-xl overflow-hidden shadow-inner border-4 border-slate-300 flex flex-col justify-between py-4"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, transparent 60px, rgba(217, 30, 30, 0.05) 60px, rgba(217, 30, 30, 0.05) 61px, transparent 62px),
            linear-gradient(to bottom, #0f172a 50%, #020617 50%)
          `,
          backgroundSize: "100% 100%, 100% 20%",
        }}
      >
        {/* Background lines representing the pitch coordinates */}
        <div className="absolute inset-0 border-2 border-white/5 pointer-events-none m-3"></div>
        {/* Center line */}
        <div className="absolute left-3 right-3 top-1/2 h-0.5 bg-white/5 pointer-events-none transform -translate-y-1/2"></div>
        {/* Center circle */}
        <div className="absolute left-1/2 top-1/2 w-24 h-24 rounded-full border-2 border-white/5 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"></div>

        {/* Area Superior (Oponente) */}
        <div className="absolute left-1/4 right-1/4 top-3 h-14 border-b-2 border-x-2 border-white/5 pointer-events-none"></div>

        {/* Area Inferior (Portero Local) */}
        <div className="absolute left-1/4 right-1/4 bottom-3 h-14 border-t-2 border-x-2 border-white/5 pointer-events-none"></div>

        {/* Pitch content zones */}
        <div className="z-10 flex flex-col justify-between h-full px-2">
          {/* DELANTEROS ZONE */}
          {renderTacticalLine("Delantera (DL)", "forwards", forwards)}

          {/* CENTROCAMPISTAS ZONE */}
          {renderTacticalLine("Mediocampo (MC)", "midfielders", midfielders)}

          {/* DEFENSAS ZONE */}
          {renderTacticalLine("Defensa (DF)", "defenders", defenders)}

          {/* PORTERO ZONE */}
          {renderGoalkeeperZone("Portería (POR)", goalkeepers)}
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-4 text-[10px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
          Clic en jugador: Ficha completa
        </span>
        <span className="text-slate-300">•</span>
        <span className="flex items-center gap-1.5">
          <Camera className="w-3 h-3 text-amber-500 inline-block" />
          Botón cámara: Subir y visualizar fotos de partido
        </span>
      </div>

      {/* MATCH PHOTOS MODAL (outside canvas so export stays clean) */}
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
