/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, PlayerPosition, PlayerStatus } from "./types";

export const INITIAL_PLAYERS: Player[] = [
  {
    id: "mcd-1",
    name: "Alejandro Lorite",
    position: PlayerPosition.PORTERO,
    age: 17,
    positives: "Excelente comunicación y liderazgo de la línea defensiva. Reflejos espectaculares a bocajarro y blocaje muy seguro.",
    negatives: "Debe mejorar el juego de pies bajo presión física y pulir su salida aérea en los saques de esquina.",
    status: PlayerStatus.SELECTED,
    number: "1",
    lateralidad: "Derecho",
    matchPhotos: [
      {
        id: "photo-sample-1",
        url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
        caption: "Estirada salvadora en el min. 86 evitando el empate",
        matchName: "Jornada 4 vs Real Jaén",
        date: "2026-09-14"
      }
    ]
  },
  {
    id: "mcd-5",
    name: "Hugo Extremera",
    position: PlayerPosition.LATERAL,
    age: 16,
    positives: "Lateral izquierdo de largo recorrido, infatigable. Centros de mucha calidad al área rival en carrera.",
    negatives: "Sufre tácticamente a su espalda en transiciones rápidas de contraataque.",
    status: PlayerStatus.PENDING,
    number: "3",
    lateralidad: "Izquierdo"
  },
  {
    id: "mcd-6",
    name: "Francisco Aguilar",
    position: PlayerPosition.CENTROCAMPISTA,
    age: 17,
    positives: "Trabajo incansable, despliegue físico brutal recuperando balones como pivote defensivo.",
    negatives: "Imprecisión técnica en pases de media y larga distancia bajo presión.",
    status: PlayerStatus.DISCARDED,
    lateralidad: "Derecho"
  },
  {
    id: "mcd-7",
    name: "Ángel Padilla",
    position: PlayerPosition.EXTREMO,
    age: 16,
    positives: "Extremo diestro muy habilidoso en el uno contra uno, regate explosivo y velocidad punta.",
    negatives: "Excesivo individualismo. Tiende a retener el balón ignorando opciones de pase libres.",
    status: PlayerStatus.PENDING,
    number: "7",
    lateralidad: "Derecho"
  }
];
