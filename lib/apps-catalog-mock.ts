export type AppPackageCategory =
  | 'Audio'
  | 'Video'
  | 'Graphics'
  | 'Games'
  | 'Internet'
  | 'Office'
  | 'Development'
  | 'Tools'
  | 'Other';

export type AppPackage = {
  id: string;
  name: string;
  category: AppPackageCategory;
  version: string;
  license: string;
  sizeBytes: number;
  description: string;
  downloadUrl: string;
  installed: boolean;
};

export const MOCK_APP_PACKAGES: AppPackage[] = [
  {
    id: 'gimp',
    name: 'GIMP',
    category: 'Graphics',
    version: '2.10.36',
    license: 'GPL',
    sizeBytes: 250_000_000,
    description: 'Raster image editor.',
    downloadUrl: 'https://www.gimp.org',
    installed: false,
  },
  {
    id: 'inkscape',
    name: 'Inkscape',
    category: 'Graphics',
    version: '1.3.2',
    license: 'GPL',
    sizeBytes: 120_000_000,
    description: 'Vector graphics editor.',
    downloadUrl: 'https://inkscape.org',
    installed: false,
  },
  {
    id: 'vlc',
    name: 'VLC',
    category: 'Video',
    version: '3.0.20',
    license: 'GPL',
    sizeBytes: 45_000_000,
    description: 'Media player.',
    downloadUrl: 'https://videolan.org',
    installed: true,
  },
  {
    id: 'vscode',
    name: 'VS Code',
    category: 'Development',
    version: '1.89',
    license: 'MIT',
    sizeBytes: 400_000_000,
    description: 'Code editor.',
    downloadUrl: 'https://code.visualstudio.com',
    installed: false,
  },
  {
    id: '7zip',
    name: '7-Zip',
    category: 'Tools',
    version: '24.08',
    license: 'LGPL',
    sizeBytes: 1_500_000,
    description: 'File archiver.',
    downloadUrl: 'https://7-zip.org',
    installed: false,
  },
];

export function packagesByCategory(cat: AppPackageCategory | 'All'): AppPackage[] {
  if (cat === 'All') return MOCK_APP_PACKAGES;
  return MOCK_APP_PACKAGES.filter((p) => p.category === cat);
}
