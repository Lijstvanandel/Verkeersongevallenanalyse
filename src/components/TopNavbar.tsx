import React from 'react';
import { MapRenderMode } from '../types/ongevallen';
import { Download, GraduationCap } from 'lucide-react';

interface TopNavbarProps {
  showFilterPanel: boolean;
  onToggleFilterPanel: () => void;
  renderMode: MapRenderMode;
  onChangeRenderMode: (mode: MapRenderMode) => void;
  onOpenDashboard: () => void;
  onOpenEmbedModal: () => void;
  onExportCSV: () => void;
  showSchoolzones: boolean;
  onToggleSchoolzones: () => void;
  schoolzonesCount?: number;
  isEmbed?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  showFilterPanel,
  onToggleFilterPanel,
  renderMode,
  onChangeRenderMode,
  onOpenDashboard,
  onOpenEmbedModal,
  onExportCSV,
  showSchoolzones,
  onToggleSchoolzones,
  schoolzonesCount = 34,
  isEmbed = false,
}) => {
  return (
    <header className="h-14 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] px-4 md:px-6 flex items-center justify-between gap-8 z-30 shrink-0 select-none">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
        }}
        className="font-display text-base md:text-lg font-bold tracking-tight text-[var(--text-main)] whitespace-nowrap shrink-0"
      >
        Verkeersongevallen Steenwijkerland
      </a>

      {/* Zone 2: 4–5 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--text-muted)]">
        <button
          type="button"
          onClick={onToggleFilterPanel}
          className={`hover:text-[var(--text-main)] transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b-2 ${
            showFilterPanel
              ? 'text-[var(--text-main)] border-[var(--accent-gold)]'
              : 'border-transparent'
          }`}
        >
          Filterpaneel
        </button>

        <button
          type="button"
          onClick={() =>
            onChangeRenderMode(renderMode === 'points' ? 'both' : 'points')
          }
          className={`hover:text-[var(--text-main)] transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b-2 ${
            renderMode === 'points' || renderMode === 'both'
              ? 'text-[var(--text-main)] border-[var(--accent-gold)]'
              : 'border-transparent'
          }`}
        >
          Ongevallenkaart
        </button>

        <button
          type="button"
          onClick={() =>
            onChangeRenderMode(renderMode === 'heatmap' ? 'points' : 'heatmap')
          }
          className={`hover:text-[var(--text-main)] transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b-2 ${
            renderMode === 'heatmap' || renderMode === 'both'
              ? 'text-[var(--text-main)] border-[var(--accent-gold)]'
              : 'border-transparent'
          }`}
        >
          Blackspot Heatmap
        </button>

        <button
          type="button"
          onClick={onToggleSchoolzones}
          className={`hover:text-[var(--text-main)] transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b-2 flex items-center gap-1.5 ${
            showSchoolzones
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border-focus)]'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Schoolzones</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              showSchoolzones
                ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                : 'bg-black/30 text-[var(--text-dim)]'
            }`}
          >
            {schoolzonesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenDashboard}
          className="hover:text-[var(--text-main)] transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b-2 border-transparent hover:border-[var(--border-focus)]"
        >
          Statistieken
        </button>

        {!isEmbed && (
          <button
            type="button"
            onClick={onOpenEmbedModal}
            className="hover:text-[var(--text-main)] transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b-2 border-transparent hover:border-[var(--border-focus)]"
          >
            Insluiten
          </button>
        )}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onExportCSV}
          className="px-4 py-2 text-xs font-semibold text-[#060e0a] bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-bright)] rounded-[5px] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download CSV</span>
        </button>
      </div>
    </header>
  );
};
