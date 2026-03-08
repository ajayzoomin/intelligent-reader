import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Vibe, ChatMessage } from '../types';
import { chat } from '../utils/ai';
import { vc } from '../utils/themes';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sourceText: string;
  persona: string;
  vibe: Vibe;
  messages: ChatMessage[];
  onMessagesUpdate: (messages: ChatMessage[]) => void;
}

export default function ChatPanel({
  isOpen,
  onClose,
  sourceText,
  persona,
  vibe,
  messages,
  onMessagesUpdate,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen, messages.length]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const updated = [...messages, userMsg];
    onMessagesUpdate(updated);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const reply = await chat(trimmed, messages, sourceText, persona, vibe);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };
      onMessagesUpdate([...updated, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const panelBg = vc(vibe, {
    CLASSIC: 'bg-[#1a1208]',
    AVANT_GARDE: 'bg-black',
    MINIMALIST: 'bg-gray-950',
  });

  const headerBg = vc(vibe, {
    CLASSIC: 'bg-[#0f0b05] border-b border-amber-900/30',
    AVANT_GARDE: 'bg-black border-b border-green-500/20',
    MINIMALIST: 'bg-gray-900 border-b border-gray-800',
  });

  const inputBg = vc(vibe, {
    CLASSIC: 'bg-[#0f0b05] border-t border-amber-900/30',
    AVANT_GARDE: 'bg-black border-t border-green-500/20',
    MINIMALIST: 'bg-gray-900 border-t border-gray-800',
  });

  const accentColor = vc(vibe, {
    CLASSIC: 'text-amber-400',
    AVANT_GARDE: 'text-green-400',
    MINIMALIST: 'text-indigo-400',
  });

  const userBubble = vc(vibe, {
    CLASSIC: 'bg-amber-900/40 text-amber-100 border border-amber-800/30',
    AVANT_GARDE: 'bg-green-900/30 text-green-100 border border-green-800/30 font-space-mono text-xs',
    MINIMALIST: 'bg-indigo-900/30 text-indigo-100 border border-indigo-800/20',
  });

  const aiBubble = vc(vibe, {
    CLASSIC: 'bg-gray-900/60 text-gray-200 border border-gray-800/50',
    AVANT_GARDE: 'bg-gray-900/80 text-gray-200 border border-gray-700/40 font-space-mono text-xs',
    MINIMALIST: 'bg-gray-800/60 text-gray-200 border border-gray-700/30',
  });

  const sendBtnColor = vc(vibe, {
    CLASSIC: 'bg-amber-700 hover:bg-amber-600',
    AVANT_GARDE: 'bg-green-700 hover:bg-green-600',
    MINIMALIST: 'bg-indigo-600 hover:bg-indigo-500',
  });

  const starterPrompts = [
    'What is the central argument of this text?',
    'What are the most controversial claims made here?',
    'How does this connect to real-world applications?',
    'What did the author get wrong?',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col shadow-2xl ${panelBg}`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 flex-shrink-0 ${headerBg}`}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${vc(vibe, {
                    CLASSIC: 'bg-amber-900/50',
                    AVANT_GARDE: 'bg-green-900/40',
                    MINIMALIST: 'bg-indigo-900/40',
                  })}`}
                >
                  🎭
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${accentColor}`}>
                    {persona.length > 45 ? persona.slice(0, 42) + '…' : persona}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center px-4"
                >
                  <MessageSquare className={`w-10 h-10 mb-4 opacity-30 ${accentColor}`} />
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    Ask your persona anything about the document.
                  </p>
                  <div className="space-y-2 w-full">
                    {starterPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(prompt)}
                        className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 text-xs transition-all border border-white/5 hover:border-white/10"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <span className="text-base mr-2 flex-shrink-0 mt-1">
                      🎭
                    </span>
                  )}
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' ? userBubble : aiBubble
                    } ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          code: ({ children }) => <code className="bg-white/10 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <span className="text-base mr-2 flex-shrink-0 mt-1">
                    🎭
                  </span>
                  <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${aiBubble}`}>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          className={`w-1.5 h-1.5 rounded-full ${vc(vibe, {
                            CLASSIC: 'bg-amber-400',
                            AVANT_GARDE: 'bg-green-400',
                            MINIMALIST: 'bg-indigo-400',
                          })}`}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mx-2 p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-xs"
                >
                  {error}
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className={`px-4 py-4 flex-shrink-0 ${inputBg}`}>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your persona anything..."
                  rows={2}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition-colors ${vc(vibe, {
                    CLASSIC:
                      'bg-gray-900 text-gray-200 placeholder-gray-600 border border-amber-900/30 focus:border-amber-700/60',
                    AVANT_GARDE:
                      'bg-gray-900 text-green-100 placeholder-green-900/60 border border-green-800/30 focus:border-green-600/60 font-space-mono text-xs',
                    MINIMALIST:
                      'bg-gray-800 text-gray-200 placeholder-gray-600 border border-gray-700 focus:border-indigo-600',
                  })}`}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white ${sendBtnColor}`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-gray-700 text-xs mt-2 text-center">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
