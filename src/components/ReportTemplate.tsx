/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Player, PlayerPosition, PlayerStatus, StaffMember } from "../types";
import { Shield, Sparkles, AlertCircle, FileText, CheckCircle2, XCircle, Users } from "lucide-react";

interface ReportTemplateProps {
  players: Player[];
  reportTitle: string;
  reportNotes: string;
  teamLogo?: string;
  staff?: StaffMember[];
}

export const ReportTemplate = React.forwardRef<HTMLDivElement, ReportTemplateProps>(
  ({ players, reportTitle, reportNotes, teamLogo, staff }, ref) => {
    const selectedPlayers = players.filter((p) => p.status === PlayerStatus.SELECTED);
    const discardedPlayers = players.filter((p) => p.status === PlayerStatus.DISCARDED);
    const pendingPlayers = players.filter((p) => p.status === PlayerStatus.PENDING);

    const getPositionBadgeColor = (pos: PlayerPosition) => {
      switch (pos) {
        case PlayerPosition.PORTERO:
          return "bg-amber-100 text-amber-800 border-amber-200";
        case PlayerPosition.LATERAL:
          return "bg-cyan-100 text-cyan-800 border-cyan-200";
        case PlayerPosition.DEFENSA:
          return "bg-blue-100 text-blue-800 border-blue-200";
        case PlayerPosition.CENTROCAMPISTA:
          return "bg-green-100 text-green-800 border-green-200";
        case PlayerPosition.EXTREMO:
          return "bg-orange-100 text-orange-850 text-orange-800 border-orange-200";
        case PlayerPosition.DELANTERO:
          return "bg-red-100 text-red-700 border-red-200";
        default:
          return "bg-slate-100 text-slate-800 border-slate-200";
      }
    };

    return (
      <div
        ref={ref}
        id="pdf-report-content"
        className="w-full bg-white p-8 border border-slate-200 rounded-xl font-sans text-slate-800 mx-auto max-w-[800px] shadow-sm leading-relaxed"
      >
        <style dangerouslySetInnerHTML={{ __html: `
          #pdf-report-content {
            /* Prevent oklch parser error in html2canvas by overriding variables with hex values */
            --color-slate-50: #f8fafc !important;
            --color-slate-100: #f1f5f9 !important;
            --color-slate-150: #eef2f6 !important;
            --color-slate-200: #e2e8f0 !important;
            --color-slate-250: #cbd5e1 !important;
            --color-slate-400: #94a3b8 !important;
            --color-slate-500: #64748b !important;
            --color-slate-600: #475569 !important;
            --color-slate-700: #334155 !important;
            --color-slate-800: #1e293b !important;
            --color-slate-900: #0f172a !important;

            --color-red-50: #fef2f2 !important;
            --color-red-100: #fee2e2 !important;
            --color-red-200: #fecaca !important;
            --color-red-500: #ef4444 !important;
            --color-red-600: #dc2626 !important;
            --color-red-650: #dc2626 !important;
            --color-red-750: #991b1b !important;
            --color-red-700: #b91c1c !important;
            --color-red-800: #991b1b !important;
            --color-red-850: #7f1d1d !important;

            --color-amber-50: #fffbeb !important;
            --color-amber-100: #fef3c7 !important;
            --color-amber-200: #fde68a !important;
            --color-amber-400: #fbbf24 !important;
            --color-amber-500: #f59e0b !important;
            --color-amber-600: #d97706 !important;
            --color-amber-700: #b45309 !important;
            --color-amber-800: #92400e !important;

            --color-blue-50: #eff6ff !important;
            --color-blue-100: #dbeafe !important;
            --color-blue-200: #bfdbfe !important;
            --color-blue-500: #3b82f6 !important;
            --color-blue-600: #2563eb !important;
            --color-blue-700: #1d4ed8 !important;
            --color-blue-800: #1e40af !important;

            --color-green-50: #f0fdf4 !important;
            --color-green-100: #dcfce7 !important;
            --color-green-200: #bbf7d0 !important;
            --color-green-500: #22c55e !important;
            --color-green-600: #16a34a !important;
            --color-green-700: #15803d !important;
            --color-green-800: #166534 !important;

            --color-emerald-50: #ecfdf5 !important;
            --color-emerald-100: #d1fae5 !important;
            --color-emerald-200: #a7f3d0 !important;
            --color-emerald-300: #6ee7b7 !important;
            --color-emerald-400: #34d399 !important;
            --color-emerald-500: #10b981 !important;
            --color-emerald-800: #065f46 !important;

            --color-rose-50: #fff1f2 !important;
            --color-rose-100: #ffe4e6 !important;
            --color-rose-200: #fecdd3 !important;
            --color-rose-300: #fda4af !important;
            --color-rose-500: #f43f5e !important;
            --color-rose-600: #e11d48 !important;
            --color-rose-700: #be123c !important;
            --color-rose-800: #9f1239 !important;
          }
        ` }} />
        {/* REPORT HEADER */}
        <div className="flex items-center justify-between border-b-4 border-red-600 pb-5 mb-6">
          <div className="flex items-center gap-4">
            {/* Visual Club Shield Logo – Dynamic with fallback */}
            {teamLogo ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-red-600 shadow shrink-0 bg-white flex items-center justify-center p-1">
                <img src={teamLogo} alt="Escudo de equipo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg bg-red-600 text-white flex flex-col items-center justify-center font-black relative overflow-hidden shadow shrink-0 border-2 border-red-700">
                <span className="text-[10px] leading-3 tracking-widest uppercase opacity-80 font-mono">CLUB</span>
                <Shield className="w-8 h-8 text-white -mt-0.5" />
                <div className="absolute bottom-0 w-full h-1.5 bg-white flex">
                  <div className="w-1/3 h-full bg-red-600"></div>
                  <div className="w-1/3 h-full bg-white"></div>
                  <div className="w-1/3 h-full bg-red-600"></div>
                </div>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-red-600 italic tracking-tight m-0 font-display uppercase">
                {reportTitle}
              </h1>
              <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                Informe Técnico - Confección de plantilla
              </p>
              <p className="text-[10px] text-slate-400">
                Fecha de generación: {new Date().toLocaleDateString("es-ES")} • Local: Jaén, España
              </p>
            </div>
          </div>
          <div className="text-right border-l pl-4 border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 font-display">Scouting Oficial</h3>
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-705 text-slate-700 ring-1 ring-inset ring-slate-600/10">
              Temporada 2026/2027
            </span>
          </div>
        </div>

        {/* METADATA SUMMARY */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-3 rounded-lg border border-slate-200 text-center shadow-sm w-full">
            <span className="block text-xs uppercase text-slate-550 text-slate-500 font-bold">Total Evaluados</span>
            <span className="text-2xl font-black text-slate-900">{players.length}</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-red-200 text-center shadow-sm w-full">
            <span className="block text-xs uppercase text-red-600 font-bold">Entran en plantilla</span>
            <span className="text-2xl font-black text-red-750">{selectedPlayers.length}</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200 text-center shadow-sm w-full">
            <span className="block text-xs uppercase text-slate-700 text-slate-600 font-bold">Descartados</span>
            <span className="text-2xl font-black text-slate-800">{discardedPlayers.length}</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200 text-center shadow-sm w-full">
            <span className="block text-xs uppercase text-slate-700 text-slate-600 font-bold">En Evaluación</span>
            <span className="text-2xl font-black text-slate-700">{pendingPlayers.length}</span>
          </div>
        </div>

        {/* CUSTOM NOTES */}
        {reportNotes.trim() !== "" && (
          <div className="mb-6 p-4 bg-white border border-slate-200 border-l-4 border-l-red-500 rounded-lg shadow-sm">
            <h4 className="text-xs uppercase font-extrabold text-red-700 mb-1 flex items-center gap-1 font-display">
              <FileText className="w-3.5 h-3.5" />
              Observaciones del Cuerpo Técnico
            </h4>
            <p className="text-xs text-slate-700 italic">{reportNotes}</p>
          </div>
        )}

        {/* ACCEPTEED SQUAD SECTION */}
        <div className="mb-6">
          <h2 className="text-sm font-black text-red-700 uppercase tracking-tight flex items-center gap-2 mb-4 border-b-2 pb-1 border-red-200">
            <CheckCircle2 className="w-4 h-4 text-red-600" />
            JUGADORES SELECCIONADOS ({selectedPlayers.length})
          </h2>

          {selectedPlayers.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-3 bg-slate-50 border rounded-lg">No hay jugadores seleccionados para entrar en plantilla.</p>
          ) : (
            <div className="space-y-4">
              {selectedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="p-4 border border-slate-200 rounded-xl bg-white space-y-3 shadow-sm hover:border-red-300 transition-all [page-break-inside:avoid] break-inside-avoid"
                >
                  {/* Ficha Header Row */}
                  <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      {/* Photo frame */}
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-white shrink-0">
                        {player.photoUrl ? (
                          <img
                            src={player.photoUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <span className="text-xs font-black text-red-600 uppercase">
                            {player.name ? player.name.charAt(0).toUpperCase() : "J"}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="block font-extrabold text-slate-900 text-sm">
                          {player.name}
                        </span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                          <span>{player.age} años</span>
                          <span>•</span>
                          <span>Lat: {player.lateralidad || "Derecho"}</span>
                          <span>•</span>
                          {player.number ? (
                            <span className="text-red-750 text-red-650 font-extrabold">Dorsal {player.number}</span>
                          ) : (
                            <span>Sin Dorsal</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded border ${getPositionBadgeColor(
                        player.position
                      )}`}
                    >
                      {player.position}
                    </span>
                  </div>

                  {/* Aspects Grid (Left: Positives, Right: Negatives) */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Positivos */}
                    <div className="bg-white p-3 rounded-lg border border-emerald-200 flex flex-col justify-between min-h-[90px]">
                      <div>
                        <span className="block text-[9px] font-black text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                          💚 ASPECTOS POSITIVOS
                        </span>
                        <p className="text-slate-700 text-[11px] leading-relaxed italic font-medium">
                          {player.positives.trim() || "Sin registrar aspectos positivos."}
                        </p>
                      </div>
                      {/* Dotted lines for handwritten additions */}
                      <div className="mt-2.5 pt-2 border-t border-dashed border-emerald-200/50 space-y-1.5 opacity-50 select-none">
                        <div className="border-b border-dotted border-emerald-400 h-3"></div>
                        <div className="border-b border-dotted border-emerald-400 h-3"></div>
                      </div>
                    </div>

                    {/* Negativos */}
                    <div className="bg-white p-3 rounded-lg border border-rose-200 flex flex-col justify-between min-h-[90px]">
                      <div>
                        <span className="block text-[9px] font-black text-rose-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                          ⚠️ ASPECTOS NEGATIVOS
                        </span>
                        <p className="text-slate-700 text-[11px] leading-relaxed italic font-medium">
                          {player.negatives.trim() || "Sin registrar aspectos negativos."}
                        </p>
                      </div>
                      {/* Dotted lines for handwritten additions */}
                      <div className="mt-2.5 pt-2 border-t border-dashed border-rose-200/50 space-y-1.5 opacity-50 select-none">
                        <div className="border-b border-dotted border-rose-300 h-3"></div>
                        <div className="border-b border-dotted border-rose-300 h-3"></div>
                      </div>
                    </div>
                  </div>

                  {/* Unified handwritten space for coaches */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="font-extrabold text-slate-500 uppercase tracking-wider">
                        📝 OBSERVACIONES DE CAMPO / NOTAS ADICIONALES
                      </span>
                      <span className="text-[8px] text-slate-400 uppercase italic">Espacio para escritura o modificaciones manuales</span>
                    </div>
                    <div className="space-y-1.5 pt-1 select-none">
                      <div className="border-b border-dotted border-slate-200 h-3.5"></div>
                      <div className="border-b border-dotted border-slate-200 h-3.5"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DISCARDED PLAYERS SECTION */}
        <div className="mb-6">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-tight flex items-center gap-2 mb-4 border-b-2 pb-1 border-slate-200">
            <XCircle className="w-4 h-4 text-slate-500" />
            JUGADORES DESCARTADOS ({discardedPlayers.length})
          </h2>

          {discardedPlayers.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-3 bg-white border border-slate-200 rounded-lg">No hay jugadores en la lista de descartes.</p>
          ) : (
            <div className="space-y-4">
              {discardedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="p-4 border border-slate-200 rounded-xl bg-white space-y-3 [page-break-inside:avoid] break-inside-avoid"
                >
                  {/* Ficha Header Row */}
                  <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      {/* Photo frame */}
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-250 shadow-sm flex items-center justify-center bg-white shrink-0">
                        {player.photoUrl ? (
                          <img
                            src={player.photoUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-500 uppercase">
                            {player.name ? player.name.charAt(0).toUpperCase() : "J"}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="block font-bold text-slate-800 text-sm">
                          {player.name}
                        </span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                          <span>{player.age} años</span>
                          <span>•</span>
                          <span>Lat: {player.lateralidad || "Derecho"}</span>
                          <span>•</span>
                          <span>Dorsal Descartado</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-[9px] uppercase font-bold px-2 py-0.5 border rounded bg-white text-slate-600 border-slate-250"
                    >
                      {player.position}
                    </span>
                  </div>

                  {/* Aspects Grid (Left: Positives, Right: Negatives) */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Positivos */}
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200 flex flex-col justify-between min-h-[80px]">
                      <div>
                        <span className="block text-[9px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">
                          Positivos
                        </span>
                        <p className="text-slate-600 text-[10px] leading-relaxed italic font-medium">
                          {player.positives.trim() || "-"}
                        </p>
                      </div>
                      <div className="mt-2 border-t border-dotted border-emerald-200/50 pt-1 select-none opacity-45">
                        <div className="border-b border-dotted border-emerald-300 h-2.5"></div>
                      </div>
                    </div>

                    {/* Negativos */}
                    <div className="bg-white p-2.5 rounded-lg border border-rose-200 flex flex-col justify-between min-h-[80px]">
                      <div>
                        <span className="block text-[9px] font-bold text-rose-800 uppercase tracking-wider mb-0.5">
                          Negativos
                        </span>
                        <p className="text-slate-600 text-[10px] leading-relaxed italic font-medium">
                          {player.negatives.trim() || "-"}
                        </p>
                      </div>
                      <div className="mt-2 border-t border-dotted border-rose-200/50 pt-1 select-none opacity-45">
                        <div className="border-b border-dotted border-rose-305 h-2.5"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PENDING PLAYERS SECTION */}
        {pendingPlayers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-black text-amber-700 uppercase tracking-tight flex items-center gap-1.5 mb-4 border-b-2 pb-1 border-amber-200 [page-break-inside:avoid] break-inside-avoid">
              🔴 JUGADORES PENDIENTES DE DECISIÓN ({pendingPlayers.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingPlayers.map((player) => (
                <div key={player.id} className="p-3 border border-amber-350 border-amber-300 rounded-xl bg-white space-y-2 [page-break-inside:avoid] break-inside-avoid">
                  <div className="flex justify-between items-center font-bold text-slate-800">
                    <span className="text-xs font-extrabold">{player.name}</span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border border-amber-200 bg-white text-amber-800">{player.position}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Edad: {player.age} años • Lateralidad: {player.lateralidad || "Derecho"} • Subcategoría Cadete/Juvenil</p>
                  
                  {/* Lined spaces specifically for notes on evaluation players */}
                  <div className="pt-2 border-t border-dashed border-amber-200/50">
                    <span className="block text-[8px] font-bold text-amber-800 uppercase tracking-wider mb-1">Criterios pendientes a examinar y notas manuales:</span>
                    <div className="space-y-1.5 select-none opacity-50">
                      <div className="border-b border-dotted border-amber-400 h-3"></div>
                      <div className="border-b border-dotted border-amber-400 h-3"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CUERPO TÉCNICO SECTION */}
        {staff && staff.length > 0 && (
          <div className="mb-6 [page-break-inside:avoid] break-inside-avoid">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5 mb-3 border-b-2 pb-1 border-slate-200">
              👥 CUERPO TÉCNICO & STAFF ({staff.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {staff.map((member) => (
                <div key={member.id} className="p-2.5 border border-slate-200 rounded-lg bg-slate-50/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="block font-bold text-xs text-slate-900">{member.name}</span>
                      <span className="text-[9px] font-bold text-red-700 uppercase tracking-wider block">{member.role}</span>
                      {member.license && (
                        <span className="text-[8.5px] text-slate-500 font-medium block">{member.license}</span>
                      )}
                    </div>
                  </div>
                  {member.responsibilities && (
                    <p className="text-[8.5px] text-slate-600 mt-1 italic line-clamp-2">
                      {member.responsibilities}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORT FOOTER */}
        <div className="mt-10 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
          <div>
            <span>Martos Club de Fútbol • Polideportivo Municipal de Martos</span>
          </div>
          <div>
            <span>Firma del Entrenador: ____________________________</span>
          </div>
        </div>
      </div>
    );
  }
);

ReportTemplate.displayName = "ReportTemplate";
