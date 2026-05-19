/**
 * Void-style fast apply: parse <<<<<<< ORIGINAL / ======= / >>>>>>> UPDATED blocks
 * and optional markdown code fences for slow apply.
 */

const ORIGINAL_MARK = '<<<<<<< ORIGINAL';
const DIVIDER_MARK = '=======';
const UPDATED_MARK = '>>>>>>> UPDATED';

export type SearchReplaceBlock = {
  original: string;
  updated: string;
};

export type CodeFence = {
  lang: string;
  code: string;
};

export type ApplyResult =
  | { ok: true; text: string; replacedCount: number }
  | { ok: false; reason: string };

/** Extract Void-style search/replace blocks from model output. */
export function parseFastApplyBlocks(aiText: string): SearchReplaceBlock[] {
  const blocks: SearchReplaceBlock[] = [];
  let cursor = 0;
  while (cursor < aiText.length) {
    const start = aiText.indexOf(ORIGINAL_MARK, cursor);
    if (start === -1) break;
    const div = aiText.indexOf(DIVIDER_MARK, start + ORIGINAL_MARK.length);
    if (div === -1) break;
    const end = aiText.indexOf(UPDATED_MARK, div + DIVIDER_MARK.length);
    if (end === -1) break;

    const original = aiText
      .slice(start + ORIGINAL_MARK.length, div)
      .replace(/^\r?\n/, '')
      .replace(/\r?\n$/, '');
    const updated = aiText
      .slice(div + DIVIDER_MARK.length, end)
      .replace(/^\r?\n/, '')
      .replace(/\r?\n$/, '');

    blocks.push({ original, updated });
    cursor = end + UPDATED_MARK.length;
  }
  return blocks;
}

/** Extract ```lang ... ``` fences (non-nested). */
export function parseCodeFences(aiText: string): CodeFence[] {
  const out: CodeFence[] = [];
  const re = /```([\w-]*)\r?\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(aiText)) !== null) {
    const lang = (m[1] ?? '').trim() || 'text';
    const code = m[2] ?? '';
    if (code.trim().length > 0) {
      out.push({ lang, code: code.replace(/\r?\n$/, '') });
    }
  }
  return out;
}

/** Apply all blocks in order; each ORIGINAL must match exactly once. */
export function applySearchReplaceBlocks(
  source: string,
  blocks: SearchReplaceBlock[]
): ApplyResult {
  if (blocks.length === 0) {
    return { ok: false, reason: 'No search/replace blocks found.' };
  }
  let text = source;
  let replacedCount = 0;
  for (const { original, updated } of blocks) {
    if (!original) {
      return { ok: false, reason: 'Empty ORIGINAL segment in a block.' };
    }
    const first = text.indexOf(original);
    if (first === -1) {
      return {
        ok: false,
        reason: 'ORIGINAL text not found in file (must match exactly).',
      };
    }
    const second = text.indexOf(original, first + original.length);
    if (second !== -1) {
      return {
        ok: false,
        reason: 'ORIGINAL matched more than once; refine the snippet.',
      };
    }
    text = text.slice(0, first) + updated + text.slice(first + original.length);
    replacedCount += 1;
  }
  return { ok: true, text, replacedCount };
}

/** Apply a single block (convenience). */
export function applySearchReplace(source: string, block: SearchReplaceBlock): ApplyResult {
  return applySearchReplaceBlocks(source, [block]);
}
