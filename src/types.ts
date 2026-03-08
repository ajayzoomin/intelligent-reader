export type Phase = 'intake' | 'processing' | 'masterpiece' | 'gym';
export type Vibe = 'CLASSIC' | 'AVANT_GARDE' | 'MINIMALIST';
export type PersonaType = string;
export type Difficulty = 'high_school' | 'college' | 'executive' | 'irate_boss';
export type InputType = 'text' | 'pdf';
export type ScopeType = 'full' | 'chapter' | 'pages';

export interface Section {
  heading: string;
  content: string;
  paragraphs: string[];
  figurePageIndex?: number | null;   // 0-based index into the pageImages array
  figureCaption?: string | null;     // AI-generated caption for the figure
}

export interface MasterpieceContent {
  title: string;
  sections: Section[];
  pullQuotes: string[];
  keyInsights: string[];
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'matching' | 'sequencing' | 'short_answer';
  question: string;
  options?: string[];                           // multiple_choice
  pairs?: Array<{ left: string; right: string }>; // matching — correct order; UI shuffles right side
  items?: string[];                             // sequencing — correct order; UI shuffles for display
}

export interface GymProtocol {
  reasoning: string;
  questions: Question[];
}

export interface QuestionFeedback {
  questionId: string;
  isCorrect: boolean;
  correctAnswer: string; // always returned so the user always sees the right answer
  explanation: string;
}

export interface GradingResult {
  overallAssessment: string;
  questionFeedback: QuestionFeedback[];
}

export interface HistoryItem {
  id: string;
  title: string;
  vibe: Vibe;
  persona: PersonaType;
  timestamp: number;
  content: MasterpieceContent;
  sourceText: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface IntakeOptions {
  inputType: InputType;
  rawText: string;
  file: File | null;
  scopeType: ScopeType;
  chapterName: string;
  pageRangeStart: number;   // used when scopeType === 'pages'
  pageRangeEnd: number;     // used when scopeType === 'pages'
  vibe: Vibe;
  persona: PersonaType;
  targetWordCount: number;  // 200–1500
}
