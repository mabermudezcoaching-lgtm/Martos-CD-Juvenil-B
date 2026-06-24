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

export interface Player {
  id: string;
  name: string;
  position: PlayerPosition;
  age: number | string;
  positives: string; // Aspectos positivos
  negatives: string; // Aspectos negativos
  status: PlayerStatus;
  number?: string; // Dorsal (opcional)
  photoUrl?: string; // URL o Base64 de la foto (opcional)
  lateralidad?: "Derecho" | "Izquierdo" | "Ambidiestro" | string; // Lateralidad (Zurdos/Diestros/Ambidiestros)
}

export type LineupFormation = "4-4-2" | "4-3-3" | "3-5-2";
