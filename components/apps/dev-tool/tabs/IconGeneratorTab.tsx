'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Download, Image as ImageIcon, Trash2 } from 'lucide-react';

import { ICON_SIZES } from '../constants';
import {
  deleteIconHistory,
  listIconHistory,
  saveIconHistory,
  uploadDevToolFile,
  type IconHistoryItem,
} from '@/lib/dev-tool-api';

import styles from '../DevToolApp.module.css';
import { ToolPanel } from './shared';

type GeneratedIcon = { size: number; dataUrl: string; blob: Blob };

export function IconGeneratorTab() {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [icons, setIcons] = useState<GeneratedIcon[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set(ICON_SIZES));
  const [history, setHistory] = useState<IconHistoryItem[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await listIconHistory());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const generateFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setSourceUrl(url);
      const img = new Image();
      img.onload = () => {
        const generated: GeneratedIcon[] = [];
        for (const size of ICON_SIZES) {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.drawImage(img, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/png');
          fetch(dataUrl)
            .then((r) => r.blob())
            .then((blob) => {
              generated.push({ size, dataUrl, blob });
              if (generated.length === ICON_SIZES.length) {
                setIcons([...generated].sort((a, b) => a.size - b.size));
              }
            });
        }
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const persistSource = async (file: File) => {
    const up = await uploadDevToolFile(file, 'icons');
    await saveIconHistory(up.path, up.signed_url);
    await loadHistory();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    generateFromFile(f);
    void persistSource(f);
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    for (const icon of icons) {
      if (!selected.has(icon.size)) continue;
      zip.file(`icon-${icon.size}x${icon.size}.png`, icon.blob);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'icons.zip';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <ToolPanel
      title="Icon Generator"
      description="Resize one image to standard favicon / PWA sizes and download as ZIP."
    >
      <input type="file" accept="image/*" onChange={onFile} className="text-sm mb-4" />
      <canvas ref={canvasRef} className="hidden" />
      {sourceUrl && (
        <img
          src={sourceUrl}
          alt="Source"
          className="w-24 h-24 object-contain mb-4 border border-slate-600 rounded"
        />
      )}
      {icons.length > 0 && (
        <>
          <button type="button" className={`${styles.btn} mb-4`} onClick={() => void downloadZip()}>
            <Download className="h-4 w-4" />
            Download selected ({selected.size})
          </button>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {icons.map((icon) => (
              <label
                key={icon.size}
                className="flex flex-col items-center p-2 rounded border border-slate-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(icon.size)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(icon.size)) next.delete(icon.size);
                    else next.add(icon.size);
                    setSelected(next);
                  }}
                  className="mb-1"
                />
                <img src={icon.dataUrl} alt="" className="w-12 h-12" />
                <span className="text-xs font-mono mt-1">{icon.size}px</span>
              </label>
            ))}
          </div>
        </>
      )}
      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm text-slate-400 mb-2 flex items-center gap-1">
            <ImageIcon className="h-4 w-4" /> History
          </h3>
          <ul className="space-y-2 text-xs">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex justify-between items-center p-2 bg-slate-800/50 rounded"
              >
                {h.source_image_url ? (
                  <img src={h.source_image_url} alt="" className="h-8 w-8 object-cover rounded" />
                ) : (
                  <span className="truncate">{h.source_image_path}</span>
                )}
                <button
                  type="button"
                  className="text-red-400"
                  onClick={() => void deleteIconHistory(h.id).then(loadHistory)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ToolPanel>
  );
}
