/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Player, PlayerPosition, PlayerStatus, MatchPhoto, StaffMember, StaffPhoto } from "./types";
import { INITIAL_PLAYERS } from "./mockPlayers";
import { INITIAL_STAFF } from "./mockStaff";
import { FootballPitch } from "./components/FootballPitch";
import { ReportTemplate } from "./components/ReportTemplate";
import { MatchPhotosModal } from "./components/MatchPhotosModal";
import { CoachingStaff } from "./components/CoachingStaff";
import { persistData, loadPersistedData } from "./lib/storage";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  Shield,
  Plus,
  Trash2,
  Edit,
  Download,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  User,
  FileText,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Upload,
  Database,
  Check,
  Camera,
  Eye,
  Save,
  Copy,
  Users,
  X,
  ClipboardCheck,
  Bookmark
} from "lucide-react";
import {
  supabase,
  isSupabaseConfigured,
  fetchPlayersFromSupabase,
  upsertPlayerInSupabase,
  deletePlayerInSupabase,
  syncLocalWithSupabase,
  getSettingFromSupabase,
  saveSettingInSupabase,
  SUPABASE_TABLE_SQL
} from "./lib/supabaseClient";

// Helper function to compress and resize player photos for canvas/localStorage efficiency
const compressImage = (file: File, callback: (base64: string) => void) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const max_size = 200; // Perfect balance of crisp resolution and small storage size
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > max_size) {
          height *= max_size / width;
          width = max_size;
        }
      } else {
        if (height > max_size) {
          width *= max_size / height;
          height = max_size;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG with 0.65 quality
        const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
        callback(dataUrl);
      } else {
        callback(event.target?.result as string);
      }
    };
    img.onerror = () => {
      callback("");
    };
    img.src = event.target?.result as string;
  };
  reader.readAsDataURL(file);
};

export default function App() {
  // Sync state with localStorage or fall back to mock seed data
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem("mcd_players_v1");
    if (saved) {
      try {
        const parsed: Player[] = JSON.parse(saved);
        return parsed.map((p) => {
          if (!p.matchPhotos || p.matchPhotos.length === 0) {
            const initial = INITIAL_PLAYERS.find((ip) => ip.id === p.id);
            if (initial?.matchPhotos) {
              return { ...p, matchPhotos: initial.matchPhotos };
            }
          }
          return p;
        });
      } catch (e) {
        console.error("Error parsing saved players:", e);
      }
    }
    return INITIAL_PLAYERS;
  });

  // Active form values
  const [formName, setFormName] = useState("");
  const [formPosition, setFormPosition] = useState<PlayerPosition>(PlayerPosition.DEFENSA);
  const [formAge, setFormAge] = useState<string>("");
  const [formNumber, setFormNumber] = useState<string>("");
  const [formPositives, setFormPositives] = useState("");
  const [formNegatives, setFormNegatives] = useState("");
  const [formStatus, setFormStatus] = useState<PlayerStatus>(PlayerStatus.SELECTED);
  const [formPhoto, setFormPhoto] = useState<string>(" ");
  const [formLateralidad, setFormLateralidad] = useState<string>("Derecho");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Team Logo and Name States
  const [teamLogo, setTeamLogo] = useState<string>(() => {
    return localStorage.getItem("mcd_team_logo_v1") || "";
  });
  const [teamName, setTeamName] = useState<string>(() => {
    return localStorage.getItem("mcd_team_name_v1") || "MARTOS CD";
  });
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [tempTeamName, setTempTeamName] = useState("");
  const teamLogoInputRef = useRef<HTMLInputElement>(null);

  // Editing state
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  
  // Dashboard state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState<"pitch" | "staff" | "report">("pitch");
  const [initialCoachingTab, setInitialCoachingTab] = useState<"staff" | "scouting" | "tracking">("staff");
  
  // Coaching Staff state
  const [staff, setStaff] = useState<StaffMember[]>(() => {
    const saved = localStorage.getItem("mcd_coaching_staff_v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved staff:", e);
      }
    }
    return INITIAL_STAFF;
  });

  // Sync staff to persistent storage (IndexedDB + localStorage)
  useEffect(() => {
    persistData("mcd_coaching_staff_v1", staff);
  }, [staff]);

  // Load complete state from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    async function loadDataFromIndexedDB() {
      try {
        const idbPlayers = await loadPersistedData<Player[]>("mcd_players_v1", []);
        if (isMounted && idbPlayers && idbPlayers.length > 0) {
          setPlayers(idbPlayers);
        }
        const idbStaff = await loadPersistedData<StaffMember[]>("mcd_coaching_staff_v1", []);
        if (isMounted && idbStaff && idbStaff.length > 0) {
          setStaff(idbStaff);
        }
      } catch (err) {
        console.error("Failed to load data from IndexedDB:", err);
      }
    }
    loadDataFromIndexedDB();
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Custom scout notes for report template
  const [reportNotes, setReportNotes] = useState(
    "Plantilla confeccionada para afrontar la exigente temporada con un enfoque en transiciones compactas y sólida defensa."
  );

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPosition, setFilterPosition] = useState<string>("TODAS");
  const [filterStatus, setFilterStatus] = useState<string>("SELECTED");

  // Notifications
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Custom modal states to bypass sandboxed iframe confirm dialog blocks
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [showPlayerPreviewModal, setShowPlayerPreviewModal] = useState<Player | null>(null);
  const [matchPhotosModalPlayerId, setMatchPhotosModalPlayerId] = useState<string | null>(null);
  const [isPreviewEditing, setIsPreviewEditing] = useState(false);
  const [previewEditData, setPreviewEditData] = useState<Player | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Supabase Sync & Connection States
  const [isSyncing, setIsSyncing] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<"idle" | "syncing" | "success" | "error">(
    isSupabaseConfigured ? "idle" : "error"
  );
  const [supabaseErrorDetail, setSupabaseErrorDetail] = useState<string | null>(null);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // PDF Ref to capture report
  const reportContainerRef = useRef<HTMLDivElement>(null);

  const handleUpdatePlayerMatchPhotos = (playerId: string, photos: MatchPhoto[]) => {
    setPlayers((prev) => {
      const updated = prev.map((p) => {
        if (p.id === playerId) {
          return { ...p, matchPhotos: photos };
        }
        return p;
      });
      persistData("mcd_players_v1", updated);
      return updated;
    });

    if (selectedPlayer?.id === playerId) {
      setSelectedPlayer((prev) => (prev ? { ...prev, matchPhotos: photos } : prev));
    }
    if (showPlayerPreviewModal?.id === playerId) {
      setShowPlayerPreviewModal((prev) => (prev ? { ...prev, matchPhotos: photos } : prev));
    }

    setAlertMessage({
      type: "success",
      text: "Fotos de partido guardadas correctamente.",
    });
  };

  const handleSetPlayerProfilePhoto = (playerId: string, photoUrl: string) => {
    setPlayers((prev) => {
      const updated = prev.map((p) => {
        if (p.id === playerId) {
          return { ...p, photoUrl };
        }
        return p;
      });
      persistData("mcd_players_v1", updated);
      return updated;
    });

    if (selectedPlayer?.id === playerId) {
      setSelectedPlayer((prev) => (prev ? { ...prev, photoUrl } : prev));
    }
    if (showPlayerPreviewModal?.id === playerId) {
      setShowPlayerPreviewModal((prev) => (prev ? { ...prev, photoUrl } : prev));
    }

    setAlertMessage({
      type: "success",
      text: "Foto de perfil actualizada a partir de la foto de partido.",
    });
  };

  const handleUpdateStaffPhotos = (memberId: string, photos: StaffPhoto[]) => {
    setStaff((prev) => {
      const updated = prev.map((m) => {
        if (m.id === memberId) {
          return { ...m, photos };
        }
        return m;
      });
      persistData("mcd_coaching_staff_v1", updated);
      return updated;
    });
    setAlertMessage({
      type: "success",
      text: "Fotos del cuerpo técnico guardadas correctamente.",
    });
  };

  const handleSetStaffProfilePhoto = (memberId: string, photoUrl: string) => {
    setStaff((prev) => {
      const updated = prev.map((m) => {
        if (m.id === memberId) {
          return { ...m, photoUrl };
        }
        return m;
      });
      persistData("mcd_coaching_staff_v1", updated);
      return updated;
    });
    setAlertMessage({
      type: "success",
      text: "Foto de perfil del técnico actualizada correctamente.",
    });
  };

  // Supabase initial sync on mount (fully merges local items with remote items)
  useEffect(() => {
    if (isSupabaseConfigured) {
      const initSync = async () => {
        setIsSyncing(true);
        setSupabaseStatus("syncing");
        setSupabaseErrorDetail(null);
        try {
          // syncLocalWithSupabase fetches remote and uploads any local items missing on remote
          const merged = await syncLocalWithSupabase(players);
          setPlayers(merged);

          // Get global settings (team logo and name) from Supabase settings table if configured
          try {
            const logoSetting = await getSettingFromSupabase("team_logo_url");
            if (logoSetting) {
              setTeamLogo(logoSetting);
              localStorage.setItem("mcd_team_logo_v1", logoSetting);
            }
            const nameSetting = await getSettingFromSupabase("team_name");
            if (nameSetting) {
              setTeamName(nameSetting);
              localStorage.setItem("mcd_team_name_v1", nameSetting);
            }
          } catch (err) {
            console.warn("Could not load global settings from Supabase matching open_coaching_settings:", err);
          }

          setSupabaseStatus("success");
          setAlertMessage({
            type: "success",
            text: "¡Conexión Supabase activa! Sincronización bilateral completada con éxito."
          });
        } catch (error: any) {
          console.error("Supabase initial sync error:", error);
          setSupabaseStatus("error");
          setSupabaseErrorDetail(error.message || String(error));
          setAlertMessage({
            type: "error",
            text: "No se pudo sincronizar automáticamente con Supabase. ¿Has creado la tabla open_coaching_players?"
          });
        } finally {
          setIsSyncing(false);
        }
      };
      initSync();
    }
  }, []);

  const handleManualSync = async () => {
    if (!isSupabaseConfigured) {
      setAlertMessage({
        type: "error",
        text: "Configuración ausente: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para habilitar."
      });
      return;
    }

    setIsSyncing(true);
    setSupabaseStatus("syncing");
    setSupabaseErrorDetail(null);
    setAlertMessage({ type: "success", text: "Sincronizando con base de datos remota..." });

    try {
      const merged = await syncLocalWithSupabase(players);
      setPlayers(merged);
      setSupabaseStatus("success");
      setAlertMessage({ type: "success", text: "¡Sincronización bilateral realizada con éxito!" });
    } catch (error: any) {
      console.error("Manual sync failed:", error);
      setSupabaseStatus("error");
      setSupabaseErrorDetail(error.message || String(error));
      setAlertMessage({
        type: "error",
        text: `Error de sincronización: ${error.message || "Asegúrate de ejecutar el script SQL en Supabase."}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync players to persistent storage (IndexedDB + safe localStorage mirror)
  useEffect(() => {
    persistData("mcd_players_v1", players);
  }, [players]);

  // Set default initial selection
  useEffect(() => {
    if (!selectedPlayer && players.length > 0) {
      setSelectedPlayer(players[0]);
    }
  }, [players, selectedPlayer]);

  // Handle alert auto-timeout
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  // Open player in modal edit mode
  const handleStartEdit = (player: Player) => {
    setSelectedPlayer(player);
    setShowPlayerPreviewModal(player);
    setIsPreviewEditing(true);
    setPreviewEditData({ ...player });
  };

  // Direct player update handler (from Scouting or Preview)
  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers((prev) => {
      const updated = prev.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p));
      persistData("mcd_players_v1", updated);
      return updated;
    });
    if (selectedPlayer?.id === updatedPlayer.id) {
      setSelectedPlayer(updatedPlayer);
    }
    if (showPlayerPreviewModal?.id === updatedPlayer.id) {
      setShowPlayerPreviewModal(updatedPlayer);
    }
    setAlertMessage({
      type: "success",
      text: `Datos de "${updatedPlayer.name}" guardados correctamente.`,
    });
    if (isSupabaseConfigured) {
      upsertPlayerInSupabase(updatedPlayer).catch((err: any) => {
        console.error("Failed to sync update to Supabase:", err);
      });
    }
  };

  // Reset editing/creation form
  const handleResetForm = () => {
    setEditingPlayerId(null);
    setFormName("");
    setFormPosition(PlayerPosition.DEFENSA);
    setFormAge("");
    setFormNumber("");
    setFormPositives("");
    setFormNegatives("");
    setFormStatus(PlayerStatus.SELECTED);
    setFormPhoto("");
    setFormLateralidad("Derecho");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag & drop handlers for the photo uploader
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        compressImage(file, (base64) => {
          setFormPhoto(base64);
        });
      } else {
        setAlertMessage({ type: "error", text: "Por favor, sube solo archivos de imagen válidos." });
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        compressImage(file, (base64) => {
          setFormPhoto(base64);
        });
      } else {
        setAlertMessage({ type: "error", text: "Por favor, selecciona un archivo de imagen válido." });
      }
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormPhoto("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Create or Update Player
  const handleSubmitPlayer = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      setAlertMessage({ type: "error", text: "El nombre del jugador es obligatorio." });
      return;
    }

    if (!formAge || isNaN(Number(formAge)) || Number(formAge) < 5 || Number(formAge) > 50) {
      setAlertMessage({ type: "error", text: "Introduce una edad válida de jugador juvenil (fútbol base)." });
      return;
    }

    if (editingPlayerId) {
      // Update existing
      const updatedPlayers = players.map((p) => {
        if (p.id === editingPlayerId) {
          const updated: Player = {
            ...p,
            name: formName.trim(),
            position: formPosition,
            age: parseInt(formAge, 10),
            number: formNumber.trim() || undefined,
            positives: formPositives.trim(),
            negatives: formNegatives.trim(),
            status: formStatus,
            photoUrl: formPhoto || undefined,
            lateralidad: formLateralidad,
          };
          // Sync with active detailed view
          if (selectedPlayer?.id === p.id) {
            setSelectedPlayer(updated);
          }
          return updated;
        }
        return p;
      });

      setPlayers(updatedPlayers);
      setAlertMessage({ type: "success", text: `Jugador "${formName}" actualizado correctamente.` });

      // Propagate update to Supabase
      const updated = updatedPlayers.find((p) => p.id === editingPlayerId);
      if (updated && isSupabaseConfigured) {
        upsertPlayerInSupabase(updated)
          .then((finalPhotoUrl) => {
            if (finalPhotoUrl && finalPhotoUrl !== updated.photoUrl) {
              setPlayers((prev) =>
                prev.map((p) => (p.id === updated.id ? { ...p, photoUrl: finalPhotoUrl } : p))
              );
              setSelectedPlayer((current) =>
                current?.id === updated.id ? { ...current, photoUrl: finalPhotoUrl } : current
              );
            }
          })
          .catch((err: any) => {
            console.error("Failed to update in Supabase:", err);
            setAlertMessage({ type: "error", text: "Ficha editada localmente, pero falló la sincronización con Supabase." });
            setSupabaseStatus("error");
            setSupabaseErrorDetail(err.message || String(err));
          });
      }
    } else {
      // Create new
      const newPlayer: Player = {
        id: `mcd-${Date.now()}`,
        name: formName.trim(),
        position: formPosition,
        age: parseInt(formAge, 10),
        number: formNumber.trim() || undefined,
        positives: formPositives.trim(),
        negatives: formNegatives.trim(),
        status: formStatus,
        photoUrl: formPhoto || undefined,
        lateralidad: formLateralidad,
      };

      setPlayers([newPlayer, ...players]);
      setSelectedPlayer(newPlayer);
      setAlertMessage({ type: "success", text: `Jugador "${formName}" añadido con éxito.` });

      // Propagate creation to Supabase
      if (isSupabaseConfigured) {
        upsertPlayerInSupabase(newPlayer)
          .then((finalPhotoUrl) => {
            if (finalPhotoUrl && finalPhotoUrl !== newPlayer.photoUrl) {
              setPlayers((prev) =>
                prev.map((p) => (p.id === newPlayer.id ? { ...p, photoUrl: finalPhotoUrl } : p))
              );
              setSelectedPlayer((current) =>
                current?.id === newPlayer.id ? { ...current, photoUrl: finalPhotoUrl } : current
              );
            }
          })
          .catch((err: any) => {
            console.error("Failed to save to Supabase:", err);
            setAlertMessage({ type: "error", text: "Jugador añadido localmente, pero falló la sincronización con Supabase." });
            setSupabaseStatus("error");
            setSupabaseErrorDetail(err.message || String(err));
          });
      }
    }

    handleResetForm();
  };

  // Delete Player (Triggers the custom modal to prevent sandboxed iframe blocks)
  const handleDeletePlayer = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  // Executes the deletion once custom modal is confirmed
  const confirmDeletePlayer = () => {
    if (!deleteConfirm) return;
    const { id, name } = deleteConfirm;

    const filtered = players.filter((p) => p.id !== id);
    setPlayers(filtered);
    
    if (selectedPlayer?.id === id) {
      setSelectedPlayer(filtered.length > 0 ? filtered[0] : null);
    }
    
    setAlertMessage({ type: "success", text: `Jugador "${name}" eliminado de la lista.` });

    // Propagate deletion to Supabase
    if (isSupabaseConfigured) {
      deletePlayerInSupabase(id).catch((err: any) => {
        console.error("Failed to delete in Supabase:", err);
        setAlertMessage({ type: "error", text: "Eliminado localmente, pero falló la sincronización con Supabase." });
        setSupabaseStatus("error");
        setSupabaseErrorDetail(err.message || String(err));
      });
    }

    setDeleteConfirm(null);
  };

  // Handle Team Logo Upload & Compression
  const handleUploadTeamLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show processing indicator
    setAlertMessage({ type: "success", text: "Procesando y optimizando escudo del equipo..." });

    compressImage(file, async (base64) => {
      if (!base64) {
        setAlertMessage({ type: "error", text: "No se pudo procesar la imagen elegida." });
        return;
      }

      // 1. Update local state and offline fallback
      setTeamLogo(base64);
      localStorage.setItem("mcd_team_logo_v1", base64);
      setAlertMessage({ type: "success", text: "Escudo del equipo cargado localmente." });

      // 2. Propagate to Supabase if configured
      if (isSupabaseConfigured) {
        setAlertMessage({ type: "success", text: "Subiendo escudo a tu Supabase..." });
        try {
          const finalUrl = await saveSettingInSupabase("team_logo_url", base64);
          setTeamLogo(finalUrl);
          localStorage.setItem("mcd_team_logo_v1", finalUrl);
          setAlertMessage({ type: "success", text: "¡Escudo guardado y sincronizado con Supabase con éxito!" });
        } catch (err: any) {
          console.error("Failed to save team logo to Supabase:", err);
          setAlertMessage({
            type: "error",
            text: "Cargado localmente, pero falló la persistencia en Supabase. Ejecuta el nuevo script SQL si aún no lo has hecho."
          });
        }
      }
    });
  };

  // Handle Team Name Updates
  const handleToggleEditTeamName = () => {
    if (isEditingTeamName) {
      const cleanName = tempTeamName.trim();
      if (cleanName) {
        setTeamName(cleanName);
        localStorage.setItem("mcd_team_name_v1", cleanName);
        setAlertMessage({ type: "success", text: "Nombre de club actualizado localmente." });

        if (isSupabaseConfigured) {
          saveSettingInSupabase("team_name", cleanName)
            .then(() => {
              setAlertMessage({ type: "success", text: "¡Nombre guardado en tu base de datos Supabase!" });
            })
            .catch((err: any) => {
              console.error("Failed to save team name to Supabase:", err);
              setAlertMessage({ type: "error", text: "Actualizado localmente, pero falló la sincronización con Supabase." });
            });
        }
      }
      setIsEditingTeamName(false);
    } else {
      setTempTeamName(teamName);
      setIsEditingTeamName(true);
    }
  };

  // Update Status directly on list actions
  const handleUpdateStatus = (id: string, nextStatus: PlayerStatus) => {
    let updatedPlayer: Player | undefined;
    const updated = players.map((p) => {
      if (p.id === id) {
        const up = { ...p, status: nextStatus };
        updatedPlayer = up;
        if (selectedPlayer?.id === id) {
          setSelectedPlayer(up);
        }
        return up;
      }
      return p;
    });
    setPlayers(updated);
    
    const statusMsg = 
      nextStatus === PlayerStatus.SELECTED ? "incluido en plantilla" : 
      nextStatus === PlayerStatus.DISCARDED ? "descartado" : "marcado en evaluación";
    
    setAlertMessage({ 
      type: "success", 
      text: `Estado corregido. Jugador ${statusMsg}.` 
    });

    // Propagate status change to Supabase
    if (isSupabaseConfigured && updatedPlayer) {
      upsertPlayerInSupabase(updatedPlayer).catch((err: any) => {
        console.error("Failed to update status in Supabase:", err);
        setAlertMessage({ type: "error", text: "Estado actualizado localmente, pero falló la sincronización con Supabase." });
        setSupabaseStatus("error");
        setSupabaseErrorDetail(err.message || String(err));
      });
    }
  };

  // Multi-Step PDF Generation script
  const generatePDF = async () => {
    if (!reportContainerRef.current) return;
    
    setIsGeneratingPdf(true);
    setAlertMessage({ type: "success", text: "Iniciando compilación del dossier PDF..." });

    // Balanced parenthesis parser to replace unsupported color format calls with standard hex safely
    const sanitizeCSSColorFunctions = (cssText: string): string => {
      let result = "";
      let i = 0;
      const len = cssText.length;
      while (i < len) {
        const remaining = cssText.slice(i, i + 10).toLowerCase();
        let matchedPrefix = "";
        if (remaining.startsWith("oklch(")) matchedPrefix = "oklch(";
        else if (remaining.startsWith("oklab(")) matchedPrefix = "oklab(";
        else if (remaining.startsWith("lch(")) matchedPrefix = "lch(";
        else if (remaining.startsWith("lab(")) matchedPrefix = "lab(";
        else if (remaining.startsWith("hwb(")) matchedPrefix = "hwb(";

        if (matchedPrefix) {
          i += matchedPrefix.length;
          let depth = 1;
          while (i < len && depth > 0) {
            const char = cssText[i];
            if (char === "(") depth++;
            else if (char === ")") depth--;
            i++;
          }
          result += "#475569"; // Replace with bulletproof placeholder color
        } else {
          result += cssText[i];
          i++;
        }
      }
      return result;
    };

    // Keep track of original style/link tags and their parent/sibling positions to restore them perfectly
    interface RemovedElementState {
      element: Element;
      parent: ParentNode;
      nextSibling: ChildNode | null;
    }
    const removedElements: RemovedElementState[] = [];
    const temporaryStylesToClean: HTMLStyleElement[] = [];

    const targets = ["oklch", "oklab", "lch", "lab", "hwb"];
    const originalGetComputedStyle = window.getComputedStyle;

    try {
      // Override getComputedStyle specifically to intercept any oklch/oklab/lch/lab/hwb colors for html2canvas
      (window as any).getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
        const style = originalGetComputedStyle.call(this, elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop, receiver) {
            const value = Reflect.get(target, prop, target);
            if (typeof value === "string") {
              const valLower = value.toLowerCase();
              if (targets.some(term => valLower.includes(term))) {
                return sanitizeCSSColorFunctions(value);
              }
            }
            if (prop === "getPropertyValue") {
              return function (propertyName: string) {
                const val = target.getPropertyValue(propertyName);
                if (typeof val === "string") {
                  const valLower = val.toLowerCase();
                  if (targets.some(term => valLower.includes(term))) {
                    return sanitizeCSSColorFunctions(val);
                  }
                }
                return val;
              };
            }
            if (typeof value === "function") {
              return value.bind(target);
            }
            return value;
          }
        });
      };

      // Find all stylesheet/style nodes inside the document
      const styleAndLinkElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
      
      for (const el of styleAndLinkElements) {
        let hasUnsupported = false;
        let cssText = "";

        // Check if this sheet has any unsupported color functions
        if (el.nodeName === "STYLE") {
          const content = el.textContent || "";
          let cssomText = "";
          try {
            const sheet = (el as HTMLStyleElement).sheet;
            if (sheet && sheet.cssRules) {
              cssomText = Array.from(sheet.cssRules).map(rule => rule.cssText).join("\n");
            }
          } catch (e) {}
          cssText = cssomText || content;
        } else if (el.nodeName === "LINK") {
          const href = (el as HTMLLinkElement).href;
          if (href) {
            try {
              const res = await fetch(href);
              if (res.ok) {
                cssText = await res.text();
              }
            } catch (err) {
              console.warn("Could not fetch link stylesheet to parse:", href, err);
            }
          }
        }

        if (cssText && targets.some(term => cssText.toLowerCase().includes(term))) {
          hasUnsupported = true;
        }

        if (hasUnsupported && cssText) {
          // 1. Create a dynamic sanitized stylesheet replacement
          const sanitizedText = sanitizeCSSColorFunctions(cssText);
          const tempStyle = document.createElement("style");
          tempStyle.textContent = sanitizedText;
          tempStyle.setAttribute("data-sanitized-style", "true");
          document.head.appendChild(tempStyle);
          temporaryStylesToClean.push(tempStyle);

          // 2. Temporarily detach the original DOM node, saving its position
          const parent = el.parentNode;
          if (parent) {
            removedElements.push({
              element: el,
              parent,
              nextSibling: el.nextSibling
            });
            el.remove();
          }
        }
      }

      // Small timeout to allow browser paint cycles and style application to fully settle
      await new Promise((resolve) => setTimeout(resolve, 250));

      const element = reportContainerRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2, // Double DPI for professional printing crisp text and vector shapes
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 800, // Fixed layout width to match container sizing nicely
        onclone: (clonedDoc) => {
          // Remove any outstanding or unresolved stylesheet links to avoid un-sanitized external loads
          clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());

          // Cleanse inline style tags
          clonedDoc.querySelectorAll("style").forEach(el => {
            if (el.getAttribute("data-sanitized-style") === "true") return;
            if (el.textContent && targets.some(term => el.textContent.toLowerCase().includes(term))) {
              el.textContent = sanitizeCSSColorFunctions(el.textContent);
            }
          });

          // Proactively sanitize inline styles of cloned DOM elements during PDF generation
          const allInlineElements = clonedDoc.querySelectorAll("[style]");
          allInlineElements.forEach(el => {
            const styleAttr = el.getAttribute("style");
            if (styleAttr && targets.some(term => styleAttr.toLowerCase().includes(term))) {
              el.setAttribute("style", sanitizeCSSColorFunctions(styleAttr));
            }
          });
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      
      // Calculate aspect ratios for pages
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      const imgHeightInPdf = (canvasHeight * pdfWidth) / canvasWidth;
      
      let heightLeft = imgHeightInPdf;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeightInPdf);
      heightLeft -= pdfHeight;

      // Span multiple pages smoothly if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeightInPdf; // Shift vertically
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeightInPdf);
        heightLeft -= pdfHeight;
      }

      const formattedDate = new Date().toISOString().split("T")[0];
      pdf.save(`Martos_CD_Juvenil_B_Informe_Plantilla_${formattedDate}.pdf`);

      setAlertMessage({ 
        type: "success", 
        text: "¡PDF de Plantilla Exportado! El informe se ha guardado en tus descargas." 
      });
    } catch (error) {
      console.error("PDF generation failure:", error);
      setAlertMessage({ 
        type: "error", 
        text: "No se pudo compilar el PDF. Revisa los datos de los jugadores." 
      });
    } finally {
      // Restore original getComputedStyle
      (window as any).getComputedStyle = originalGetComputedStyle;

      // Re-insert the original style elements exactly where they were
      // Restore in reverse order to preserve exact sibling indices
      for (let i = removedElements.length - 1; i >= 0; i--) {
        const { element, parent, nextSibling } = removedElements[i];
        try {
          parent.insertBefore(element, nextSibling);
        } catch (err) {
          parent.appendChild(element);
        }
      }

      // Remove temporarily injected sanitized stylesheets
      temporaryStylesToClean.forEach(el => el.remove());

      setIsGeneratingPdf(false);
    }
  };

  const POSITION_ORDER: Record<string, number> = {
    [PlayerPosition.PORTERO]: 1,
    [PlayerPosition.DEFENSA]: 2,
    [PlayerPosition.LATERAL]: 3,
    [PlayerPosition.CENTROCAMPISTA]: 4,
    [PlayerPosition.EXTREMO]: 5,
    [PlayerPosition.DELANTERO]: 6,
  };

  // Search, Status, and Position filters applied chain - sorted by positions (Portero -> Defensa -> Lateral -> Centrocampista -> Extremo -> Delantero)
  const filteredPlayers = players
    .filter((player) => {
      const matchesSearch =
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (player.number && player.number.toString().includes(searchQuery));
      const matchesPosition = filterPosition === "TODAS" || player.position === filterPosition;
      const matchesStatus = 
        filterStatus === "TODOS" || 
        (filterStatus === "SELECTED" && player.status === PlayerStatus.SELECTED) ||
        (filterStatus === "DISCARDED" && player.status === PlayerStatus.DISCARDED) ||
        (filterStatus === "PENDING" && player.status === PlayerStatus.PENDING);
      
      return matchesSearch && matchesPosition && matchesStatus;
    })
    .sort((a, b) => {
      const orderA = POSITION_ORDER[a.position] || 99;
      const orderB = POSITION_ORDER[b.position] || 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const numA = a.number ? parseInt(String(a.number), 10) : 999;
      const numB = b.number ? parseInt(String(b.number), 10) : 999;
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return a.name.localeCompare(b.name);
    });

  // KPI counters
  const totalCount = players.length;
  const selectedCount = players.filter((p) => p.status === PlayerStatus.SELECTED).length;
  const discardedCount = players.filter((p) => p.status === PlayerStatus.DISCARDED).length;
  const pendingCount = players.filter((p) => p.status === PlayerStatus.PENDING).length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors">
      
      {/* GLOBAL BANNER NOTIFICATION */}
      {alertMessage && (
        <div 
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl shadow-lg border text-xs max-w-md animate-fade-in transition-all duration-300 ${
            alertMessage.type === "success" 
              ? "bg-white text-emerald-800 border-emerald-250" 
              : "bg-white text-rose-800 border-rose-250"
          }`}
        >
          <div className="flex h-6 w-5 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            {alertMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
          </div>
          <div className="font-semibold">{alertMessage.text}</div>
        </div>
      )}

      {/* DYNAMIC CONFIRM DELETE MODAL (Bypasses sandboxed iframe confirm block) */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-slate-800 animate-scale-in">
            <div className="bg-rose-50 p-4 border-b border-rose-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-rose-900 uppercase tracking-wider">Confirmar Eliminación</h3>
                <p className="text-[11px] text-rose-700 font-medium">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-normal">
                ¿Estás completamente seguro de que deseas eliminar a <strong className="text-slate-900 font-bold">{deleteConfirm.name}</strong> de la plantilla?
              </p>
              {isSupabaseConfigured && (
                <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg text-[10px] text-slate-500 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-[#D91E1E] shrink-0" />
                  <span>El jugador también será eliminado de forma remota en tu base de datos de Supabase.</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeletePlayer}
                className="px-4 py-1.5 rounded-lg text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm transition uppercase tracking-wider"
              >
                Eliminar Jugador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER BRAND BAR - PROFESSIONAL RED HIGH-FIDELITY DESIGNED */}
      <header className="sticky top-0 z-40 w-full bg-[#D91E1E] text-white px-4 lg:px-8 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Elegant Circle Brand Shield Indicator / Upload Button */}
            <div className="relative group cursor-pointer" onClick={() => teamLogoInputRef.current?.click()} title="Haz clic para subir o cambiar el escudo del equipo (Aparece en PDF y campo)">
              <input 
                type="file" 
                ref={teamLogoInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleUploadTeamLogo} 
              />
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-[#D91E1E] font-black shadow-md border-2 border-white overflow-hidden relative transition-all group-hover:scale-105 active:scale-95">
                {teamLogo ? (
                  <img src={teamLogo} alt="Escudo de equipo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                ) : (
                  <Shield className="w-7 h-7 text-[#D91E1E]" />
                )}
                
                {/* Camera hover icon */}
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-4 h-4 text-white" />
                  <span className="text-[7px] text-white font-black uppercase tracking-wider mt-0.5">SUBIR</span>
                </div>
              </div>
            </div>

            <div className="text-left">
              {isEditingTeamName ? (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={tempTeamName}
                    onChange={(e) => setTempTeamName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleToggleEditTeamName();
                      if (e.key === "Escape") setIsEditingTeamName(false);
                    }}
                    className="bg-white text-slate-900 px-2 py-0.5 rounded text-lg font-black uppercase tracking-tight font-display w-40 sm:w-56 focus:outline-none focus:ring-2 focus:ring-red-500"
                    autoFocus
                  />
                  <button
                    onClick={handleToggleEditTeamName}
                    type="button"
                    title="Guardar nombre"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-950 text-white transition active:scale-95 flex items-center justify-center"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title">
                  <h1 className="text-2xl font-black tracking-tight leading-none uppercase text-white font-display">
                    {teamName}
                  </h1>
                  <button
                    onClick={handleToggleEditTeamName}
                    type="button"
                    title="Editar nombre del equipo"
                    className="opacity-0 group-hover/title:opacity-100 p-1.5 rounded hover:bg-white/10 text-white transition-opacity text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    ✏️
                  </button>
                </div>
              )}
              <span className="text-sm font-medium opacity-90 text-white italic">
                Gestión de Plantilla • Juvenil B
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN SCREEN GRID WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT 5-COLUMNS: PLANTILLA OFICIAL CERRADA - ROSTER LIST */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shadow-xs">
                      <Shield className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Plantilla Oficial Cerrada
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Juvenil B • {selectedCount} Convocados
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Cerrada
                  </span>
                </div>
                
                {/* Search query input */}
                <div className="relative mb-3">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar convocado por nombre o dorsal..."
                    className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Grid Position & status filter pills */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase shrink-0">Posición:</span>
                    <div className="flex gap-1 overflow-x-auto pb-1 max-w-[280px]">
                      {["TODAS", "Portero", "Defensa", "Lateral", "Centrocampista", "Extremo", "Delantero"].map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setFilterPosition(pos)}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 transition-all cursor-pointer ${
                            filterPosition === pos
                              ? "bg-red-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {pos === "TODAS" ? "Todas" : pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase shrink-0">Vista:</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setFilterStatus("SELECTED")}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                          filterStatus === "SELECTED"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Convocados ({selectedCount})
                      </button>
                      <button
                        onClick={() => setFilterStatus("TODOS")}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                          filterStatus === "TODOS"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Todos ({totalCount})
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIST BODY */}
              <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                {filteredPlayers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50/20">
                    No se encontraron jugadores con los filtros seleccionados.
                  </div>
                ) : (
                  filteredPlayers.map((player, idx) => {
                    const isNewGroup = filterPosition === "TODAS" && (idx === 0 || filteredPlayers[idx - 1].position !== player.position);
                    const groupCount = filteredPlayers.filter(p => p.position === player.position).length;

                    return (
                      <React.Fragment key={player.id}>
                        {isNewGroup && (
                          <div className="bg-slate-100/95 px-3.5 py-1.5 flex items-center justify-between border-y border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-700 sticky top-0 z-10 backdrop-blur-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-3 bg-red-600 rounded-xs"></span>
                              <span>
                                {player.position === PlayerPosition.PORTERO && "🧤 Porteros"}
                                {player.position === PlayerPosition.DEFENSA && "🛡️ Defensas"}
                                {player.position === PlayerPosition.LATERAL && "🏃‍♂️ Laterales"}
                                {player.position === PlayerPosition.CENTROCAMPISTA && "📋 Centrocampistas"}
                                {player.position === PlayerPosition.EXTREMO && "⚡ Extremos"}
                                {player.position === PlayerPosition.DELANTERO && "🔥 Delanteros"}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">
                              {groupCount} {groupCount === 1 ? "jugador" : "jugadores"}
                            </span>
                          </div>
                        )}
                        <div
                          onClick={() => setSelectedPlayer(player)}
                          className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                            selectedPlayer?.id === player.id 
                              ? "bg-red-50/40 border-l-4 border-red-600" 
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="min-w-0 pr-3 flex items-center gap-3">
                            {/* Avatar Mini-thumbnail */}
                            <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center relative">
                              {player.photoUrl ? (
                                <img
                                  src={player.photoUrl}
                                  alt={player.name}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-xs font-black text-[#D91E1E]">
                                  {player.name ? player.name.charAt(0).toUpperCase() : "?"}
                                </span>
                              )}
                              {player.number && (
                                <span className="absolute bottom-0 right-0 bg-slate-900 text-white font-black text-[8px] px-1 rounded-tl-sm">
                                  #{player.number}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {player.name}
                                </span>
                                {player.status === PlayerStatus.PENDING && (
                                  <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-1 rounded">
                                    En Seguimiento
                                  </span>
                                )}
                                {player.status === PlayerStatus.DISCARDED && (
                                  <span className="text-[8px] bg-slate-200 text-slate-600 font-bold px-1 rounded">
                                    Descartado
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                                <span className={`uppercase tracking-wide font-bold px-1.5 py-0.2 rounded text-[9px] ${
                                  player.position === PlayerPosition.PORTERO ? "bg-amber-50 text-amber-800 border border-amber-200/80" :
                                  player.position === PlayerPosition.DEFENSA ? "bg-blue-50 text-blue-800 border border-blue-200/80" :
                                  player.position === PlayerPosition.LATERAL ? "bg-cyan-50 text-cyan-800 border border-cyan-200/80" :
                                  player.position === PlayerPosition.CENTROCAMPISTA ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80" :
                                  player.position === PlayerPosition.EXTREMO ? "bg-purple-50 text-purple-800 border border-purple-200/80" :
                                  "bg-rose-50 text-rose-800 border border-rose-200/80"
                                }`}>
                                  {player.position}
                                </span>
                                <span>•</span>
                                <span>{player.age} años</span>
                                <span>•</span>
                                <span className="capitalize">{player.lateralidad || "Derecho"}</span>
                              </div>
                            </div>
                          </div>

                          {/* FAST ACTIONS */}
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* Previsualizar */}
                            <button
                              onClick={() => {
                                setSelectedPlayer(player);
                                setShowPlayerPreviewModal(player);
                              }}
                              title="Previsualizar Ficha"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Fotos de partido */}
                            <button
                              onClick={() => setMatchPhotosModalPlayerId(player.id)}
                              title={`Ver fotos de partido (${player.matchPhotos?.length || 0})`}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition cursor-pointer relative"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              {player.matchPhotos && player.matchPhotos.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-600"></span>
                              )}
                            </button>

                            {/* Ver Ficha de Scouting en Cuerpo Técnico */}
                            <button
                              onClick={() => {
                                setSelectedPlayer(player);
                                setInitialCoachingTab("scouting");
                                setActiveTab("staff");
                              }}
                              title="Abrir Ficha de Scouting en Cuerpo Técnico"
                              className="p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition cursor-pointer"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                            </button>

                            {/* Editar Ficha modal */}
                            <button
                              onClick={() => handleStartEdit(player)}
                              title="Editar datos del jugador"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
              </div>

              {/* FOOTER NOTICE LINKING TO CARTERA Y DESCARTES IN CUERPO TÉCNICO */}
              <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200/60 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[11px] font-black text-amber-950 uppercase tracking-tight truncate">
                      Cartera & Descartes en Cuerpo Técnico
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-800 mt-0.5">
                    {pendingCount} en seguimiento • {discardedCount} descartados
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInitialCoachingTab("tracking");
                    setActiveTab("staff");
                  }}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Ver Cartera</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT 7-COLUMNS: DASHBOARD HOUSING FIELD, CATEGORIES, AND PDF TEMPLATE PREVIEW */}
          <div className="lg:col-span-7 space-y-6">

            {/* MAIN INTERACTIVE CONTROL TABS */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-200 bg-slate-50/50">
                <button
                  onClick={() => setActiveTab("pitch")}
                  className={`flex-1 py-3 text-xs font-black tracking-tight text-center border-b-2 uppercase transition-all flex items-center justify-center gap-2 pointer-events-auto cursor-pointer ${
                    activeTab === "pitch"
                      ? "border-red-600 text-red-600 bg-white font-black"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <Shield className="w-4 h-4 text-red-500" />
                  <span>Pizarra Táctica B</span>
                  <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full">
                    {selectedCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("staff")}
                  className={`flex-1 py-3 text-xs font-black tracking-tight text-center border-b-2 uppercase transition-all flex items-center justify-center gap-2 pointer-events-auto cursor-pointer ${
                    activeTab === "staff"
                      ? "border-red-600 text-red-600 bg-white font-black"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <Users className="w-4 h-4 text-red-600" />
                  <span>Cuerpo Técnico & Scouting</span>
                  <span className="text-[10px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded-full border border-red-200">
                    {staff.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("report")}
                  className={`flex-1 py-3 text-xs font-black tracking-tight text-center border-b-2 uppercase transition-all flex items-center justify-center gap-2 pointer-events-auto cursor-pointer ${
                    activeTab === "report"
                      ? "border-red-600 text-red-600 bg-white font-black"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Informe Oficial PDF</span>
                </button>
              </div>

              {/* TAB ACTIVE CONTAINER OUTLET */}
              <div className="p-4">
                
                {/* 1. VISUAL FOOTBALL FIELD VIEW */}
                {activeTab === "pitch" && (
                  <div className="space-y-4">
                    <FootballPitch 
                      players={players} 
                      onSelectPlayer={(p) => {
                        setSelectedPlayer(p);
                        setShowPlayerPreviewModal(p);
                      }} 
                      onUpdatePlayerPhotos={handleUpdatePlayerMatchPhotos}
                      onSetAsProfilePhoto={handleSetPlayerProfilePhoto}
                    />
                  </div>
                )}

                {/* 2. GENERATIVE PDF DETAILED PREVIEW ZONE */}
                {activeTab === "report" && (
                  <div className="space-y-4">
                    {/* CUSTOMIZABLE SCOUT STATEMENT PANEL */}
                    <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl space-y-2">
                      <span className="block text-xs font-black uppercase text-red-700 tracking-wide">
                        Editar Observaciones de Confección
                      </span>
                      <textarea
                        value={reportNotes}
                        onChange={(e) => setReportNotes(e.target.value)}
                        placeholder="Define una conclusión o resumen sobre el estado actual de la confección de plantilla..."
                        rows={3}
                        className="w-full text-xs p-2.5 bg-white border border-stone-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 text-stone-850"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-stone-400">
                          * Este párrafo será incluido al inicio de tu informe de Martos CD B.
                        </span>
                        <button
                          onClick={generatePDF}
                          disabled={isGeneratingPdf || players.length === 0}
                          className="text-xs bg-red-650 hover:bg-red-750 bg-red-600 text-white font-bold p-1 px-3.5 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Descargar PDF
                        </button>
                      </div>
                    </div>

                    {/* LIVE VIEWABLE COMPONENT CLONE */}
                    <div className="overflow-x-auto p-1 bg-stone-100 rounded-xl border border-stone-200">
                      <div className="scale-[0.8] sm:scale-100 origin-top min-w-[700px] sm:min-w-0">
                        <ReportTemplate
                          players={players}
                          reportTitle={`${teamName} JUVENIL B`}
                          reportNotes={reportNotes}
                          teamLogo={teamLogo}
                          staff={staff}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. CUERPO TÉCNICO & SCOUTING VIEW */}
                {activeTab === "staff" && (
                  <div className="space-y-4">
                    <CoachingStaff
                      staff={staff}
                      players={players}
                      onAddStaff={(newMember) => {
                        setStaff((prev) => [newMember, ...prev]);
                        setAlertMessage({
                          type: "success",
                          text: `"${newMember.name}" añadido al cuerpo técnico.`,
                        });
                      }}
                      onUpdateStaff={(updatedMember) => {
                        setStaff((prev) =>
                          prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
                        );
                        setAlertMessage({
                          type: "success",
                          text: `Datos de "${updatedMember.name}" actualizados correctamente.`,
                        });
                      }}
                      onDeleteStaff={(id) => {
                        const removed = staff.find((m) => m.id === id);
                        setStaff((prev) => prev.filter((m) => m.id !== id));
                        setAlertMessage({
                          type: "success",
                          text: removed
                            ? `"${removed.name}" eliminado del cuerpo técnico.`
                            : "Miembro eliminado del cuerpo técnico.",
                        });
                      }}
                      onUpdateStaffPhotos={handleUpdateStaffPhotos}
                      onSetStaffProfilePhoto={handleSetStaffProfilePhoto}
                      onUpdatePlayerStatus={handleUpdateStatus}
                      onUpdatePlayer={handleUpdatePlayer}
                      onOpenPlayerMatchPhotos={(playerId) => setMatchPhotosModalPlayerId(playerId)}
                      selectedPlayer={selectedPlayer}
                      onSelectPlayer={(p) => setSelectedPlayer(p)}
                      initialCoachingTab={initialCoachingTab}
                    />
                  </div>
                )}

              </div>
            </div>

            {/* QUICK SELECTION BAR FOR PITCH VIEW */}
            {selectedPlayer && activeTab === "pitch" && (
              <div className="bg-white p-3.5 px-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    {selectedPlayer.photoUrl ? (
                      <img src={selectedPlayer.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-red-600 text-xs">
                        {selectedPlayer.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900 truncate">{selectedPlayer.name}</span>
                      {selectedPlayer.number && (
                        <span className="text-[9px] bg-slate-100 font-bold px-1 rounded text-slate-600">
                          #{selectedPlayer.number}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium uppercase">
                      {selectedPlayer.position} • {selectedPlayer.age} años • {selectedPlayer.lateralidad || "Derecho"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowPlayerPreviewModal(selectedPlayer)}
                    className="text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Previa</span>
                  </button>
                  <button
                    onClick={() => {
                      setInitialCoachingTab("scouting");
                      setActiveTab("staff");
                    }}
                    className="text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Ver Ficha de Scouting en Cuerpo Técnico →</span>
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </main>

      {/* FOOTER GENERAL INFO */}
      <footer className="bg-white border-t border-stone-200 mt-12 py-6 px-4 text-center text-xs text-stone-550 text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© Martos CD - Juvenil B. Gestión Estratégica Deportiva. Confección de Plantilla Técnica.</p>
          <div className="flex gap-4">
            <span>Rojo & Blanco</span>
            <span>•</span>
            <span>Jaén, España</span>
          </div>
        </div>
      </footer>

      {/* Permanent off-screen target for high-fidelity HTML-to-PDF compilation */}
      <div style={{ position: "absolute", top: "-9999px", left: "-9999px", width: "800px", zIndex: -100, pointerEvents: "none" }}>
        <ReportTemplate
          ref={reportContainerRef}
          players={players}
          reportTitle={`${teamName} JUVENIL B`}
          reportNotes={reportNotes}
          teamLogo={teamLogo}
          staff={staff}
        />
      </div>

      {/* JUGADOR PREVIEW MODAL */}
      {showPlayerPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200 text-stone-900 my-8">
            
            {/* Modal Header */}
            <div className="bg-[#D91E1E] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-white" />
                <span className="text-xs font-black uppercase tracking-widest">
                  {isPreviewEditing ? "Editar Ficha de Jugador" : "Previsualización del Jugador"}
                </span>
              </div>

              {/* Navegación de jugadores desde el modal */}
              {!isPreviewEditing && players.length > 1 && (
                <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl border border-white/20 shadow-inner">
                  <button
                    onClick={() => {
                      const idx = players.findIndex(p => p.id === showPlayerPreviewModal.id);
                      if (idx !== -1) {
                        const prevIdx = idx === 0 ? players.length - 1 : idx - 1;
                        const targetPlayer = players[prevIdx];
                        setShowPlayerPreviewModal(targetPlayer);
                        setSelectedPlayer(targetPlayer); // Sync underlying selectedPlayer card
                      }
                    }}
                    className="p-1 hover:bg-white/20 rounded-lg text-white transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                    title="Jugador Anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-black tracking-wider text-white select-none min-w-[2.5rem] text-center">
                    {players.findIndex(p => p.id === showPlayerPreviewModal.id) + 1} / {players.length}
                  </span>
                  <button
                    onClick={() => {
                      const idx = players.findIndex(p => p.id === showPlayerPreviewModal.id);
                      if (idx !== -1) {
                        const nextIdx = idx === players.length - 1 ? 0 : idx + 1;
                        const targetPlayer = players[nextIdx];
                        setShowPlayerPreviewModal(targetPlayer);
                        setSelectedPlayer(targetPlayer); // Sync underlying selectedPlayer card
                      }
                    }}
                    className="p-1 hover:bg-white/20 rounded-lg text-white transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                    title="Siguiente Jugador"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setShowPlayerPreviewModal(null);
                  setIsPreviewEditing(false);
                  setPreviewEditData(null);
                }}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer ml-2"
                title="Cerrar Previa"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {isPreviewEditing && previewEditData ? (
              /* EDIT MODE */
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <input
                  type="file"
                  ref={modalFileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const file = e.target.files[0];
                      if (file.type.startsWith("image/")) {
                        compressImage(file, (base64) => {
                          setPreviewEditData(prev => prev ? { ...prev, photoUrl: base64 } : null);
                        });
                      } else {
                        setAlertMessage({ type: "error", text: "Por favor, selecciona un archivo de imagen válido." });
                      }
                    }
                  }}
                />

                {/* Photo & Identity Section */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <div className="relative group cursor-pointer w-24 h-24 bg-gradient-to-tr from-stone-900 to-slate-800 rounded-2xl overflow-hidden border-4 border-red-600 shadow-md flex items-center justify-center shrink-0">
                    {previewEditData.photoUrl ? (
                      <>
                        <img
                          src={previewEditData.photoUrl}
                          alt={previewEditData.name}
                          className="w-full h-full object-cover group-hover:opacity-40 transition-opacity"
                          referrerPolicy="no-referrer"
                        />
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white font-extrabold text-[10px] text-center p-1"
                          onClick={() => modalFileInputRef.current?.click()}
                        >
                          CAMBIAR FOTO
                        </div>
                      </>
                    ) : (
                      <div 
                        className="text-center text-stone-400 w-full"
                        onClick={() => modalFileInputRef.current?.click()}
                      >
                        <Camera className="w-8 h-8 mx-auto opacity-70 text-white hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-black uppercase text-slate-350">Subir Foto</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 w-full space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-black tracking-wider text-stone-500 block mb-0.5">Nombre del Jugador</label>
                      <input
                        type="text"
                        value={previewEditData.name}
                        onChange={(e) => setPreviewEditData(prev => prev ? { ...prev, name: e.target.value } : null)}
                        placeholder="Ej. Juan Pérez"
                        className="w-full text-sm font-bold bg-white text-stone-955 border border-stone-300 p-2 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Core Specifications */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-wider text-stone-500 block mb-1">Dorsal</label>
                    <input
                      type="text"
                      value={previewEditData.number || ""}
                      onChange={(e) => setPreviewEditData(prev => prev ? { ...prev, number: e.target.value } : null)}
                      placeholder="Sin dorsal"
                      className="w-full text-xs font-bold bg-white text-stone-955 border border-stone-300 p-2 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-wider text-stone-500 block mb-1">Edad</label>
                    <input
                      type="number"
                      value={previewEditData.age}
                      onChange={(e) => setPreviewEditData(prev => prev ? { ...prev, age: parseInt(e.target.value, 10) || 0 } : null)}
                      min="5"
                      max="50"
                      className="w-full text-xs font-bold bg-white text-stone-955 border border-stone-300 p-2 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 outline-none"
                    />
                  </div>
                </div>

                {/* Position, Lateralidad & Status Selector Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-wider text-stone-500 block mb-1">Posición de Campo</label>
                    <select
                      value={previewEditData.position}
                      onChange={(e) => setPreviewEditData(prev => prev ? { ...prev, position: e.target.value as PlayerPosition } : null)}
                      className="w-full text-xs font-bold bg-white text-stone-955 border border-stone-300 p-2 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 outline-none"
                    >
                      <option value={PlayerPosition.PORTERO}>Portero</option>
                      <option value={PlayerPosition.DEFENSA}>Defensa</option>
                      <option value={PlayerPosition.LATERAL}>Lateral</option>
                      <option value={PlayerPosition.CENTROCAMPISTA}>Centrocampista</option>
                      <option value={PlayerPosition.EXTREMO}>Extremo</option>
                      <option value={PlayerPosition.DELANTERO}>Delantero</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-wider text-stone-500 block mb-1">Lateralidad</label>
                    <select
                      value={previewEditData.lateralidad || "Derecho"}
                      onChange={(e) => setPreviewEditData(prev => prev ? { ...prev, lateralidad: e.target.value } : null)}
                      className="w-full text-xs font-bold bg-white text-stone-955 border border-stone-300 p-2 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 outline-none"
                    >
                      <option value="Derecho">Derecho</option>
                      <option value="Izquierdo">Izquierdo</option>
                      <option value="Ambidiestro">Ambidiestro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-wider text-stone-500 block mb-1">Estado de Scouting</label>
                    <select
                      value={previewEditData.status}
                      onChange={(e) => setPreviewEditData(prev => prev ? { ...prev, status: e.target.value as PlayerStatus } : null)}
                      className="w-full text-xs font-black bg-white text-stone-955 border border-stone-300 p-2 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 outline-none"
                    >
                      <option value={PlayerStatus.SELECTED}>Plantilla (SQUAD)</option>
                      <option value={PlayerStatus.PENDING}>En Evaluación (EVALUACIÓN)</option>
                      <option value={PlayerStatus.DISCARDED}>Descartado (DESCARTADO)</option>
                    </select>
                  </div>
                </div>

                {/* Aspectos de Rendimiento */}
                <div className="space-y-4 pt-1">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <label className="text-[10px] uppercase font-black tracking-wider text-stone-600">
                        Aspectos Positivos de Rendimiento
                      </label>
                    </div>
                    <textarea
                      value={previewEditData.positives}
                      onChange={(e) => setPreviewEditData(prev => prev ? { ...prev, positives: e.target.value } : null)}
                      placeholder="Describa el rendimiento, virtudes tácticas, físicas u ofensivas..."
                      rows={3}
                      className="w-full text-xs font-normal bg-white text-stone-950 border border-stone-300 p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <label className="text-[10px] uppercase font-black tracking-wider text-stone-600">
                        Aspectos Negativos / Áreas de Mejora
                      </label>
                    </div>
                    <textarea
                      value={previewEditData.negatives}
                      onChange={(e) => setPreviewEditData(prev => prev ? { ...prev, negatives: e.target.value } : null)}
                      placeholder="Describa flaquezas defensivas, problemas físicos, de actitud o toma de decisiones..."
                      rows={3}
                      className="w-full text-xs font-normal bg-white text-stone-950 border border-stone-300 p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-rose-500 outline-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* PREVIEW SHOW MODE */
              <div className="p-6 space-y-6">
                
                {/* Profile Card Main Info Row */}
                <div className="flex flex-col sm:flex-row items-center gap-5 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  
                  {/* FIFA Ultimate Team Dynamic Photo Frame */}
                  <div className="relative w-28 h-28 bg-gradient-to-tr from-stone-900 to-slate-800 rounded-2xl overflow-hidden border-4 border-red-600 shadow-lg flex items-center justify-center shrink-0">
                    {showPlayerPreviewModal.photoUrl ? (
                      <img
                        src={showPlayerPreviewModal.photoUrl}
                        alt={showPlayerPreviewModal.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center text-stone-400">
                        <User className="w-14 h-14 mx-auto opacity-40 text-white" />
                        <span className="text-[9px] font-bold text-slate-400">Falta Foto</span>
                      </div>
                    )}
                    
                    {/* Big Jersey Number Badge */}
                    {showPlayerPreviewModal.number && (
                      <div className="absolute top-1 left-1 bg-red-600 text-white font-black text-xs px-1.5 py-0.5 rounded-lg border border-white/40 shadow-md">
                        {showPlayerPreviewModal.number}
                      </div>
                    )}
                  </div>

                  <div className="text-center sm:text-left space-y-1">
                    <h3 className="text-2xl font-black text-stone-900 leading-tight">
                      {showPlayerPreviewModal.name}
                    </h3>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <span className="bg-red-600/10 text-red-600 font-extrabold uppercase text-[10px] px-2.5 py-1 rounded-full border border-red-600/20">
                        {showPlayerPreviewModal.position}
                      </span>
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">
                        🦶 {showPlayerPreviewModal.lateralidad || "Derecho"}
                      </span>
                      <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2.5 py-1 rounded-full">
                        {showPlayerPreviewModal.age} años
                      </span>
                      
                      {/* Status Badge */}
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                        showPlayerPreviewModal.status === PlayerStatus.SELECTED 
                          ? "bg-red-50 text-red-700 border-red-200" 
                          : showPlayerPreviewModal.status === PlayerStatus.DISCARDED 
                          ? "bg-stone-100 text-stone-600 border-stone-300"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {showPlayerPreviewModal.status === PlayerStatus.SELECTED 
                          ? "SQUAD" 
                          : showPlayerPreviewModal.status === PlayerStatus.DISCARDED 
                          ? "DESCARTADO" 
                          : "EVALUACIÓN"
                        }
                      </span>
                    </div>
                  </div>

                </div>

                {/* Positives and Negatives Section in Grid */}
                <div className="grid grid-cols-1 gap-4">
                  
                  {/* Positive Column */}
                  <div className="bg-emerald-50/50 border border-emerald-150 p-4 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800">
                        Aspectos Positivos de Rendimiento
                      </span>
                    </div>
                    <p className="text-xs text-stone-750 font-normal leading-relaxed italic">
                      "{showPlayerPreviewModal.positives.trim() || "No especificado en el informe de scouting."}"
                    </p>
                  </div>

                  {/* Negative Column */}
                  <div className="bg-rose-50/50 border border-rose-150 p-4 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span className="text-[10px] uppercase font-black tracking-wider text-rose-800">
                        Aspectos Negativos / Áreas de Mejora
                      </span>
                    </div>
                    <p className="text-xs text-stone-750 font-normal leading-relaxed italic">
                      "{showPlayerPreviewModal.negatives.trim() || "No especificado en el informe de scouting."}"
                    </p>
                  </div>

                  {/* Match Photos Section in Player Modal */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-red-600" />
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-800">
                          Fotos de Partido ({showPlayerPreviewModal.matchPhotos?.length || 0})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMatchPhotosModalPlayerId(showPlayerPreviewModal.id)}
                        className="text-[10px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" /> Subir / Ver fotos
                      </button>
                    </div>

                    {showPlayerPreviewModal.matchPhotos && showPlayerPreviewModal.matchPhotos.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {showPlayerPreviewModal.matchPhotos.slice(0, 4).map((photo, i) => (
                          <div
                            key={photo.id || i}
                            onClick={() => setMatchPhotosModalPlayerId(showPlayerPreviewModal.id)}
                            className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 cursor-pointer group shadow-xs hover:border-red-400"
                            title={photo.caption || "Ver fotos de partido"}
                          >
                            <img
                              src={photo.url}
                              alt={photo.caption || "Foto de partido"}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {photo.caption && (
                              <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-xs text-white text-[8px] font-medium px-1 py-0.5 truncate">
                                {photo.caption}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div 
                        onClick={() => setMatchPhotosModalPlayerId(showPlayerPreviewModal.id)}
                        className="p-3 border border-dashed border-slate-300 rounded-lg text-center cursor-pointer hover:bg-white hover:border-red-300 transition"
                      >
                        <p className="text-[11px] text-slate-500 font-medium">
                          No hay fotos de partido para este jugador todavía.
                        </p>
                        <span className="text-[10px] font-bold text-red-600">
                          + Haz clic aquí para subir fotos de partido
                        </span>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[10px] text-stone-500 italic">
                {isPreviewEditing ? "* Los cambios afectarán directamente a este jugador." : "* El PDF exportado incluye el informe completo del Juvenil B."}
              </span>
              
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                {isPreviewEditing && previewEditData ? (
                  /* EDITING MODE FOOTER BUTTONS */
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPreviewEditing(false);
                        setPreviewEditData(null);
                      }}
                      className="text-xs text-stone-550 text-stone-600 hover:text-stone-850 hover:bg-stone-100 font-bold px-4 py-2 rounded-lg border border-stone-250 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!previewEditData.name.trim()) {
                          setAlertMessage({ type: "error", text: "El nombre del jugador es obligatorio." });
                          return;
                        }
                        if (!previewEditData.age || previewEditData.age < 5 || previewEditData.age > 50) {
                          setAlertMessage({ type: "error", text: "Introduce una edad válida de jugador." });
                          return;
                        }

                        // Update main state
                        const updatedPlayers = players.map(p => p.id === previewEditData.id ? previewEditData : p);
                        setPlayers(updatedPlayers);
                        setSelectedPlayer(previewEditData);
                        setShowPlayerPreviewModal(previewEditData);
                        
                        setAlertMessage({ type: "success", text: `Los datos de "${previewEditData.name}" se guardaron correctamente.` });

                        // Sync with Supabase if enabled
                        if (isSupabaseConfigured) {
                          upsertPlayerInSupabase(previewEditData)
                            .then((finalPhotoUrl) => {
                              if (finalPhotoUrl && finalPhotoUrl !== previewEditData.photoUrl) {
                                const finalPlayer = { ...previewEditData, photoUrl: finalPhotoUrl };
                                setPlayers((prev) =>
                                  prev.map((p) => (p.id === previewEditData.id ? finalPlayer : p))
                                );
                                setSelectedPlayer(finalPlayer);
                                setShowPlayerPreviewModal(finalPlayer);
                              }
                            })
                            .catch((err: any) => {
                              console.error("Failed to sync from preview edit:", err);
                            });
                        }

                        setIsPreviewEditing(false);
                        setPreviewEditData(null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow font-bold px-4 py-2 rounded-lg transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Guardar
                    </button>
                  </>
                ) : (
                  /* VIEWING MODE FOOTER BUTTONS */
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewEditData({ ...showPlayerPreviewModal });
                        setIsPreviewEditing(true);
                      }}
                      className="text-xs text-stone-700 bg-stone-100 hover:bg-stone-200 font-bold px-4 py-2 rounded-lg border border-stone-300 transition-colors uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                      title="Editar ficha de este jugador"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlayerPreviewModal(null);
                        setIsPreviewEditing(false);
                        setPreviewEditData(null);
                      }}
                      className="text-xs text-stone-550 text-stone-600 hover:text-stone-855 hover:bg-stone-100 font-bold px-4 py-2 rounded-lg border border-stone-250 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        generatePDF();
                      }}
                      disabled={isGeneratingPdf || players.length === 0}
                      className="bg-[#D91E1E] hover:bg-[#b01616] text-white shadow-md font-bold px-4 py-2 rounded-lg transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
                      title="Exportar informe de plantilla completo"
                    >
                      <Download className="w-4 h-4" />
                      {isGeneratingPdf ? "Imprimiendo..." : "Exportar PDF"}
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* GLOBAL MATCH PHOTOS MODAL */}
      <MatchPhotosModal
        player={matchPhotosModalPlayerId ? players.find((p) => p.id === matchPhotosModalPlayerId) || null : null}
        isOpen={Boolean(matchPhotosModalPlayerId)}
        onClose={() => setMatchPhotosModalPlayerId(null)}
        onUpdatePlayerPhotos={handleUpdatePlayerMatchPhotos}
        onSetAsProfilePhoto={handleSetPlayerProfilePhoto}
      />

    </div>
  );
}
