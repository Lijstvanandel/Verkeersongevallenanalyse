import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  TrafficAccident,
  MapRenderMode,
  getSeverityMeta,
} from '../types/ongevallen';
import {
  STEENWIJKERLAND_BOUNDS,
  STEENWIJKERLAND_POLYGON,
  STEENWIJKERLAND_KERNEN,
  isPointInSteenwijkerland,
} from '../data/steenwijkerland';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Flame,
  MapPin,
  SlidersHorizontal,
  GraduationCap,
} from 'lucide-react';
import { SchoolZone } from '../types/schoolzones';

interface MapComponentProps {
  accidents: TrafficAccident[];
  selectedAccident: TrafficAccident | null;
  onSelectAccident: (acc: TrafficAccident | null) => void;
  renderMode: MapRenderMode;
  onChangeRenderMode: (mode: MapRenderMode) => void;
  onToggleFilterPanel: () => void;
  showFilterPanel: boolean;
  flyToTarget: { lat: number; lng: number; zoom: number; ts: number } | null;
  schoolzones?: SchoolZone[];
  showSchoolzones?: boolean;
  onToggleSchoolzones?: () => void;
  selectedSchoolZone?: SchoolZone | null;
  onSelectSchoolZone?: (zone: SchoolZone | null) => void;
}

type TileLayerKey = 'osm' | 'opentopo' | 'satellite';

const TILE_LAYERS: Record<
  TileLayerKey,
  { name: string; url: string; attribution: string; maxZoom: number }
> = {
  osm: {
    name: 'OpenStreetMap (Standaard)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · BRON Verkeersongevallen',
    maxZoom: 19,
  },
  opentopo: {
    name: 'OpenTopoMap (Topografie)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
  satellite: {
    name: 'Luchtfoto / Satelliet (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &copy; Earthstar Geographics',
    maxZoom: 18,
  },
};

export const MapComponent: React.FC<MapComponentProps> = ({
  accidents,
  selectedAccident,
  onSelectAccident,
  renderMode,
  onChangeRenderMode,
  onToggleFilterPanel,
  showFilterPanel,
  flyToTarget,
  schoolzones = [],
  showSchoolzones = false,
  onToggleSchoolzones,
  selectedSchoolZone = null,
  onSelectSchoolZone,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const pointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const schoolzonesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const selectedMarkerLayerRef = useRef<L.LayerGroup | null>(null);
  const canvasRendererRef = useRef<L.Canvas | null>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const municipalityOutlineRef = useRef<L.Polygon | null>(null);

  const [activeTileLayer, setActiveTileLayer] = useState<TileLayerKey>('osm');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const onSelectAccidentRef = useRef(onSelectAccident);
  useEffect(() => {
    onSelectAccidentRef.current = onSelectAccident;
  }, [onSelectAccident]);

  const onSelectSchoolZoneRef = useRef(onSelectSchoolZone);
  useEffect(() => {
    onSelectSchoolZoneRef.current = onSelectSchoolZone;
  }, [onSelectSchoolZone]);

  const schoolzonesSvgRendererRef = useRef<L.SVG | null>(null);
  const selectedSvgRendererRef = useRef<L.SVG | null>(null);
  const maskSvgRendererRef = useRef<L.SVG | null>(null);

  // Draw the weighted Blackspot Heatmap on the custom overlay canvas
  const redrawHeatmap = useCallback(() => {
    const map = mapInstanceRef.current;
    const canvas = heatmapCanvasRef.current;
    if (!map || !canvas) return;

    const size = map.getSize();
    if (canvas.width !== size.x || canvas.height !== size.y) {
      canvas.width = size.x;
      canvas.height = size.y;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (renderMode !== 'heatmap' && renderMode !== 'both') {
      return;
    }

    if (accidents.length === 0) return;

    // Position the canvas at current map container top-left in layerPoint coordinates
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);

    const zoom = map.getZoom();
    const radius = Math.max(12, Math.min(38, (zoom - 9) * 5.5));

    // Step 1: Draw grayscale alpha intensity blobs
    const offscreen = document.createElement('canvas');
    offscreen.width = size.x;
    offscreen.height = size.y;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    for (const acc of accidents) {
      if (!isPointInSteenwijkerland(acc.lat, acc.lng)) continue;
      const pt = map.latLngToContainerPoint([acc.lat, acc.lng]);
      if (
        pt.x < -radius ||
        pt.y < -radius ||
        pt.x > size.x + radius ||
        pt.y > size.y + radius
      ) {
        continue;
      }

      const meta = getSeverityMeta(acc.ernst);
      const alpha = Math.min(0.45, 0.08 * meta.weightScore);

      const grad = offCtx.createRadialGradient(
        pt.x,
        pt.y,
        1,
        pt.x,
        pt.y,
        radius
      );
      grad.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      offCtx.fill();
    }

    // Step 2: Colorize alpha values into thermal Blackspot ramp
    const imgData = offCtx.getImageData(0, 0, size.x, size.y);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 6) {
        data[i + 3] = 0;
        continue;
      }
      const norm = a / 255;
      let r = 0;
      let g = 0;
      let b = 0;

      if (norm < 0.25) {
        // Deep blue to cyan
        const t = norm / 0.25;
        r = 14;
        g = Math.round(116 + t * 110);
        b = Math.round(180 + t * 75);
      } else if (norm < 0.55) {
        // Cyan to yellow
        const t = (norm - 0.25) / 0.3;
        r = Math.round(t * 250);
        g = Math.round(226 + t * 20);
        b = Math.round(255 * (1 - t));
      } else if (norm < 0.8) {
        // Yellow to orange
        const t = (norm - 0.55) / 0.25;
        r = 250;
        g = Math.round(240 - t * 115);
        b = 15;
      } else {
        // Orange to crimson red (blackspot)
        const t = (norm - 0.8) / 0.2;
        r = Math.round(235 + t * 20);
        g = Math.round(125 * (1 - t));
        b = Math.round(20 * (1 - t));
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = Math.min(215, Math.round(a * 0.88 + 25));
    }

    ctx.putImageData(imgData, 0, 0);
  }, [accidents, renderMode]);

  // Initialize Leaflet Map with pitch-black exterior mask outside Gemeente Steenwijkerland
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [STEENWIJKERLAND_BOUNDS.center.lat, STEENWIJKERLAND_BOUNDS.center.lng],
      zoom: STEENWIJKERLAND_BOUNDS.defaultZoom,
      minZoom: 9,
      maxZoom: 19,
      zoomControl: false,
      preferCanvas: true,
    });

    mapInstanceRef.current = map;

    // 1. Custom pane for Heatmap (below points and below the black exterior mask)
    const heatmapPane = map.createPane('heatmapPane');
    heatmapPane.style.zIndex = '380';
    heatmapPane.style.pointerEvents = 'none';

    const heatCanvas = L.DomUtil.create(
      'canvas',
      'leaflet-zoom-hide',
      heatmapPane
    ) as HTMLCanvasElement;
    heatCanvas.style.position = 'absolute';
    heatCanvas.style.pointerEvents = 'none';
    heatmapCanvasRef.current = heatCanvas;

    // 2. Custom pane for Schoolzone road polylines (rendered via dedicated SVG; sits under accidents)
    const schoolzonesRoadPane = map.createPane('schoolzonesRoadPane');
    schoolzonesRoadPane.style.zIndex = '395';
    schoolzonesRoadPane.style.pointerEvents = 'none';

    const schoolzonesSvgRenderer = L.svg({ pane: 'schoolzonesRoadPane' });
    schoolzonesSvgRendererRef.current = schoolzonesSvgRenderer;

    // 3. Custom pane for Accident Points Canvas (above road lines, direct click handling)
    const accidentsPane = map.createPane('accidentsPane');
    accidentsPane.style.zIndex = '415';

    // 4. Custom pane for School Point Markers (graduation cap icons above accident dots)
    const schoolzonesMarkersPane = map.createPane('schoolzonesMarkersPane');
    schoolzonesMarkersPane.style.zIndex = '425';
    schoolzonesMarkersPane.style.pointerEvents = 'none';

    // 5. Selected accident highlight pane (strictly non-interactive to never intercept clicks)
    const selectedPane = map.createPane('selectedAccidentPane');
    selectedPane.style.zIndex = '435';
    selectedPane.style.pointerEvents = 'none';

    // 6. Exterior Pitch-Black Mask Pane outside Gemeente Steenwijkerland (`#060e0a`)
    const maskPane = map.createPane('exteriorBlackMaskPane');
    maskPane.style.zIndex = '450';
    maskPane.style.pointerEvents = 'none';

    // Dedicated SVG renderers for non-interactive overlays (ensures zero Canvas interception)
    const selectedSvgRenderer = L.svg({ pane: 'selectedAccidentPane' });
    selectedSvgRendererRef.current = selectedSvgRenderer;

    const maskSvgRenderer = L.svg({ pane: 'exteriorBlackMaskPane' });
    maskSvgRendererRef.current = maskSvgRenderer;

    // Base Tile Layer
    const tileConfig = TILE_LAYERS[activeTileLayer];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);
    currentTileLayerRef.current = tileLayer;

    // Inverted world polygon with hole = STEENWIJKERLAND_POLYGON (space outside remains pitch-black)
    const outerWorldRing: [number, number][] = [
      [-90, -180],
      [-90, 180],
      [90, 180],
      [90, -180],
    ];

    L.polygon([outerWorldRing, STEENWIJKERLAND_POLYGON], {
      renderer: maskSvgRenderer,
      pane: 'exteriorBlackMaskPane',
      stroke: true,
      color: '#437257',
      weight: 2.2,
      opacity: 1,
      fillColor: '#060e0a',
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);

    // Invisible reference polygon of Steenwijkerland for fitBounds
    const municipalityOutline = L.polygon(STEENWIJKERLAND_POLYGON, {
      stroke: false,
      fill: false,
      interactive: false,
    }).addTo(map);
    municipalityOutlineRef.current = municipalityOutline;

    // Dedicated Canvas renderer for thousands of accident points
    canvasRendererRef.current = L.canvas({
      pane: 'accidentsPane',
      padding: 0.5,
    });
    pointsLayerGroupRef.current = L.layerGroup().addTo(map);
    schoolzonesLayerGroupRef.current = L.layerGroup().addTo(map);
    selectedMarkerLayerRef.current = L.layerGroup().addTo(map);

    try {
      const bounds = municipalityOutline.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    } catch {
      // ignore
    }

    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    if (mapContainerRef.current) {
      ro.observe(mapContainerRef.current);
    }

    return () => {
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Re-attach heatmap redraw listeners when redrawHeatmap updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    redrawHeatmap();
    map.on('moveend zoomend resize', redrawHeatmap);
    return () => {
      map.off('moveend zoomend resize', redrawHeatmap);
    };
  }, [redrawHeatmap]);

  // Switch Base Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const tileConfig = TILE_LAYERS[activeTileLayer];
    const newTileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    currentTileLayerRef.current = newTileLayer;
  }, [activeTileLayer]);

  // Render Accident Markers on Canvas (strictly inside Steenwijkerland)
  useEffect(() => {
    const layer = pointsLayerGroupRef.current;
    const renderer = canvasRendererRef.current;
    if (!layer || !renderer) return;

    layer.clearLayers();

    if (renderMode !== 'points' && renderMode !== 'both') {
      return;
    }

    // Sort so UMS is drawn first, Letsel second, and Dodelijk on top
    const sorted = [...accidents].sort((a, b) => {
      const wa = getSeverityMeta(a.ernst).weightScore;
      const wb = getSeverityMeta(b.ernst).weightScore;
      return wa - wb;
    });

    for (const acc of sorted) {
      if (!isPointInSteenwijkerland(acc.lat, acc.lng)) continue;

      const meta = getSeverityMeta(acc.ernst);
      const isBothMode = renderMode === 'both';

      const marker = L.circleMarker([acc.lat, acc.lng], {
        renderer,
        pane: 'accidentsPane',
        radius: isBothMode ? Math.max(3, meta.radius - 1) : meta.radius,
        fillColor: meta.fillHex,
        fillOpacity:
          acc.ernst === 'Dodelijk' ? 0.95 : acc.ernst === 'Letsel' ? 0.88 : 0.78,
        color: '#060e0a',
        weight: acc.ernst === 'Dodelijk' ? 1.8 : 1,
        opacity: 0.9,
      });

      const partyText =
        acc.partijen.length > 0
          ? acc.partijen.map((p) => p.oteId).join(', ')
          : `${acc.aantalPartijen} partij(en)`;

      marker.bindTooltip(
        `<div class="text-xs text-[#f5f6f4] tabular-nums">
          <div class="font-bold text-[#fbbf24]">${acc.jaar} · ${meta.label}</div>
          <div class="font-semibold">${acc.kern} — #${acc.vklNummer}</div>
          <div class="text-[11px] text-[#9bb0a4]">${acc.aardOngeval || 'Ongeval'} · ${partyText}</div>
        </div>`,
        {
          direction: 'top',
          offset: [0, -6],
        }
      );

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectAccidentRef.current(acc);
      });

      layer.addLayer(marker);
    }
  }, [accidents, renderMode]);

  // Highlight Selected Accident with non-blocking SVG overlay
  useEffect(() => {
    const selLayer = selectedMarkerLayerRef.current;
    if (!selLayer) return;

    selLayer.clearLayers();
    if (!selectedAccident) return;

    const meta = getSeverityMeta(selectedAccident.ernst);
    const renderer = selectedSvgRendererRef.current || undefined;

    // Outer highlight ring rendered in SVG with interactive: false (100% pass-through)
    const ring = L.circleMarker([selectedAccident.lat, selectedAccident.lng], {
      renderer,
      pane: 'selectedAccidentPane',
      radius: meta.radius + 7,
      fillColor: meta.fillHex,
      fillOpacity: 0.25,
      color: '#ffffff',
      weight: 2.5,
      opacity: 1,
      interactive: false,
    });

    const centerDot = L.circleMarker(
      [selectedAccident.lat, selectedAccident.lng],
      {
        renderer,
        pane: 'selectedAccidentPane',
        radius: meta.radius + 1.5,
        fillColor: meta.fillHex,
        fillOpacity: 1,
        color: '#060e0a',
        weight: 2,
        opacity: 1,
        interactive: false,
      }
    );

    selLayer.addLayer(ring);
    selLayer.addLayer(centerDot);
  }, [selectedAccident]);

  // Render NDW Schoolzones (road segment polyline + school point marker)
  useEffect(() => {
    const layer = schoolzonesLayerGroupRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (!showSchoolzones || !schoolzones || schoolzones.length === 0) {
      return;
    }

    const svgRenderer = schoolzonesSvgRendererRef.current || undefined;

    // If a school zone is selected, draw a subtle non-blocking 250m radius circle around it
    if (selectedSchoolZone) {
      const radiusCircle = L.circle(
        [selectedSchoolZone.lat, selectedSchoolZone.lng],
        {
          renderer: svgRenderer,
          pane: 'schoolzonesRoadPane',
          radius: 250,
          color: '#38bdf8',
          weight: 1.5,
          dashArray: '4, 4',
          fillColor: '#06b6d4',
          fillOpacity: 0.1,
          interactive: false, // Non-interactive so accident markers inside can be hovered & clicked!
        }
      );
      layer.addLayer(radiusCircle);
    }

    for (const zone of schoolzones) {
      const isSelected = selectedSchoolZone?.id === zone.id;

      // 1. Draw Road Segment PolyLine if coordinates available
      if (zone.coordinates && zone.coordinates.length > 0) {
        const polyline = L.polyline(zone.coordinates, {
          renderer: svgRenderer,
          pane: 'schoolzonesRoadPane',
          color: isSelected
            ? '#38bdf8'
            : zone.isActieveSchoolzone
            ? '#06b6d4'
            : '#0d9488',
          weight: isSelected ? 8 : zone.isActieveSchoolzone ? 5 : 3.5,
          opacity: isSelected ? 1 : zone.isActieveSchoolzone ? 0.9 : 0.75,
          dashArray: zone.isActieveSchoolzone ? undefined : '5, 5',
          interactive: true,
        });

        polyline.bindTooltip(
          `<div class="text-xs text-white tabular-nums">
            <div class="font-bold text-[#38bdf8]">${zone.schoolName}</div>
            <div class="text-[11px]">${zone.address}</div>
            <div class="text-[10px] text-cyan-200 capitalize font-medium">${zone.aanduidingZone}</div>
          </div>`,
          { direction: 'top', offset: [0, -4] }
        );

        polyline.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectSchoolZoneRef.current?.(zone);
        });

        layer.addLayer(polyline);
      }

      // 2. School Point Marker with graduation cap icon
      const iconHtml = `
        <div class="relative flex items-center justify-center w-7 h-7 rounded-full transition-transform hover:scale-110 cursor-pointer pointer-events-auto ${
          isSelected
            ? 'bg-[#38bdf8] border-2 border-white text-[#060e0a] shadow-xl ring-4 ring-cyan-400/50 scale-110'
            : zone.isActieveSchoolzone
            ? 'bg-[#0891b2] border-2 border-white text-white shadow-lg shadow-cyan-950/70 ring-2 ring-cyan-400/30'
            : 'bg-[#0f766e] border border-cyan-300 text-white shadow-md'
        }">
          <svg class="w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'schoolzone-point-marker',
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        tooltipAnchor: [0, -16],
      });

      const marker = L.marker([zone.lat, zone.lng], {
        icon: customIcon,
        pane: 'schoolzonesMarkersPane',
        interactive: true,
      });

      marker.bindTooltip(
        `<div class="text-xs text-white tabular-nums">
          <div class="font-bold text-[#38bdf8]">${zone.schoolName}</div>
          <div class="text-[11px]">${zone.address}</div>
          <div class="text-[10px] text-cyan-200 capitalize font-medium">${zone.aanduidingZone} · #${zone.wvkId}</div>
          ${zone.gevalideerdDoorGemeente ? '<div class="text-[10px] text-emerald-400 font-semibold">✓ Gevalideerd door gemeente</div>' : ''}
        </div>`,
        { direction: 'top', offset: [0, -12] }
      );

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectSchoolZoneRef.current?.(zone);
      });

      layer.addLayer(marker);
    }
  }, [showSchoolzones, schoolzones, selectedSchoolZone]);

  // Respond to external flyToTarget (e.g. Kern selector or Zoom to Location button)
  useEffect(() => {
    if (!flyToTarget || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom, {
      duration: 1.0,
    });
  }, [flyToTarget]);

  const resetToMunicipality = () => {
    if (!mapInstanceRef.current) return;
    if (municipalityOutlineRef.current) {
      const bounds = municipalityOutlineRef.current.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.flyToBounds(bounds, {
          padding: [20, 20],
          duration: 1.0,
        });
        return;
      }
    }
    mapInstanceRef.current.flyTo(
      [STEENWIJKERLAND_BOUNDS.center.lat, STEENWIJKERLAND_BOUNDS.center.lng],
      STEENWIJKERLAND_BOUNDS.defaultZoom,
      { duration: 1.0 }
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#060e0a] tabular-nums">
      <div
        ref={mapContainerRef}
        className="w-full h-full bg-[#060e0a]"
        id="map"
      />

      {/* Top-Left Map Toolbar */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-[500] flex flex-col gap-2 max-w-full">
        <div className="flex items-center gap-1 bg-[var(--bg-card)]/95 backdrop-blur-xs p-1 rounded-[6px] border border-[var(--border-subtle)] shadow-2xl text-[var(--text-main)] overflow-x-auto no-scrollbar">
          {/* Toggle Filter Panel Button */}
          <button
            type="button"
            onClick={onToggleFilterPanel}
            className={`px-2.5 py-1.5 rounded-[4px] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showFilterPanel
                ? 'bg-[var(--bg-elevated)] text-[var(--accent-gold-bright)] border border-[var(--border-focus)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Filters</span>
          </button>

          <div className="w-[1px] h-4 bg-[var(--border-subtle)] shrink-0" />

          {/* Render Mode Switcher: Punten | Heatmap | Beide */}
          <button
            type="button"
            onClick={() => onChangeRenderMode('points')}
            className={`px-2.5 py-1.5 rounded-[4px] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              renderMode === 'points'
                ? 'bg-[var(--accent-gold)] text-[#060e0a]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Punten ({accidents.length.toLocaleString('nl-NL')})</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeRenderMode('heatmap')}
            className={`px-2.5 py-1.5 rounded-[4px] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              renderMode === 'heatmap'
                ? 'bg-[var(--accent-gold)] text-[#060e0a]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Blackspot Heatmap</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeRenderMode('both')}
            className={`px-2.5 py-1.5 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              renderMode === 'both'
                ? 'bg-[var(--accent-gold)] text-[#060e0a]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <span>Punten + Heatmap</span>
          </button>

          <div className="w-[1px] h-4 bg-[var(--border-subtle)] shrink-0" />

          {/* Schoolzones Layer Toggle Button */}
          <button
            type="button"
            onClick={onToggleSchoolzones}
            className={`px-2.5 py-1.5 rounded-[4px] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showSchoolzones
                ? 'bg-[#0891b2] text-white shadow-xs font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
            title="Schoolzones (NDW WKD) in/uitschakelen"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Schoolzones ({schoolzones?.length || 34})</span>
          </button>

          <div className="w-[1px] h-4 bg-[var(--border-subtle)] shrink-0" />

          {/* Basemap Switcher */}
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] rounded-[4px] transition-colors cursor-pointer shrink-0"
            title="Basiskaart wijzigen"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {showLayerMenu && (
          <div className="w-60 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[6px] shadow-2xl p-1.5 z-50 text-xs">
            <div className="px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
              Basiskaart (Buiten grens zwart)
            </div>
            {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTileLayer(key);
                  setShowLayerMenu(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-[4px] transition-colors flex items-center justify-between cursor-pointer ${
                  activeTileLayer === key
                    ? 'bg-[var(--accent-gold)] text-[#060e0a] font-bold'
                    : 'text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                <span>{TILE_LAYERS[key].name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom-Left Legend & Quick Kern Jump Bar */}
      <div className="absolute bottom-3 left-3 z-[500] flex flex-col gap-2 max-w-[calc(100%-90px)]">
        {/* Legend */}
        <div className="bg-[var(--bg-card)]/95 backdrop-blur-xs border border-[var(--border-subtle)] rounded-[6px] px-3 py-2 shadow-xl flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-main)]">
          <span className="font-display font-bold text-[var(--text-muted)]">
            Legenda:
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#e60000] border border-black/50 inline-block" />
            <span>Dodelijk</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffaa00] border border-black/50 inline-block" />
            <span>Letsel</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ffffbe] border border-black/50 inline-block" />
            <span>Materiële schade</span>
          </span>
          {showSchoolzones && (
            <span className="flex items-center gap-1.5 pl-2 border-l border-[var(--border-subtle)] text-[#38bdf8]">
              <span className="w-3.5 h-1.5 bg-[#06b6d4] rounded-full inline-block" />
              <span className="font-semibold">NDW Schoolzone</span>
            </span>
          )}
        </div>

        {/* Quick Kern Buttons */}
        <div className="hidden sm:flex items-center gap-1 bg-[var(--bg-card)]/95 backdrop-blur-xs p-1 rounded-[6px] border border-[var(--border-subtle)] shadow-xl overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={resetToMunicipality}
            className="px-2 py-1 rounded-[4px] text-[11px] font-semibold bg-[var(--bg-elevated)] text-[var(--accent-gold-bright)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer whitespace-nowrap"
          >
            Hele Gemeente
          </button>
          {STEENWIJKERLAND_KERNEN.slice(0, 7).map((kern) => (
            <button
              key={kern.name}
              type="button"
              onClick={() => {
                mapInstanceRef.current?.flyTo([kern.lat, kern.lng], kern.zoom, {
                  duration: 1.0,
                });
              }}
              className="px-2 py-1 rounded-[4px] text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer whitespace-nowrap"
            >
              {kern.name}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom-Right Zoom Controls */}
      <div className="absolute bottom-6 right-3 z-[500] flex flex-col gap-1 bg-[var(--bg-card)]/95 backdrop-blur-xs p-1 rounded-[6px] border border-[var(--border-subtle)] shadow-2xl">
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="p-2 text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] rounded-[4px] transition-colors cursor-pointer"
          title="Inzoomen"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="h-[1px] bg-[var(--border-subtle)]" />
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="p-2 text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] rounded-[4px] transition-colors cursor-pointer"
          title="Uitzoomen"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-[1px] bg-[var(--border-subtle)]" />
        <button
          type="button"
          onClick={resetToMunicipality}
          className="p-2 text-[var(--accent-gold-bright)] hover:bg-[var(--bg-card-hover)] rounded-[4px] transition-colors cursor-pointer"
          title="Toon hele Gemeente Steenwijkerland"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
