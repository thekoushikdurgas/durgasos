'use client';

import { useState } from 'react';
import { Globe, Sparkles } from 'lucide-react';

import { analyzeWebsiteHtml } from '@/lib/dev-tool-api';
import { useDevToolGateway } from '@/hooks/use-dev-tool-gateway';

import styles from '../DevToolApp.module.css';
import { CopyButton, LoadingState, ToolPanel } from './shared';

type Tab = 'code' | 'assets' | 'info';

export function WebsiteAnalyzerTab() {
  const { fetchPage } = useDevToolGateway();
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const [assets, setAssets] = useState<{
    images: string[];
    videos: string[];
    scripts: string[];
    styles: string[];
  } | null>(null);
  const [pageInfo, setPageInfo] = useState<Record<string, unknown> | null>(null);

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchPage(url);
      setAssets(fetched.assets);
      setPageInfo(fetched.pageInfo as Record<string, unknown>);
      const analyzed = await analyzeWebsiteHtml(fetched.html, url);
      setGeneratedCode(analyzed.generatedCode);
      setAssets(analyzed.assets);
      setPageInfo(analyzed.pageInfo);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPanel
      title="Website Analyzer"
      description="Fetch a page via backend, then generate standalone HTML with AI."
    >
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 rounded bg-slate-800 border border-slate-600 px-3 py-2 text-sm"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
        />
        <button type="button" className={styles.btn} disabled={loading} onClick={() => void run()}>
          <Globe className="h-4 w-4" />
          <Sparkles className="h-4 w-4" />
          Analyze
        </button>
      </div>
      {loading && <LoadingState />}
      {error && <p className={styles.error}>{error}</p>}
      {generatedCode && (
        <>
          <div className="flex gap-2 mb-2">
            {(['code', 'assets', 'info'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.btn} ${activeTab === t ? '' : styles.btnSecondary}`}
                onClick={() => setActiveTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {activeTab === 'code' && (
            <>
              <CopyButton text={generatedCode} />
              <pre className={styles.output} style={{ maxHeight: '32rem' }}>
                {generatedCode}
              </pre>
            </>
          )}
          {activeTab === 'assets' && assets && (
            <div className="text-xs space-y-3 max-h-96 overflow-auto">
              {(['images', 'styles', 'scripts', 'videos'] as const).map((k) => (
                <div key={k}>
                  <h4 className="font-medium text-slate-300 capitalize">{k}</h4>
                  <ul className="list-disc pl-4 text-slate-400">
                    {assets[k].slice(0, 30).map((u) => (
                      <li key={u} className="truncate">
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'info' && pageInfo && (
            <pre className={styles.output}>{JSON.stringify(pageInfo, null, 2)}</pre>
          )}
        </>
      )}
    </ToolPanel>
  );
}
