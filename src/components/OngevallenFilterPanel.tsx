import React, { useMemo, useState } from 'react';
import {
  TrafficAccident,
  AccidentFilterState,
  INITIAL_FILTER_STATE,
  getSeverityMeta,
} from '../types/ongevallen';
import { STEENWIJKERLAND_KERNEN } from '../data/steenwijkerland';
import {
  Filter,
  RotateCcw,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  MapPin,
} from 'lucide-react';

interface OngevallenFilterPanelProps {
  allAccidents: TrafficAccident[];
  filteredAccidents: TrafficAccident[];
  filters: AccidentFilterState;
  onChangeFilters: (next: AccidentFilterState) => void;
  selectedAccident: TrafficAccident | null;
  onSelectAccident: (acc: TrafficAccident) => void;
  onFlyToKern: (lat: number, lng: number, zoom: number) => void;
  onSyncLive: () => void;
  isSyncing: boolean;
  onCloseMobile?: () => void;
}

const ALL_YEARS = Array.from({ length: 23 }, (_, i) => 2003 + i); // 2003..2025

export const OngevallenFilterPanel: React.FC<OngevallenFilterPanelProps> = ({
  allAccidents,
  filteredAccidents,
  filters,
  onChangeFilters,
  selectedAccident,
  onSelectAccident,
  onFlyToKern,
  onSyncLive,
  isSyncing,
  onCloseMobile,
}) => {
  const [activeTab, setActiveTab] = useState<'filters' | 'list'>('filters');
  const [showAdvancedRoadFilters, setShowAdvancedRoadFilters] = useState(false);
  const [visibleListCount, setVisibleListCount] = useState(60);

  // Histogram counts per year (2003..2025) across all accidents matching non-year filters
  const yearHistogram = useMemo(() => {
    const counts: Record<number, { total: number; dodelijk: number; letsel: number; ums: number }> =
      {};
    for (const y of ALL_YEARS) {
      counts[y] = { total: 0, dodelijk: 0, letsel: 0, ums: 0 };
    }
    for (const acc of allAccidents) {
      const bin = counts[acc.jaar];
      if (!bin) continue;
      bin.total++;
      if (acc.ernst === 'Dodelijk') bin.dodelijk++;
      else if (acc.ernst === 'Letsel') bin.letsel++;
      else bin.ums++;
    }
    const maxCount = Math.max(1, ...Object.values(counts).map((c) => c.total));
    const avgYear =
      allAccidents.length > 0
        ? allAccidents.reduce((s, a) => s + a.jaar, 0) / allAccidents.length
        : 2014;
    return { counts, maxCount, avgYear };
  }, [allAccidents]);

  // Distinct filter options derived from Steenwijkerland dataset
  const filterOptions = useMemo(() => {
    const partyCounts = new Map<string, number>();
    const aardCounts = new Map<string, number>();
    const wegsitCounts = new Map<string, number>();
    const snelheidSet = new Set<number>();
    const lichtCounts = new Map<string, number>();
    const weerCounts = new Map<string, number>();
    const kernCounts = new Map<string, number>();

    for (const acc of allAccidents) {
      if (acc.aardOngeval) {
        aardCounts.set(acc.aardOngeval, (aardCounts.get(acc.aardOngeval) || 0) + 1);
      }
      if (acc.wegsituatie) {
        wegsitCounts.set(acc.wegsituatie, (wegsitCounts.get(acc.wegsituatie) || 0) + 1);
      }
      if (acc.maxSnelheid) {
        snelheidSet.add(acc.maxSnelheid);
      }
      if (acc.lichtgesteldheid) {
        lichtCounts.set(acc.lichtgesteldheid, (lichtCounts.get(acc.lichtgesteldheid) || 0) + 1);
      }
      if (acc.weergesteldheid) {
        weerCounts.set(acc.weergesteldheid, (weerCounts.get(acc.weergesteldheid) || 0) + 1);
      }
      if (acc.kern) {
        kernCounts.set(acc.kern, (kernCounts.get(acc.kern) || 0) + 1);
      }
      const seenInAcc = new Set<string>();
      for (const p of acc.partijen) {
        if (p.oteId && !seenInAcc.has(p.oteId)) {
          seenInAcc.add(p.oteId);
          partyCounts.set(p.oteId, (partyCounts.get(p.oteId) || 0) + 1);
        }
      }
    }

    const sortMap = (m: Map<string, number>) =>
      Array.from(m.entries()).sort((a, b) => b[1] - a[1]);

    return {
      parties: sortMap(partyCounts),
      aardOngeval: sortMap(aardCounts),
      wegsituatie: sortMap(wegsitCounts),
      snelheden: Array.from(snelheidSet).sort((a, b) => a - b),
      licht: sortMap(lichtCounts),
      weer: sortMap(weerCounts),
      kernen: sortMap(kernCounts),
    };
  }, [allAccidents]);

  // Severity counts in current filtered set
  const severityCounts = useMemo(() => {
    let dodelijk = 0;
    let letsel = 0;
    let ums = 0;
    for (const a of filteredAccidents) {
      if (a.ernst === 'Dodelijk') dodelijk++;
      else if (a.ernst === 'Letsel') letsel++;
      else ums++;
    }
    return { dodelijk, letsel, ums };
  }, [filteredAccidents]);

  const toggleSeverity = (ernstValue: string) => {
    const exists = filters.severities.includes(ernstValue);
    const next = exists
      ? filters.severities.filter((s) => s !== ernstValue)
      : [...filters.severities, ernstValue];
    onChangeFilters({ ...filters, severities: next });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.minYear !== 2003 ||
      filters.maxYear !== 2025 ||
      filters.severities.length > 0 ||
      filters.partyType !== '' ||
      filters.aardOngeval !== '' ||
      filters.wegsituatie !== '' ||
      filters.bebouwdeKom !== '' ||
      filters.maxSnelheid !== '' ||
      filters.lichtgesteldheid !== '' ||
      filters.weergesteldheid !== '' ||
      filters.kern !== '' ||
      filters.searchQuery !== '' ||
      filters.onlyVulnerableParticipants
    );
  }, [filters]);

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-card)] text-[var(--text-main)] select-none overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 shrink-0">
        <div>
          <h2 className="font-display text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--accent-gold)]" />
            <span>Verkeersongevallen Filteren</span>
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums">
            <strong className="text-[var(--text-main)] font-mono">
              {filteredAccidents.length.toLocaleString('nl-NL')}
            </strong>{' '}
            van {allAccidents.length.toLocaleString('nl-NL')} ongevallen binnen gemeentegrens
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => onChangeFilters(INITIAL_FILTER_STATE)}
              className="px-2.5 py-1.5 rounded-[4px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] text-[var(--accent-gold-bright)] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              title="Alle filters wissen"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Wissen</span>
            </button>
          )}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
              aria-label="Sluiten"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs: Filters vs Lijstweergave */}
      <div className="px-4 pt-2.5 pb-2 border-b border-[var(--border-subtle)] shrink-0">
        <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--bg-main)] rounded-[5px] border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setActiveTab('filters')}
            className={`py-1.5 px-3 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'filters'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-main)] border border-[var(--border-focus)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Filters &amp; Histogram
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`py-1.5 px-3 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
              activeTab === 'list'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-main)] border border-[var(--border-focus)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Ongevallenlijst ({filteredAccidents.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Filters & Histogram */}
      {activeTab === 'filters' ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* 1. ArcGIS Style Year Histogram & Range Condition (2003 - 2025) */}
          <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[5px] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-xs text-[var(--text-main)]">
                Jaar van ongeval (2003–2025)
              </span>
              <span className="font-mono text-xs font-bold text-[var(--accent-gold-bright)]">
                {filters.minYear === filters.maxYear
                  ? `${filters.minYear}`
                  : `${filters.minYear} t/m ${filters.maxYear}`}
              </span>
            </div>

            {/* Quick Year Presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Alle jaren (2003–2025)', min: 2003, max: 2025 },
                { label: 'Alleen 2025', min: 2025, max: 2025 },
                { label: '2020–2025', min: 2020, max: 2025 },
                { label: '2015–2025', min: 2015, max: 2025 },
              ].map((preset) => {
                const isActive =
                  filters.minYear === preset.min && filters.maxYear === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      onChangeFilters({
                        ...filters,
                        minYear: preset.min,
                        maxYear: preset.max,
                      })
                    }
                    className={`px-2.5 py-1 rounded-[4px] text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[var(--accent-gold)] text-[#060e0a] font-bold'
                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Interactive SVG Histogram (inspired by ArcGIS Histogram Range Slider) */}
            <div className="pt-1">
              <div className="h-24 w-full flex items-end gap-[2px] pt-2 pb-1 px-1 bg-[#08130e] rounded-[4px] border border-[var(--border-subtle)] relative">
                {ALL_YEARS.map((year) => {
                  const data = yearHistogram.counts[year];
                  const heightPct = Math.max(
                    4,
                    Math.round((data.total / yearHistogram.maxCount) * 100)
                  );
                  const inRange = year >= filters.minYear && year <= filters.maxYear;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() =>
                        onChangeFilters({
                          ...filters,
                          minYear: year,
                          maxYear: year,
                        })
                      }
                      title={`${year}: ${data.total} ongevallen (${data.dodelijk} dodelijk, ${data.letsel} letsel, ${data.ums} materieel) — Klik om alleen ${year} te filteren`}
                      className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                    >
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-[2px] transition-opacity ${
                          inRange
                            ? 'bg-[#599dd4] group-hover:bg-[var(--accent-gold-bright)] opacity-100'
                            : 'bg-[#599dd4]/25 group-hover:bg-[#599dd4]/50'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-dim)] mt-1">
                <span>2003</span>
                <span>x̄ {yearHistogram.avgYear.toFixed(1)}</span>
                <span>2025</span>
              </div>
            </div>

            {/* Min / Max Year Selectors */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  Vanaf jaar:
                </label>
                <select
                  value={filters.minYear}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onChangeFilters({
                      ...filters,
                      minYear: val,
                      maxYear: Math.max(val, filters.maxYear),
                    });
                  }}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[var(--border-focus)] rounded-[4px] px-2.5 py-1.5 text-xs font-mono text-[var(--text-main)] outline-none"
                >
                  {ALL_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y} ({yearHistogram.counts[y]?.total || 0})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  Tot en met jaar:
                </label>
                <select
                  value={filters.maxYear}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onChangeFilters({
                      ...filters,
                      maxYear: val,
                      minYear: Math.min(val, filters.minYear),
                    });
                  }}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[var(--border-focus)] rounded-[4px] px-2.5 py-1.5 text-xs font-mono text-[var(--text-main)] outline-none"
                >
                  {ALL_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y} ({yearHistogram.counts[y]?.total || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Afloop / Ernst van het ongeval (AP3_CODE) */}
          <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[5px] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-xs text-[var(--text-main)]">
                Ernst / Afloop (AP3_CODE)
              </span>
              {filters.severities.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChangeFilters({ ...filters, severities: [] })}
                  className="text-[11px] text-[var(--accent-gold-bright)] hover:underline cursor-pointer"
                >
                  Toon alle
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {[
                {
                  code: 'Dodelijk',
                  label: 'Dodelijk ongeval',
                  count: severityCounts.dodelijk,
                  swatch: '#e60000',
                },
                {
                  code: 'Letsel',
                  label: 'Letsel (ziekenhuis / SEH)',
                  count: severityCounts.letsel,
                  swatch: '#ffaa00',
                },
                {
                  code: 'Uitsluitend materiele schade',
                  label: 'Uitsluitend materiële schade',
                  count: severityCounts.ums,
                  swatch: '#ffffbe',
                },
              ].map((item) => {
                const selected =
                  filters.severities.length === 0 ||
                  filters.severities.includes(item.code);
                const explicitlyActive = filters.severities.includes(item.code);

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => toggleSeverity(item.code)}
                    className={`w-full px-3 py-2 rounded-[4px] border flex items-center justify-between transition-colors cursor-pointer ${
                      explicitlyActive
                        ? 'bg-[var(--bg-elevated)] border-[var(--accent-gold)] text-[var(--text-main)]'
                        : selected
                        ? 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)]'
                        : 'bg-[var(--bg-card)]/40 border-transparent text-[var(--text-dim)] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-black/40"
                        style={{ backgroundColor: item.swatch }}
                      />
                      <span className="font-medium text-xs">{item.label}</span>
                    </div>
                    <span className="font-mono text-xs font-bold tabular-nums">
                      {item.count.toLocaleString('nl-NL')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Betrokken Partijen (Tabel 2: Partijen / OTE_ID) */}
          <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[5px] p-3.5 space-y-3">
            <span className="font-display font-bold text-xs text-[var(--text-main)] block">
              Betrokken Partijen &amp; Vervoersmiddel
            </span>

            <label className="flex items-center justify-between gap-2 p-2.5 rounded-[4px] bg-[var(--bg-card)] border border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors">
              <div>
                <div className="font-semibold text-xs text-[var(--text-main)]">
                  Alleen kwetsbare verkeersdeelnemers
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Fiets, e-bike, voetganger, brom-/snorfiets
                </div>
              </div>
              <input
                type="checkbox"
                checked={filters.onlyVulnerableParticipants}
                onChange={(e) =>
                  onChangeFilters({
                    ...filters,
                    onlyVulnerableParticipants: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-[#f59e0b] rounded-[3px] shrink-0"
              />
            </label>

            <div>
              <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                Specifiek objecttype / partij (OTE_ID):
              </label>
              <select
                value={filters.partyType}
                onChange={(e) =>
                  onChangeFilters({ ...filters, partyType: e.target.value })
                }
                className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[var(--border-focus)] rounded-[4px] px-2.5 py-2 text-xs text-[var(--text-main)] outline-none"
              >
                <option value="">Alle betrokken partijen</option>
                {filterOptions.parties.map(([ote, count]) => (
                  <option key={ote} value={ote}>
                    {ote} ({count.toLocaleString('nl-NL')} ongevallen)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Kern / Plaats in Gemeente Steenwijkerland */}
          <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[5px] p-3.5 space-y-2.5">
            <span className="font-display font-bold text-xs text-[var(--text-main)] block">
              Kern / Gebied in Steenwijkerland
            </span>
            <select
              value={filters.kern}
              onChange={(e) => {
                const kernName = e.target.value;
                onChangeFilters({ ...filters, kern: kernName });
                if (kernName) {
                  const found = STEENWIJKERLAND_KERNEN.find((k) => k.name === kernName);
                  if (found) {
                    onFlyToKern(found.lat, found.lng, found.zoom);
                  }
                }
              }}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[var(--border-focus)] rounded-[4px] px-2.5 py-2 text-xs text-[var(--text-main)] outline-none"
            >
              <option value="">Gehele Gemeente Steenwijkerland</option>
              {filterOptions.kernen.map(([kern, count]) => (
                <option key={kern} value={kern}>
                  {kern} ({count.toLocaleString('nl-NL')})
                </option>
              ))}
            </select>
          </div>

          {/* 5. Weg-, Toedracht- & Weersomstandigheden (Collapsible) */}
          <div className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[5px] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedRoadFilters(!showAdvancedRoadFilters)}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left font-display font-bold text-xs text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
            >
              <span>Aard ongeval, Wegsituatie &amp; Weer</span>
              {showAdvancedRoadFilters ? (
                <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </button>

            {showAdvancedRoadFilters && (
              <div className="p-3.5 pt-0 space-y-3 border-t border-[var(--border-subtle)]">
                <div className="pt-2.5">
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    Aard van het ongeval (AOL_ID):
                  </label>
                  <select
                    value={filters.aardOngeval}
                    onChange={(e) =>
                      onChangeFilters({ ...filters, aardOngeval: e.target.value })
                    }
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[4px] px-2.5 py-1.5 text-xs text-[var(--text-main)] outline-none"
                  >
                    <option value="">Alle typen aanrijdingen</option>
                    {filterOptions.aardOngeval.map(([aard, count]) => (
                      <option key={aard} value={aard}>
                        {aard} ({count})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    Wegsituatie (WSE_ID):
                  </label>
                  <select
                    value={filters.wegsituatie}
                    onChange={(e) =>
                      onChangeFilters({ ...filters, wegsituatie: e.target.value })
                    }
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[4px] px-2.5 py-1.5 text-xs text-[var(--text-main)] outline-none"
                  >
                    <option value="">Alle wegsituaties</option>
                    {filterOptions.wegsituatie.map(([wse, count]) => (
                      <option key={wse} value={wse}>
                        {wse} ({count})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      Bebouwde kom:
                    </label>
                    <select
                      value={filters.bebouwdeKom}
                      onChange={(e) =>
                        onChangeFilters({ ...filters, bebouwdeKom: e.target.value })
                      }
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[4px] px-2.5 py-1.5 text-xs text-[var(--text-main)] outline-none"
                    >
                      <option value="">Binnen &amp; Buiten</option>
                      <option value="Binnen">Binnen bebouwde kom</option>
                      <option value="Buiten">Buiten bebouwde kom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      Max. snelheid:
                    </label>
                    <select
                      value={filters.maxSnelheid}
                      onChange={(e) =>
                        onChangeFilters({ ...filters, maxSnelheid: e.target.value })
                      }
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[4px] px-2.5 py-1.5 text-xs font-mono text-[var(--text-main)] outline-none"
                    >
                      <option value="">Alle snelheden</option>
                      {filterOptions.snelheden.map((s) => (
                        <option key={s} value={String(s)}>
                          {s} km/u
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      Lichtgesteldheid:
                    </label>
                    <select
                      value={filters.lichtgesteldheid}
                      onChange={(e) =>
                        onChangeFilters({
                          ...filters,
                          lichtgesteldheid: e.target.value,
                        })
                      }
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[4px] px-2.5 py-1.5 text-xs text-[var(--text-main)] outline-none"
                    >
                      <option value="">Alle</option>
                      {filterOptions.licht.map(([l, cnt]) => (
                        <option key={l} value={l}>
                          {l} ({cnt})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      Weersgesteldheid:
                    </label>
                    <select
                      value={filters.weergesteldheid}
                      onChange={(e) =>
                        onChangeFilters({
                          ...filters,
                          weergesteldheid: e.target.value,
                        })
                      }
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[4px] px-2.5 py-1.5 text-xs text-[var(--text-main)] outline-none"
                    >
                      <option value="">Alle</option>
                      {filterOptions.weer.map(([w, cnt]) => (
                        <option key={w} value={w}>
                          {w} ({cnt})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6. Live BRON Sync Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onSyncLive}
              disabled={isSyncing}
              className="w-full py-2 px-3 rounded-[4px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-main)] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[var(--accent-gold)]' : 'text-[var(--accent-gold)]'}`} />
              <span>
                {isSyncing
                  ? 'ArcGIS BRON FeatureServer synchroniseren...'
                  : 'Synchroniseer met ArcGIS BRON'}
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* Tab 2: Searchable Filtered Accidents List */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[var(--border-subtle)] shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => {
                  onChangeFilters({ ...filters, searchQuery: e.target.value });
                  setVisibleListCount(60);
                }}
                placeholder="Zoek op VKL-nummer, kern, partij, aard..."
                className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] focus:border-[var(--border-focus)] rounded-[4px] pl-8 pr-7 py-1.5 text-xs text-[var(--text-main)] placeholder:text-[var(--text-dim)] outline-none"
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  onClick={() => onChangeFilters({ ...filters, searchQuery: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {filteredAccidents.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs font-semibold text-[var(--text-main)]">
                  Geen verkeersongevallen gevonden
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Pas de jaartallen of filtervoorwaarden aan om ongevallen binnen Steenwijkerland te tonen.
                </p>
                <button
                  type="button"
                  onClick={() => onChangeFilters(INITIAL_FILTER_STATE)}
                  className="mt-2 px-3 py-1.5 rounded-[4px] bg-[var(--accent-gold)] text-[#060e0a] font-semibold text-xs cursor-pointer"
                >
                  Herstel filters
                </button>
              </div>
            ) : (
              <>
                {filteredAccidents.slice(0, visibleListCount).map((acc) => {
                  const meta = getSeverityMeta(acc.ernst);
                  const isSelected = selectedAccident?.vklNummer === acc.vklNummer;
                  const partySummary =
                    acc.partijen.length > 0
                      ? acc.partijen.map((p) => p.oteId).join(' · ')
                      : `${acc.aantalPartijen} partij(en)`;

                  return (
                    <button
                      key={acc.vklNummer}
                      type="button"
                      onClick={() => onSelectAccident(acc)}
                      className={`w-full text-left px-3.5 py-2.5 transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-[var(--bg-elevated)]'
                          : 'hover:bg-[var(--bg-card-hover)]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: meta.fillHex }}
                          />
                          <span className="font-mono font-bold text-[var(--text-main)]">
                            #{acc.vklNummer}
                          </span>
                          <span className="text-[var(--text-dim)]">·</span>
                          <span className="font-semibold text-[var(--text-main)] truncate">
                            {acc.kern}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                          {acc.aardOngeval || 'Ongeval'}
                          {acc.wegsituatie ? ` · ${acc.wegsituatie}` : ''}
                          {acc.maxSnelheid ? ` · ${acc.maxSnelheid} km/u` : ''}
                        </div>
                        <div className="text-[11px] text-[var(--text-dim)] mt-0.5 truncate">
                          {partySummary}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-bold text-[var(--accent-gold-bright)]">
                          {acc.jaar}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          {meta.shortLabel}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-[var(--text-dim)]">
                          <MapPin className="w-2.5 h-2.5" />
                          <span>Toon</span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {filteredAccidents.length > visibleListCount && (
                  <div className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleListCount((c) => c + 100)}
                      className="px-4 py-1.5 rounded-[4px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-main)] cursor-pointer"
                    >
                      Toon meer ({filteredAccidents.length - visibleListCount} resterend)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
