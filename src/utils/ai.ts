import { GoogleGenAI } from '@google/genai';
import type {
  MasterpieceContent,
  GymProtocol,
  GradingResult,
  Vibe,
  Difficulty,
  ChatMessage,
  Question,
} from '../types';

const MODEL = 'gemini-2.5-flash';

export const LS_KEY = 'gemini_api_key';

function getRuntimeKey(): string {
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    (window as unknown as Record<string, unknown>).__GEMINI_API_KEY__ as string ||
    localStorage.getItem(LS_KEY) ||
    ''
  );
}

let _genAI: GoogleGenAI | null = null;
let _usedKey = '';

function getClient(): GoogleGenAI {
  const apiKey = getRuntimeKey();
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set. Create a .env file with your Gemini API key.');
  // Re-create client if key changed (e.g. user entered a new one)
  if (!_genAI || _usedKey !== apiKey) {
    _genAI = new GoogleGenAI({ apiKey });
    _usedKey = apiKey;
  }
  return _genAI;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sanitise a raw AI response string and extract a valid JSON value.
 * Tries multiple increasingly aggressive repair strategies before giving up.
 */
function parseJson<T>(text: string): T {
  // ① Strip markdown code fences
  const stripped = text
    .replace(/^```json\s*/gm, '')
    .replace(/^```\s*/gm, '')
    .replace(/```\s*$/gm, '')
    .trim();

  // ② Simple parse
  try { return JSON.parse(stripped) as T; } catch { /* fall through */ }

  // ③ Extract the outermost {...} object (handles leading/trailing prose)
  const objMatch = stripped.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]) as T; } catch { /* fall through */ }

    // ④ Fix trailing commas before } or ] then try again
    const noTrail = objMatch[0].replace(/,(\s*[}\]])/g, '$1');
    try { return JSON.parse(noTrail) as T; } catch { /* fall through */ }
  }

  // ⑤ Escape unescaped control characters inside string literals
  //    (Gemini sometimes emits literal \n or \t inside JSON string values)
  try {
    let inStr = false, escaped = false;
    let repaired = '';
    for (let i = 0; i < stripped.length; i++) {
      const ch = stripped[i];
      if (escaped) { repaired += ch; escaped = false; continue; }
      if (ch === '\\') { escaped = true; repaired += ch; continue; }
      if (ch === '"') { inStr = !inStr; repaired += ch; continue; }
      if (inStr) {
        if (ch === '\n') { repaired += '\\n'; continue; }
        if (ch === '\r') { repaired += '\\r'; continue; }
        if (ch === '\t') { repaired += '\\t'; continue; }
      }
      repaired += ch;
    }
    const repairedMatch = repaired.match(/\{[\s\S]*\}/);
    if (repairedMatch) return JSON.parse(repairedMatch[0]) as T;
  } catch { /* fall through */ }

  throw new Error(
    'Could not parse AI response as JSON. The document may be too complex — try a shorter excerpt or paste just the relevant section.'
  );
}

/**
 * Re-try generateMasterpiece with a shorter, simpler prompt if the first
 * attempt produced invalid JSON (handles long/complex PDFs).
 */
async function retryWithSimplePrompt<T>(
  genAI: ReturnType<typeof getClient>,
  systemInstruction: string,
  text: string
): Promise<T> {
  const response = await genAI.models.generateContent({
    model: MODEL,
    contents: `Transform this source text into a masterpiece (shorter excerpt):\n\n${text.substring(0, 75000)}`,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.3,   // lower temperature = more deterministic JSON
    },
  });
  return parseJson<T>(response.text ?? '{}');
}

function getPersonaInstruction(persona: string): string {
  return `You are embodying this voice and perspective: "${persona}". Channel this persona authentically throughout your entire response. If it implies a specific person, conversation format, or relationship dynamic, honor it fully — stay in character at all times.`;
}

const VIBE_STYLE: Record<Vibe, string> = {
  CLASSIC: 'Write with refined, timeless elegance. Rich literary language. A sense of gravitas.',
  AVANT_GARDE: 'Write with bold, provocative force. Challenge conventions. Be disruptive and subversive. Short punchy sentences mixed with longer rhetorical flights.',
  MINIMALIST: 'Write with surgical precision. Remove every unnecessary word. Clarity above all else.',
};

// ── Masterpiece Generation ────────────────────────────────────────────────────

export async function generateMasterpiece(
  text: string,
  persona: string,
  vibe: Vibe,
  pageImages: string[] = [],  // base64 "data:image/jpeg;base64,..." strings
  targetWordCount = 800
): Promise<MasterpieceContent> {
  const hasFigures = pageImages.length > 0;

  // Build a length instruction calibrated to the requested word count
  const lengthInstruction =
    targetWordCount <= 350
      ? `TARGET LENGTH: ~${targetWordCount} words total — ultra-concise. Write exactly 2 sections with 1-2 short sentences per paragraph. Strip everything non-essential.`
      : targetWordCount <= 650
      ? `TARGET LENGTH: ~${targetWordCount} words total — concise. Write 2-3 focused sections with 2-3 sentences per paragraph.`
      : targetWordCount <= 950
      ? `TARGET LENGTH: ~${targetWordCount} words total — standard. Write 4-5 sections with 3-4 sentences per paragraph.`
      : targetWordCount <= 1200
      ? `TARGET LENGTH: ~${targetWordCount} words total — thorough. Write 5 rich sections with 4-5 sentences per paragraph plus supporting detail.`
      : `TARGET LENGTH: ~${targetWordCount} words total — deep dive. Write 5-6 fully developed sections with 5-6 sentences per paragraph, detailed examples, and nuanced analysis.`;

  const figureSchemaNote = hasFigures
    ? `
      "figurePageIndex": null,   // 0-based index into the provided page images, or null
      "figureCaption": null      // brief description of what the figure shows, or null`
    : '';

  const figureRules = hasFigures
    ? `- ${pageImages.length} page images are provided (indexed 0 to ${pageImages.length - 1}).
- STRICT FIGURE SELECTION: ONLY set figurePageIndex when a page contains a self-contained analytical or technical visual that cannot be understood from text alone — this means: data charts, graphs, plots, technical diagrams, schematics, circuit diagrams, mathematical figures, tables of structured data, code screenshots, scientific illustrations, or architectural diagrams. These must be the PRIMARY content of the image, not a decorative element on the page.
- NEVER set figurePageIndex for: hero/banner/header images, decorative illustrations, photographs of people, stock art, logos, article thumbnails, UI screenshots of webpages, or any image that is purely aesthetic, ornamental, or used as article cover art rather than conveying analytical information.
- When in doubt, leave both figurePageIndex and figureCaption null. False negatives (missing a real figure) are far better than false positives (showing a decorative image as a figure).`
    : '';

  const systemInstruction = `${getPersonaInstruction(persona)}

AESTHETIC MANDATE: ${VIBE_STYLE[vibe]}

Transform the provided source text into a high-quality editorial masterpiece. You MUST return ONLY a valid JSON object — no markdown code fences, no preamble, no explanation — matching this exact schema:

{
  "title": "A compelling, editorial title that is NOT generic",
  "sections": [
    {
      "heading": "Section title",
      "content": "Full markdown content with **bold**, *italics*, markdown tables where relevant, and LaTeX math ($...$) for any mathematical or scientific concepts.",
      "paragraphs": ["First paragraph with **bold** and $LaTeX$ as needed (60+ words)", "Second paragraph", "...additional paragraphs"]${figureSchemaNote}
    }
  ],
  "pullQuotes": ["First profound standalone quote (10-30 words)", "Second quote", "Third quote"],
  "keyInsights": ["First specific actionable insight", "Second insight", "Third insight", "Fourth insight", "Fifth insight"]
}

RULES:
${lengthInstruction}
- Each section: write paragraphs[] matching the target length per section. Use **bold** for key terms, $formula$ for math. paragraphs[] is rendered with full markdown + KaTeX.
- pullQuotes: 2–4 profound statements that stand alone without context
- keyInsights: 3–5 specific, actionable takeaways (not vague platitudes)
${figureRules}
- Return ONLY the JSON object. No markdown code blocks. No commentary.`;

  const genAI = getClient();

  // Build request — multimodal when page images are present
  let contents: Parameters<typeof genAI.models.generateContent>[0]['contents'];

  if (hasFigures) {
    const imageParts = pageImages.slice(0, 15).map((img) => ({
      inlineData: {
        mimeType: 'image/jpeg' as const,
        data: img.replace(/^data:image\/jpeg;base64,/, ''),
      },
    }));
    contents = [
      {
        role: 'user' as const,
        parts: [
          {
            text: `The following ${imageParts.length} images are rendered pages from the source document (index 0 to ${imageParts.length - 1}). Use them to identify diagrams, figures, and visual content.\n\nNow transform this source text into a masterpiece:\n\n${text.substring(0, 150000)}`,
          },
          ...imageParts,
        ],
      },
    ];
  } else {
    contents = `Transform this source text into a masterpiece:\n\n${text.substring(0, 150000)}`;
  }

  const response = await genAI.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.75,
    },
  });

  const raw = response.text ?? '{}';

  try {
    return parseJson<MasterpieceContent>(raw);
  } catch {
    // First attempt failed — retry with lower temperature and shorter text
    return retryWithSimplePrompt<MasterpieceContent>(genAI, systemInstruction, text);
  }
}

// ── Chapter Boundary Detection ────────────────────────────────────────────────

export async function findChapterBoundaries(
  tocText: string,
  chapterName: string
): Promise<{ startPage: number; endPage: number }> {
  const genAI = getClient();
  const response = await genAI.models.generateContent({
    model: MODEL,
    contents: `Given this table of contents or document beginning, identify the chapter or section titled "${chapterName}".
Return ONLY a JSON object: {"startPage": <number>, "endPage": <number>}
If you cannot find the exact end page, estimate based on surrounding chapter start pages.
Assume 1-indexed page numbers.

Document content:
${tocText}`,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  const raw = response.text ?? '{"startPage":1,"endPage":20}';
  return parseJson<{ startPage: number; endPage: number }>(raw);
}

// ── Gym Protocol Generation ───────────────────────────────────────────────────

export async function generateGymProtocol(
  text: string,
  persona: string,
  difficulty: Difficulty
): Promise<GymProtocol> {
  const difficultyInstr: Record<Difficulty, string> = {
    high_school:
      'DIFFICULTY — HIGH SCHOOL: Create 5-6 questions. Test basic recall and comprehension of what the document explicitly states. Questions must be unambiguous and answerable directly from the text.',
    college:
      'DIFFICULTY — COLLEGE: Create 5-6 questions. Test conceptual understanding — the ability to distinguish between related ideas, explain author intent, and identify cause-and-effect relationships.',
    executive:
      'DIFFICULTY — EXECUTIVE: Create 4-5 questions. Test application and synthesis — can the reader apply concepts to real scenarios, identify second-order implications, or critique the reasoning?',
    irate_boss:
      'DIFFICULTY — IRATE BOSS: Create 5-6 questions. Be AGGRESSIVE in tone and phrasing. Test edge cases, nuances, and common misunderstandings about the document. Use confrontational language. Channel a furious executive who expects mastery, not familiarity.',
  };

  const systemInstruction = `${getPersonaInstruction(persona)}

CRITICAL — DOCUMENT CONTEXT FIRST:
Step 1: Identify the document type (self-help, business, science, history, biography, technical manual, narrative, etc.) and its core concepts.
Step 2: ALL questions MUST be exclusively about the content of this specific document. Your persona affects only TONE and VOICE — it does NOT determine the subject matter. A self-help book gets questions about the book's ideas. A history text gets questions about its events. An economist persona must NOT ask economics questions on a self-help chapter — that is a critical failure. Test what the document teaches, always.

${difficultyInstr[difficulty]}

SMART QUESTION TYPE SELECTION — choose types that fit the content naturally:
- "multiple_choice": distinguishing between similar concepts, "which of these is NOT", identifying correct examples (4 options, prefix each A) B) C) D))
- "true_false": factual assertions, principle statements, "the author claims X" verification
- "fill_in_blank": key terms, names, or specific concepts with a single clear answer. Write the sentence with _____ where the answer belongs.
- "matching": ONLY when 3-5 clear pairs exist in the document (terms↔definitions, causes↔effects, people↔ideas). pairs array MUST be in correct order — the UI shuffles the right side.
- "sequencing": ONLY when the document describes a clear ordered sequence of steps, stages, or events. items array MUST be in the correct order — the UI shuffles for display.
- "short_answer": "explain why", "what does the author mean by", synthesis questions. Expect 2-4 sentence answers maximum. NO long essay questions.

Mix types intelligently. Do NOT force a type that doesn't fit.

Return ONLY valid JSON:
{
  "reasoning": "2-3 sentences: document type detected, what you are testing, why you chose these question types",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "Question text",
      "options": ["A) Option one", "B) Option two", "C) Option three", "D) Option four"]
    },
    {
      "id": "q2",
      "type": "true_false",
      "question": "A clear declarative statement from the document that is definitively true or false"
    },
    {
      "id": "q3",
      "type": "fill_in_blank",
      "question": "The author argues that _____ is the foundation of lasting change."
    },
    {
      "id": "q4",
      "type": "matching",
      "question": "Match each concept to its correct description from the document.",
      "pairs": [
        {"left": "Concept A", "right": "Its definition from the document"},
        {"left": "Concept B", "right": "Its definition from the document"},
        {"left": "Concept C", "right": "Its definition from the document"}
      ]
    },
    {
      "id": "q5",
      "type": "sequencing",
      "question": "Arrange these steps in the correct order as described in the document.",
      "items": ["First step", "Second step", "Third step", "Fourth step"]
    },
    {
      "id": "q6",
      "type": "short_answer",
      "question": "Brief question requiring 2-4 sentences"
    }
  ]
}

No markdown fences. No preamble. JSON only.`;

  const genAI = getClient();
  const response = await genAI.models.generateContent({
    model: MODEL,
    contents: `Design a comprehension test for this material:\n\n${text.substring(0, 100000)}`,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.6,
    },
  });

  const raw = response.text ?? '{"reasoning":"","questions":[]}';
  return parseJson<GymProtocol>(raw);
}

// ── Answer Grading ────────────────────────────────────────────────────────────

export async function gradeAnswers(
  questions: Question[],
  answers: Record<string, string>,
  sourceText: string,
  persona: string,
  difficulty: Difficulty
): Promise<GradingResult> {
  const irateBossNote =
    difficulty === 'irate_boss'
      ? 'You are FURIOUS if they fail. Use capital letters for emphasis. Be theatrically angry. If they pass, be grudgingly impressed.'
      : 'Be fair but rigorous. Acknowledge what is correct before noting gaps.';

  const systemInstruction = `${getPersonaInstruction(persona)}

You are grading a comprehension test. ${irateBossNote}

CRITICAL — DOCUMENT-GROUNDED GRADING:
Grade answers EXCLUSIVELY based on the source document provided below. Before marking anything as absent or wrong, search the document carefully. Do NOT use outside knowledge — only what appears in the document counts as correct.

ANSWER FORMAT NOTES (so you can interpret user answers correctly):
- matching: user's answer is a JSON object {"left item": "selected right item", ...} — compare each mapping against the correct pairs
- sequencing: user's answer is a JSON array ["item at position 1", "item at position 2", ...] — compare order against the correct items array
- fill_in_blank: accept reasonable synonyms and paraphrases, not just exact word matches
- true_false: answer will be "True" or "False"
- multiple_choice: answer is the full option string (e.g. "A) Some text")
- short_answer: grade on whether key concepts from the document are present

Return ONLY valid JSON:
{
  "overallAssessment": "Your overall assessment in your full persona voice (3-5 sentences). Make it vivid and characteristic.",
  "questionFeedback": [
    {
      "questionId": "q1",
      "isCorrect": true,
      "correctAnswer": "The specific correct answer from the document. For MCQ: the correct option. For T/F: True or False. For fill_in_blank: the missing term. For matching: all correct pairs listed. For sequencing: the correct order. For short_answer: the key points the answer should contain.",
      "explanation": "Concise explanation referencing the document specifically. For wrong answers, explain what the document actually says."
    }
  ]
}

No markdown fences. JSON only.`;

  const qa = questions.map((q) => ({
    id: q.id,
    type: q.type,
    question: q.question,
    options: q.options,
    pairs: q.pairs,   // correct pairs for grader reference
    items: q.items,   // correct order for grader reference
    userAnswer: answers[q.id] || '(no answer provided)',
  }));

  const genAI = getClient();
  const response = await genAI.models.generateContent({
    model: MODEL,
    contents: `Grade these answers against the source material.

SOURCE DOCUMENT (use this — and only this — to determine correct answers):
${sourceText.substring(0, 100000)}

QUESTIONS AND USER ANSWERS:
${JSON.stringify(qa, null, 2)}`,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.5,
    },
  });

  const raw = response.text ?? '{"overallAssessment":"Error grading.","questionFeedback":[]}';
  return parseJson<GradingResult>(raw);
}

// ── Simplify Content ──────────────────────────────────────────────────────────

export async function simplifyContent(
  content: MasterpieceContent,
  persona: string,
  vibe: Vibe
): Promise<MasterpieceContent> {
  const systemInstruction = `${getPersonaInstruction(persona)}
${VIBE_STYLE[vibe]}

Rewrite the following editorial content at a significantly simpler reading level — shorter sentences, more common vocabulary, clearer explanations. Preserve the persona's voice and the vibe's aesthetic. Keep the same JSON schema structure.

Return ONLY the JSON object with the same schema. No markdown fences.`;

  const genAI = getClient();
  const response = await genAI.models.generateContent({
    model: MODEL,
    contents: `Simplify this content:\n${JSON.stringify(content)}`,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.55,
    },
  });

  const raw = response.text ?? JSON.stringify(content);
  try {
    return parseJson<MasterpieceContent>(raw);
  } catch {
    return content; // Fall back to original if simplification fails
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function chat(
  message: string,
  history: ChatMessage[],
  sourceText: string,
  persona: string,
  vibe: Vibe
): Promise<string> {
  const vibeNote: Record<Vibe, string> = {
    CLASSIC: 'Speak with classical refinement and gravitas.',
    AVANT_GARDE: 'Speak with bold, disruptive energy. Short, punchy, provocative.',
    MINIMALIST: 'Be extremely concise. No excess. Every word earns its place.',
  };

  const systemInstruction = `${getPersonaInstruction(persona)}
${vibeNote[vibe]}

You are in a conversation about a specific document. Reference the document directly when relevant. Stay fully in character at all times. Be substantive and engaging — never vague.

DOCUMENT CONTEXT (use this to ground your answers):
${sourceText.substring(0, 20000)}`;

  const contents = [
    ...history.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model' as 'user' | 'model',
      parts: [{ text: m.content }],
    })),
    {
      role: 'user' as const,
      parts: [{ text: message }],
    },
  ];

  const genAI = getClient();
  const response = await genAI.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction,
      temperature: 0.85,
    },
  });

  return response.text ?? 'I was unable to generate a response. Please try again.';
}
