import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrafficAccident,
  AccidentFilterState,
  INITIAL_FILTER_STATE,
  MapRenderMode,
  filterAccidents,
  exportAccidentsToCSV,
} from './types/ongevallen';
import { isPointInSteenwijkerland } from './data/steenwijkerland';
import { TopNavbar } from './components/TopNavbar';
import { OngevallenFilterPanel } from './components/OngevallenFilterPanel';
import { MapComponent } from './components/MapComponent';
import { AccidentDetailModal } from './components/AccidentDetailModal';
import { OngevallenDashboard } from './components/OngevallenDashboard';
import { EmbedDataproductModal } from './components/EmbedDataproductModal';
import './firebase';
import { Code2, Maximize2, ExternalLink } from 'lucide-react';

export default function App() {
  const [allAccidents, setAllAccidents] = useState<TrafficAccident[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [filters, setFilters] = useState<AccidentFilterState>(INITIAL_FILTER_STATE);
  const [renderMode, setRenderMode] = useState<MapRenderMode>('points');
  const [selectedAccident, setSelectedAccident] = useState<TrafficAccident | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
    ts: number;
  } | null>(null);

  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const params = new URLSearchParams(window.location.search);
    const embedded =
      params.get('embed') === 'true' ||
      params.get('widget') === 'true' ||
      window.self !== window.top;
    if (embedded && window.innerWidth < 900) return false;
    return window.innerWidth >= 1024;
  });

  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState<boolean>(false);

  const isEmbed = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('embed') === 'true' ||
      params.get('widget') === 'true' ||
      window.self !== window.top
    );
  }, []);

  // Fetch all Steenwijkerland traffic accidents from backend
  const fetchAccidents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ongevallen');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.accidents)) {
          const valid = data.accidents.filter((a: TrafficAccident) =>
            isPointInSteenwijkerland(a.lat, a.lng)
          );
          setAllAccidents(valid);
        }
      }
    } catch (e) {
      console.warn('Error fetching verkeersongevallen:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccidents();
  }, [fetchAccidents]);

  // Trigger live sync with ArcGIS BRON FeatureServer
  const handleSyncLive = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/ongevallen/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full: false }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.accidents)) {
          const valid = data.accidents.filter((a: TrafficAccident) =>
            isPointInSteenwijkerland(a.lat, a.lng)
          );
          setAllAccidents(valid);
        }
      }
    } catch (e) {
      console.warn('Live ArcGIS sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Filtered accidents according to active filter state
  const filteredAccidents = useMemo(() => {
    return filterAccidents(allAccidents, filters);
  }, [allAccidents, filters]);

  // Select an accident and lazy-fetch related Partijen if needed
  const handleSelectAccident = useCallback(async (acc: TrafficAccident | null) => {
    setSelectedAccident(acc);
    if (!acc) return;

    if (acc.partijen.length === 0 && acc.aantalPartijen > 0) {
      try {
        const res = await fetch(`/api/ongevallen/${encodeURIComponent(acc.vklNummer)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.accident && Array.isArray(data.accident.partijen)) {
            const updated: TrafficAccident = data.accident;
            setSelectedAccident((prev) =>
              prev?.vklNummer === updated.vklNummer ? updated : prev
            );
            setAllAccidents((prev) =>
              prev.map((item) =>
                item.vklNummer === updated.vklNummer ? updated : item
              )
            );
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Export current filtered accidents as .CSV
  const handleExportCSV = useCallback(() => {
    const csvContent = exportAccidentsToCSV(filteredAccidents);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verkeersongevallen_steenwijkerland_${filters.minYear}_${filters.maxYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredAccidents, filters.minYear, filters.maxYear]);

  const handleToggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Keyboard Escape handler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedAccident(null);
        setIsDashboardOpen(false);
        setIsEmbedModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] tabular-nums">
      {/* Top Bar (Strict 3-Zone Contract) */}
      <TopNavbar
        showFilterPanel={showFilterPanel}
        onToggleFilterPanel={() => setShowFilterPanel((v) => !v)}
        renderMode={renderMode}
        onChangeRenderMode={setRenderMode}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        onOpenEmbedModal={() => setIsEmbedModalOpen(true)}
        onExportCSV={handleExportCSV}
        isEmbed={isEmbed}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 relative flex w-full overflow-hidden bg-[var(--bg-main)]">
        {/* Mobile Backdrop for Filter Panel */}
        {showFilterPanel && (
          <div
            onClick={() => setShowFilterPanel(false)}
            className="lg:hidden fixed inset-0 bg-black/60 z-[510] cursor-pointer"
          />
        )}

        {/* Left Sidebar: Interactive Filter & Year Histogram Panel */}
        {showFilterPanel && (
          <aside className="absolute inset-y-0 left-0 w-full sm:w-[360px] lg:static lg:w-[380px] h-full bg-[var(--bg-card)] border-r border-[var(--border-subtle)] flex flex-col shrink-0 z-[520] lg:z-20 overflow-hidden shadow-2xl lg:shadow-none">
            <OngevallenFilterPanel
              allAccidents={allAccidents}
              filteredAccidents={filteredAccidents}
              filters={filters}
              onChangeFilters={setFilters}
              selectedAccident={selectedAccident}
              onSelectAccident={(acc) => {
                handleSelectAccident(acc);
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setShowFilterPanel(false);
                }
              }}
              onFlyToKern={(lat, lng, zoom) =>
                setFlyToTarget({ lat, lng, zoom, ts: Date.now() })
              }
              onSyncLive={handleSyncLive}
              isSyncing={isSyncing}
              onCloseMobile={() => setShowFilterPanel(false)}
            />
          </aside>
        )}

        {/* Center Map Viewport (Strictly inside Gemeente Steenwijkerland; pitch-black outside) */}
        <section className="flex-1 relative w-full h-full overflow-hidden bg-[#060e0a]">
          <MapComponent
            accidents={filteredAccidents}
            selectedAccident={selectedAccident}
            onSelectAccident={handleSelectAccident}
            renderMode={renderMode}
            onChangeRenderMode={setRenderMode}
            onToggleFilterPanel={() => setShowFilterPanel((v) => !v)}
            showFilterPanel={showFilterPanel}
            flyToTarget={flyToTarget}
          />

          {/* Initial Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-[600] bg-[#060e0a]/80 backdrop-blur-xs flex items-center justify-center">
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[6px] px-6 py-4 shadow-2xl text-center space-y-2">
                <div className="w-7 h-7 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="font-display text-sm font-bold text-[var(--text-main)]">
                  BRON Verkeersongevallen Steenwijkerland laden...
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Jaargangen 2003 t/m 2025 &amp; gekoppelde partijen binnen gemeentegrens
                </div>
              </div>
            </div>
          )}

          {/* Selected Accident Detail Panel (ArcGIS BRON Popup Style) */}
          <AccidentDetailModal
            accident={selectedAccident}
            onClose={() => setSelectedAccident(null)}
            onCenterOnMap={(lat, lng) =>
              setFlyToTarget({ lat, lng, zoom: 16, ts: Date.now() })
            }
          />
        </section>

        {/* Multi-Year Statistics & Analytics Dashboard Modal */}
        <OngevallenDashboard
          isOpen={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
          allAccidents={allAccidents}
          filteredAccidents={filteredAccidents}
          filters={filters}
          onSelectYearRange={(minYear, maxYear) =>
            setFilters((prev) => ({ ...prev, minYear, maxYear }))
          }
          onExportCSV={handleExportCSV}
          onSyncLive={handleSyncLive}
          isSyncing={isSyncing}
        />

        {/* Embed Dataproduct Modal */}
        <EmbedDataproductModal
          isOpen={isEmbedModalOpen}
          onClose={() => setIsEmbedModalOpen(false)}
        />
      </main>

      {/* Clean Dataproduct Footer */}
      <footer className="h-8 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] px-4 md:px-6 flex items-center justify-between text-xs text-[var(--text-muted)] z-30 shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-[var(--text-main)] whitespace-nowrap">
            Dataproduct van Lijst van Andel
          </span>
          <span className="text-[var(--text-dim)] hidden md:inline truncate">
            · BRON Verkeersongevallenregistratie Gemeente Steenwijkerland (2003–2025)
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] shrink-0">
          <button
            type="button"
            onClick={() => setIsEmbedModalOpen(true)}
            className="hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span className="hidden sm:inline">Insluiten</span>
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">Volledig scherm</span>
          </button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-main)] flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Nieuw venster</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
