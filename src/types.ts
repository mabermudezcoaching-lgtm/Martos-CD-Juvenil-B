/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum PlayerPosition {
  PORTERO = "Portero",
  DEFENSA = "Defensa",
  LATERAL = "Lateral",
  CENTROCAMPISTA = "Centrocampista",
  EXTREMO = "Extremo",
  DELANTERO = "Delantero"
}

export enum PlayerStatus {
  SELECTED = "selected",    // Entra en la plantilla
  DISCARDED = "discarded",  // Descartado
  PENDING = "pending"       // Pendiente / En evaluación
}

export interface MatchPhoto {
  id: string;
  url: string; // Base64 o URL de la foto de partido
  caption?: string; // Descripción de la jugada, acción o partido
  date?: string; // Fecha del partido o momento
  matchName?: string; // Nombre del partido o jornada
}

export interface Player {
  id: string;
  name: string;
  position: PlayerPosition;
  age: number | string;
  positives: string; // Aspectos positivos
  negatives: string; // Aspectos negativos
  status: PlayerStatus;
  number?: string; // Dorsal (opcional)
  photoUrl?: string; // URL o Base64 de la foto de perfil (opcional)
  lateralidad?: "Derecho" | "Izquierdo" | "Ambidiestro" | string; // Lateralidad (Zurdos/Diestros/Ambidiestros)
  matchPhotos?: MatchPhoto[]; // Fotos de partido del jugador
}

export type LineupFormation = "4-4-2" | "4-3-3" | "3-5-2";

export enum StaffRole {
  PRIMER_ENTRENADOR = "Primer Entrenador",
  SEGUNDO_ENTRENADOR = "Segundo Entrenador",
  PREPARADOR_FISICO = "Preparador Físico",
  ENTRENADOR_PORTEROS = "Entrenador de Porteros",
  ANALISTA_TACTICO = "Analista Táctico / Scout",
  FISIOTERAPEUTA = "Fisioterapeuta / Médico",
  DELEGADO = "Delegado de Equipo",
  UTILLERO = "Utillero / Material",
  OTRO = "Otro Cargo"
}

export interface StaffPhoto {
  id: string;
  url: string; // Base64 o URL
  caption?: string; // Título o descripción del momento
  date?: string; // Fecha (YYYY-MM-DD)
  event?: string; // Ej: "Entrenamiento", "Partido", "Pizarra Táctica", "Celebración"
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  license?: string; // e.g. "Licencia UEFA Pro", "UEFA A", "Grado CAFyD"
  phone?: string;
  email?: string;
  photoUrl?: string;
  responsibilities?: string; // Tareas principales o funciones asignadas
  notes?: string;
  photos?: StaffPhoto[]; // Fotos de entrenamientos, partidos o momentos del integrante
}
