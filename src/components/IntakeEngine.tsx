import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, ChevronRight, Clock, Trash2, AlertCircle, BookOpen, Zap } from 'lucide-react';
import type { Vibe, ScopeType, InputType, HistoryItem, IntakeOptions } from '../types';
import { VIBE_DATA } from '../constants';
import { clearHistory } from '../utils/storage';
import { LS_KEY } from '../utils/ai';

interface IntakeEngineProps {
  history: HistoryItem[];
  onSubmit: (options: IntakeOptions) => void;
  onLoadHistory: (item: HistoryItem) => void;
  onHistoryCleared: () => void;
  isLoading: boolean;
  error: string | null;
  apiKeyMissing: boolean;
  /** True when the previously-saved key was rejected (expired / quota / wrong) */
  apiKeyInvalid?: boolean;
  /** Called once the user has saved a new valid-looking key */
  onApiKeyRestored?: () => void;
}

export default function IntakeEngine({
  history,
  onSubmit,
  onLoadHistory,
  onHistoryCleared,
  isLoading,
  error,
  apiKeyMissing,
  apiKeyInvalid = false,
  onApiKeyRestored,
}: IntakeEngineProps) {
  const [inputType, setInputType] = useState<InputType>('text');
  const [rawText, setRawText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [scopeType, setScopeType] = useState<ScopeType>('full');
  const [chapterName, setChapterName] = useState('');
  const [pageRangeStart, setPageRangeStart] = useState<number>(1);
  const [pageRangeEnd, setPageRangeEnd] = useState<number>(50);
  const [vibe, setVibe] = useState<Vibe>('CLASSIC');
  const [persona, setPersona] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [targetWordCount, setTargetWordCount] = useState(800);

  // Seed from localStorage so the user never has to re-enter the key after a reload
  const [apiKey, setApiKey] = useState<string>(
    () => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem(LS_KEY) || ''
  );
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(
    () => !import.meta.env.VITE_GEMINI_API_KEY && !localStorage.getItem(LS_KEY)
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // When App.tsx tells us the key was rejected, clear it and re-show the input
  useEffect(() => {
    if (apiKeyInvalid) {
      setApiKey('');
      setShowApiKeyInput(true);
    }
  }, [apiKeyInvalid]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setFile(dropped);
      setInputType('pdf');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setInputType('pdf');
    }
  };

  const saveApiKey = (key: string) => {
    if (!key) return;
    localStorage.setItem(LS_KEY, key);
    (window as unknown as Record<string, unknown>).__GEMINI_API_KEY__ = key;
  };

  const getLengthLabel = (words: number) => {
    if (words <= 350) return 'Crisp';
    if (words <= 650) return 'Brief';
    if (words <= 950) return 'Standard';
    if (words <= 1200) return 'Thorough';
    return 'Deep Dive';
  };

  const handleSubmit = () => {
    saveApiKey(apiKey);
    const effectivePersona = persona.trim() || 'A thoughtful intellectual who distills ideas with depth, clarity, and genuine curiosity';
    onSubmit({ inputType, rawText, file, scopeType, chapterName, pageRangeStart, pageRangeEnd, vibe, persona: effectivePersona, targetWordCount });
  };

  const canSubmit = (inputType === 'text' && rawText.trim().length > 50) ||
    (inputType === 'pdf' && file !== null);

  const vibeStyles: Record<Vibe, string> = {
    CLASSIC: 'border-amber-700/60 bg-amber-950/30 hover:bg-amber-900/40 data-[selected=true]:bg-amber-900/50 data-[selected=true]:border-amber-500',
    AVANT_GARDE: 'border-green-500/40 bg-green-950/20 hover:bg-green-900/30 data-[selected=true]:bg-green-900/40 data-[selected=true]:border-green-400',
    MINIMALIST: 'border-gray-500/40 bg-gray-800/30 hover:bg-gray-700/40 data-[selected=true]:bg-gray-700/50 data-[selected=true]:border-gray-300',
  };

  const vibeFonts: Record<Vibe, string> = {
    CLASSIC: 'font-playfair italic text-2xl',
    AVANT_GARDE: 'font-space-mono text-sm tracking-widest',
    MINIMALIST: 'font-inter font-light text-xl tracking-tight',
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <span className="font-inter font-semibold text-sm tracking-widest uppercase text-gray-300">
              The Intelligent Reader & Gym
            </span>
          </div>
          {!showApiKeyInput && apiKeyMissing && (
            <button
              onClick={() => setShowApiKeyInput(true)}
              className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5" /> Set API Key
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h1 className="text-5xl md:text-6xl font-playfair font-bold text-white mb-4">
            Transform Text into{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Masterpieces
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto font-inter font-light">
            Upload a document or paste text. Choose your aesthetic vibe and AI persona. Receive an
            editorial masterpiece — then enter the Gym to test your comprehension.
          </p>
        </motion.div>

        {/* API Key Banner */}
        <AnimatePresence>
          {showApiKeyInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-yellow-950/40 border border-yellow-700/60 rounded-xl p-5"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-yellow-300 font-semibold text-sm mb-1">
                    {apiKeyInvalid ? 'API Key Rejected — Please Re-enter' : 'Gemini API Key Required'}
                  </p>
                  <p className="text-yellow-200/70 text-xs mb-3">
                    {apiKeyInvalid
                      ? 'Your key was rejected by the API (expired, quota exceeded, or invalid). Enter a fresh key below.'
                      : <>Get your free key at <span className="underline">aistudio.google.com</span>. Or create a{' '}
                        <code className="bg-yellow-900/40 px-1 rounded">.env</code> file with{' '}
                        <code className="bg-yellow-900/40 px-1 rounded">VITE_GEMINI_API_KEY=...</code></>
                    }
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIza..."
                      className="flex-1 bg-gray-900 border border-yellow-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                    />
                    <button
                      onClick={() => {
                        if (apiKey) {
                          saveApiKey(apiKey);
                          setShowApiKeyInput(false);
                          onApiKeyRestored?.();
                        }
                      }}
                      className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-yellow-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 bg-red-950/40 border border-red-700/60 rounded-xl p-4 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Left: Input */}
          <div className="md:col-span-3 space-y-4">
            {/* Input Type Toggle */}
            <div className="bg-gray-900 rounded-2xl p-1 flex gap-1 border border-gray-800">
              {(['text', 'pdf'] as InputType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setInputType(t)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    inputType === t
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {t === 'text' ? <FileText className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                  {t === 'text' ? 'Paste Text' : 'Upload PDF'}
                </button>
              ))}
            </div>

            {/* Text Input */}
            <AnimatePresence mode="wait">
              {inputType === 'text' ? (
                <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste your article, essay, research paper, or any text here... (minimum 50 characters)"
                    rows={12}
                    className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 text-gray-200 text-sm font-inter placeholder-gray-600 focus:outline-none focus:border-indigo-600 resize-none leading-relaxed transition-colors"
                  />
                  <p className="text-gray-600 text-xs mt-1.5 font-inter">
                    {rawText.length} characters
                  </p>
                </motion.div>
              ) : (
                <motion.div key="pdf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                      dragOver
                        ? 'border-indigo-500 bg-indigo-950/30'
                        : file
                        ? 'border-emerald-600 bg-emerald-950/20'
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {file ? (
                      <div className="space-y-2">
                        <div className="w-12 h-12 bg-emerald-900/50 rounded-xl flex items-center justify-center mx-auto">
                          <FileText className="w-6 h-6 text-emerald-400" />
                        </div>
                        <p className="text-emerald-400 font-medium text-sm">{file.name}</p>
                        <p className="text-gray-500 text-xs">{(file.size / 1024).toFixed(0)} KB</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFile(null); }}
                          className="text-gray-500 hover:text-red-400 text-xs underline transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-gray-300 font-medium text-sm">
                            Drop your PDF here or click to browse
                          </p>
                          <p className="text-gray-600 text-xs mt-1">PDF files only</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scope Selection */}
                  <div className="mt-4 bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mb-3">
                      Scope
                    </p>
                    <div className="flex gap-2">
                      {([
                        { value: 'full',    label: 'Full Work' },
                        { value: 'chapter', label: 'Chapter' },
                        { value: 'pages',   label: 'Page Range' },
                      ] as { value: ScopeType; label: string }[]).map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setScopeType(s.value)}
                          className={`flex-1 py-2 rounded-lg text-sm transition-all border ${
                            scopeType === s.value
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                              : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence>
                      {scopeType === 'full' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 overflow-hidden"
                        >
                          <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-700/40 rounded-lg px-3 py-2.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-amber-300/90 text-xs leading-relaxed">
                                Capped at ~60 pages (150k chars). For long documents, use{' '}
                                <button
                                  onClick={() => setScopeType('pages')}
                                  className="underline underline-offset-2 hover:text-amber-200 transition-colors font-medium"
                                >
                                  Page Range
                                </button>{' '}
                                to target specific sections.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {scopeType === 'chapter' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3"
                        >
                          <input
                            type="text"
                            value={chapterName}
                            onChange={(e) => setChapterName(e.target.value)}
                            placeholder="e.g. Chapter 3: The Neural Architecture"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </motion.div>
                      )}

                      {scopeType === 'pages' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="text-gray-500 text-xs mb-1 block">Start Page</label>
                              <input
                                type="number"
                                min={1}
                                value={pageRangeStart}
                                onChange={(e) => setPageRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors text-center font-mono"
                              />
                            </div>
                            <span className="text-gray-600 text-sm mt-4">→</span>
                            <div className="flex-1">
                              <label className="text-gray-500 text-xs mb-1 block">End Page</label>
                              <input
                                type="number"
                                min={pageRangeStart}
                                value={pageRangeEnd}
                                onChange={(e) => setPageRangeEnd(Math.max(pageRangeStart, parseInt(e.target.value) || pageRangeStart))}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors text-center font-mono"
                              />
                            </div>
                          </div>
                          <p className="text-gray-600 text-xs mt-2 text-center">
                            {pageRangeEnd - pageRangeStart + 1} pages · both endpoints included
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Persona & Vibe */}
          <div className="md:col-span-2 space-y-4">
            {/* Vibe Selector */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mb-4">
                Aesthetic Vibe
              </p>
              <div className="space-y-2">
                {(Object.keys(VIBE_DATA) as Vibe[]).map((v) => {
                  const data = VIBE_DATA[v];
                  return (
                    <button
                      key={v}
                      data-selected={vibe === v}
                      onClick={() => setVibe(v)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${vibeStyles[v]}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`block ${vibeFonts[v]} text-white mb-0.5`}>
                            {data.preview}
                          </span>
                          <span className="text-xs text-gray-400 font-inter">{data.name}</span>
                        </div>
                        {vibe === v && (
                          <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-gray-500 text-xs mt-1 font-inter">{data.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Persona — free-form */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mb-1">
                Re-imagine as
              </p>
              <p className="text-gray-600 text-xs mb-3 font-inter">
                Describe any voice, character, or scenario on earth.
              </p>
              <textarea
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="e.g. Ram Gopal Varma having a raw, unfiltered conversation with a curious mind named Ajay on this topic"
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed transition-colors font-inter"
              />
              {/* Quick-start chips */}
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  'Carl Sagan explaining this to his curious grandson',
                  'Christopher Hitchens delivering a biting lecture',
                  'Two economists arguing both sides',
                  'A street-smart entrepreneur pitching to skeptics',
                  'Socrates interrogating every claim',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setPersona(suggestion)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-300 transition-all font-inter"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Article Length Slider ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 bg-gray-900 rounded-2xl p-5 border border-gray-800"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">
              Article Length
            </p>
            <span className="flex items-center gap-2">
              <span className="text-indigo-400 font-mono text-sm font-semibold">
                {targetWordCount.toLocaleString()} words
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 font-inter">
                {getLengthLabel(targetWordCount)}
              </span>
            </span>
          </div>

          {/* Track */}
          <div className="relative">
            <input
              type="range"
              min={200}
              max={1500}
              step={50}
              value={targetWordCount}
              onChange={(e) => setTargetWordCount(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                bg-gray-700
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-indigo-500
                [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-indigo-300
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:shadow-indigo-900/60
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-110
                [&::-moz-range-thumb]:w-5
                [&::-moz-range-thumb]:h-5
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-indigo-500
                [&::-moz-range-thumb]:border-2
                [&::-moz-range-thumb]:border-indigo-300
                [&::-moz-range-thumb]:cursor-pointer"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((targetWordCount - 200) / 1300) * 100}%, #374151 ${((targetWordCount - 200) / 1300) * 100}%, #374151 100%)`,
              }}
            />
          </div>

          {/* Legends */}
          <div className="flex justify-between mt-3">
            <div className="text-left">
              <p className="text-[11px] font-semibold text-gray-400 font-inter">Crisp</p>
              <p className="text-[10px] text-gray-600">200 words</p>
            </div>
            {/* Tick marks */}
            <div className="flex items-center gap-0 absolute-ish hidden sm:flex">
              {[350, 650, 950, 1200].map((tick) => (
                <button
                  key={tick}
                  onClick={() => setTargetWordCount(tick)}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition-colors font-inter ${
                    getLengthLabel(tick) === getLengthLabel(targetWordCount)
                      ? 'text-indigo-300'
                      : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  {getLengthLabel(tick === 350 ? 300 : tick === 650 ? 600 : tick === 950 ? 900 : 1100)}
                </button>
              ))}
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-gray-400 font-inter">Deep Dive</p>
              <p className="text-[10px] text-gray-600">1500 words</p>
            </div>
          </div>
        </motion.div>

        {/* Submit Button */}
        <motion.button
          onClick={handleSubmit}
          disabled={!canSubmit || isLoading}
          whileHover={{ scale: canSubmit && !isLoading ? 1.01 : 1 }}
          whileTap={{ scale: canSubmit && !isLoading ? 0.99 : 1 }}
          className={`w-full mt-8 py-4 px-8 rounded-2xl font-semibold text-base flex items-center justify-center gap-3 transition-all ${
            canSubmit && !isLoading
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-900/30'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Zap className="w-5 h-5" />
          {isLoading ? 'Processing...' : 'Generate Masterpiece'}
          <ChevronRight className="w-5 h-5" />
        </motion.button>

        {/* History Strip */}
        {history.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5" />
                Recent Masterpieces
              </div>
              <button
                onClick={() => { clearHistory(); onHistoryCleared(); }}
                className="text-gray-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {history.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => onLoadHistory(item)}
                  whileHover={{ y: -2 }}
                  className="flex-shrink-0 w-48 bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-3 text-left transition-all group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-1.5 py-0.5 rounded-md bg-gray-800 text-gray-400 font-space-mono">
                      {item.vibe === 'CLASSIC' ? 'CL' : item.vibe === 'AVANT_GARDE' ? 'AG' : 'MN'}
                    </span>
                    <span className="text-xs text-gray-500">🎭</span>
                  </div>
                  <p className="text-gray-300 text-xs font-medium line-clamp-2 group-hover:text-white transition-colors leading-snug">
                    {item.title}
                  </p>
                  <p className="text-gray-600 text-xs mt-2">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
