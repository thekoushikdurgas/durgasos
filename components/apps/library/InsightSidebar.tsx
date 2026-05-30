'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, FileText, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';

import type { LibraryBook, StatisticsReport } from '@/components/apps/library/types';
import { fetchLibraryStatistics } from '@/lib/library-api';

type Props = {
  books: LibraryBook[];
  activeBookIds: string[];
};

export function InsightSidebar({ books, activeBookIds }: Props) {
  const [segment, setSegment] = useState<'insights' | 'statistics'>('statistics');
  const [stats, setStats] = useState<StatisticsReport | null>(null);

  useEffect(() => {
    fetchLibraryStatistics()
      .then(setStats)
      .catch(() => {
        const borrowed = books.filter((b) => b.borrowingStatus === 'borrowed').length;
        const pagesRead = books.reduce((a, b) => a + b.pagesRead, 0);
        const pagesSum = books.reduce((a, b) => a + b.pagesTotal, 0) || 1;
        const cats: Record<string, number> = {};
        books.forEach((b) => {
          const c = b.category || 'General';
          cats[c] = (cats[c] || 0) + 1;
        });
        setStats({
          totalBooks: books.length,
          borrowedBooks: borrowed,
          completedBooks: books.filter((b) => b.pagesRead >= b.pagesTotal).length,
          totalPagesRead: pagesRead,
          readingEfficiency: Math.round((pagesRead / pagesSum) * 1000) / 10,
          categoryDistribution: Object.entries(cats).map(([name, value]) => ({ name, value })),
        });
      });
  }, [books]);

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.text('AuraBook Library Report', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, 28);
    let y = 40;
    books.forEach((b) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(40, 40, 40);
      doc.text(`${b.title} — ${b.author}`, 14, y);
      y += 6;
      doc.setTextColor(120, 120, 120);
      doc.text(
        `${b.category} · ${b.pagesRead}/${b.pagesTotal} pages · ${b.borrowingStatus}`,
        14,
        y
      );
      y += 10;
    });
    doc.save('aurabook-library-report.pdf');
  };

  const grounded = books.filter((b) => activeBookIds.includes(b.id));

  return (
    <div className="h-full flex flex-col bg-[#0A0C10] w-80 border-l border-slate-800">
      <div className="flex border-b border-slate-800 text-[10px] font-mono uppercase">
        {(['statistics', 'insights'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSegment(s)}
            className={`flex-1 py-2 ${segment === s ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 text-xs space-y-3">
        {segment === 'statistics' && stats && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Books', value: stats.totalBooks },
                { label: 'Borrowed', value: stats.borrowedBooks },
                { label: 'Completed', value: stats.completedBooks },
                { label: 'Pages read', value: stats.totalPagesRead },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-slate-800 p-2 bg-slate-900/50"
                >
                  <p className="text-slate-500 text-[10px]">{item.label}</p>
                  <p className="text-lg font-bold text-emerald-400">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-slate-400 flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Reading efficiency: {stats.readingEfficiency}%
            </p>
            <div className="space-y-1">
              <p className="text-slate-500 font-mono uppercase text-[10px]">Categories</p>
              {stats.categoryDistribution.map((c) => (
                <div key={c.name} className="flex justify-between text-slate-300">
                  <span className="truncate">{c.name}</span>
                  <span>{c.value}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={exportPdf}
              className="w-full flex items-center justify-center gap-1 py-2 rounded border border-slate-700 text-slate-300 hover:border-emerald-500/40"
            >
              <FileText className="h-3.5 w-3.5" />
              Export PDF report
            </button>
          </>
        )}

        {segment === 'insights' && (
          <>
            <p className="text-slate-500 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              {grounded.length} books selected for chat grounding
            </p>
            {grounded.length === 0 ? (
              <p className="text-slate-600">Select books in the catalog to focus AI context.</p>
            ) : (
              grounded.map((b) => (
                <div key={b.id} className="border border-slate-800 rounded p-2">
                  <p className="text-slate-200 font-medium truncate">{b.title}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">
                    {b.description || b.pdfContent || 'No summary'}
                  </p>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
