'use client';

import { useState } from 'react';
import { Wrench } from 'lucide-react';

import { Tool, TOOL_LABELS } from './types';
import styles from './DevToolApp.module.css';
import { CodeMinifierTab } from './tabs/CodeMinifierTab';
import { IconGeneratorTab } from './tabs/IconGeneratorTab';
import { CheatsheetTab } from './tabs/CheatsheetTab';
import { RegexTab } from './tabs/RegexTab';
import { JsonToTypeTab } from './tabs/JsonToTypeTab';
import { JsonToToonTab } from './tabs/JsonToToonTab';
import { CodeRefactorTab } from './tabs/CodeRefactorTab';
import { WebsiteAnalyzerTab } from './tabs/WebsiteAnalyzerTab';
import { PromptEnhancerTab } from './tabs/PromptEnhancerTab';
import { CodeEditorTab } from './tabs/CodeEditorTab';
import { MemoryBankTab } from './tabs/MemoryBankTab';

const NAV_ORDER: Tool[] = [
  Tool.Minifier,
  Tool.IconGenerator,
  Tool.Cheatsheet,
  Tool.RegexGenerator,
  Tool.JsonToType,
  Tool.JsonToToon,
  Tool.CodeRefactor,
  Tool.WebsiteAnalyzer,
  Tool.PromptEnhancer,
  Tool.CodeEditorSheet,
  Tool.MemoryBank,
];

function renderTool(tool: Tool) {
  switch (tool) {
    case Tool.Minifier:
      return <CodeMinifierTab />;
    case Tool.IconGenerator:
      return <IconGeneratorTab />;
    case Tool.Cheatsheet:
      return <CheatsheetTab />;
    case Tool.RegexGenerator:
      return <RegexTab />;
    case Tool.JsonToType:
      return <JsonToTypeTab />;
    case Tool.JsonToToon:
      return <JsonToToonTab />;
    case Tool.CodeRefactor:
      return <CodeRefactorTab />;
    case Tool.WebsiteAnalyzer:
      return <WebsiteAnalyzerTab />;
    case Tool.PromptEnhancer:
      return <PromptEnhancerTab />;
    case Tool.CodeEditorSheet:
      return <CodeEditorTab />;
    case Tool.MemoryBank:
      return <MemoryBankTab />;
    default:
      return null;
  }
}

export function DevToolApp() {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.Minifier);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Wrench className="h-5 w-5 text-indigo-400" />
          Dev AI
        </div>
        <nav className={styles.nav}>
          {NAV_ORDER.map((tool) => (
            <button
              key={tool}
              type="button"
              className={`${styles.navBtn} ${activeTool === tool ? styles.navBtnActive : ''}`}
              onClick={() => setActiveTool(tool)}
            >
              {TOOL_LABELS[tool]}
            </button>
          ))}
        </nav>
      </aside>
      <main className={styles.main}>{renderTool(activeTool)}</main>
    </div>
  );
}

export default DevToolApp;
