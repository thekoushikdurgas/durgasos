export type MatcherAiResult = {
  matchScore: number;
  tailoredResumeContent: string;
  coverLetterContent: string;
};

export function buildResumeMatcherPrompt(input: {
  masterResumeContent: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
}): string {
  const { masterResumeContent, jobTitle, company, jobDescription } = input;
  return `You are an expert technical recruiter and resume writer.
Here is the user's master resume:
${masterResumeContent}

Here is the targeted job description for the role "${jobTitle}" at "${company}":
${jobDescription}

Please analyze the resume against the job description.
Return a structured JSON object exactly in this format without markdown code blocks (just the raw JSON):
{
  "matchScore": <number 0-100>,
  "tailoredResumeContent": "<markdown string of the tailored resume highlighting the right skills>",
  "coverLetterContent": "<markdown string of an engaging, tailored cover letter>"
}`;
}

function stripCodeFences(text: string): string {
  let t = text.trim();
  if (t.startsWith('```json')) {
    t = t.slice(7).trim();
    if (t.endsWith('```')) t = t.slice(0, -3).trim();
    return t;
  }
  if (t.startsWith('```')) {
    t = t.slice(3).trim();
    if (t.endsWith('```')) t = t.slice(0, -3).trim();
    return t;
  }
  return t;
}

export function parseMatcherAiResult(text: string): MatcherAiResult {
  const cleaned = stripCodeFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Model did not return valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON shape.');
  }
  const o = parsed as Record<string, unknown>;
  const matchScore = o.matchScore;
  const tailoredResumeContent = o.tailoredResumeContent;
  const coverLetterContent = o.coverLetterContent;
  if (typeof matchScore !== 'number' || Number.isNaN(matchScore)) {
    throw new Error('Missing or invalid matchScore.');
  }
  if (typeof tailoredResumeContent !== 'string' || typeof coverLetterContent !== 'string') {
    throw new Error('Missing tailored resume or cover letter text.');
  }
  const score = Math.max(0, Math.min(100, Math.round(matchScore)));
  return {
    matchScore: score,
    tailoredResumeContent,
    coverLetterContent,
  };
}

export function extractChatCompletionMessage(data: unknown): string {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return '';
}
