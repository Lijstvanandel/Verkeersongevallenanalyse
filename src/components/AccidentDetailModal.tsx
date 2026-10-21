import React, { useState } from 'react';
import {
  TrafficAccident,
  PARTY_ICON_URLS,
  getSeverityMeta,
} from '../types/ongevallen';
import { X, Crosshair, ShieldAlert } from 'lucide-react';

interface AccidentDetailModalProps {
  accident: TrafficAccident | null;
  onClose: () => void;
  onCenterOnMap: (lat: number, lng: number) => void;
}

const nz = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined) return 'n.v.t.';
  const s = String(val).trim();
  return s === '' ? 'n.v.t.' : s;
};

const PartyIconChip: React.FC<{ oteId: string; index: number }> = ({ oteId }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const url = PARTY_ICON_URLS[oteId] || '';

  return (
    <div className="flex flex-col items-center w-[76px] m-1">
      <div className="w-[52px] h-[52px] rounded-[10px] bg-[#f6f4ee] border border-[#e5e1d8] flex items-center justify-center overflow-hidden shadow-xs">
        {url && !imgFailed ? (
          <img
            src={url}
            alt={oteId}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-9 h-9 object-contain"
          />
        ) : (
          <ShieldAlert className="w-6 h-6 text-[#455460]" />
        )}
      </div>
      <span className="text-[10px] text-[var(--text-main)] font-medium text-center mt-1.5 leading-tight">
        {nz(oteId)}
      </span>
    </div>
  );
};

export const AccidentDetailModal: React.FC<AccidentDetailModalProps> = ({
  accident,
  onClose,
  onCenterOnMap,
}) => {
  if (!accident) return null;

  const meta = getSeverityMeta(accident.ernst);

  return (
    <aside className="absolute right-3 top-3 bottom-3 w-[calc(100%-24px)] sm:w-[390px] z-[550] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[8px] shadow-2xl flex flex-col overflow-hidden select-none">
      {/* Header — Exact ArcGIS Arcade Popup Gradient & Layout */}
      <div
        style={{ background: meta.headerGradient }}
        className="px-5 py-4 flex items-start justify-between gap-3 shrink-0"
      >
        <div>
          <div className="text-[10px] tracking-[1.5px] uppercase text-white/80 font-semibold">
            Verkeersongeval · {accident.kern}
          </div>
          <div className="font-mono text-xl font-bold text-white mt-0.5 tabular-nums">
            {nz(accident.vklNummer)}
          </div>
          <div className="text-xs text-white/90 mt-1 font-medium">
            {meta.label}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onCenterOnMap(accident.lat, accident.lng)}
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

      {/* Quick Stats Strip (Partijen | Jaar | Gemeente) */}
      <div className="grid grid-cols-3 bg-[var(--bg-main)] border-b border-[var(--border-subtle)] shrink-0 tabular-nums">
        <div className="py-2.5 px-2 text-center border-r border-[var(--border-subtle)]">
          <div className="font-mono text-base font-bold text-[var(--text-main)]">
            {nz(accident.aantalPartijen)}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            Partijen
          </div>
        </div>
        <div className="py-2.5 px-2 text-center border-r border-[var(--border-subtle)]">
          <div className="font-mono text-base font-bold text-[var(--accent-gold-bright)]">
            {nz(accident.jaar)}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            Jaar
          </div>
        </div>
        <div className="py-2.5 px-2 text-center">
          <div className="text-xs font-bold text-[var(--text-main)] truncate mt-0.5">
            {nz(accident.gmeNaam)}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            Gemeente
          </div>
        </div>
      </div>

      {/* Body — Scrollable BRON Attributes & Linked Partijen */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Section 1: Betrokken partijen (Icons + Detailed Table from Layer 2) */}
        <div>
          <h3 className="font-display text-xs font-bold text-[var(--accent-gold-bright)] mb-2">
            Betrokken partijen ({accident.partijen.length || accident.aantalPartijen})
          </h3>

          {accident.partijen.length > 0 ? (
            <>
              <div className="flex flex-wrap bg-[var(--bg-main)] p-2.5 rounded-[6px] border border-[var(--border-subtle)] mb-2.5">
                {accident.partijen.map((p, idx) => (
                  <PartyIconChip
                    key={`${p.nummer}-${idx}`}
                    oteId={p.oteId}
                    index={idx}
                  />
                ))}
              </div>

              <div className="space-y-1.5">
                {accident.partijen.map((p, idx) => (
                  <div
                    key={`${p.nummer}-detail-${idx}`}
                    className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[5px] p-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--text-main)]">
                        Partij {p.nummer}: {nz(p.oteId)}
                      </span>
                      {p.doorrijder === 'Ja' && (
                        <span className="text-[11px] font-semibold text-[#ef4444]">
                          Doorrijder
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)] pt-0.5">
                      {p.voorgenomenBeweging && (
                        <div>
                          Rijrichting:{' '}
                          <strong className="text-[var(--text-main)]">
                            {p.voorgenomenBeweging}
                          </strong>
                        </div>
                      )}
                      {p.beweging && (
                        <div>
                          Toedracht:{' '}
                          <strong className="text-[var(--text-main)]">{p.beweging}</strong>
                        </div>
                      )}
                      {p.uitgangspositie && (
                        <div>
                          Positie:{' '}
                          <strong className="text-[var(--text-main)]">
                            {p.uitgangspositie}
                          </strong>
                        </div>
                      )}
                      {(p.leeftijd || p.geslacht) && (
                        <div>
                          Persoon:{' '}
                          <strong className="text-[var(--text-main)]">
                            {[p.leeftijd, p.geslacht].filter(Boolean).join(' · ')}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[5px] p-3 text-[var(--text-muted)] text-[11px]">
              Geen afzonderlijke partij-records gekoppeld in BRON (geregistreerd aantal partijen:{' '}
              <strong className="text-[var(--text-main)] font-mono">
                {accident.aantalPartijen}
              </strong>
              ).
            </div>
          )}
        </div>

        {/* Section 2: Details */}
        <div>
          <h3 className="font-display text-xs font-bold text-[var(--accent-gold-bright)] mb-1.5">
            Details
          </h3>
          <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[5px] divide-y divide-[var(--border-subtle)] px-3">
            <DetailRow label="Registratienummer" value={nz(accident.regNummer)} mono />
            <DetailRow label="Aard van het ongeval" value={nz(accident.aardOngeval)} />
            <DetailRow label="Kern / Nabij" value={nz(accident.kern)} />
            <DetailRow label="Koppeling locatie" value={nz(accident.niveauKop)} />
            <DetailRow label="Wegvak ID (WVK_ID)" value={nz(accident.wvkId)} mono />
            {accident.jteId && (
              <DetailRow label="Junctie ID (JTE_ID)" value={nz(accident.jteId)} mono />
            )}
            {accident.hectometer && (
              <DetailRow label="Hectometerbord" value={nz(accident.hectometer)} mono />
            )}
          </div>
        </div>

        {/* Section 3: Wegomstandigheden */}
        <div>
          <h3 className="font-display text-xs font-bold text-[var(--accent-gold-bright)] mb-1.5">
            Wegomstandigheden
          </h3>
          <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[5px] divide-y divide-[var(--border-subtle)] px-3">
            <DetailRow label="Wegsituatie" value={nz(accident.wegsituatie)} />
            <DetailRow
              label="Maximumsnelheid"
              value={accident.maxSnelheid ? `${accident.maxSnelheid} km/h` : 'n.v.t.'}
              mono
            />
            <DetailRow label="Bebouwde kom" value={nz(accident.bebouwdeKom)} />
            <DetailRow label="Wegverlichting" value={nz(accident.wegverlichting)} />
            <DetailRow label="Wegverharding" value={nz(accident.wegverharding)} />
            <DetailRow label="Wegdek" value={nz(accident.wegdek)} />
            {accident.bijzonderheidInfra && (
              <DetailRow
                label="Bijzonderheid infra"
                value={nz(accident.bijzonderheidInfra)}
              />
            )}
          </div>
        </div>

        {/* Section 4: Weersomstandigheden */}
        <div>
          <h3 className="font-display text-xs font-bold text-[var(--accent-gold-bright)] mb-1.5">
            Weersomstandigheden
          </h3>
          <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[5px] divide-y divide-[var(--border-subtle)] px-3">
            <DetailRow label="Lichtgesteldheid" value={nz(accident.lichtgesteldheid)} />
            <DetailRow label="Weergesteldheid" value={nz(accident.weergesteldheid)} />
            <DetailRow
              label="Coördinaten (WGS84)"
              value={`${accident.lat.toFixed(5)}, ${accident.lng.toFixed(5)}`}
              mono
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-[var(--bg-main)] border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)] shrink-0">
        <span>Bron: BRON verkeersongevallenregistratie</span>
        <button
          type="button"
          onClick={() => onCenterOnMap(accident.lat, accident.lng)}
          className="text-[var(--accent-gold-bright)] hover:underline font-semibold cursor-pointer"
        >
          Zoom naar locatie
        </button>
      </div>
    </aside>
  );
};

const DetailRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono = false,
}) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
    <span
      className={`text-xs font-semibold text-[var(--text-main)] text-right max-w-[60%] break-words ${
        mono ? 'font-mono tabular-nums' : ''
      }`}
    >
      {value}
    </span>
  </div>
);
