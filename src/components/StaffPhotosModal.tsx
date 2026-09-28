/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { StaffMember, StaffPhoto } from "../types";
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
  Loader2,
  Users
} from "lucide-react";

interface StaffPhotosModalProps {
  member: StaffMember | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStaffPhotos: (memberId: string, photos: StaffPhoto[]) => void;
  onSetAsProfilePhoto?: (memberId: string, photoUrl: string) => void;
}

// Client-side image compression for staff photos
const compressStaffPhoto = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDimension = 900;
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
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
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

const QUICK_STAFF_TAGS = [
  "Entrenamiento",
  "Día de Partido",
  "Charla Táctica",
  "Preparación Física",
  "Vídeo Análisis",
  "Fisioterapia",
  "Celebración"
];

export function StaffPhotosModal({
  member,
  isOpen,
  onClose,
  onUpdateStaffPhotos,
  onSetAsProfilePhoto,
}: StaffPhotosModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [captionInput, setCaptionInput] = useState("");
  const [eventInput, setEventInput] = useState("");
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().slice(0, 10));
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);

  // Fullscreen Lightbox viewer states
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !member) return null;

  const photos = member.photos || [];

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewerIndex === null) return;
      if (e.key === "Escape") {
        setViewerIndex(null);
        setIsZoomed(false);
      } else if (e.key === "ArrowLeft") {
        setViewerIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
        setIsZoomed(false);
      } else if (e.key === "ArrowRight") {
        setViewerIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
        setIsZoomed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewerIndex, photos.length]);

  const handleProcessFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    const newPhotos: StaffPhoto[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      try {
        const compressedBase64 = await compressStaffPhoto(file);
        if (compressedBase64) {
          newPhotos.push({
            id: `staff-photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            url: compressedBase64,
            caption: captionInput.trim() || undefined,
            event: eventInput.trim() || undefined,
            date: dateInput || undefined,
          });
        }
      } catch (err) {
        console.error("Error processing staff photo:", err);
      }
    }

    if (newPhotos.length > 0) {
      const updatedList = [...newPhotos, ...photos];
      onUpdateStaffPhotos(member.id, updatedList);
      setCaptionInput("");
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    const updated = photos.filter((p) => p.id !== photoId);
    onUpdateStaffPhotos(member.id, updated);
    setPhotoToDelete(null);
    if (viewerIndex !== null && viewerIndex >= updated.length) {
      setViewerIndex(updated.length > 0 ? updated.length - 1 : null);
    }
  };

  const handleSetProfile = (photoUrl: string) => {
    if (onSetAsProfilePhoto) {
      onSetAsProfilePhoto(member.id, photoUrl);
      setProfileSuccessMsg(true);
      setTimeout(() => setProfileSuccessMsg(false), 2500);
    }
  };

  const currentViewerPhoto = viewerIndex !== null ? photos[viewerIndex] : null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-6 flex flex-col max-h-[92vh]">
          {/* MODAL HEADER */}
          <div className="bg-[#D91E1E] p-4 text-white flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black tracking-tight">{member.name}</h4>
                  <span className="bg-white/20 text-white font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-full border border-white/20">
                    {member.role}
                  </span>
                </div>
                <p className="text-xs text-red-100 flex items-center gap-1.5 mt-0.5">
                  <Camera className="w-3.5 h-3.5" />
                  Galería & Fotos de Entrenamientos, Partidos y Staff ({photos.length})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MODAL BODY */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1">
            {/* UPLOAD BOX */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 transition-all text-center ${
                isDragging
                  ? "border-red-500 bg-red-50/60 scale-[0.99]"
                  : "border-slate-300 hover:border-red-400 bg-slate-50/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="max-w-xl mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-sm">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <h5 className="text-sm font-black text-slate-800">
                    Subir fotos del cuerpo técnico
                  </h5>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Arrastra imágenes aquí o pulsa para seleccionar desde tu dispositivo (entrenamientos, pizarra, partidos...)
                  </p>
                </div>

                {/* Optional Metadata before upload */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left pt-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Momento / Título
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Charla previa..."
                      value={captionInput}
                      onChange={(e) => setCaptionInput(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Evento / Actividad
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Entrenamiento Táctico"
                      value={eventInput}
                      onChange={(e) => setEventInput(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Quick Tags */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Etiquetas:</span>
                  {QUICK_STAFF_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setEventInput(tag)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                        eventInput === tag
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-red-300"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Optimizando y guardando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Seleccionar Fotos
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* PHOTOS GALLERY */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-red-600" />
                  Galería Guardada ({photos.length})
                </h5>
                {photos.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    Pulsa sobre una foto para verla en pantalla completa
                  </span>
                )}
              </div>

              {photos.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
                  <Camera className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">
                    Aún no hay fotos registradas para este miembro del cuerpo técnico.
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Sube fotos de entrenamientos dirigidos, momentos del partido, pizarra o celebraciones para guardarlas en su historial.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {photos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="group relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-4/3 flex flex-col justify-end"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || "Foto staff"}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => {
                          setViewerIndex(idx);
                          setIsZoomed(false);
                        }}
                      />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                        {photo.event && (
                          <span className="bg-black/60 backdrop-blur-xs text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-white/20 truncate max-w-[120px]">
                            {photo.event}
                          </span>
                        )}
                        {photo.date && (
                          <span className="bg-black/60 backdrop-blur-xs text-white/90 text-[9px] font-medium px-1.5 py-0.5 rounded-md border border-white/20 ml-auto">
                            {photo.date}
                          </span>
                        )}
                      </div>

                      {/* Hover Overlay with Action Buttons */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetProfile(photo.url);
                            }}
                            title="Establecer como foto oficial de perfil"
                            className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white text-white hover:text-red-600 backdrop-blur-sm flex items-center justify-center transition cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoToDelete(photo.id);
                            }}
                            title="Eliminar foto"
                            className="w-7 h-7 rounded-lg bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-sm flex items-center justify-center transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div
                          className="cursor-pointer"
                          onClick={() => {
                            setViewerIndex(idx);
                            setIsZoomed(false);
                          }}
                        >
                          {photo.caption ? (
                            <p className="text-[11px] font-bold text-white line-clamp-2">
                              {photo.caption}
                            </p>
                          ) : (
                            <span className="text-[10px] text-white/70 italic flex items-center gap-1">
                              <Maximize2 className="w-3 h-3" /> Ver a pantalla completa
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              Las fotos se almacenan de forma permanente e integrada en la aplicación.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {photoToDelete && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h5 className="text-sm font-black text-slate-900">¿Eliminar esta foto del cuerpo técnico?</h5>
              <p className="text-xs text-slate-500 mt-1">
                La foto se eliminará definitivamente de la galería del integrante.
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

      {/* FULLSCREEN LIGHTBOX VIEWER */}
      {currentViewerPhoto && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[80] flex flex-col justify-between p-4 animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white py-2 px-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-white/70">
                {viewerIndex! + 1} / {photos.length}
              </span>
              {currentViewerPhoto.event && (
                <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  {currentViewerPhoto.event}
                </span>
              )}
              {currentViewerPhoto.date && (
                <span className="text-xs text-white/60 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {currentViewerPhoto.date}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {profileSuccessMsg && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mr-2 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" /> ¡Foto de perfil asignada!
                </span>
              )}

              {onSetAsProfilePhoto && (
                <button
                  type="button"
                  onClick={() => handleSetProfile(currentViewerPhoto.url)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white hover:text-slate-900 text-white font-bold text-xs transition cursor-pointer"
                  title="Establecer como foto oficial de perfil"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Foto Perfil</span>
                </button>
              )}

              <a
                href={currentViewerPhoto.url}
                download={`${member.name.replace(/\s+/g, "_")}_foto_${viewerIndex! + 1}.jpg`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white hover:text-slate-900 text-white font-bold text-xs transition cursor-pointer"
                title="Descargar foto"
              >
                <Download className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setViewerIndex(null);
                  setIsZoomed(false);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer ml-2"
                title="Cerrar visor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Image Container with Navigation */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2">
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setViewerIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
                  setIsZoomed(false);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-white hover:text-black text-white border border-white/20 flex items-center justify-center transition cursor-pointer z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <div
              className={`max-w-full max-h-full flex items-center justify-center cursor-pointer transition-transform duration-200 ${
                isZoomed ? "scale-125" : "scale-100"
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
            >
              <img
                src={currentViewerPhoto.url}
                alt={currentViewerPhoto.caption || "Foto visor"}
                className="max-w-[90vw] max-h-[75vh] object-contain rounded-xl shadow-2xl select-none"
              />
            </div>

            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setViewerIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
                  setIsZoomed(false);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-white hover:text-black text-white border border-white/20 flex items-center justify-center transition cursor-pointer z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Caption Bar */}
          <div className="text-center py-2 px-4 shrink-0">
            {currentViewerPhoto.caption ? (
              <p className="text-sm font-semibold text-white max-w-2xl mx-auto">
                {currentViewerPhoto.caption}
              </p>
            ) : (
              <p className="text-xs text-white/50 italic">
                {member.name} • {member.role}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
