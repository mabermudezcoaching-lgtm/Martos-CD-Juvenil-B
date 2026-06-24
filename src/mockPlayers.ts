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
    lateralidad: "Derecho"
  },
  {
    id: "mcd-2",
    name: "Carlos Chamorro",
    position: PlayerPosition.DEFENSA,
    age: 16,
    positives: "Central rapidísimo al corte con físico imponente, letal en juego áereo ofensivo. Muy limpio en las entradas.",
    negatives: "Falta de paciencia en la salida de balón jugado desde atrás. A veces arriesga demasiado en pase horizontal.",
    status: PlayerStatus.SELECTED,
    number: "4",
    lateralidad: "Derecho"
  },
  {
    id: "mcd-3",
    name: "Mario Bermúdez",
    position: PlayerPosition.CENTROCAMPISTA,
    age: 17,
    positives: "Visión de juego privilegiada de tres cuartos en adelante. Gran capacidad para filtrar pases entre líneas y excelente balón parado.",
    negatives: "Suele tener lagunas de repliegue defensivo e intensidad en la presión alta. Necesita ganar músculo.",
    status: PlayerStatus.SELECTED,
    number: "8",
    lateralidad: "Derecho"
  },
  {
    id: "mcd-4",
    name: "José Manuel 'Chema'",
    position: PlayerPosition.DELANTERO,
    age: 17,
    positives: "Olfato goleador insaciable. Desmarques de ruptura constantes, excelente disparo raso cruzado con ambas piernas.",
    negatives: "Pierde concentración si no recibe balones limpios. Le falta asociarse más con el mediocampo.",
    status: PlayerStatus.SELECTED,
    number: "9",
    lateralidad: "Ambidiestro"
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
