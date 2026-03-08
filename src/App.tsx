import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  Phase,
  Vibe,
  MasterpieceContent,
  ChatMessage,
  HistoryItem,
  IntakeOptions,
} from './types';
import type { ThemeColorKey } from './components/ColorControlBar';
import { applyTheme } from './utils/themes';
import { getHistory, addToHistory } from './utils/storage';
import {
  generateMasterpiece,
  simplifyContent,
  findChapterBoundaries,
  LS_KEY,
} from './utils/ai';
import { extractTextFromPdf, extractTocPages, extractPageImages } from './utils/pdf';
import { LOADING_PHRASES } from './constants';

import IntakeEngine from './components/IntakeEngine';
import ProcessingView from './components/ProcessingView';
import MasterpieceView from './components/MasterpieceView';
import GymView from './components/GymView';
import ChatPanel from './components/ChatPanel';

// Detect errors that mean the API key is invalid or quota is exhausted
function isApiKeyError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('api key') ||
    m.includes('api_key') ||
    m.includes('quota') ||
    m.includes('resource_exhausted') ||
    m.includes('permission_denied') ||
    m.includes('invalid_argument') ||
    m.includes('unauthenticated') ||
    m.includes('403') ||
    m.includes('401')
  );
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('intake');
  const [vibe, setVibe] = useState<Vibe>('CLASSIC');
  const [persona, setPersona] = useState<string>('');
  const [sourceText, setSourceText] = useState('');
  const [content, setContent] = useState<MasterpieceContent | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_PHRASES[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>({});

  // True when the saved key has been rejected (expired / quota / wrong key)
  const [apiKeyInvalid, setApiKeyInvalid] = useState(false);

  // Key is "missing" if there's no env key and nothing in localStorage yet
  const apiKeyMissing =
    !import.meta.env.VITE_GEMINI_API_KEY && !localStorage.getItem(LS_KEY);

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  // Apply theme whenever vibe changes
  useEffect(() => {
    applyTheme(vibe);
  }, [vibe]);

  // Cycle loading messages
  useEffect(() => {
    if (phase !== 'processing') return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % LOADING_PHRASES.length;
      setLoadingMessage(LOADING_PHRASES[idx]);
    }, 2200);
    return () => clearInterval(interval);
  }, [phase]);

  // ── Runtime API key (env → window → localStorage) ────────────────────────
  const getRuntimeApiKey = () => {
    return (
      import.meta.env.VITE_GEMINI_API_KEY ||
      (window as unknown as Record<string, unknown>).__GEMINI_API_KEY__ as string ||
      localStorage.getItem(LS_KEY) ||
      ''
    );
  };

  // ── Process document ──────────────────────────────────────────────────────
  const handleColorChange = useCallback((key: ThemeColorKey, value: string) => {
    setColorOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleProcess = useCallback(async (options: IntakeOptions) => {
    setPhase('processing');
    setError(null);
    setApiKeyInvalid(false);
    setChatMessages([]);
    setColorOverrides({});  // reset custom colors on new document

    const apiKey = getRuntimeApiKey();
    if (!apiKey) {
      setError('Please set your Gemini API key before processing.');
      setPhase('intake');
      return;
    }

    try {
      let text = '';
      let images: string[] = [];

      if (options.inputType === 'pdf' && options.file) {
        setLoadingMessage('Extracting text from PDF...');

        let pdfStart: number | undefined;
        let pdfEnd: number | undefined;

        if (options.scopeType === 'pages') {
          // Direct page range — no AI needed, use the numbers as-is
          pdfStart = options.pageRangeStart;
          pdfEnd = options.pageRangeEnd;
          setLoadingMessage(`Extracting pages ${pdfStart}–${pdfEnd}...`);
          const result = await extractTextFromPdf(options.file, pdfStart, pdfEnd);
          text = result.text;
        } else if (options.scopeType === 'chapter' && options.chapterName.trim()) {
          setLoadingMessage('Mapping chapter boundaries with AI...');
          try {
            const tocText = await extractTocPages(options.file, 15);
            const boundaries = await findChapterBoundaries(tocText, options.chapterName);
            pdfStart = boundaries.startPage;
            pdfEnd = boundaries.endPage;
            setLoadingMessage(`Extracting pages ${boundaries.startPage}–${boundaries.endPage}...`);
            const result = await extractTextFromPdf(options.file, pdfStart, pdfEnd);
            text = result.text;
          } catch {
            setLoadingMessage('Chapter mapping failed — extracting full document...');
            const result = await extractTextFromPdf(options.file);
            text = result.text;
          }
        } else {
          const result = await extractTextFromPdf(options.file);
          text = result.text;
        }

        // Render page images for AI multimodal analysis (diagrams, charts, tables)
        setLoadingMessage('Rendering page images for diagram extraction...');
        try {
          images = await extractPageImages(options.file, pdfStart, pdfEnd, 15);
        } catch {
          // Images are optional — AI still works without them
        }
      } else {
        text = options.rawText;
      }

      setPageImages(images);

      if (!text.trim() || text.trim().length < 50) {
        throw new Error(
          'The extracted text is too short or empty. Please check your input and try again.'
        );
      }

      setSourceText(text);
      setVibe(options.vibe);
      setPersona(options.persona);
      applyTheme(options.vibe);

      setLoadingMessage('Consulting the AI...');
      const masterpiece = await generateMasterpiece(text, options.persona, options.vibe, images, options.targetWordCount);

      if (!masterpiece.title || !Array.isArray(masterpiece.sections) || masterpiece.sections.length === 0) {
        throw new Error('The AI returned an incomplete response. Please try again.');
      }

      setContent(masterpiece);

      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        title: masterpiece.title,
        vibe: options.vibe,
        persona: options.persona,
        timestamp: Date.now(),
        content: masterpiece,
        sourceText: text,
      };
      addToHistory(historyItem);
      setHistory(getHistory());

      setPhase('masterpiece');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setError(message);
      setPhase('intake');

      // If it's an auth / quota error, invalidate the stored key so the
      // banner re-appears and the user can enter a fresh one
      if (isApiKeyError(message)) {
        localStorage.removeItem(LS_KEY);
        (window as unknown as Record<string, unknown>).__GEMINI_API_KEY__ = '';
        setApiKeyInvalid(true);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Simplify content ──────────────────────────────────────────────────────
  const handleSimplify = useCallback(async () => {
    if (!content || isSimplifying) return;
    setIsSimplifying(true);
    try {
      const simplified = await simplifyContent(content, persona, vibe);
      setContent(simplified);
    } catch {
      // Fail silently — keep original content
    } finally {
      setIsSimplifying(false);
    }
  }, [content, persona, vibe, isSimplifying]);

  // ── Load from history ─────────────────────────────────────────────────────
  const handleLoadHistory = useCallback((item: HistoryItem) => {
    setContent(item.content);
    setVibe(item.vibe);
    setPersona(item.persona);
    setSourceText(item.sourceText);
    setPageImages([]);   // page images are not persisted in history
    setChatMessages([]);
    applyTheme(item.vibe);
    setPhase('masterpiece');
  }, []);

  // ── Return to intake ──────────────────────────────────────────────────────
  const handleReturnToIntake = useCallback(() => {
    setPhase('intake');
    setError(null);
    setChatOpen(false);
  }, []);

  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.4 } },
    exit: { opacity: 0, transition: { duration: 0.25 } },
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {phase === 'intake' && (
          <motion.div key="intake" {...pageVariants}>
            <IntakeEngine
              history={history}
              onSubmit={handleProcess}
              onLoadHistory={handleLoadHistory}
              onHistoryCleared={() => setHistory([])}
              isLoading={false}
              error={error}
              apiKeyMissing={apiKeyMissing}
              apiKeyInvalid={apiKeyInvalid}
              onApiKeyRestored={() => setApiKeyInvalid(false)}
            />
          </motion.div>
        )}

        {phase === 'processing' && (
          <motion.div key="processing" {...pageVariants}>
            <ProcessingView currentMessage={loadingMessage} />
          </motion.div>
        )}

        {phase === 'masterpiece' && content && (
          <motion.div key="masterpiece" {...pageVariants}>
            <MasterpieceView
              content={content}
              vibe={vibe}
              persona={persona}
              onEnterGym={() => setPhase('gym')}
              onOpenChat={() => setChatOpen(true)}
              onReExtract={handleReturnToIntake}
              onSimplify={handleSimplify}
              isSimplifying={isSimplifying}
              pageImages={pageImages}
              colorOverrides={colorOverrides}
              onColorChange={handleColorChange}
            />
            <ChatPanel
              isOpen={chatOpen}
              onClose={() => setChatOpen(false)}
              sourceText={sourceText}
              persona={persona}
              vibe={vibe}
              messages={chatMessages}
              onMessagesUpdate={setChatMessages}
            />
          </motion.div>
        )}

        {phase === 'gym' && (
          <motion.div key="gym" {...pageVariants}>
            <GymView
              sourceText={sourceText}
              persona={persona}
              vibe={vibe}
              onBack={() => setPhase('masterpiece')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
