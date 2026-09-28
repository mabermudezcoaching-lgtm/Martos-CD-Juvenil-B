/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StaffMember, StaffRole } from "./types";

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: "staff-1",
    name: "M. A. Bermúdez",
    role: StaffRole.PRIMER_ENTRENADOR,
    license: "UEFA Pro",
    phone: "+34 600 123 456",
    email: "m.a.bermudezcoaching@gmail.com",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    responsibilities: "Dirección técnica, modelo de juego, planteamiento táctico de partidos y gestión del grupo.",
    notes: "Máxima exigencia en la presión tras pérdida y transiciones ofensivas ordenadas.",
    photos: [
      {
        id: "staff-photo-1",
        url: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=800&q=80",
        caption: "Sesión táctica: ajuste de basculaciones y presión en bloque medio",
        date: "2026-09-15",
        event: "Entrenamiento Táctico"
      },
      {
        id: "staff-photo-2",
        url: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=800&q=80",
        caption: "Instrucciones de pizarra en el túnel de vestuarios antes de salir al campo",
        date: "2026-09-20",
        event: "Charla Técnica"
      }
    ]
  },
  {
    id: "staff-2",
    name: "Javier Morales",
    role: StaffRole.SEGUNDO_ENTRENADOR,
    license: "UEFA A",
    phone: "+34 611 234 567",
    email: "j.morales@martoscd.es",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    responsibilities: "Estrategia a balón parado (córners y faltas), correcciones en directo y tareas de entrenamiento sectoriales.",
    notes: "Especialista en análisis de vídeo y scouting táctico del rival semanal."
  },
  {
    id: "staff-3",
    name: "Sergio Delgado",
    role: StaffRole.PREPARADOR_FISICO,
    license: "Grado CAFyD • Máster Rendimiento",
    phone: "+34 622 345 678",
    email: "s.delgado@martoscd.es",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    responsibilities: "Planificación de cargas físicas semanales, calentamientos pre-partido, fuerza y prevención de lesiones.",
    notes: "Seguimiento diario de RPE (esfuerzo percibido) y picos de fatiga muscular."
  },
  {
    id: "staff-4",
    name: "David Cabrera",
    role: StaffRole.ENTRENADOR_PORTEROS,
    license: "Especialista RFEF Porteros",
    phone: "+34 633 456 789",
    email: "d.cabrera@martoscd.es",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    responsibilities: "Entrenamiento específico de guardametas: blocajes, juego aéreo, coberturas y salida de balón con los pies.",
    notes: "Sesiones personalizadas de agilidad y lectura de penaltis."
  },
  {
    id: "staff-5",
    name: "Laura Martínez",
    role: StaffRole.FISIOTERAPEUTA,
    license: "Graduada Fisioterapia Deportiva",
    phone: "+34 644 567 890",
    email: "l.martinez@martoscd.es",
    photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    responsibilities: "Tratamiento fisioterápico, masajes de descarga, vendajes funcionales y readaptación de lesionados al grupo.",
    notes: "Comunicación médica constante con el cuerpo técnico tras cada sesión y partido."
  },
  {
    id: "staff-6",
    name: "Manuel Expósito",
    role: StaffRole.DELEGADO,
    license: "Delegado Federativo RFEF",
    phone: "+34 655 678 901",
    email: "m.exposito@martoscd.es",
    photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
    responsibilities: "Actas de partido, gestión de licencias federativas, contacto con árbitros y logística de vestuarios y desplazamientos.",
    notes: "Control de tarjetas amarillas y sanciones del comité de competición."
  }
];
