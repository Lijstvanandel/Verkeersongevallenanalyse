import React, { useMemo } from 'react';
import {
  TrafficAccident,
  AccidentFilterState,
  VULNERABLE_PARTIES,
} from '../types/ongevallen';
import { SchoolZone } from '../types/schoolzones';
import { X, Download, RefreshCw, BarChart3, GraduationCap } from 'lucide-react';

interface OngevallenDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  allAccidents: TrafficAccident[];
  filteredAccidents: TrafficAccident[];
  filters: AccidentFilterState;
  onSelectYearRange: (minYear: number, maxYear: number) => void;
  onExportCSV: () => void;
  onSyncLive: () => void;
  isSyncing: boolean;
  schoolzones?: SchoolZone[];
}

const ALL_YEARS = Array.from({ length: 23 }, (_, i) => 2003 + i);

export const OngevallenDashboard: React.FC<OngevallenDashboardProps> = ({
  isOpen,
  onClose,
  allAccidents,
  filteredAccidents,
  filters,
  onSelectYearRange,
  onExportCSV,
  onSyncLive,
  isSyncing,
  schoolzones = [],
}) => {
  const stats = useMemo(() => {
    let dodelijk = 0;
    let letsel = 0;
    let ums = 0;
    let vulnerableInvolved = 0;
    let totalParties = 0;

    const byYear: Record<
      number,
      { total: number; dodelijk: number; letsel: number; ums: number }
    > = {};
    for (const y of ALL_YEARS) {
      byYear[y] = { total: 0, dodelijk: 0, letsel: 0, ums: 0 };
    }

    const partyMap = new Map<string, number>();
    const kernMap = new Map<
      string,
      { total: number; dodelijk: number; letsel: number; ums: number }
    >();
    const aardMap = new Map<string, number>();

    for (const acc of filteredAccidents) {
      totalParties += acc.aantalPartijen || acc.partijen.length;

      if (acc.ernst === 'Dodelijk') dodelijk++;
      else if (acc.ernst === 'Letsel') letsel++;
      else ums++;

      if (byYear[acc.jaar]) {
        byYear[acc.jaar].total++;
        if (acc.ernst === 'Dodelijk') byYear[acc.jaar].dodelijk++;
        else if (acc.ernst === 'Letsel') byYear[acc.jaar].letsel++;
        else byYear[acc.jaar].ums++;
      }

      if (acc.partijen.some((p) => VULNERABLE_PARTIES.has(p.oteId))) {
        vulnerableInvolved++;
      }

      for (const p of acc.partijen) {
        if (p.oteId) {
          partyMap.set(p.oteId, (partyMap.get(p.oteId) || 0) + 1);
        }
      }

      if (acc.kern) {
        const k = kernMap.get(acc.kern) || {
          total: 0,
          dodelijk: 0,
          letsel: 0,
          ums: 0,
        };
        k.total++;
        if (acc.ernst === 'Dodelijk') k.dodelijk++;
        else if (acc.ernst === 'Letsel') k.letsel++;
        else k.ums++;
        kernMap.set(acc.kern, k);
      }

      if (acc.aardOngeval) {
        aardMap.set(acc.aardOngeval, (aardMap.get(acc.aardOngeval) || 0) + 1);
      }
    }

    const maxYearTotal = Math.max(
      1,
      ...Object.values(byYear).map((v) => v.total)
    );

    const topParties = Array.from(partyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    const topKernen = Array.from(kernMap.entries())
      .map(([kern, data]) => ({ kern, ...data }))
      .sort((a, b) => b.total - a.total);

    const topAard = Array.from(aardMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      dodelijk,
      letsel,
      ums,
      vulnerableInvolved,
      totalParties,
      byYear,
      maxYearTotal,
      topParties,
      topKernen,
      topAard,
    };
  }, [filteredAccidents]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[850] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6">
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[8px] max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[var(--text-main)] select-none">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-[var(--accent-gold)]" />
            <div>
              <h2 className="font-display text-base md:text-lg font-bold text-[var(--text-main)]">
                Statistieken &amp; Meerjarige Analyse Verkeersongevallen Steenwijkerland
              </h2>
              <p className="text-xs text-[var(--text-muted)] tabular-nums">
                Periode {filters.minYear} t/m {filters.maxYear} ·{' '}
                {filteredAccidents.length.toLocaleString('nl-NL')} geselecteerde ongevallen (van{' '}
                {allAccidents.length.toLocaleString('nl-NL')} totaal binnen gemeentegrens)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onSyncLive}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-[5px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[var(--accent-gold)] ${
                  isSyncing ? 'animate-spin' : ''
                }`}
              />
              <span>Sync BRON</span>
            </button>

            <button
              type="button"
              onClick={onExportCSV}
              className="px-4 py-2 rounded-[5px] bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-bright)] text-[#060e0a] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporteer Selectie (.CSV)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-[5px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
              aria-label="Sluiten"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* 1. 6-Column KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 tabular-nums">
            <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[6px] p-4">
              <div className="text-[11px] text-[var(--text-muted)]">
                Geregistreerde Ongevallen
              </div>
              <div className="font-mono text-2xl font-bold text-[var(--text-main)] mt-1">
                {filteredAccidents.length.toLocaleString('nl-NL')}
              </div>
              <div className="text-[11px] text-[var(--text-dim)] mt-1">
                {stats.totalParties.toLocaleString('nl-NL')} betrokken partijen
              </div>
            </div>

            <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[6px] p-4">
              <div className="text-[11px] text-[var(--text-muted)]">
                Dodelijke Ongevallen
              </div>
              <div className="font-mono text-2xl font-bold text-[#ef4444] mt-1">
                {stats.dodelijk.toLocaleString('nl-NL')}
              </div>
              <div className="text-[11px] text-[var(--text-dim)] mt-1">
                {filteredAccidents.length > 0
                  ? ((stats.dodelijk / filteredAccidents.length) * 100).toFixed(1)
                  : '0.0'}
                % van selectie
              </div>
            </div>

            <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[6px] p-4">
              <div className="text-[11px] text-[var(--text-muted)]">
                Letselongevallen
              </div>
              <div className="font-mono text-2xl font-bold text-[#f59e0b] mt-1">
                {stats.letsel.toLocaleString('nl-NL')}
              </div>
              <div className="text-[11px] text-[var(--text-dim)] mt-1">
                {filteredAccidents.length > 0
                  ? ((stats.letsel / filteredAccidents.length) * 100).toFixed(1)
                  : '0.0'}
                % van selectie
              </div>
            </div>

            <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[6px] p-4">
              <div className="text-[11px] text-[var(--text-muted)]">
                Materiële Schade (UMS)
              </div>
              <div className="font-mono text-2xl font-bold text-[#fef08a] mt-1">
                {stats.ums.toLocaleString('nl-NL')}
              </div>
              <div className="text-[11px] text-[var(--text-dim)] mt-1">
                {filteredAccidents.length > 0
                  ? ((stats.ums / filteredAccidents.length) * 100).toFixed(1)
                  : '0.0'}
                % van selectie
              </div>
            </div>

            <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[6px] p-4">
              <div className="text-[11px] text-[var(--text-muted)]">
                Kwetsbare Deelnemers
              </div>
              <div className="font-mono text-2xl font-bold text-[#38bdf8] mt-1">
                {stats.vulnerableInvolved.toLocaleString('nl-NL')}
              </div>
              <div className="text-[11px] text-[var(--text-dim)] mt-1">
                Fiets, e-bike, voetganger
              </div>
            </div>

            <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[6px] p-4">
              <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                <span>NDW Schoolzones</span>
              </div>
              <div className="font-mono text-2xl font-bold text-cyan-400 mt-1">
                {schoolzones.length}
              </div>
              <div className="text-[11px] text-[var(--text-dim)] mt-1">
                {schoolzones.filter((s) => s.isActieveSchoolzone).length} met markering/zone
              </div>
            </div>
          </div>

          {/* 2. Annual Trend Chart (2003 - 2025) */}
          <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[6px] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-display text-sm font-bold text-[var(--text-main)]">
                  Jaarlijkse Ongevallentrend Gemeente Steenwijkerland (2003–2025)
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Klik op een jaartal-kolom om de kaart direct op dat betreffende jaar te filteren
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e60000]" />
                  <span>Dodelijk</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffaa00]" />
                  <span>Letsel</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#599dd4]" />
                  <span>Materieel (UMS)</span>
                </span>
              </div>
            </div>

            <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 px-2 border-b border-[var(--border-subtle)]">
              {ALL_YEARS.map((year) => {
                const d = stats.byYear[year];
                const totalHeightPct = Math.max(
                  2,
                  Math.round((d.total / stats.maxYearTotal) * 100)
                );
                const isSelectedYear =
                  year >= filters.minYear && year <= filters.maxYear;

                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      onSelectYearRange(year, year);
                      onClose();
                    }}
                    title={`${year}: ${d.total} ongevallen (${d.dodelijk} dodelijk, ${d.letsel} letsel, ${d.ums} UMS)`}
                    className={`flex-1 h-full flex flex-col justify-end items-center group cursor-pointer ${
                      isSelectedYear ? 'opacity-100' : 'opacity-35 hover:opacity-75'
                    }`}
                  >
                    <span className="text-[9px] font-mono text-[var(--text-muted)] mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.total}
                    </span>
                    <div
                      style={{ height: `${totalHeightPct}%` }}
                      className="w-full rounded-t-[3px] overflow-hidden flex flex-col justify-end bg-[#599dd4] group-hover:ring-1 group-hover:ring-[var(--accent-gold-bright)]"
                    >
                      {d.dodelijk > 0 && (
                        <div
                          style={{
                            height: `${Math.max(8, (d.dodelijk / d.total) * 100)}%`,
                          }}
                          className="w-full bg-[#e60000]"
                        />
                      )}
                      {d.letsel > 0 && (
                        <div
                          style={{
                            height: `${Math.max(10, (d.letsel / d.total) * 100)}%`,
                          }}
                          className="w-full bg-[#ffaa00]"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between gap-1 pt-2 px-2">
              {ALL_YEARS.map((year) => (
                <div
                  key={year}
                  className="flex-1 text-center font-mono text-[10px] text-[var(--text-muted)]"
                >
                  &apos;{String(year).slice(2)}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Three-Column Breakdown Tables: Kernen | Betrokken Partijen (OTE_ID) | Aard Ongeval (AOL_ID) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Table A: Ongevallen per Kern in Steenwijkerland */}
            <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[6px] p-4 flex flex-col">
              <h3 className="font-display text-xs font-bold text-[var(--accent-gold-bright)] mb-3">
                Verdeling per Kern in Steenwijkerland
              </h3>
              <div className="overflow-y-auto max-h-72">
                <table className="w-full text-left border-collapse tabular-nums">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
                      <th className="py-1.5 font-medium">Kern</th>
                      <th className="py-1.5 font-medium text-right">Dodelijk</th>
                      <th className="py-1.5 font-medium text-right">Letsel</th>
                      <th className="py-1.5 font-medium text-right">Totaal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                    {stats.topKernen.map((row) => (
                      <tr
                        key={row.kern}
                        className="hover:bg-[var(--bg-card-hover)] transition-colors"
                      >
                        <td className="py-2 font-medium text-[var(--text-main)]">
                          {row.kern}
                        </td>
                        <td className="py-2 font-mono text-right text-[#ef4444]">
                          {row.dodelijk}
                        </td>
                        <td className="py-2 font-mono text-right text-[#f59e0b]">
                          {row.letsel}
                        </td>
                        <td className="py-2 font-mono font-bold text-right text-[var(--text-main)]">
                          {row.total.toLocaleString('nl-NL')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table B: Betrokken Partijen (Tabel 2: OTE_ID) */}
            <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[6px] p-4 flex flex-col">
              <h3 className="font-display text-xs font-bold text-[var(--accent-gold-bright)] mb-3">
                Betrokken Partijen (Tabel Partijen · OTE_ID)
              </h3>
              <div className="overflow-y-auto max-h-72 space-y-2">
                {stats.topParties.map(([oteId, count]) => {
                  const maxP = stats.topParties[0]?.[1] || 1;
                  const widthPct = Math.max(4, Math.round((count / maxP) * 100));
                  return (
                    <div key={oteId} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-main)]">
                          {oteId}
                        </span>
                        <span className="font-mono font-bold text-[var(--text-muted)]">
                          {count.toLocaleString('nl-NL')}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--bg-card)] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className="h-full bg-[var(--accent-gold)] rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table C: Aard van het Ongeval (AOL_ID) */}
            <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[6px] p-4 flex flex-col">
              <h3 className="font-display text-xs font-bold text-[var(--accent-gold-bright)] mb-3">
                Aard van het Ongeval (AOL_ID)
              </h3>
              <div className="overflow-y-auto max-h-72 space-y-2">
                {stats.topAard.map(([aard, count]) => {
                  const maxA = stats.topAard[0]?.[1] || 1;
                  const widthPct = Math.max(4, Math.round((count / maxA) * 100));
                  return (
                    <div key={aard} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-main)]">
                          {aard}
                        </span>
                        <span className="font-mono font-bold text-[var(--text-muted)]">
                          {count.toLocaleString('nl-NL')}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--bg-card)] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className="h-full bg-[#38bdf8] rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
