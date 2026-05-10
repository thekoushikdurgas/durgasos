'use client';

import React, { useCallback, useState } from 'react';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MockFsEntry, PathSegments } from '@/lib/file-explorer-mock';
import { formatPathDisplay, listDirectory, pathExists, pathKey } from '@/lib/file-explorer-mock';

function pathStartsWith(current: PathSegments, prefix: PathSegments): boolean {
  if (prefix.length > current.length) return false;
  return prefix.every((s, i) => s === current[i]);
}

function isFolderLike(e: MockFsEntry): boolean {
  return e.kind !== 'file';
}

export function FolderTree({
  currentPath,
  onNavigate,
}: {
  currentPath: PathSegments;
  onNavigate: (p: PathSegments) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['This PC', 'Network']));

  const toggle = useCallback((k: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);

  const renderBranch = (segments: PathSegments, depth: number): React.ReactNode => {
    const key = pathKey(segments);
    const entries = listDirectory(segments).filter(isFolderLike);
    const isExpanded = expanded.has(key);
    const isActive = pathStartsWith(currentPath, segments) && currentPath.length >= segments.length;

    return (
      <div key={key} className="select-none">
        <button
          type="button"
          onClick={() => onNavigate(segments)}
          className={cn(
            'flex w-full items-center gap-0.5 rounded px-1 py-0.5 text-left text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50',
            pathKey(currentPath) === key
              ? 'bg-blue-500/25 text-blue-200'
              : 'text-slate-400 hover:bg-white/5',
            isActive && pathKey(currentPath) !== key ? 'text-slate-300' : ''
          )}
          style={{ paddingLeft: 4 + depth * 10 }}
        >
          {entries.length > 0 ? (
            <span
              role="button"
              tabIndex={0}
              className="shrink-0 p-0.5 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                toggle(key);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  toggle(key);
                }
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" aria-hidden />
              ) : (
                <ChevronRight className="h-3 w-3" aria-hidden />
              )}
            </span>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <Folder className="h-3 w-3 shrink-0 text-blue-400/80" />
          <span className="min-w-0 truncate">{segments[segments.length - 1]}</span>
        </button>
        {isExpanded && entries.length > 0 ? (
          <div>
            {entries.map((e) => {
              const child = [...segments, e.name] as PathSegments;
              if (!pathExists(child)) return null;
              return (
                <React.Fragment key={pathKey(child)}>
                  {renderBranch(child, depth + 1)}
                </React.Fragment>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  const roots: PathSegments[] = [['This PC'], ['Network'], ['Recycle Bin']].filter((p) =>
    pathExists(p)
  );

  return (
    <div className="flex flex-col gap-0.5 text-xs" aria-label="Folder tree">
      {roots.map((r) => (
        <React.Fragment key={pathKey(r)}>{renderBranch(r, 0)}</React.Fragment>
      ))}
      <p className="mt-2 px-1 text-[9px] text-white/30">
        Current: {formatPathDisplay(currentPath)}
      </p>
    </div>
  );
}
