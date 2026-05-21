'use client';

import { useMemo, useState } from 'react';

import {
  APP_CATEGORY_LABELS,
  APP_DESCRIPTIONS,
  ALL_APP_TAGS,
  getAppsForLauncher,
  type AppCategory,
  type AppDefinition,
} from '@/lib/apps';

export type LauncherCategoryFilter = 'all' | AppCategory;

export type LauncherFilters = {
  query: string;
  setQuery: (q: string) => void;
  category: LauncherCategoryFilter;
  setCategory: (c: LauncherCategoryFilter) => void;
  tag: string;
  setTag: (t: string) => void;
  apps: AppDefinition[];
  tagOptions: string[];
  categoryOptions: { value: LauncherCategoryFilter; label: string }[];
  filterKey: string;
};

const CATEGORY_OPTIONS: { value: LauncherCategoryFilter; label: string }[] = [
  { value: 'all', label: 'All categories' },
  { value: 'core', label: APP_CATEGORY_LABELS.core },
  { value: 'workflows', label: APP_CATEGORY_LABELS.workflows },
  { value: 'data', label: APP_CATEGORY_LABELS.data },
  { value: 'system', label: APP_CATEGORY_LABELS.system },
];

export function useLauncherFilters(): LauncherFilters {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<LauncherCategoryFilter>('all');
  const [tag, setTag] = useState('all');

  const apps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return getAppsForLauncher().filter((app) => {
      if (category !== 'all' && app.category !== category) return false;
      if (tag !== 'all' && !app.tags.includes(tag)) return false;
      if (!q) return true;
      const desc = APP_DESCRIPTIONS[app.id]?.toLowerCase() ?? '';
      const catLabel = APP_CATEGORY_LABELS[app.category].toLowerCase();
      return (
        app.name.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q) ||
        catLabel.includes(q) ||
        desc.includes(q) ||
        app.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, category, tag]);

  const filterKey = `${category}|${tag}|${query.trim().toLowerCase()}`;

  return {
    query,
    setQuery,
    category,
    setCategory,
    tag,
    setTag,
    apps,
    tagOptions: ['all', ...ALL_APP_TAGS],
    categoryOptions: CATEGORY_OPTIONS,
    filterKey,
  };
}
