/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { StaffMember, StaffRole, StaffPhoto, Player, PlayerPosition, PlayerStatus } from "../types";
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
  ChevronLeft,
  ShieldAlert,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  Eye,
  Bookmark,
  XCircle,
  User,
  ArrowRightLeft,
  Check,
  RotateCcw
} from "lucide-react";

interface CoachingStaffProps {
  staff: StaffMember[];
  players?: Player[];
  onAddStaff: (member: StaffMember) => void;
  onUpdateStaff: (member: StaffMember) => void;
  onDeleteStaff: (id: string) => void;
  onUpdateStaffPhotos?: (memberId: string, photos: StaffPhoto[]) => void;
  onSetStaffProfilePhoto?: (memberId: string, photoUrl: string) => void;
  onUpdatePlayerStatus?: (playerId: string, status: PlayerStatus) => void;
  onUpdatePlayer?: (player: Player) => void;
  onOpenPlayerMatchPhotos?: (playerId: string) => void;
  selectedPlayer?: Player | null;
  onSelectPlayer?: (player: Player) => void;
  initialCoachingTab?: "staff" | "scouting" | "tracking";
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

export function CoachingStaff({
  staff,
  players = [],
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onUpdateStaffPhotos,
  onSetStaffProfilePhoto,
  onUpdatePlayerStatus,
  onUpdatePlayer,
  onOpenPlayerMatchPhotos,
  selectedPlayer,
  onSelectPlayer,
  initialCoachingTab,
}: CoachingStaffProps) {
  // Top Sub-tabs within Coaching Staff portal
  const [activeCoachingTab, setActiveCoachingTab] = useState<"staff" | "scouting" | "tracking">(
    initialCoachingTab || "staff"
  );

  React.useEffect(() => {
    if (initialCoachingTab) {
      setActiveCoachingTab(initialCoachingTab);
    }
  }, [initialCoachingTab]);

  // Staff Section states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "organigram">("cards");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [photosModalMemberId, setPhotosModalMemberId] = useState<string | null>(null);

  // Form states for Staff
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<StaffRole>(StaffRole.PRIMER_ENTRENADOR);
  const [formLicense, setFormLicense] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhoto, setFormPhoto] = useState("");
  const [formResponsibilities, setFormResponsibilities] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scouting Section states
  const [scoutingPlayerId, setScoutingPlayerId] = useState<string>(() => {
    return selectedPlayer?.id || players[0]?.id || "";
  });

  React.useEffect(() => {
    if (selectedPlayer?.id) {
      setScoutingPlayerId(selectedPlayer.id);
    }
  }, [selectedPlayer?.id]);
  const [scoutingFilterPos, setScoutingFilterPos] = useState<string>("TODAS");
  const [scoutingSearch, setScoutingSearch] = useState("");
  const [isEditingScouting, setIsEditingScouting] = useState(false);
  const [editPositives, setEditPositives] = useState("");
  const [editNegatives, setEditNegatives] = useState("");
  const [editLateralidad, setEditLateralidad] = useState("Derecho");
  const [editNumber, setEditNumber] = useState("");

  // Tracking Section states (Cartera & Descartes)
  const [trackingSubTab, setTrackingSubTab] = useState<"pending" | "discarded">("pending");
  const [trackingSearch, setTrackingSearch] = useState("");

  const resetStaffForm = () => {
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
    resetStaffForm();
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

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingStaffId) {
      const existing = staff.find((m) => m.id === editingStaffId);
      const updated: StaffMember = {
        id: editingStaffId,
        name: formName.trim(),
        role: formRole,
        license: formLicense.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        photoUrl: formPhoto || undefined,
        responsibilities: formResponsibilities.trim() || undefined,
        notes: formNotes.trim() || undefined,
        photos: existing?.photos || [],
      };
      onUpdateStaff(updated);
    } else {
      const newMember: StaffMember = {
        id: `staff-${Date.now()}`,
        name: formName.trim(),
        role: formRole,
        license: formLicense.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        photoUrl: formPhoto || undefined,
        responsibilities: formResponsibilities.trim() || undefined,
        notes: formNotes.trim() || undefined,
        photos: [],
      };
      onAddStaff(newMember);
    }
    setIsModalOpen(false);
    resetStaffForm();
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

  // Filtered staff list
  const filteredStaff = staff.filter((member) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      member.name.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      (member.license && member.license.toLowerCase().includes(query)) ||
      (member.responsibilities && member.responsibilities.toLowerCase().includes(query));

    const matchesRole = filterRole === "ALL" || member.role === filterRole;
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

  // Scouting active player
  const currentScoutingPlayer =
    players.find((p) => p.id === scoutingPlayerId) ||
    players.find((p) => p.id === selectedPlayer?.id) ||
    players[0] ||
    null;

  const handleStartEditScouting = () => {
    if (!currentScoutingPlayer) return;
    setEditPositives(currentScoutingPlayer.positives || "");
    setEditNegatives(currentScoutingPlayer.negatives || "");
    setEditLateralidad(currentScoutingPlayer.lateralidad || "Derecho");
    setEditNumber(currentScoutingPlayer.number || "");
    setIsEditingScouting(true);
  };

  const handleSaveScouting = () => {
    if (!currentScoutingPlayer || !onUpdatePlayer) return;
    const updated: Player = {
      ...currentScoutingPlayer,
      positives: editPositives.trim(),
      negatives: editNegatives.trim(),
      lateralidad: editLateralidad,
      number: editNumber.trim() || undefined,
    };
    onUpdatePlayer(updated);
    setIsEditingScouting(false);
  };

  const POSITION_ORDER: Record<string, number> = {
    [PlayerPosition.PORTERO]: 1,
    [PlayerPosition.DEFENSA]: 2,
    [PlayerPosition.LATERAL]: 3,
    [PlayerPosition.CENTROCAMPISTA]: 4,
    [PlayerPosition.EXTREMO]: 5,
    [PlayerPosition.DELANTERO]: 6,
  };

  const sortByPosition = (a: Player, b: Player) => {
    const orderA = POSITION_ORDER[a.position] || 99;
    const orderB = POSITION_ORDER[b.position] || 99;
    if (orderA !== orderB) return orderA - orderB;
    const numA = a.number ? parseInt(String(a.number), 10) : 999;
    const numB = b.number ? parseInt(String(b.number), 10) : 999;
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
    return a.name.localeCompare(b.name);
  };

  // Filtered players for scouting selector (sorted by position)
  const scoutingList = players
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(scoutingSearch.toLowerCase());
      const matchesPos = scoutingFilterPos === "TODAS" || p.position === scoutingFilterPos;
      return matchesSearch && matchesPos;
    })
    .sort(sortByPosition);

  // Tracking lists (sorted by position)
  const pendingPlayers = players.filter((p) => p.status === PlayerStatus.PENDING).sort(sortByPosition);
  const discardedPlayers = players.filter((p) => p.status === PlayerStatus.DISCARDED).sort(sortByPosition);

  const activeTrackingList = (trackingSubTab === "pending" ? pendingPlayers : discardedPlayers).filter(
    (p) => p.name.toLowerCase().includes(trackingSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* TOP SUB-TAB NAVIGATION OF COACHING STAFF PORTAL */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1.5 border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveCoachingTab("staff")}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeCoachingTab === "staff"
              ? "bg-white text-red-600 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Users className="w-4 h-4 text-red-600" />
          <span>Cuerpo Técnico</span>
          <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-mono font-bold border border-red-200">
            {staff.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCoachingTab("scouting")}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeCoachingTab === "scouting"
              ? "bg-white text-red-600 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-red-600" />
          <span>Fichas de Scouting</span>
          <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">
            {players.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCoachingTab("tracking")}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeCoachingTab === "tracking"
              ? "bg-white text-red-600 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Bookmark className="w-4 h-4 text-amber-500" />
          <span>Cartera & Descartes</span>
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono font-bold border border-amber-200">
            {pendingPlayers.length + discardedPlayers.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. CUERPO TÉCNICO SUB-VIEW                                     */}
      {/* ============================================================== */}
      {activeCoachingTab === "staff" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* HEADER BAR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  Estructura del Cuerpo Técnico • Juvenil B
                </h3>
                <span className="bg-red-50 text-red-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-red-200">
                  {staff.length} Miembros
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Equipo multidisciplinar a cargo de la preparación física, táctica y médica del conjunto.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Switcher */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-white text-slate-900 shadow-2xs"
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
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Organigrama
                </button>
              </div>

              {/* Add Staff Button */}
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Añadir Integrante
              </button>
            </div>
          </div>

          {/* SEARCH & FILTER BAR */}
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
                      className="bg-white rounded-2xl border border-slate-200 hover:border-red-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                    >
                      <div className="p-5 space-y-4">
                        {/* Member Header */}
                        <div className="flex items-start gap-3.5">
                          <div className="relative w-14 h-14 rounded-2xl bg-slate-900 border-2 border-white shadow-sm overflow-hidden shrink-0">
                            {member.photoUrl ? (
                              <img
                                src={member.photoUrl}
                                alt={member.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white">
                                <UserCheck className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <span
                              className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border mb-1 ${getRoleBadgeStyle(
                                member.role
                              )}`}
                            >
                              {member.role}
                            </span>
                            <h5 className="font-black text-sm text-slate-900 truncate">
                              {member.name}
                            </h5>
                            {member.license && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                <GraduationCap className="w-3 h-3 text-red-500 shrink-0" />
                                <span>{member.license}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Responsibilities */}
                        {member.responsibilities && (
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                              <Briefcase className="w-3 h-3 text-slate-400" /> Funciones Principales
                            </span>
                            <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                              {member.responsibilities}
                            </p>
                          </div>
                        )}

                        {/* Notes */}
                        {member.notes && (
                          <p className="text-xs text-slate-500 italic line-clamp-2">
                            "{member.notes}"
                          </p>
                        )}

                        {/* Contact info */}
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
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. FICHAS DE SCOUTING SUB-VIEW (INTEGRATED INSIDE COACHING STAFF) */}
      {/* ============================================================== */}
      {activeCoachingTab === "scouting" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* TOP CONTROLS & FAST PLAYER SELECTOR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-red-600" />
                  Fichas Analíticas de Scouting Individual
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evaluación técnica detallada, fortalezas, aspectos a mejorar y registro fotográfico de partidos.
                </p>
              </div>

              {/* Position Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {["TODAS", "Portero", "Defensa", "Lateral", "Centrocampista", "Extremo", "Delantero"].map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setScoutingFilterPos(pos)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                      scoutingFilterPos === pos
                        ? "bg-red-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {pos === "TODAS" ? "Todas" : pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Player Strip Carousel */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Seleccionar Jugador ({scoutingList.length})
                </span>
                <div className="relative w-48 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre..."
                    value={scoutingSearch}
                    onChange={(e) => setScoutingSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {scoutingList.map((p) => {
                  const isSelected = currentScoutingPlayer?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setScoutingPlayerId(p.id);
                        if (onSelectPlayer) onSelectPlayer(p);
                        setIsEditingScouting(false);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all shrink-0 cursor-pointer text-left ${
                        isSelected
                          ? "bg-red-600 text-white border-red-600 shadow-sm"
                          : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200"
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 shrink-0">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center font-bold text-xs ${isSelected ? "text-white" : "text-red-600"}`}>
                            {p.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold truncate max-w-[120px]">{p.name}</span>
                          {p.number && (
                            <span className={`text-[9px] font-black px-1 rounded ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                              #{p.number}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] block uppercase ${isSelected ? "text-red-100" : "text-slate-400"}`}>
                          {p.position}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ACTIVE PLAYER SCOUTING PROFILE */}
          {currentScoutingPlayer ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              {/* Profile Card Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-red-600 shadow bg-gradient-to-tr from-red-50 to-white shrink-0">
                    {currentScoutingPlayer.photoUrl ? (
                      <img
                        src={currentScoutingPlayer.photoUrl}
                        alt={currentScoutingPlayer.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                        <User className="w-10 h-10" />
                      </div>
                    )}
                    {currentScoutingPlayer.number && (
                      <span className="absolute bottom-0 right-0 bg-red-600 text-white font-black text-xs w-6 h-6 rounded-tl-lg flex items-center justify-center border-t border-l border-white shadow-sm">
                        {currentScoutingPlayer.number}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">
                        {currentScoutingPlayer.name}
                      </h4>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          currentScoutingPlayer.status === PlayerStatus.SELECTED
                            ? "bg-red-50 text-red-700 border-red-200"
                            : currentScoutingPlayer.status === PlayerStatus.PENDING
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {currentScoutingPlayer.status === PlayerStatus.SELECTED
                          ? "PLANTILLA CERRADA"
                          : currentScoutingPlayer.status === PlayerStatus.PENDING
                          ? "EN SEGUIMIENTO"
                          : "DESCARTADO"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Posición: <span className="font-bold text-red-600 uppercase">{currentScoutingPlayer.position}</span> • Lateralidad: <span className="font-black text-slate-700">{currentScoutingPlayer.lateralidad || "Derecho"}</span> • {currentScoutingPlayer.age} años
                    </p>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Previous / Next buttons */}
                  {players.length > 1 && (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          const idx = players.findIndex((p) => p.id === currentScoutingPlayer.id);
                          const prevIdx = idx > 0 ? idx - 1 : players.length - 1;
                          setScoutingPlayerId(players[prevIdx].id);
                          if (onSelectPlayer) onSelectPlayer(players[prevIdx]);
                          setIsEditingScouting(false);
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-white text-slate-700 flex items-center justify-center transition cursor-pointer"
                        title="Jugador Anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-mono font-bold text-slate-500 px-1">
                        {players.findIndex((p) => p.id === currentScoutingPlayer.id) + 1}/{players.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const idx = players.findIndex((p) => p.id === currentScoutingPlayer.id);
                          const nextIdx = idx < players.length - 1 ? idx + 1 : 0;
                          setScoutingPlayerId(players[nextIdx].id);
                          if (onSelectPlayer) onSelectPlayer(players[nextIdx]);
                          setIsEditingScouting(false);
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-white text-slate-700 flex items-center justify-center transition cursor-pointer"
                        title="Siguiente Jugador"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Match Photos Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenPlayerMatchPhotos) {
                        onOpenPlayerMatchPhotos(currentScoutingPlayer.id);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-red-600" />
                    <span>Fotos de Partido ({currentScoutingPlayer.matchPhotos?.length || 0})</span>
                  </button>

                  {/* Edit Scouting button */}
                  {!isEditingScouting ? (
                    <button
                      type="button"
                      onClick={handleStartEditScouting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition cursor-pointer shadow-2xs"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar Ficha</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEditingScouting(false)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveScouting}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Guardar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SCOUTING CONTENT: VIEW VS EDIT */}
              {isEditingScouting ? (
                /* INLINE EDIT MODE */
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                        Lateralidad Predominante
                      </label>
                      <select
                        value={editLateralidad}
                        onChange={(e) => setEditLateralidad(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="Derecho">Derecho</option>
                        <option value="Izquierdo">Izquierdo</option>
                        <option value="Ambidiestro">Ambidiestro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                        Dorsal Oficial
                      </label>
                      <input
                        type="text"
                        value={editNumber}
                        onChange={(e) => setEditNumber(e.target.value)}
                        placeholder="Ej. 10"
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-emerald-800 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Fortalezas y Aspectos Positivos
                    </label>
                    <textarea
                      rows={3}
                      value={editPositives}
                      onChange={(e) => setEditPositives(e.target.value)}
                      placeholder="Velocidad, visión de juego, salida de balón, contundencia..."
                      className="w-full text-xs bg-white border border-emerald-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-rose-800 mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Áreas de Mejora y Aspectos Negativos
                    </label>
                    <textarea
                      rows={3}
                      value={editNegatives}
                      onChange={(e) => setEditNegatives(e.target.value)}
                      placeholder="Juego aéreo, repliegue defensivo, toma de decisiones..."
                      className="w-full text-xs bg-white border border-rose-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              ) : (
                /* VIEW MODE */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Positive aspects */}
                    <div className="bg-emerald-50/70 border border-emerald-200/80 p-5 rounded-2xl space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        Fortalezas & Aspectos Positivos
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium">
                        {currentScoutingPlayer.positives.trim() || (
                          <span className="text-slate-400 italic">
                            Sin observaciones positivas registradas. Pulsa en "Editar Ficha" para añadir.
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Negative aspects */}
                    <div className="bg-rose-50/70 border border-rose-200/80 p-5 rounded-2xl space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        Áreas de Mejora & Aspectos Negativos
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium">
                        {currentScoutingPlayer.negatives.trim() || (
                          <span className="text-slate-400 italic">
                            Sin aspectos a corregir registrados. Pulsa en "Editar Ficha" para añadir.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Match Photos Strip Preview */}
                  {currentScoutingPlayer.matchPhotos && currentScoutingPlayer.matchPhotos.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-red-600" />
                          Fotos de Partido Guardadas ({currentScoutingPlayer.matchPhotos.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenPlayerMatchPhotos) {
                              onOpenPlayerMatchPhotos(currentScoutingPlayer.id);
                            }
                          }}
                          className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                        >
                          Ver galería completa →
                        </button>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {currentScoutingPlayer.matchPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer hover:scale-105 transition"
                            onClick={() => {
                              if (onOpenPlayerMatchPhotos) {
                                onOpenPlayerMatchPhotos(currentScoutingPlayer.id);
                              }
                            }}
                          >
                            <img src={photo.url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400 text-xs italic">
              No hay ningún jugador seleccionado.
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. CARTERA & DESCARTES SUB-VIEW                                */}
      {/* ============================================================== */}
      {activeCoachingTab === "tracking" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header & Sub-tab Toggles */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-500" />
                Posibles Jugadores a Tener en Cuenta o Descartados Definitivamente
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Futbolistas no inscritos en la plantilla cerrada: jugadores pendientes en seguimiento para el cuerpo técnico o descartados de la convocatoria.
              </p>
            </div>

            {/* Sub-toggle: A tener en cuenta vs Descartados */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setTrackingSubTab("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  trackingSubTab === "pending"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>⭐ Posibles a Tener en Cuenta</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">
                  {pendingPlayers.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTrackingSubTab("discarded")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  trackingSubTab === "discarded"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🚫 Descartados Definitivamente</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">
                  {discardedPlayers.length}
                </span>
              </button>
            </div>
          </div>

          {/* Search bar for tracking players */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={
                trackingSubTab === "pending"
                  ? "Buscar entre futbolistas en seguimiento..."
                  : "Buscar entre jugadores descartados..."
              }
              value={trackingSearch}
              onChange={(e) => setTrackingSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-xs"
            />
          </div>

          {/* Cards Grid */}
          {activeTrackingList.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                {trackingSubTab === "pending" ? <Sparkles className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <p className="text-sm font-bold text-slate-700">
                {trackingSubTab === "pending"
                  ? "No hay futbolistas en seguimiento técnico en este momento."
                  : "No hay jugadores clasificados como descartados definitivamente."}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Los jugadores de esta categoría quedan reservados para la gestión interna del cuerpo técnico sin ocupar ficha en la plantilla cerrada de 25.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTrackingList.map((player) => (
                <div
                  key={player.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-5 space-y-3.5">
                    {/* Player Header */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        {player.photoUrl ? (
                          <img src={player.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-red-600 text-sm">
                            {player.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-black text-sm text-slate-900 truncate">{player.name}</h5>
                          {player.number && (
                            <span className="text-[9px] bg-slate-100 font-bold px-1 rounded text-slate-600">
                              #{player.number}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mt-0.5">
                          {player.position} • {player.age} años • {player.lateralidad || "Diestro"}
                        </span>
                      </div>
                    </div>

                    {/* Scouting preview */}
                    {player.positives && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <span className="text-[9px] font-black uppercase text-emerald-800 block mb-0.5">
                          Fortalezas:
                        </span>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{player.positives}</p>
                      </div>
                    )}

                    {player.negatives && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <span className="text-[9px] font-black uppercase text-rose-800 block mb-0.5">
                          Motivo / Aspectos a mejorar:
                        </span>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{player.negatives}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                    {/* View Scouting Sheet */}
                    <button
                      type="button"
                      onClick={() => {
                        setScoutingPlayerId(player.id);
                        if (onSelectPlayer) onSelectPlayer(player);
                        setActiveCoachingTab("scouting");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-red-600 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-slate-400" />
                      Ficha
                    </button>

                    {/* Photos */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenPlayerMatchPhotos) {
                          onOpenPlayerMatchPhotos(player.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-red-600 bg-white hover:bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 transition cursor-pointer"
                      title="Ver fotos de partido"
                    >
                      <Camera className="w-3 h-3 text-slate-400" />
                      <span>{player.matchPhotos?.length || 0}</span>
                    </button>

                    {/* Toggle between Pending & Discarded */}
                    {player.status === PlayerStatus.PENDING ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdatePlayerStatus) onUpdatePlayerStatus(player.id, PlayerStatus.DISCARDED);
                        }}
                        className="text-[10px] font-bold text-slate-500 hover:text-red-700 bg-white px-2 py-1 rounded-lg border border-slate-200 transition cursor-pointer"
                        title="Mover a descartados definitivamente"
                      >
                        Descartar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdatePlayerStatus) onUpdatePlayerStatus(player.id, PlayerStatus.PENDING);
                        }}
                        className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 transition cursor-pointer"
                        title="Mover a cartera en seguimiento"
                      >
                        ⭐ A Seguimiento
                      </button>
                    )}

                    {/* Promote to Closed Squad */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onUpdatePlayerStatus) {
                          onUpdatePlayerStatus(player.id, PlayerStatus.SELECTED);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-lg shadow-2xs transition cursor-pointer active:scale-95"
                      title="Incorporar este jugador a la plantilla cerrada oficial"
                    >
                      <Check className="w-3 h-3" />
                      <span>A Plantilla</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* CREATE / EDIT STAFF MEMBER MODAL                                */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="bg-[#D91E1E] p-4 text-white flex items-center justify-between shadow-md">
              <h4 className="text-base font-black flex items-center gap-2">
                <Users className="w-5 h-5 text-white" />
                {editingStaffId ? "Editar Miembro del Cuerpo Técnico" : "Añadir al Cuerpo Técnico"}
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-5 space-y-4">
              {/* Photo Upload Zone */}
              <div className="flex items-center gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 hover:border-red-500 overflow-hidden flex items-center justify-center cursor-pointer transition relative group shrink-0"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {formPhoto ? (
                    <img src={formPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400 group-hover:text-red-500 transition" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] text-white font-bold transition">
                    Cambiar
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Fotografía del Técnico</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Sube una foto o déjala vacía para asignarla más tarde desde la galería.
                  </p>
                  {formPhoto && (
                    <button
                      type="button"
                      onClick={() => setFormPhoto("")}
                      className="text-[10px] text-red-600 hover:underline mt-1 cursor-pointer font-semibold"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>
              </div>

              {/* Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Manuel Bermúdez"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Cargo / Rol Técnico *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as StaffRole)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                  >
                    {Object.values(StaffRole).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Titulación / Licencia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: UEFA Pro, Grado CAFyD..."
                    value={formLicense}
                    onChange={(e) => setFormLicense(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="tel"
                    placeholder="+34 600 000 000"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="tecnico@martoscd.es"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Responsibilities */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                  Funciones y Responsabilidades
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Tácticas de balón parado, dirección de sesiones de calentamiento, prevención de lesiones..."
                  value={formResponsibilities}
                  onChange={(e) => setFormResponsibilities(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                  Notas Internas
                </label>
                <textarea
                  rows={2}
                  placeholder="Observaciones de disponibilidad, especialidades metodológicas..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Form buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  {editingStaffId ? "Guardar Cambios" : "Añadir al Cuerpo Técnico"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE STAFF MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
