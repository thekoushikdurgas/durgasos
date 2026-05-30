export enum Tool {
  Minifier = 'MINIFIER',
  IconGenerator = 'ICON_GENERATOR',
  Cheatsheet = 'CHEATSHEET',
  RegexGenerator = 'REGEX_GENERATOR',
  JsonToType = 'JSON_TO_TYPE',
  CodeRefactor = 'CODE_REFACTOR',
  WebsiteAnalyzer = 'WEBSITE_ANALYZER',
  PromptEnhancer = 'PROMPT_ENHANCER',
  JsonToToon = 'JSON_TO_TOON',
  CodeEditorSheet = 'CODE_EDITOR_SHEET',
  MemoryBank = 'MEMORY_BANK',
}

export const TOOL_LABELS: Record<Tool, string> = {
  [Tool.Minifier]: 'Code Minifier',
  [Tool.IconGenerator]: 'Icon Generator',
  [Tool.Cheatsheet]: 'AI Cheatsheets',
  [Tool.RegexGenerator]: 'Regex Gen & Explainer',
  [Tool.JsonToType]: 'JSON to Type',
  [Tool.CodeRefactor]: 'AI Refactor',
  [Tool.WebsiteAnalyzer]: 'Website Analyzer',
  [Tool.PromptEnhancer]: 'Prompt Enhancer',
  [Tool.JsonToToon]: 'JSON to TOON',
  [Tool.CodeEditorSheet]: 'Code Editor',
  [Tool.MemoryBank]: 'Memory Bank',
};
