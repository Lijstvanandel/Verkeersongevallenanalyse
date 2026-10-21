import React, { useState } from 'react';
import { X, Copy, Check, Code2, ExternalLink } from 'lucide-react';

interface EmbedDataproductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmbedDataproductModal: React.FC<EmbedDataproductModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [heightPx, setHeightPx] = useState<number>(680);

  if (!isOpen) return null;

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://steenwijkerland.nl';
  const embedUrl = `${baseUrl}/?embed=true`;

  const iframeCode = `<iframe
  src="${embedUrl}"
  width="100%"
  height="${heightPx}"
  style="border: 1px solid #1b3829; border-radius: 6px; background: #060e0a;"
  title="Verkeersongevallen Gemeente Steenwijkerland (BRON 2003–2025)"
  loading="lazy"
  allowfullscreen
></iframe>`;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(iframeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[900] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[6px] max-w-xl w-full shadow-2xl overflow-hidden text-[var(--text-main)]">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-[var(--accent-gold)]" />
            <h2 className="font-display text-base font-bold">
              Kaart Insluiten (Embed)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[4px] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <p className="text-[var(--text-muted)] leading-relaxed">
            Gebruik onderstaande HTML-code om de interactieve{' '}
            <strong className="text-[var(--text-main)]">
              Verkeersongevallenkaart Steenwijkerland (BRON 2003–2025)
            </strong>{' '}
            rechtstreeks in een artikel, beleidsnota of webpagina op te nemen.
          </p>

          <div className="flex items-center justify-between gap-4 bg-[var(--bg-main)] p-3 rounded-[5px] border border-[var(--border-subtle)]">
            <label className="text-[var(--text-muted)] font-medium">
              Hoogte van kaartframe (px):
            </label>
            <div className="flex items-center gap-2">
              {[520, 680, 820].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHeightPx(h)}
                  className={`px-3 py-1.5 rounded-[4px] font-mono text-xs transition-colors cursor-pointer ${
                    heightPx === h
                      ? 'bg-[var(--accent-gold)] text-[#060e0a] font-bold'
                      : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {h}px
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <pre className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[5px] p-3.5 font-mono text-[11px] text-[var(--text-main)] overflow-x-auto leading-relaxed">
              {iframeCode}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-[4px] bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-bright)] text-[#060e0a] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Gekopieerd</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopieer Code</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-gold-bright)] hover:underline flex items-center gap-1.5 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Bekijk embed-weergave in nieuw tabblad</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[4px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] font-semibold transition-colors cursor-pointer"
            >
              Sluiten
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
