'use client';

import { useState } from 'react';
import { MOCK_LOGICAL_VOLUMES, MOCK_PHYSICAL_DISKS } from '@/lib/volume-mock';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const gb = n / 1_000_000_000;
  return `${gb.toFixed(1)} GB`;
}

export function VolumeManagerApp() {
  const [status] = useState('Ready');
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950/90 text-slate-100">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-white/10 px-2 text-[10px] uppercase">
        <button type="button" className="rounded px-2 py-1 hover:bg-white/10">
          File
        </button>
        <button type="button" className="rounded px-2 py-1 hover:bg-white/10">
          Edit
        </button>
        <button type="button" className="rounded px-2 py-1 hover:bg-white/10">
          Tools
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 hover:bg-white/10"
          onClick={() => setAboutOpen(true)}
        >
          Help
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-h-0 overflow-auto border-b border-white/10 p-2">
          <p className="mb-2 text-[10px] font-bold uppercase text-white/40">Logical volumes</p>
          <table className="w-full border-collapse text-left text-xs">
            <thead className="text-white/50">
              <tr>
                <th className="p-1">Volume</th>
                <th className="p-1">Type</th>
                <th className="p-1">File system</th>
                <th className="p-1">Total</th>
                <th className="p-1">Used</th>
                <th className="p-1">Physical</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_LOGICAL_VOLUMES.map((v) => (
                <tr key={v.id} className="border-t border-white/5">
                  <td className="p-1 font-medium">{v.letter}</td>
                  <td className="p-1 text-white/60">{v.volumeType}</td>
                  <td className="p-1">{v.fileSystem}</td>
                  <td className="p-1 tabular-nums">{formatBytes(v.totalBytes)}</td>
                  <td className="p-1 tabular-nums">{formatBytes(v.usedBytes)}</td>
                  <td className="p-1 text-white/50">{v.physicalObject}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="min-h-0 overflow-auto p-2">
          <p className="mb-2 text-[10px] font-bold uppercase text-white/40">Physical disks</p>
          {MOCK_PHYSICAL_DISKS.map((disk) => (
            <div key={disk.id} className="mb-3">
              <p className="mb-1 font-semibold text-white/90">{disk.label}</p>
              {disk.partitions.length === 0 ? (
                <p className="text-[11px] text-white/40">No partitions</p>
              ) : (
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead className="text-white/45">
                    <tr>
                      <th className="p-1">Partition</th>
                      <th className="p-1">Type</th>
                      <th className="p-1">FS</th>
                      <th className="p-1">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disk.partitions.map((p) => (
                      <tr key={p.id} className="border-t border-white/5">
                        <td className="p-1">{p.label}</td>
                        <td className="p-1">{p.type}</td>
                        <td className="p-1">{p.fileSystem}</td>
                        <td className="p-1 tabular-nums">{formatBytes(p.sizeBytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      </div>

      <footer className="flex h-7 shrink-0 items-center border-t border-white/10 bg-black/30 px-3 text-[10px] text-white/50">
        {status}
      </footer>

      {aboutOpen ? (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal
        >
          <div className="max-w-md rounded-xl border border-white/15 bg-slate-900 p-4 shadow-xl">
            <h2 className="text-sm font-semibold">About Volume Manager</h2>
            <p className="mt-2 text-xs text-white/60">Demo storage layout for Durgasos.</p>
            <button
              type="button"
              className="mt-4 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
              onClick={() => setAboutOpen(false)}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
