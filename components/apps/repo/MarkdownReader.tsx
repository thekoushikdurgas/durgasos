'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RemoteImage } from '@/components/ui/remote-image';
import {
  BookOpen,
  FileText,
  Search,
  X,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Info,
  Lightbulb,
  AlertTriangle,
  Flame,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { swallowClientError } from '@/lib/safe-client-storage';

interface MarkdownReaderProps {
  readmeText: string;
  loading?: boolean;
  username: string;
}

// Slugify helper for linking headings to TOC
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Clean markdown links or extra styling in headers for raw text output
function cleanHeadingText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children.map(cleanHeadingText).join('');
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return cleanHeadingText((children as any).props.children);
  }
  return '';
}

// Helper to escape regex special characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Cleansing relative URLs and rewriting GitHub blob URLs to raw content URLs
function cleanseUrl(url: string, username: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  // If it starts with protocol or is absolute/data URL
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    // Rewrite github blob URLs to raw
    const githubBlobRegex =
      /https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/i;
    const match = trimmed.match(githubBlobRegex);
    if (match) {
      return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}/${match[4]}`;
    }
    return trimmed;
  }
  // Relative URL: prefix with raw github user content path for the profile repo
  const cleanRelative = trimmed.replace(/^\.?\//, '');
  return `https://raw.githubusercontent.com/${username}/${username}/main/${cleanRelative}`;
}

// Decode HTML entities recursively to allow processing of nested/double escaped HTML tags
function decodeHtmlEntities(str: string): string {
  let prev = '';
  let curr = str;
  // Loop up to 10 times to handle potential double/triple/quadruple encoding
  for (let i = 0; i < 10 && curr !== prev; i++) {
    prev = curr;
    curr = curr
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&amp;/gi, '&')
      .replace(/&#39;/gi, "'")
      .replace(/&nbsp;/gi, ' ');
  }
  return curr;
}

// Decode camo hex-encoded URLs to determine original source URL (to identify badges/icons)
function decodeCamoUrl(url: string): string {
  if (!url || !url.includes('camo.githubusercontent.com')) return url;
  try {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    // Check if the last part is a hex string (usually 40+ chars)
    if (/^[0-9a-fA-F]{10,}$/.test(lastPart)) {
      let decoded = '';
      for (let i = 0; i < lastPart.length; i += 2) {
        decoded += String.fromCharCode(parseInt(lastPart.substring(i, i + 2), 16));
      }
      return decoded;
    }
  } catch (err) {
    swallowClientError('markdownReader.decodeCamo', err);
  }
  return url;
}

export function MarkdownReader({ readmeText, loading, username }: MarkdownReaderProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [fontSizeScale, setFontSizeScale] = useState<number>(1.0); // 0.8 to 1.3
  const [showTOC, setShowTOC] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenScrollRef = useRef<HTMLDivElement>(null);

  // Source Data Pre-processing Pipeline
  const cleanReadmeText = useMemo(() => {
    if (!readmeText) return '';

    let clean = readmeText;

    // Decode HTML entities first to allow regex matching of tags like &lt;img ...&gt;
    clean = decodeHtmlEntities(clean);

    // Clean backslash-escaped ampersands in URLs
    clean = clean.replace(/\\&/g, '&');

    // 1. Strip HTML Comments
    clean = clean.replace(/<!--[\s\S]*?-->/g, '');

    // 2. Strip Memory Citations like [memory:5] or [memory:33]
    clean = clean.replace(/\[memory:[^\]]*\]/gi, '');

    // 3. Convert Break tags to newlines
    clean = clean.replace(/<br\s*\/?>/gi, '\n');

    // 4. Convert HTML Image tags <img ...> to markdown ![alt|attributes](src) first
    // (This ensures nested images inside link tags are converted before anchor tags parse them)
    clean = clean.replace(/<img\s+([\s\S]*?)\/?>/gi, (match, attrsString) => {
      const getAttr = (attrs: string, name: string): string => {
        const m = attrs.match(new RegExp(`${name}=(?:["']([^"']+)["']|([^\\s/>]+))`, 'i'));
        return m ? m[1] || m[2] : '';
      };

      const src = getAttr(attrsString, 'src');
      if (!src) return '';
      const width = getAttr(attrsString, 'width');
      const height = getAttr(attrsString, 'height');
      const alt = getAttr(attrsString, 'alt');
      const align = getAttr(attrsString, 'align');

      const parts = [alt || 'image'];
      if (width) parts.push(`width:${width}`);
      if (height) parts.push(`height:${height}`);
      if (align) parts.push(`align:${align}`);

      return `![${parts.join('|')}](${src})`;
    });

    // 5. Convert HTML Anchor tags <a href="URL">CONTENT</a> to markdown [CONTENT](URL)
    clean = clean.replace(/<a\s+[^>]*?href=["']([^"']+)["'][^>]*?>([\s\S]*?)<\/a>/gi, '[$2]($1)');

    // 6. Strip alignment wrapper HTML tags like <p align="center"> or <div align="center">
    clean = clean.replace(/<p\s+[^>]*?>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');
    clean = clean.replace(/<div\s+[^>]*?>([\s\S]*?)<\/div>/gi, '\n\n$1\n\n');

    return clean;
  }, [readmeText]);

  // Close on ESC key in fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Calculate estimated reading time & word count
  const stats = useMemo(() => {
    const words = cleanReadmeText.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(words / 200);
    return {
      wordCount: words,
      readingTime: readingTime,
    };
  }, [cleanReadmeText]);

  // Copy raw content
  const handleCopyRaw = useCallback(() => {
    void navigator.clipboard.writeText(cleanReadmeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [cleanReadmeText]);

  // Parse Table of Contents
  const parsedTOC = useMemo(() => {
    const lines = cleanReadmeText.split('\n');
    const headings: { id: string; text: string; level: number }[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
        const id = slugify(text);
        headings.push({ id, text, level });
      }
    }
    return headings;
  }, [cleanReadmeText]);

  // Scroll to heading helper
  const handleHeadingClick = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Text highlighting recursive helper
  const highlightText = useCallback(
    (node: React.ReactNode): React.ReactNode => {
      const recurse = (n: React.ReactNode): React.ReactNode => {
        if (typeof n === 'string') {
          if (!searchTerm.trim()) return n;
          const parts = n.split(new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi'));
          return parts.map((part, i) =>
            part.toLowerCase() === searchTerm.toLowerCase() ? (
              <mark key={i} className="bg-yellow-500/40 text-yellow-100 px-0.5 rounded font-medium">
                {part}
              </mark>
            ) : (
              part
            )
          );
        }
        if (Array.isArray(n)) {
          return n.map((child, idx) => <span key={idx}>{recurse(child)}</span>);
        }
        if (n && typeof n === 'object' && React.isValidElement(n)) {
          const element = n as React.ReactElement<{ children?: React.ReactNode }>;
          if (element.props && element.props.children) {
            return React.cloneElement(element, {}, recurse(element.props.children));
          }
        }
        return n;
      };
      return recurse(node);
    },
    [searchTerm]
  );

  // Custom component renderers for ReactMarkdown
  const customRenderers = useMemo(() => {
    const createHeadingRenderer = (level: number) => {
      const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      const classes = [
        'font-bold text-white tracking-tight mt-6 mb-3 border-b border-white/5 pb-1',
        level === 1 ? 'text-2xl mt-4 border-white/10 pb-2' : '',
        level === 2 ? 'text-xl' : '',
        level === 3 ? 'text-lg' : '',
        level === 4 ? 'text-base' : '',
        'text-sm',
      ].join(' ');

      const HeadingComp = ({ children, ...props }: any) => {
        const textContent = cleanHeadingText(children);
        const slugId = slugify(textContent);
        return React.createElement(
          Tag,
          { id: slugId, className: `${classes} group flex items-center gap-2`, ...props },
          <span className="text-violet-400/40 font-mono text-[0.8em] font-normal group-hover:text-violet-400 select-none">
            {'#'.repeat(level)}
          </span>,
          <span className="flex-1">{highlightText(children)}</span>,
          <a
            href={`#${slugId}`}
            className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/60 text-xs transition-opacity"
            title="Anchor Link"
          >
            #
          </a>
        );
      };
      HeadingComp.displayName = `Heading${level}`;
      return HeadingComp;
    };

    // Remove [!NOTE] etc. from children elements
    const removeAlertTag = (children: React.ReactNode, tag: string): React.ReactNode => {
      if (typeof children === 'string') {
        return children.replace(tag, '').trim();
      }
      if (Array.isArray(children)) {
        return children.map((child) => removeAlertTag(child, tag));
      }
      if (children && typeof children === 'object' && React.isValidElement(children)) {
        const el = children as React.ReactElement<{ children?: React.ReactNode }>;
        if (el.props && el.props.children) {
          return React.cloneElement(el, {}, removeAlertTag(el.props.children, tag));
        }
      }
      return children;
    };

    return {
      h1: createHeadingRenderer(1),
      h2: createHeadingRenderer(2),
      h3: createHeadingRenderer(3),
      h4: createHeadingRenderer(4),
      h5: createHeadingRenderer(5),
      h6: createHeadingRenderer(6),

      p: ({ children }: any) => {
        const childrenArray = React.Children.toArray(children);
        // Helper to check if a node is an inline badge or icon
        const isBadgeElement = (node: any): boolean => {
          if (!node) return true;
          if (typeof node === 'string') {
            return node.trim() === '';
          }
          if (Array.isArray(node)) {
            return node.every(isBadgeElement);
          }
          if (React.isValidElement(node)) {
            const type = node.type as any;
            const props = (node.props as any) || {};

            // Check if it's an image (either standard 'img' tag, custom img component, or has src/alt props)
            const isImg =
              type === 'img' ||
              props.src !== undefined ||
              (typeof type === 'function' && (type.name === 'img' || type.displayName === 'img'));

            if (isImg) {
              const src = props.src || '';
              const alt = props.alt || '';
              const width = props.width;
              const height = props.height;
              const decodedSrc = decodeCamoUrl(cleanseUrl(src, username));
              return (
                (width && parseInt(width) < 120) ||
                (height && parseInt(height) < 40) ||
                src.includes('shields.io') ||
                src.includes('badge') ||
                src.includes('paw-waving') ||
                decodedSrc.includes('shields.io') ||
                decodedSrc.includes('badge') ||
                decodedSrc.includes('simple-icons') ||
                decodedSrc.includes('jsdelivr') ||
                alt.toLowerCase().includes('badge') ||
                alt.toLowerCase().includes('icon') ||
                [
                  'c',
                  'c++',
                  'java',
                  'python',
                  'javascript',
                  'js',
                  'ts',
                  'typescript',
                  'php',
                  'html',
                  'css',
                  'linux',
                  'windows',
                  'github',
                  'linkedin',
                ].includes(alt.toLowerCase().trim())
              );
            }

            // Check if it's an anchor (either standard 'a' tag, custom a component, or has href prop)
            const isAnchor =
              type === 'a' ||
              props.href !== undefined ||
              (typeof type === 'function' && (type.name === 'a' || type.displayName === 'a'));

            if (isAnchor) {
              return isBadgeElement(props.children);
            }

            // Check if it's a span or div
            const isSpanOrDiv =
              type === 'span' ||
              type === 'div' ||
              (typeof type === 'function' &&
                (type.name === 'span' ||
                  type.displayName === 'span' ||
                  type.name === 'div' ||
                  type.displayName === 'div'));

            if (isSpanOrDiv) {
              return isBadgeElement(props.children);
            }
          }
          return false;
        };

        const onlyBadges = childrenArray.length > 0 && childrenArray.every(isBadgeElement);
        if (onlyBadges) {
          return (
            <span className="inline-flex flex-wrap gap-1.5 items-center my-1 select-text">
              {children}
            </span>
          );
        }

        return <p className="leading-relaxed mb-4 text-white/75">{highlightText(children)}</p>;
      },

      li: ({ children, checked, ...props }: any) => {
        if (checked !== undefined) {
          // Task list item
          return (
            <li className="flex items-start gap-2.5 my-1.5 list-none text-white/75" {...props}>
              <span className="mt-1 shrink-0 flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-white/5">
                {checked ? <Check className="h-2.5 w-2.5 text-violet-400 stroke-[3]" /> : null}
              </span>
              <span className={checked ? 'line-through text-white/40' : ''}>
                {highlightText(children)}
              </span>
            </li>
          );
        }
        return <li className="my-1 text-white/75">{highlightText(children)}</li>;
      },

      ul: ({ children, ...props }: any) => {
        // Detect if task lists exist inside
        const hasTasks = Array.isArray(children)
          ? children.some((c: any) => c?.props?.checked !== undefined)
          : children?.props?.checked !== undefined;
        return (
          <ul
            className={`${hasTasks ? 'space-y-1.5' : 'list-disc pl-5 space-y-1 my-4'} text-white/80`}
            {...props}
          >
            {children}
          </ul>
        );
      },

      ol: ({ children, ...props }: any) => (
        <ol className="list-decimal pl-5 space-y-1 my-4 text-white/80" {...props}>
          {children}
        </ol>
      ),

      a: ({ href, children, ...props }: any) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-400 hover:text-violet-300 font-medium underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
          {...props}
        >
          {highlightText(children)}
        </a>
      ),

      img: ({ src, alt }: any) => {
        let actualAlt = alt || '';
        let width: string | undefined;
        let height: string | undefined;
        let align: string | undefined;

        if (actualAlt.includes('|')) {
          const parts = actualAlt.split('|');
          actualAlt = parts[0];
          for (const part of parts.slice(1)) {
            const [key, val] = part.split(':');
            if (key === 'width') width = val;
            if (key === 'height') height = val;
            if (key === 'align') align = val;
          }
        }

        const resolvedSrc = cleanseUrl(src, username);

        // Standardize badges and icons display inline
        const decodedSrc = decodeCamoUrl(resolvedSrc);
        const isBadgeOrIcon =
          (width && parseInt(width) < 120) ||
          (height && parseInt(height) < 40) ||
          resolvedSrc.includes('shields.io') ||
          resolvedSrc.includes('badge') ||
          resolvedSrc.includes('paw-waving') ||
          decodedSrc.includes('shields.io') ||
          decodedSrc.includes('badge') ||
          decodedSrc.includes('simple-icons') ||
          decodedSrc.includes('jsdelivr') ||
          actualAlt.toLowerCase().includes('badge') ||
          actualAlt.toLowerCase().includes('icon') ||
          [
            'c',
            'c++',
            'java',
            'python',
            'javascript',
            'js',
            'ts',
            'typescript',
            'php',
            'html',
            'css',
            'linux',
            'windows',
            'github',
            'linkedin',
          ].includes(actualAlt.toLowerCase().trim());

        if (isBadgeOrIcon) {
          return (
            <RemoteImage
              src={resolvedSrc}
              alt={actualAlt}
              style={{
                display: 'inline-block',
                verticalAlign: 'middle',
                width: width
                  ? width.endsWith('%') || width.endsWith('px')
                    ? width
                    : `${width}px`
                  : 'auto',
                height: height
                  ? height.endsWith('%') || height.endsWith('px')
                    ? height
                    : `${height}px`
                  : 'auto',
                margin: '0 4px',
              }}
              className="rounded-sm animate-fade-in duration-200"
              width={parseInt(width ?? '120', 10) || 120}
              height={parseInt(height ?? '40', 10) || 40}
            />
          );
        }

        // Standard image display block-centered
        return (
          <span className="block my-6 text-center">
            <RemoteImage
              src={resolvedSrc}
              alt={actualAlt}
              style={{
                display: 'inline-block',
                maxWidth: '100%',
                width: width
                  ? width.endsWith('%') || width.endsWith('px')
                    ? width
                    : `${width}px`
                  : 'auto',
                height: height
                  ? height.endsWith('%') || height.endsWith('px')
                    ? height
                    : `${height}px`
                  : 'auto',
              }}
              className="rounded-lg shadow-md border border-white/5"
              width={parseInt(width ?? '800', 10) || 800}
              height={parseInt(height ?? '600', 10) || 600}
            />
          </span>
        );
      },

      blockquote: ({ children }: any) => {
        const textContent = cleanHeadingText(children).trim();
        const alerts = {
          '[!NOTE]': {
            label: 'Note',
            color: 'border-sky-500/80 bg-sky-500/[0.04] text-sky-400',
            icon: Info,
          },
          '[!TIP]': {
            label: 'Tip',
            color: 'border-emerald-500/80 bg-emerald-500/[0.04] text-emerald-400',
            icon: Lightbulb,
          },
          '[!IMPORTANT]': {
            label: 'Important',
            color: 'border-violet-500/80 bg-violet-500/[0.04] text-violet-400',
            icon: Sparkles,
          },
          '[!WARNING]': {
            label: 'Warning',
            color: 'border-amber-500/80 bg-amber-500/[0.04] text-amber-400',
            icon: AlertTriangle,
          },
          '[!CAUTION]': {
            label: 'Caution',
            color: 'border-rose-500/80 bg-rose-500/[0.04] text-rose-400',
            icon: Flame,
          },
        };

        const match = Object.keys(alerts).find((key) => textContent.startsWith(key)) as
          | keyof typeof alerts
          | undefined;

        if (match) {
          const alert = alerts[match];
          const Icon = alert.icon;
          const cleanChildren = removeAlertTag(children, match);
          return (
            <div
              className={`my-4 flex flex-col gap-1.5 rounded-xl border-l-4 p-3.5 text-xs ${alert.color}`}
            >
              <div className="flex items-center gap-2 font-semibold tracking-wide uppercase text-[10px]">
                <Icon className="h-3.5 w-3.5" />
                {alert.label}
              </div>
              <div className="text-white/80 leading-relaxed font-normal">{cleanChildren}</div>
            </div>
          );
        }

        return (
          <blockquote className="my-4 border-l-4 border-white/10 pl-4 italic text-white/50">
            {children}
          </blockquote>
        );
      },

      table: ({ children }: any) => (
        <div className="my-5 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.01]">
          <table className="w-full border-collapse text-left text-xs text-white/80">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }: any) => (
        <thead className="border-b border-white/10 bg-white/[0.04] text-white/95 font-semibold">
          {children}
        </thead>
      ),
      tbody: ({ children }: any) => <tbody className="divide-y divide-white/5">{children}</tbody>,
      tr: ({ children }: any) => (
        <tr className="hover:bg-white/[0.01] transition-colors">{children}</tr>
      ),
      th: ({ children }: any) => <th className="p-3 font-semibold">{children}</th>,
      td: ({ children }: any) => <td className="p-3 text-white/70">{children}</td>,

      code: ({ className, children, ...props }: any) => {
        const textCode = String(children).replace(/\n$/, '');
        const match = /language-(\w+)/.exec(className || '');
        const isInline = !match && !textCode.includes('\n');

        if (isInline) {
          return (
            <code
              className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-violet-300 font-mono text-[0.88em] break-words"
              {...props}
            >
              {highlightText(children)}
            </code>
          );
        }

        // Language code blocks
        const lang = match ? match[1] : 'code';
        return <CodeBlock lang={lang} code={textCode} />;
      },
    };
  }, [highlightText, username]);

  // Reading style container scale
  const contentStyle = {
    fontSize: `${fontSizeScale}rem`,
    lineHeight: '1.75',
  };

  const showLoader = loading || !readmeText;

  // The main scrollable reader layout
  const renderReaderContent = (scrollRef: React.RefObject<HTMLDivElement | null>) => {
    if (showLoader) {
      return (
        <div className="flex h-full min-h-[160px] items-center justify-center text-xs text-white/45 gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-400" />
          Loading Reader...
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 divide-x divide-white/10">
        {/* Table of Contents Side Panel */}
        {showTOC && parsedTOC.length > 0 ? (
          <aside className="w-56 shrink-0 flex-col gap-2 p-4 overflow-y-auto hidden md:flex">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-white/35 mb-2 px-1 flex items-center gap-1.5">
              <BookOpen className="h-3 w-3" />
              Document Outline
            </h5>
            <nav className="flex flex-col gap-0.5">
              {parsedTOC.map((h, i) => (
                <button
                  key={i}
                  onClick={() => handleHeadingClick(h.id)}
                  style={{ paddingLeft: `${(h.level - 1) * 8 + 4}px` }}
                  className="group flex items-center gap-1.5 text-left text-[11px] py-1 px-1.5 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/[0.04] transition-all font-medium truncate"
                >
                  <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-100 text-violet-400 transition-opacity" />
                  <span className="truncate">{h.text}</span>
                </button>
              ))}
            </nav>
          </aside>
        ) : null}

        {/* Content Viewer */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 scrollbar-thin scroll-smooth select-text"
        >
          {viewMode === 'preview' ? (
            <div
              style={contentStyle}
              className="prose prose-invert prose-sm max-w-none prose-headings:font-bold prose-hr:border-white/10"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={customRenderers as any}>
                {cleanReadmeText}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="relative font-mono text-xs leading-relaxed text-white/70 bg-black/30 border border-white/5 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap select-text">
              {highlightText(cleanReadmeText)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-2 gap-2 text-xs">
      {/* File info details */}
      <div className="flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-violet-400" />
        <span className="font-mono font-semibold text-white/80 text-[11px]">
          {username} / README.md
        </span>
        <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/40">
          Read-only
        </span>
        {!showLoader ? (
          <span className="text-[10px] text-white/35 hidden sm:inline border-l border-white/10 pl-2">
            {stats.wordCount.toLocaleString()} words · {stats.readingTime} min read
          </span>
        ) : null}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Find Search Panel */}
        {showSearch && (
          <div className="relative flex items-center shrink-0">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/35" />
            <input
              type="text"
              placeholder="Find in file..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-32 rounded-lg border border-white/10 bg-white/[0.05] py-0.5 pl-7 pr-6 text-[10px] text-white/90 outline-none placeholder:text-white/25 focus:border-violet-400/30"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/75"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => {
            setShowSearch(!showSearch);
            if (showSearch) setSearchTerm('');
          }}
          className={`p-1.5 rounded-lg border transition-all hover:bg-white/[0.06] ${
            showSearch
              ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
              : 'border-white/5 text-white/50'
          }`}
          title="Search Document"
        >
          <Search className="h-3.5 w-3.5" />
        </button>

        {/* View Mode Toggle */}
        <div className="flex rounded-lg border border-white/5 bg-white/5 p-0.5">
          <button
            onClick={() => setViewMode('preview')}
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all ${
              viewMode === 'preview'
                ? 'bg-violet-500/30 text-violet-200 shadow-sm'
                : 'text-white/55 hover:text-white/85'
            }`}
          >
            Reader
          </button>
          <button
            onClick={() => setViewMode('source')}
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all ${
              viewMode === 'source'
                ? 'bg-violet-500/30 text-violet-200 shadow-sm'
                : 'text-white/55 hover:text-white/85'
            }`}
          >
            Source
          </button>
        </div>

        {/* Outline / Table of Contents */}
        {parsedTOC.length > 0 && (
          <button
            onClick={() => setShowTOC(!showTOC)}
            className={`p-1.5 rounded-lg border transition-all hover:bg-white/[0.06] ${
              showTOC
                ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                : 'border-white/5 text-white/50'
            }`}
            title="Outline"
          >
            <BookOpen className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Font Zoom Controls */}
        <div className="flex rounded-lg border border-white/5 bg-white/5 p-0.5 items-center">
          <button
            onClick={() => setFontSizeScale((s) => Math.max(0.8, s - 0.1))}
            className="p-1 rounded text-white/50 hover:text-white/85"
            title="Zoom Out Font"
          >
            <ZoomOut className="h-3 w-3" />
          </button>
          <span className="text-[9px] font-mono font-medium text-white/40 px-1 select-none">
            {Math.round(fontSizeScale * 100)}%
          </span>
          <button
            onClick={() => setFontSizeScale((s) => Math.min(1.3, s + 0.1))}
            className="p-1 rounded text-white/50 hover:text-white/85"
            title="Zoom In Font"
          >
            <ZoomIn className="h-3 w-3" />
          </button>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopyRaw}
          className="p-1.5 rounded-lg border border-white/5 text-white/50 hover:bg-white/[0.06] hover:text-white/85 transition-all"
          title="Copy Markdown"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Focus Mode (Fullscreen) toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 rounded-lg border border-white/5 text-white/50 hover:bg-white/[0.06] hover:text-white/85 transition-all"
          title="Fullscreen Focus Mode"
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Inline Reader container */}
      <div className="flex-1 flex flex-col min-h-0 border border-white/10 bg-white/[0.03] rounded-2xl overflow-hidden shadow-inner">
        {toolbar}
        <div className="flex-1 min-h-0 max-h-[360px] flex flex-col bg-white/[0.005]">
          {renderReaderContent(scrollContainerRef)}
        </div>
      </div>

      {/* Fullscreen Overlay / Focus Mode */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/98 backdrop-blur-xl p-4 md:p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-6xl mx-auto flex flex-col h-full bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header controls inside fullscreen */}
            <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-white/[0.04] px-5 py-3 gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-violet-400" />
                <span className="font-mono font-bold text-white text-[13px]">
                  {username} / README.md
                </span>
                <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 text-[9px] font-semibold text-violet-300">
                  Focus Mode
                </span>
                <span className="text-[11px] text-white/45 hidden sm:inline border-l border-white/10 pl-2.5">
                  {stats.wordCount.toLocaleString()} words · {stats.readingTime} min read
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Same toolbar controls replicated in fullscreen */}
                {showSearch && (
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                    <input
                      type="text"
                      placeholder="Find in file..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-40 rounded-lg border border-white/10 bg-white/[0.05] py-1 pl-8 pr-6 text-xs text-white/90 outline-none focus:border-violet-400/30"
                      autoFocus
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/75"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowSearch(!showSearch);
                    if (showSearch) setSearchTerm('');
                  }}
                  className={`p-2 rounded-lg border transition-all hover:bg-white/[0.06] ${
                    showSearch
                      ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                      : 'border-white/10 text-white/50'
                  }`}
                >
                  <Search className="h-4 w-4" />
                </button>
                <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                      viewMode === 'preview'
                        ? 'bg-violet-500/30 text-violet-200 shadow-sm'
                        : 'text-white/55 hover:text-white/85'
                    }`}
                  >
                    Reader
                  </button>
                  <button
                    onClick={() => setViewMode('source')}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                      viewMode === 'source'
                        ? 'bg-violet-500/30 text-violet-200 shadow-sm'
                        : 'text-white/55 hover:text-white/85'
                    }`}
                  >
                    Source
                  </button>
                </div>
                {parsedTOC.length > 0 && (
                  <button
                    onClick={() => setShowTOC(!showTOC)}
                    className={`p-2 rounded-lg border transition-all hover:bg-white/[0.06] ${
                      showTOC
                        ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                        : 'border-white/10 text-white/50'
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                  </button>
                )}
                <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5 items-center">
                  <button
                    onClick={() => setFontSizeScale((s) => Math.max(0.8, s - 0.1))}
                    className="p-1 rounded text-white/50 hover:text-white/85"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[10px] font-mono font-medium text-white/40 px-1.5 select-none">
                    {Math.round(fontSizeScale * 100)}%
                  </span>
                  <button
                    onClick={() => setFontSizeScale((s) => Math.min(1.3, s + 0.1))}
                    className="p-1 rounded text-white/50 hover:text-white/85"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={handleCopyRaw}
                  className="p-2 rounded-lg border border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/85"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-lg border border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-rose-400 hover:border-rose-500/25 transition-all"
                  title="Close Fullscreen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Viewport for reading */}
            <div className="flex-1 min-h-0 flex bg-[#0c0d12]/50">
              {renderReaderContent(fullscreenScrollRef)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Inline Sub-component for individual Code Block with Header and Copy button
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-white/10 bg-[#07080b]">
      {/* Codeblock Header */}
      <div className="flex items-center justify-between bg-white/[0.02] border-b border-white/5 px-4 py-2 text-[10px] text-white/45">
        <div className="flex items-center gap-1.5">
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500/70" />
            <span className="h-2 w-2 rounded-full bg-amber-500/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
          </span>
          <span className="ml-1 text-[9px] uppercase tracking-wider font-semibold font-mono text-white/50">
            {lang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
          type="button"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Text Area */}
      <pre className="overflow-x-auto p-4 text-xs font-mono text-white/90 scrollbar-thin select-text">
        <code>{code}</code>
      </pre>
    </div>
  );
}
