import React from 'react';
import { SchoolZone } from '../types/schoolzones';
import { TrafficAccident } from '../types/ongevallen';
import { GraduationCap, Crosshair, X, ShieldCheck, ShieldAlert, MapPin, AlertTriangle } from 'lucide-react';

interface SchoolZoneDetailModalProps {
  schoolZone: SchoolZone | null;
  onClose: () => void;
  onCenterOnMap: (lat: number, lng: number) => void;
  nearbyAccidents: TrafficAccident[];
  onSelectAccident: (acc: TrafficAccident) => void;
}

export const SchoolZoneDetailModal: React.FC<SchoolZoneDetailModalProps> = ({
  schoolZone,
  onClose,
  onCenterOnMap,
  nearbyAccidents,
  onSelectAccident,
}) => {
  if (!schoolZone) return null;

  return (
    <aside
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute right-3 top-3 bottom-3 w-[calc(100%-24px)] sm:w-[390px] max-h-[88vh] sm:max-h-none z-[550] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[8px] shadow-2xl flex flex-col overflow-hidden select-none"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0e7490] to-[#0891b2] px-5 py-4 flex items-start justify-between gap-3 shrink-0 text-white">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[1.5px] uppercase text-cyan-100 font-semibold">
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span>NDW Schoolzone · Steenwijkerland</span>
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold text-white mt-1 leading-snug truncate">
            {schoolZone.schoolName}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-cyan-100/90 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{schoolZone.address}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onCenterOnMap(schoolZone.lat, schoolZone.lng)}
            className="p-1.5 rounded-[5px] bg-black/25 hover:bg-black/40 text-white transition-colors cursor-pointer"
            title="Centreer op kaart"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[5px] bg-black/25 hover:bg-black/40 text-white transition-colors cursor-pointer"
            title="Sluiten"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Stats Strip */}
      <div className="grid grid-cols-3 bg-[var(--bg-main)] border-b border-[var(--border-subtle)] shrink-0 tabular-nums text-center text-xs">
        <div className="py-2.5 px-2 border-r border-[var(--border-subtle)]">
          <div className="font-bold text-[var(--accent-gold)] capitalize truncate">
            {schoolZone.isActieveSchoolzone ? 'Actieve zone' : 'BAG Locatie'}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
            Status
          </div>
        </div>
        <div className="py-2.5 px-2 border-r border-[var(--border-subtle)]">
          <div className="font-mono font-bold text-[var(--text-main)] truncate">
            {schoolZone.zoneNummer && schoolZone.zoneNummer !== '0' ? `#${schoolZone.zoneNummer}` : 'N.v.t.'}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
            Zone ID
          </div>
        </div>
        <div className="py-2.5 px-2">
          <div className="font-mono font-bold text-[var(--text-main)]">
            {nearbyAccidents.length}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
            Ongevallen &lt;250m
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Section 1: Wegkenmerken & Zone Indicatie */}
        <div>
          <h3 className="font-display text-xs font-bold text-[var(--accent-gold-bright)] mb-2">
            Zone Specificaties (WKD NDW)
          </h3>
          <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[5px] divide-y divide-[var(--border-subtle)] px-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-[11px] text-[var(--text-muted)]">Aanduiding</span>
              <span className="text-xs font-bold text-[#06b6d4] capitalize">
                {schoolZone.aanduidingZone}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[11px] text-[var(--text-muted)]">Wegvak ID (WVK_ID)</span>
              <span className="font-mono text-xs font-semibold text-[var(--text-main)]">
                {schoolZone.wvkId}
              </span>
            </div>
            {schoolZone.tekstWeg && (
              <div className="flex items-center justify-between py-2">
                <span className="text-[11px] text-[var(--text-muted)]">Tekst op weg</span>
                <span className="text-xs font-semibold text-[var(--text-main)]">
                  {schoolZone.tekstWeg}
                </span>
              </div>
            )}
            {schoolZone.tekstBord && (
              <div className="flex items-center justify-between py-2">
                <span className="text-[11px] text-[var(--text-muted)]">Tekst op bord</span>
                <span className="text-xs font-semibold text-[var(--text-main)]">
                  {schoolZone.tekstBord}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-2">
              <span className="text-[11px] text-[var(--text-muted)]">Gemeente verificatie</span>
              <span className="flex items-center gap-1 font-semibold text-xs">
                {schoolZone.gevalideerdDoorGemeente ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Gevalideerd (JA)</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-400">Nog niet gevalideerd</span>
                  </>
                )}
              </span>
            </div>
            {schoolZone.brin6 && (
              <div className="flex items-center justify-between py-2">
                <span className="text-[11px] text-[var(--text-muted)]">BRIN6 Schoolcode</span>
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {schoolZone.brin6}
                </span>
              </div>
            )}
            {schoolZone.jaarLuchtfoto && (
              <div className="flex items-center justify-between py-2">
                <span className="text-[11px] text-[var(--text-muted)]">Jaar luchtfoto</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {schoolZone.jaarLuchtfoto}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Ongevallen in de directe omgeving */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-xs font-bold text-[var(--accent-gold-bright)] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Verkeersongevallen binnen 250m ({nearbyAccidents.length})</span>
            </h3>
          </div>

          {nearbyAccidents.length > 0 ? (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {nearbyAccidents.map((acc) => (
                <div
                  key={acc.vklNummer}
                  onClick={() => onSelectAccident(acc)}
                  className="bg-[var(--bg-main)] hover:bg-[#1a2e22] border border-[var(--border-subtle)] hover:border-[var(--accent-gold)] p-2.5 rounded-[5px] cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--text-main)]">
                      {acc.jaar} · {acc.kern}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] ${
                        acc.ernst === 'Dodelijk'
                          ? 'bg-[#e60000]/20 text-[#ff4d4d]'
                          : acc.ernst === 'Letsel'
                          ? 'bg-[#ffaa00]/20 text-[#ffb82e]'
                          : 'bg-[#ffffbe]/15 text-[#fef08a]'
                      }`}
                    >
                      {acc.ernst}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                    <span>{acc.aardOngeval || 'Ongeval'}</span>
                    <span className="font-mono text-[10px]">#{acc.vklNummer}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[5px] p-3 text-[11px] text-emerald-400/90 text-center">
              Geen geregistreerde ongevallen binnen 250m van deze schoollocatie.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-[var(--bg-main)] border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)] shrink-0">
        <span>Bron: NDW WKD Schoolzones (2024–2025)</span>
        <button
          type="button"
          onClick={() => onCenterOnMap(schoolZone.lat, schoolZone.lng)}
          className="text-[#06b6d4] hover:underline font-semibold cursor-pointer"
        >
          Zoom naar schoolzone
        </button>
      </div>
    </aside>
  );
};
