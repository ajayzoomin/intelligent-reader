import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { LOADING_PHRASES } from '../constants';

interface ProcessingViewProps {
  currentMessage: string;
}

export default function ProcessingView({ currentMessage }: ProcessingViewProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhraseIndex((i) => (i + 1) % LOADING_PHRASES.length);
        setVisible(true);
      }, 400);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const phrase = currentMessage || LOADING_PHRASES[phraseIndex];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-purple-900/10 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-pink-900/10 blur-3xl animate-pulse-slow" />
      </div>

      {/* Animated grid background */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center max-w-lg">
        {/* Animated icon */}
        <div className="relative mx-auto w-24 h-24 mb-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border border-indigo-500/30"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2 rounded-full border border-purple-500/40 border-dashed"
          />
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center"
          >
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </motion.div>
        </div>

        {/* Main label */}
        <p className="text-gray-500 text-xs uppercase tracking-[0.3em] font-space-mono mb-4">
          Generating Masterpiece
        </p>

        {/* Cycling phrase */}
        <div className="h-10 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {visible && (
              <motion.p
                key={phrase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="text-white text-xl font-playfair font-medium italic"
              >
                {phrase}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              className="w-1.5 h-1.5 rounded-full bg-indigo-400"
            />
          ))}
        </div>

        {/* Hint */}
        <p className="text-gray-700 text-xs font-inter mt-10 max-w-xs mx-auto">
          The AI is reading, analyzing, and crafting your editorial masterpiece. This may take 15–30 seconds.
        </p>
      </div>
    </div>
  );
}
