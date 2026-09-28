/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Player, MatchPhoto } from "../types";
import {
  Camera,
  Upload,
  X,
  Trash2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Download,
  Check,
  Calendar,
  Tag,
  UserCheck,
  Image as ImageIcon,
  Sparkles,
  Loader2
} from "lucide-react";

interface MatchPhotosModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePlayerPhotos: (playerId: string, photos: MatchPhoto[]) => void;
  onSetAsProfilePhoto?: (playerId: string, photoUrl: string) => void;
}

// Client-side image compression for match photos to prevent storage bloat
const compressMatchPhoto = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDimension = 850; // Crisp resolution for match photos and canvas rendering
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.72);
          resolve(compressedDataUrl);
        } else {
          resolve((event.target?.result as string) || "");
        }
      };
      img.onerror = () => resolve("");
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
};

const QUICK_TAGS = [
  "Gol",
  "Asistencia",
  "Parada",
  "Acción Defensiva",
  "Celebración",
  "Balón Parado",
  "Presión Alta"
];

export function MatchPhotosModal({
  player,
  isOpen,
  onClose,
  onUpdatePlayerPhotos,
  onSetAsProfilePhoto,
}: MatchPhotosModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [captionInput, setCaptionInput] = useState("");
  const [matchNameInput, setMatchNameInput] = useState("");
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().slice(0, 10));
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  
  // Lightbox full view
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copiedProfileId, setCopiedProfileId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        if (lightboxIndex !== null) {
          setLightboxIndex(null);
        } else {
          onClose();
        }
      } else if (lightboxIndex !== null && player?.matchPhotos) {
        if (e.key === "ArrowLeft") {
          setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : player.matchPhotos!.length - 1));
        } else if (e.key === "ArrowRight") {
          setLightboxIndex((prev) => (prev! < player.matchPhotos!.length - 1 ? prev! + 1 : 0));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, lightboxIndex, player, onClose]);

  if (!isOpen || !player) return null;

  const photos = player.matchPhotos || [];

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const validFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith("image/")) {
          validFiles.push(files[i]);
        }
      }

      if (validFiles.length === 0) {
        alert("Por favor, selecciona archivos de imagen válidos (JPG, PNG, WebP).");
        return;
      }

      const newPhotos: MatchPhoto[] = [];
      for (const file of validFiles) {
        const base64 = await compressMatchPhoto(file);
        if (base64) {
          newPhotos.push({
            id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            url: base64,
            caption: captionInput.trim() || undefined,
            matchName: matchNameInput.trim() || undefined,
            date: dateInput || new Date().toISOString().slice(0, 10),
          });
        }
      }

      const updated = [...newPhotos, ...photos];
      onUpdatePlayerPhotos(player.id, updated);

      // Reset form fields
      setCaptionInput("");
      setMatchNameInput("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error al procesar fotos:", err);
      alert("Error al subir las imágenes. Inténtalo de nuevo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    const updated = photos.filter((p) => p.id !== photoId);
    onUpdatePlayerPhotos(player.id, updated);
    setPhotoToDelete(null);
    if (lightboxIndex !== null) {
      setLightboxIndex(null);
    }
  };

  const handleSetProfile = (photoUrl: string, photoId: string) => {
    if (onSetAsProfilePhoto) {
      onSetAsProfilePhoto(player.id, photoUrl);
      setCopiedProfileId(photoId);
      setTimeout(() => setCopiedProfileId(null), 2000);
    }
  };

  const handleDownload = (photo: MatchPhoto) => {
    const link = document.createElement("a");
    link.href = photo.url;
    const cleanPlayerName = player.name.replace(/\s+/g, "_").toLowerCase();
    link.download = `partido_${cleanPlayerName}_${photo.date || "foto"}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="bg-[#D91E1E] p-4 sm:px-6 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
              {player.photoUrl ? (
                <img
                  src={player.photoUrl}
                  alt={player.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-5 h-5 text-white/90" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight leading-tight">
                  Fotos de Partido
                </h3>
                <span className="bg-white/20 text-white font-bold text-[10px] px-2 py-0.5 rounded-full border border-white/30">
                  {photos.length} {photos.length === 1 ? "foto" : "fotos"}
                </span>
              </div>
              <p className="text-xs text-red-100 font-medium">
                {player.name} {player.number ? `(#${player.number})` : ""} • <span className="font-bold">{player.position}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* UPLOAD PANEL */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Upload className="w-4 h-4 text-red-600" />
                Subir Fotos de Partido / Entrenamientos
              </h4>
              <span className="text-[11px] text-slate-400">
                Soporta selección múltiple
              </span>
            </div>

            {/* Optional Metadata Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400" /> Título o Jugada
                </label>
                <input
                  type="text"
                  placeholder="Ej: Gol minuto 74, Disputa aérea..."
                  value={captionInput}
                  onChange={(e) => setCaptionInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-slate-400" /> Partido / Rival
                </label>
                <input
                  type="text"
                  placeholder="Ej: Jornada 4 vs Real Jaén..."
                  value={matchNameInput}
                  onChange={(e) => setMatchNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Fecha del Encuentro
                </label>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition"
                />
              </div>
            </div>

            {/* Quick tags */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 mr-1">Etiqueta rápida:</span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCaptionInput((prev) => (prev ? `${prev} - ${tag}` : tag))}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-red-500 bg-red-50/60 scale-[0.99]"
                  : "border-slate-300 hover:border-red-400 hover:bg-red-50/20 bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <Loader2 className="w-7 h-7 text-red-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-700">Comprimiendo y guardando fotos...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow-inner">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-red-600 hover:underline">
                      Haz clic para buscar fotos
                    </span>{" "}
                    <span className="text-xs text-slate-500">o arrástralas directamente aquí</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Formatos JPG, PNG o WebP. Se optimizan automáticamente para un rendimiento fluido.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* PHOTOS GALLERY */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-red-600" />
                Galería de Fotos de Partido ({photos.length})
              </h4>
              {photos.length > 0 && (
                <span className="text-[10px] text-slate-400 italic">
                  Haz clic sobre una foto para verla a pantalla completa
                </span>
              )}
            </div>

            {photos.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    Aún no hay fotos de partido para {player.name}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-1">
                    Sube fotos de jugadas, acciones destacadas, goles o momentos de los partidos para realizar un seguimiento visual completo desde la pizarra táctica.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Subir primera foto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="group relative bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-red-400 shadow-sm hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Image thumbnail container */}
                    <div 
                      className="relative aspect-[4/3] bg-slate-900 overflow-hidden cursor-pointer"
                      onClick={() => setLightboxIndex(index)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || `Foto de partido ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/90 text-slate-900 font-bold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                          <Maximize2 className="w-3 h-3 text-red-600" /> Ampliar
                        </span>
                      </div>

                      {/* Date Badge */}
                      {photo.date && (
                        <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          {photo.date}
                        </div>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2 bg-white">
                      <div>
                        {photo.matchName && (
                          <div className="text-[10px] font-bold text-red-600 truncate mb-0.5" title={photo.matchName}>
                            {photo.matchName}
                          </div>
                        )}
                        <p className="text-[11px] font-medium text-slate-700 line-clamp-2 leading-tight">
                          {photo.caption || "Sin descripción de jugada"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-1">
                        {/* Set as profile */}
                        {onSetAsProfilePhoto && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetProfile(photo.url, photo.id);
                            }}
                            className={`text-[10px] font-bold px-1.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                              copiedProfileId === photo.id
                                ? "bg-emerald-100 text-emerald-800"
                                : "text-slate-500 hover:text-red-600 hover:bg-slate-50"
                            }`}
                            title="Usar como foto de perfil del jugador"
                          >
                            {copiedProfileId === photo.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" /> Perfil
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" /> Foto perfil
                              </>
                            )}
                          </button>
                        )}

                        <div className="flex items-center gap-1 ml-auto">
                          {/* Download */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(photo);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            title="Descargar foto"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoToDelete(photo.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Eliminar foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-white px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            * Las fotos quedan vinculadas al jugador y se muestran con insignia en la pizarra táctica.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Aceptar y Volver
          </button>
        </div>
      </div>

      {/* CONFIRM DELETE SUB-MODAL */}
      {photoToDelete && (
        <div 
          className="fixed inset-0 bg-slate-950/80 z-[60] flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h5 className="text-sm font-black text-slate-900">¿Eliminar foto de partido?</h5>
              <p className="text-xs text-slate-500 mt-1">
                Esta acción borrará la fotografía de partido seleccionada. No se puede deshacer.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeletePhoto(photoToDelete)}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase transition cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FULLSCREEN VISUALIZER */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div 
          className="fixed inset-0 bg-black/95 z-[70] flex flex-col justify-between p-4 sm:p-6 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div 
            className="flex items-center justify-between text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-black tracking-wider text-white">
                {lightboxIndex + 1} / {photos.length}
              </span>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">
                  {photos[lightboxIndex].caption || `${player.name} - Foto de partido`}
                </h4>
                {(photos[lightboxIndex].matchName || photos[lightboxIndex].date) && (
                  <p className="text-[11px] text-white/70">
                    {photos[lightboxIndex].matchName} {photos[lightboxIndex].date ? `(${photos[lightboxIndex].date})` : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload(photos[lightboxIndex])}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Descargar imagen"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Cerrar visor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Photo View with Navigation */}
          <div 
            className="relative flex-1 flex items-center justify-center my-2 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : photos.length - 1))}
                className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition cursor-pointer hover:scale-105"
                title="Foto anterior (Flecha Izquierda)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={photos[lightboxIndex].url}
              alt={photos[lightboxIndex].caption || "Foto ampliada"}
              className="max-h-[78vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            />

            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex((prev) => (prev! < photos.length - 1 ? prev! + 1 : 0))}
                className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition cursor-pointer hover:scale-105"
                title="Foto siguiente (Flecha Derecha)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails strip */}
          {photos.length > 1 && (
            <div 
              className="flex justify-center gap-2 overflow-x-auto py-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {photos.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setLightboxIndex(idx)}
                  className={`w-14 h-11 rounded-lg overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                    idx === lightboxIndex ? "border-red-500 scale-105 shadow-lg" : "border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
