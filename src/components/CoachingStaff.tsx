/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { StaffMember, StaffRole, StaffPhoto } from "../types";
import { StaffPhotosModal } from "./StaffPhotosModal";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  Camera,
  X,
  Upload,
  UserCheck,
  Search,
  FileSpreadsheet,
  Award,
  ClipboardCheck,
  ChevronRight,
  ShieldAlert,
  Image as ImageIcon
} from "lucide-react";

interface CoachingStaffProps {
  staff: StaffMember[];
  onAddStaff: (member: StaffMember) => void;
  onUpdateStaff: (member: StaffMember) => void;
  onDeleteStaff: (id: string) => void;
  onUpdateStaffPhotos?: (memberId: string, photos: StaffPhoto[]) => void;
  onSetStaffProfilePhoto?: (memberId: string, photoUrl: string) => void;
}

// Client-side compression for staff member photos
const compressStaffPhoto = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDimension = 500;
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
          resolve(canvas.toDataURL("image/jpeg", 0.75));
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

export function CoachingStaff({
  staff,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onUpdateStaffPhotos,
  onSetStaffProfilePhoto,
}: CoachingStaffProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "organigram">("cards");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [photosModalMemberId, setPhotosModalMemberId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<StaffRole>(StaffRole.PRIMER_ENTRENADOR);
  const [formLicense, setFormLicense] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhoto, setFormPhoto] = useState("");
  const [formResponsibilities, setFormResponsibilities] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingStaffId(null);
    setFormName("");
    setFormRole(StaffRole.PRIMER_ENTRENADOR);
    setFormLicense("");
    setFormPhone("");
    setFormEmail("");
    setFormPhoto("");
    setFormResponsibilities("");
    setFormNotes("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: StaffMember) => {
    setEditingStaffId(member.id);
    setFormName(member.name);
    setFormRole(member.role);
    setFormLicense(member.license || "");
    setFormPhone(member.phone || "");
    setFormEmail(member.email || "");
    setFormPhoto(member.photoUrl || "");
    setFormResponsibilities(member.responsibilities || "");
    setFormNotes(member.notes || "");
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Por favor, introduce el nombre del integrante del cuerpo técnico.");
      return;
    }

    if (editingStaffId) {
      onUpdateStaff({
        id: editingStaffId,
        name: formName.trim(),
        role: formRole,
        license: formLicense.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        photoUrl: formPhoto || undefined,
        responsibilities: formResponsibilities.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    } else {
      onAddStaff({
        id: `staff-${Date.now()}`,
        name: formName.trim(),
        role: formRole,
        license: formLicense.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        photoUrl: formPhoto || undefined,
        responsibilities: formResponsibilities.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        const compressed = await compressStaffPhoto(file);
        setFormPhoto(compressed);
      }
    }
  };

  // Filtered members
  const filteredStaff = staff.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.responsibilities && m.responsibilities.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = filterRole === "ALL" || m.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeStyle = (role: StaffRole) => {
    switch (role) {
      case StaffRole.PRIMER_ENTRENADOR:
        return "bg-red-50 text-red-700 border-red-200 ring-1 ring-red-600/10";
      case StaffRole.SEGUNDO_ENTRENADOR:
        return "bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-600/10";
      case StaffRole.PREPARADOR_FISICO:
        return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-600/10";
      case StaffRole.ENTRENADOR_PORTEROS:
        return "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-600/10";
      case StaffRole.ANALISTA_TACTICO:
        return "bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-600/10";
      case StaffRole.FISIOTERAPEUTA:
        return "bg-teal-50 text-teal-700 border-teal-200 ring-1 ring-teal-600/10";
      case StaffRole.DELEGADO:
        return "bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-600/10";
      case StaffRole.UTILLERO:
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  };

  // Grouped for organigram view
  const headCoach = staff.find((m) => m.role === StaffRole.PRIMER_ENTRENADOR);
  const assistants = staff.filter(
    (m) =>
      m.role === StaffRole.SEGUNDO_ENTRENADOR ||
      m.role === StaffRole.PREPARADOR_FISICO ||
      m.role === StaffRole.ENTRENADOR_PORTEROS ||
      m.role === StaffRole.ANALISTA_TACTICO
  );
  const supportStaff = staff.filter(
    (m) =>
      m.role === StaffRole.FISIOTERAPEUTA ||
      m.role === StaffRole.DELEGADO ||
      m.role === StaffRole.UTILLERO ||
      (m.role === StaffRole.OTRO && m.id !== headCoach?.id)
  );

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600" />
              Cuerpo Técnico & Staff
            </h3>
            <span className="bg-red-50 text-red-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-red-200">
              {staff.length} {staff.length === 1 ? "Integrante" : "Integrantes"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión completa del cuerpo técnico, entrenadores, preparadores físicos y servicios auxiliares.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Fichas
            </button>
            <button
              type="button"
              onClick={() => setViewMode("organigram")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "organigram"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Organigrama
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Miembro</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, cargo o función..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-xs"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-xs cursor-pointer w-full sm:w-auto"
        >
          <option value="ALL">Todos los cargos ({staff.length})</option>
          {Object.values(StaffRole).map((role) => (
            <option key={role} value={role}>
              {role} ({staff.filter((m) => m.role === role).length})
            </option>
          ))}
        </select>
      </div>

      {/* VIEW: ORGANIGRAM */}
      {viewMode === "organigram" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="text-center mb-6">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Estructura Jerárquica del Cuerpo Técnico
            </h4>
            <p className="text-xs text-slate-500">
              Distribución de responsabilidades y cadena de mando técnico.
            </p>
          </div>

          {/* Level 1: Primer Entrenador */}
          <div className="flex justify-center">
            {headCoach ? (
              <div className="bg-red-50 border-2 border-red-600 rounded-2xl p-4 max-w-sm w-full text-center shadow-md relative">
                <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-white shadow-md mx-auto overflow-hidden mb-2">
                  {headCoach.photoUrl ? (
                    <img src={headCoach.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserCheck className="w-8 h-8 text-white mx-auto mt-3" />
                  )}
                </div>
                <span className="inline-block bg-red-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full mb-1">
                  {headCoach.role}
                </span>
                <h5 className="font-black text-sm text-slate-900">{headCoach.name}</h5>
                {headCoach.license && (
                  <p className="text-[11px] font-bold text-red-700 flex items-center justify-center gap-1 mt-0.5">
                    <GraduationCap className="w-3.5 h-3.5" /> {headCoach.license}
                  </p>
                )}
                {headCoach.responsibilities && (
                  <p className="text-[11px] text-slate-600 italic mt-2 border-t border-red-200/60 pt-2">
                    "{headCoach.responsibilities}"
                  </p>
                )}
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setPhotosModalMemberId(headCoach.id)}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-700 hover:text-white bg-white hover:bg-red-600 px-2.5 py-1 rounded-full border border-red-200 transition cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Fotos ({headCoach.photos?.length || 0})</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-300 rounded-xl p-4 text-xs text-slate-400 italic">
                No hay Primer Entrenador asignado.
              </div>
            )}
          </div>

          {/* Level 2: Asistentes y Staff Técnico */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-px bg-slate-200 flex-1"></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Área Técnica & Preparación
              </span>
              <span className="h-px bg-slate-200 flex-1"></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {assistants.map((member) => (
                <div
                  key={member.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center shadow-xs hover:border-red-300 transition"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-white shadow-xs mx-auto overflow-hidden mb-1.5">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserCheck className="w-6 h-6 text-white mx-auto mt-2.5" />
                    )}
                  </div>
                  <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border mb-1 ${getRoleBadgeStyle(member.role)}`}>
                    {member.role}
                  </span>
                  <h6 className="font-bold text-xs text-slate-900 truncate">{member.name}</h6>
                  {member.license && (
                    <span className="text-[10px] text-slate-500 font-medium block truncate">
                      {member.license}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setPhotosModalMemberId(member.id)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[9.5px] font-bold text-slate-700 hover:text-red-700 bg-white hover:bg-red-50 px-2 py-0.5 rounded-md border border-slate-200 transition cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-2.5 h-2.5 text-red-500" />
                    <span>Fotos ({member.photos?.length || 0})</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Level 3: Soporte Médico y Logística */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-px bg-slate-200 flex-1"></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Área Médica, Fisioterapia & Logística
              </span>
              <span className="h-px bg-slate-200 flex-1"></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {supportStaff.map((member) => (
                <div
                  key={member.id}
                  className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center shadow-xs hover:border-red-300 transition"
                >
                  <div className="w-11 h-11 rounded-full bg-slate-700 border-2 border-white shadow-xs mx-auto overflow-hidden mb-1.5">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserCheck className="w-5 h-5 text-white mx-auto mt-2" />
                    )}
                  </div>
                  <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border mb-1 ${getRoleBadgeStyle(member.role)}`}>
                    {member.role}
                  </span>
                  <h6 className="font-bold text-xs text-slate-900 truncate">{member.name}</h6>
                  {member.license && (
                    <span className="text-[10px] text-slate-500 font-medium block truncate">
                      {member.license}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setPhotosModalMemberId(member.id)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[9.5px] font-bold text-slate-700 hover:text-red-700 bg-white hover:bg-red-50 px-2 py-0.5 rounded-md border border-stone-200 transition cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-2.5 h-2.5 text-red-500" />
                    <span>Fotos ({member.photos?.length || 0})</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: CARDS */}
      {viewMode === "cards" && (
        <>
          {filteredStaff.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                No se encontraron integrantes del cuerpo técnico
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Prueba a cambiar el filtro de búsqueda o pulsa en el botón superior para añadir un nuevo miembro al equipo técnico.
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Añadir Primer Integrante
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-red-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5 space-y-4">
                    {/* Top Row: Photo + Role + Name */}
                    <div className="flex items-start gap-3.5">
                      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 border-2 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                        {member.photoUrl ? (
                          <img
                            src={member.photoUrl}
                            alt={member.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <UserCheck className="w-7 h-7 text-white/80" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span
                          className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border mb-1 truncate max-w-full ${getRoleBadgeStyle(
                            member.role
                          )}`}
                        >
                          {member.role}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 truncate leading-tight">
                          {member.name}
                        </h4>
                        {member.license && (
                          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{member.license}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Responsibilities */}
                    {member.responsibilities && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[9.5px] uppercase font-black tracking-wider text-slate-500 block flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-red-500" /> Tareas Principales
                        </span>
                        <p className="text-xs text-slate-700 font-normal leading-relaxed line-clamp-3">
                          {member.responsibilities}
                        </p>
                      </div>
                    )}

                    {/* Notes / Special focus */}
                    {member.notes && (
                      <div className="text-[11px] text-slate-600 italic bg-red-50/30 border-l-2 border-red-500 pl-2.5 py-1">
                        "{member.notes}"
                      </div>
                    )}

                    {/* Contacts info */}
                    {(member.phone || member.email) && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                        {member.phone && (
                          <a
                            href={`tel:${member.phone}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-2 py-1 rounded-lg border border-slate-200 transition"
                            title="Llamar"
                          >
                            <Phone className="w-3 h-3 text-slate-400" /> {member.phone}
                          </a>
                        )}
                        {member.email && (
                          <a
                            href={`mailto:${member.email}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-2 py-1 rounded-lg border border-slate-200 transition truncate max-w-[200px]"
                            title="Enviar correo"
                          >
                            <Mail className="w-3 h-3 text-slate-400" /> {member.email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPhotosModalMemberId(member.id)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 px-2.5 py-1 rounded-lg border border-red-200 transition cursor-pointer shadow-2xs"
                      title="Subir y ver fotos de entrenamientos y partidos"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Fotos ({member.photos?.length || 0})</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(member)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition cursor-pointer shadow-2xs"
                        title="Editar ficha del miembro"
                      >
                        <Edit className="w-3 h-3" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(member.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 px-2 py-1 rounded-lg border border-slate-200 hover:border-red-200 transition cursor-pointer shadow-2xs"
                        title="Eliminar del cuerpo técnico"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT STAFF MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="bg-[#D91E1E] p-4 text-white flex items-center justify-between shadow-md">
              <h4 className="text-base font-black flex items-center gap-2">
                <Users className="w-5 h-5" />
                {editingStaffId ? "Editar Miembro del Cuerpo Técnico" : "Nuevo Miembro del Cuerpo Técnico"}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Photo Preview & Selector */}
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-red-600 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                  {formPhoto ? (
                    <img src={formPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <span className="block text-[11px] font-bold text-slate-700">Foto Oficial</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-red-500 text-slate-700 hover:text-red-600 transition shadow-xs cursor-pointer"
                    >
                      {formPhoto ? "Cambiar foto" : "Subir foto"}
                    </button>
                    {formPhoto && (
                      <button
                        type="button"
                        onClick={() => setFormPhoto("")}
                        className="text-xs font-bold text-slate-400 hover:text-red-600 px-2 py-1 rounded transition cursor-pointer"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Mario Bermúdez"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Cargo / Rol *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as StaffRole)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
                  >
                    {Object.values(StaffRole).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* License */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Titulación / Licencia
                </label>
                <input
                  type="text"
                  placeholder="Ej: Licencia UEFA Pro, Grado CAFyD, Nivel 3 RFEF..."
                  value={formLicense}
                  onChange={(e) => setFormLicense(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="tel"
                    placeholder="+34 600 000 000"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="tecnico@martoscd.es"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              {/* Responsibilities */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Funciones y Tareas Principales
                </label>
                <textarea
                  rows={3}
                  placeholder="Describa tareas de entrenamiento, scouting, balón parado, preparación física o funciones sanitarias..."
                  value={formResponsibilities}
                  onChange={(e) => setFormResponsibilities(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none leading-relaxed"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Notas de Enfoque / Filosofía
                </label>
                <input
                  type="text"
                  placeholder="Ej: Especialista en balón parado y transiciones ofensivas"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {editingStaffId ? "Guardar Cambios" : "Añadir al Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h5 className="text-sm font-black text-slate-900">¿Eliminar miembro del cuerpo técnico?</h5>
              <p className="text-xs text-slate-500 mt-1">
                Se retirará a este integrante del cuerpo técnico de la plantilla y de la estructura del club.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteStaff(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase transition cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAFF PHOTOS MODAL */}
      <StaffPhotosModal
        member={staff.find((m) => m.id === photosModalMemberId) || null}
        isOpen={photosModalMemberId !== null}
        onClose={() => setPhotosModalMemberId(null)}
        onUpdateStaffPhotos={(memberId, photos) => {
          if (onUpdateStaffPhotos) {
            onUpdateStaffPhotos(memberId, photos);
          } else {
            const found = staff.find((m) => m.id === memberId);
            if (found) {
              onUpdateStaff({ ...found, photos });
            }
          }
        }}
        onSetAsProfilePhoto={(memberId, photoUrl) => {
          if (onSetStaffProfilePhoto) {
            onSetStaffProfilePhoto(memberId, photoUrl);
          } else {
            const found = staff.find((m) => m.id === memberId);
            if (found) {
              onUpdateStaff({ ...found, photoUrl });
            }
          }
        }}
      />
    </div>
  );
}
