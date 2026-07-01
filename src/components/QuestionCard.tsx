import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ArrowRight, ArrowLeft, Play, AlertCircle, HelpCircle, CheckCircle, RotateCw, Sliders, MoreVertical, LogOut, BookOpen, Scissors } from 'lucide-react';
import { PlayableQuestion, RawQuestion } from '../types';
import { getQuestionCategory } from '../utils';

interface QuestionCardProps {
  question: PlayableQuestion;
  currentIndex: number;
  totalQuestions: number;
  autoAdvance: boolean;
  onAnswerSelected: (selectedOption: string) => void;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  onNext: () => void;
  flagged: boolean;
  onToggleFlag: () => void;
  onPracticeMistakesNow?: () => void;
  mistakesCountSoFar: number;
  isMistakesSession: boolean;
  onJumpToQuestion?: (index: number) => void;
  shuffleOptions: boolean;
  onCancelTest?: () => void;
  shuffleQuestions?: boolean;
  rangeStart?: string;
  rangeEnd?: string;
  cutStart?: string;
  cutEnd?: string;
  chosenMode?: 'practice' | 'simulator' | 'residents' | null;
  originalQuestions?: RawQuestion[];
  onFilterByCategory?: (category: string | null) => void;
  onUpdateParams?: (
    newShuffleQ: boolean,
    newShuffleO: boolean,
    newAutoAdv: boolean,
    newRangeS: string,
    newRangeE: string,
    newCutS: string,
    newCutE: string
  ) => void;
}

export default function QuestionCard({
  question,
  currentIndex,
  totalQuestions,
  autoAdvance,
  onAnswerSelected,
  selectedAnswer,
  isCorrect,
  onNext,
  flagged,
  onToggleFlag,
  onPracticeMistakesNow,
  mistakesCountSoFar,
  isMistakesSession,
  onJumpToQuestion,
  shuffleOptions,
  onCancelTest,
  shuffleQuestions = false,
  rangeStart = '',
  rangeEnd = '',
  cutStart = '',
  cutEnd = '',
  chosenMode = 'practice',
  originalQuestions = [],
  onFilterByCategory,
  onUpdateParams,
}: QuestionCardProps) {
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const [jumpTarget, setJumpTarget] = useState((currentIndex + 1).toString());
  const [showCardDropdown, setShowCardDropdown] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const [localRangeStart, setLocalRangeStart] = useState(rangeStart);
  const [localRangeEnd, setLocalRangeEnd] = useState(rangeEnd);
  const [localCutStart, setLocalCutStart] = useState(cutStart);
  const [localCutEnd, setLocalCutEnd] = useState(cutEnd);

  // Sync state if parents update
  useEffect(() => {
    setLocalRangeStart(rangeStart || '');
    setLocalRangeEnd(rangeEnd || '');
    setLocalCutStart(cutStart || '');
    setLocalCutEnd(cutEnd || '');
  }, [rangeStart, rangeEnd, cutStart, cutEnd]);

  // `question.options` is authoritative: it holds file-order when shuffleOptions=false,
  // or a shuffled order when shuffleOptions=true. Never fall back to rawOptions for display.
  const optionsToDisplay = question.options;

  // Compute categories and counts for Table of Contents
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const pool = originalQuestions || [];
    pool.forEach((q) => {
      const cat = getQuestionCategory(q.text);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const order = [
      'კარდიოლოგია',
      'პულმონოლოგია',
      'გასტროენტეროლოგია',
      'ნეფროლოგია',
      'ჰემატოლოგია',
      'ენდოკრინოლოგია',
      'რევმატოლოგია',
      'ალერგოლოგია-იმუნოლოგია',
      'ნევროლოგია',
      'პედიატრია',
      'მეანობა-გინეკოლოგია',
      'ქირურგია',
      'სხვა მიმართულებები'
    ];

    return order
      .map((name) => ({
        name,
        count: counts[name] || 0
      }))
      .filter((item) => item.count > 0);
  }, [originalQuestions]);

  useEffect(() => {
    setJumpTarget((currentIndex + 1).toString());
  }, [currentIndex]);

  // Monitor keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent running if user was focused on inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();

      // Keyboard choices: 1-5 or a-e
      const isNumberKey = ['1', '2', '3', '4', '5'].includes(key);
      const isLetterKey = ['a', 'b', 'c', 'd', 'e'].includes(key);

      if (isNumberKey || isLetterKey) {
        let index = -1;
        if (isNumberKey) index = parseInt(key) - 1;
        if (isLetterKey) index = key.charCodeAt(0) - 97;

        if (index >= 0 && index < optionsToDisplay.length && selectedAnswer === null) {
          onAnswerSelected(optionsToDisplay[index]);
          setPressedIndex(index);
          setTimeout(() => setPressedIndex(null), 150);
        }
      }

      // Space or Enter for Next Question
      if ((key === ' ' || key === 'enter') && selectedAnswer !== null) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [question, selectedAnswer, onAnswerSelected, onNext, optionsToDisplay]);

  const letterLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
  const progressPercent = Math.min(((currentIndex + 1) / totalQuestions) * 100, 100);

  return (
    <div id="question-card-wrapper" className="space-y-4 max-w-2xl mx-auto">
      {/* Sleek Integrated Minimalist Top Control Row */}
      <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-4 font-sans relative">
        {/* Left: Go Home / End test & Question Counter */}
        <div className="flex items-center gap-3">
          {onCancelTest && (
            <button
              onClick={onCancelTest}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-bold text-slate-650 dark:text-slate-400 hover:text-rose-600 hover:border-rose-500/30 dark:hover:text-rose-450 transition-all cursor-pointer focus:outline-none"
              title="მთავარზე დაბრუნება (უკან)"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">უკან დაბრუნება</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wide hidden sm:inline">კითხვა</span>
            <span className={`font-mono text-sm font-black px-2.5 py-1 rounded-xl border ${
              chosenMode === 'simulator'
                ? 'text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30'
                : chosenMode === 'residents'
                ? 'text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                : 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 border-teal-100/50 dark:border-teal-900/30'
            }`}>
              {currentIndex + 1} / {totalQuestions}
            </span>
          </div>
        </div>

        {/* Centered Active Mode Name with elegant custom colors */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center pointer-events-none select-none">
          <span className={`text-xs font-sans font-black uppercase tracking-[0.2em] ${
            chosenMode === 'simulator'
              ? 'text-red-650 dark:text-red-400'
              : chosenMode === 'residents'
              ? 'text-slate-905 dark:text-slate-300'
              : 'text-[#3B82F6] dark:text-[#60A5FA]'
          }`}>
            BON COURAGE!⚕️
          </span>
        </div>

        {/* Right: jump input, and three dots close together */}
        <div className="flex items-center gap-3 ml-auto">
          
          {/* Jump input close to the 3-dots */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max={totalQuestions}
              value={jumpTarget}
              onChange={(e) => setJumpTarget(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt(jumpTarget);
                  if (val >= 1 && val <= totalQuestions && onJumpToQuestion) {
                    onJumpToQuestion(val - 1);
                  }
                }
              }}
              placeholder="#"
              className={`w-10 text-center text-xs font-mono font-black border bg-slate-50 dark:bg-[#0A0C10] rounded-lg py-1 px-1 focus:outline-none focus:ring-2 transition-all ${
                chosenMode === 'simulator'
                  ? 'border-red-200 dark:border-red-900/40 focus:ring-red-500/15 focus:border-red-500'
                  : chosenMode === 'residents'
                  ? 'border-slate-300 dark:border-slate-700 focus:ring-slate-500/15 focus:border-slate-500'
                  : 'border-slate-200 dark:border-slate-800 focus:ring-teal-500/15 focus:border-teal-500'
              }`}
              title="გადასვლა კითხვაზე"
            />
            <button
              type="button"
              onClick={() => {
                const val = parseInt(jumpTarget);
                if (val >= 1 && val <= totalQuestions && onJumpToQuestion) {
                  onJumpToQuestion(val - 1);
                }
              }}
              disabled={!jumpTarget || parseInt(jumpTarget) < 1 || parseInt(jumpTarget) > totalQuestions}
              className={`px-2 py-1 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold rounded-lg transition-all cursor-pointer text-white ${
                chosenMode === 'simulator'
                  ? 'bg-red-650 hover:bg-red-700'
                  : chosenMode === 'residents'
                  ? 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600'
                  : 'bg-[#0f172a] hover:bg-[#1e293b] dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-[#0A0C10]'
              }`}
            >
              სვლა
            </button>
          </div>

          {/* Three dots button */}
          <div className="relative flex items-center shrink-0">
            <button
              onClick={() => setShowCardDropdown(!showCardDropdown)}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/80 dark:hover:bg-[#0A0C10] border border-slate-200 dark:border-slate-805 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer focus:outline-none shadow-sm"
              title="მოქმედებები"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            <AnimatePresence>
              {showCardDropdown && (
                <>
                  {/* Overlay dismiss click catcher */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowCardDropdown(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 top-full w-72 bg-white dark:bg-[#161B22] border border-slate-205 dark:border-slate-800 rounded-3xl shadow-xl z-50 p-3.5 font-sans text-left space-y-3"
                  >
                    {/* Database origin detail */}
                    <div className="px-1 pb-2 border-b border-slate-100 dark:border-slate-800/85 text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-normal break-words">
                      ბაზა: {question.sourceFile} <span className={`font-mono ${
                        chosenMode === 'simulator' ? 'text-red-500' : chosenMode === 'residents' ? 'text-slate-400' : 'text-teal-650 dark:text-teal-400'
                      }`}>(#{question.originalIndex})</span>
                    </div>

                    {/* Standard Quick Actions */}
                    <div className="space-y-1">
                      <div className="px-1 text-[9px] uppercase tracking-wider font-extrabold text-slate-405 dark:text-slate-500">
                        სწრაფი ქმედებები
                      </div>

                      {/* Favourites Option */}
                      <button
                        type="button"
                        onClick={() => {
                          onToggleFlag();
                        }}
                        className="w-full px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-xs font-bold rounded-xl transition-all cursor-pointer text-left flex items-center gap-2 text-slate-700 dark:text-slate-300"
                      >
                        <Star className={`h-3.5 w-3.5 ${flagged ? 'fill-red-500 text-red-500' : 'text-slate-500'}`} />
                        <span>{flagged ? 'ფავორიტიდან ამოშლა' : 'ფავორიტებში შენახვა'}</span>
                      </button>

                      {/* SARCHEVI Option for Table of Contents */}
                      {originalQuestions && originalQuestions.length > 0 && onFilterByCategory && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowCardDropdown(false);
                            setShowSidebar(true);
                          }}
                          className="w-full px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-xs font-bold rounded-xl transition-all cursor-pointer text-left flex items-center gap-2 text-slate-700 dark:text-slate-300 border-0 bg-transparent outline-none"
                        >
                          <BookOpen className={`h-3.5 w-3.5 ${chosenMode === 'simulator' ? 'text-red-500' : chosenMode === 'residents' ? 'text-slate-400' : 'text-teal-500'}`} />
                          <span>სარჩევი (საგნები)</span>
                        </button>
                      )}

                      {/* Mistakes Option */}
                      {mistakesCountSoFar > 0 && !isMistakesSession && onPracticeMistakesNow && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowCardDropdown(false);
                            onPracticeMistakesNow();
                          }}
                          className="w-full px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-xs font-bold rounded-xl transition-all cursor-pointer text-left flex items-center gap-2 text-slate-700 dark:text-slate-300"
                        >
                          <RotateCw className={`h-3.5 w-3.5 ${
                            chosenMode === 'simulator' ? 'text-red-500' : chosenMode === 'residents' ? 'text-slate-400' : 'text-teal-500'
                          }`} />
                          <span>შეცდომების გავლა ახლავე</span>
                        </button>
                      )}
                    </div>

                    {/* Shuffling parameters */}
                    {onUpdateParams && (
                      <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/70 pt-2.5">
                        <div className="px-1 text-[9px] uppercase tracking-wider font-extrabold text-slate-455 dark:text-slate-500">
                          არევის რეჟიმები
                        </div>
                        <div className="flex flex-col gap-1">
                          {/* Shuffle Questions Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateParams(
                                !shuffleQuestions,
                                shuffleOptions,
                                autoAdvance,
                                localRangeStart,
                                localRangeEnd,
                                localCutStart,
                                localCutEnd
                              );
                            }}
                            className="w-full px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-xs font-bold rounded-xl transition-all cursor-pointer text-left flex items-center justify-between text-slate-700 dark:text-slate-300 animate-fade-in"
                          >
                            <span className="flex items-center gap-2">
                              <Sliders className="h-3.5 w-3.5 text-slate-500" />
                              კითხვების არევა
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${shuffleQuestions ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-extrabold' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                              {shuffleQuestions ? 'კი' : 'არა'}
                            </span>
                          </button>

                          {/* Shuffle Options Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateParams(
                                shuffleQuestions,
                                !shuffleOptions,
                                autoAdvance,
                                localRangeStart,
                                localRangeEnd,
                                localCutStart,
                                localCutEnd
                              );
                            }}
                            className="w-full px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-xs font-bold rounded-xl transition-all cursor-pointer text-left flex items-center justify-between text-slate-700 dark:text-slate-300 animate-fade-in"
                          >
                            <span className="flex items-center gap-2">
                              <RotateCw className="h-3.5 w-3.5 text-slate-500" />
                              პასუხების არევა
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${shuffleOptions ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-extrabold' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                              {shuffleOptions ? 'კი' : 'არა'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Slicing Range System */}
                    {onUpdateParams && (
                      <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/70 pt-2.5">
                        <div className="px-1 text-[9px] uppercase tracking-wider font-extrabold text-slate-455 dark:text-slate-500">
                          დიაპაზონის ფილტრაცია
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-left">
                          <div>
                            <span className="text-[9px] text-slate-400 block mb-0.5">დაწყება:</span>
                            <input
                              type="number"
                              min="1"
                              placeholder="1"
                              value={localRangeStart}
                              onChange={(e) => setLocalRangeStart(e.target.value)}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-100 text-xs font-mono focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block mb-0.5">დასასრული:</span>
                            <input
                              type="number"
                              min="1"
                              placeholder="მაქს"
                              value={localRangeEnd}
                              onChange={(e) => setLocalRangeEnd(e.target.value)}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-100 text-xs font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateParams(
                              shuffleQuestions,
                              shuffleOptions,
                              autoAdvance,
                              localRangeStart,
                              localRangeEnd,
                              localCutStart,
                              localCutEnd
                            );
                          }}
                          className="w-full py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-[10px] font-black transition-all cursor-pointer focus:outline-none text-center"
                        >
                          ფილტრაციის გამოყენება
                        </button>
                      </div>
                    )}

                    {/* Cut Questions System */}
                    {onUpdateParams && (
                      <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/70 pt-2.5">
                        <div className="px-1 text-[9px] uppercase tracking-wider font-extrabold text-slate-455 dark:text-slate-500">
                          კითხვების ამოჭრის სისტემა
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-left">
                          <div>
                            <span className="text-[9px] text-slate-400 block mb-0.5">აქედან:</span>
                            <input
                              type="number"
                              placeholder="მაგ: 10"
                              value={localCutStart}
                              onChange={(e) => setLocalCutStart(e.target.value)}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-100 text-xs font-mono focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block mb-0.5">აქამდე:</span>
                            <input
                              type="number"
                              placeholder="მაგ: 35"
                              value={localCutEnd}
                              onChange={(e) => setLocalCutEnd(e.target.value)}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-100 text-xs font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateParams(
                              shuffleQuestions,
                              shuffleOptions,
                              autoAdvance,
                              localRangeStart,
                              localRangeEnd,
                              localCutStart,
                              localCutEnd
                            );
                          }}
                          className="w-full py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer focus:outline-none text-center"
                        >
                          მონაკვეთის ამოჭრა
                        </button>
                      </div>
                    )}

                    {onCancelTest && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/70">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCardDropdown(false);
                            onCancelTest();
                          }}
                          className="w-full px-2.5 py-1.5 text-rose-650 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-955/20 text-xs font-bold rounded-xl transition-all cursor-pointer text-left flex items-center gap-2"
                        >
                          <LogOut className="h-3.5 w-3.5 text-rose-500" />
                          ტესტირების შეწყვეტა
                        </button>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

           {/* Actual Progress Bar */}
      <div className="w-full bg-slate-150 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden shadow-inner font-sans">
        <motion.div
          className={`h-full rounded-full ${
            chosenMode === 'simulator'
              ? 'bg-red-550 dark:bg-red-400'
              : chosenMode === 'residents'
              ? 'bg-slate-900 dark:bg-white'
              : 'bg-teal-500 dark:bg-teal-400'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Focus Card */}
      <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 relative">
        
        {/* Toggle Flag floating widget */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            id="toggle-flag-btn"
            onClick={onToggleFlag}
            className={`p-2 rounded-xl transition-all border outline-none focus:outline-none ${
              flagged
                ? 'bg-red-50 dark:bg-red-950/30 text-red-500 border-red-200 dark:border-red-900/50 scale-105'
                : 'bg-slate-50 dark:bg-[#0A0C10] text-slate-400 border-slate-150 dark:border-slate-850 hover:text-red-500 hover:scale-105'
            }`}
            title={flagged ? 'მონიშნულია (ფავორიტიდან მოხსნა)' : 'მონიშვნა (მოგვიანებით გადაკითხვა)'}
          >
            <Star className={`h-5 w-5 ${flagged ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>

        {/* Question Text */}
        <div className="pr-12">
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border ${
            chosenMode === 'simulator'
              ? 'text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200/50 dark:border-red-900/55'
              : chosenMode === 'residents'
              ? 'text-slate-900 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-705'
              : 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/50'
          }`}>
            სამედიცინო კითხვა
          </span>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-sans mt-3 whitespace-pre-wrap leading-relaxed">
            {question.text}
          </h1>
        </div>

        {/* Answer Options list */}
        <div className="space-y-3.5 pt-2">
          {optionsToDisplay.map((option, idx) => {
            const letter = letterLabels[idx] || '';
            const isSelected = selectedAnswer === option;
            const isCorrectOption = option === question.correctAnswer;
            
            let btnStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0A0C10]/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200';
            let circleStyle = 'bg-slate-200/80 dark:bg-[#0A0C10] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-805';

            if (selectedAnswer !== null) {
              if (isCorrectOption) {
                // Correct highlights Green
                btnStyle = 'border-emerald-500 dark:border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20';
                circleStyle = 'bg-emerald-500 text-white border-transparent';
              } else if (isSelected && !isCorrect) {
                // Wrong selected highlights Red
                btnStyle = 'border-rose-500 dark:border-rose-600 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 ring-2 ring-rose-500/20';
                circleStyle = 'bg-rose-500 text-white border-transparent';
              } else {
                // Non-selected remains neutral/opaque
                btnStyle = 'opacity-40 border-slate-200 dark:border-[#30363D] bg-slate-50/50 dark:bg-[#0A0C10]/40 text-slate-400 dark:text-slate-550';
                circleStyle = 'bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-500';
              }
            } else if (pressedIndex === idx) {
              if (chosenMode === 'simulator') {
                btnStyle = 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300';
                circleStyle = 'bg-red-650 text-white border-transparent';
              } else if (chosenMode === 'residents') {
                btnStyle = 'border-slate-900 dark:border-white bg-[#121824] dark:bg-[#080b11] text-[#0f172a] dark:text-slate-100 ring-1 ring-slate-400 dark:ring-slate-700';
                circleStyle = 'bg-slate-900 dark:bg-white text-white dark:text-[#0A0C10] border-transparent';
              } else {
                btnStyle = 'border-teal-500 dark:border-teal-400 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300';
                circleStyle = 'bg-teal-600 text-white border-transparent';
              }
            }

            return (
              <button
                key={option + idx}
                disabled={selectedAnswer !== null}
                onClick={() => onAnswerSelected(option)}
                className={`w-full p-4 rounded-2xl border text-left flex items-start gap-4 transition-all duration-150 cursor-pointer focus:outline-none ${btnStyle}`}
              >
                <span className={`w-7 h-7 rounded-lg font-mono text-sm font-semibold flex items-center justify-center shrink-0 mt-0.5 ${circleStyle}`}>
                  {letter}
                </span>
                <span className="text-sm md:text-base font-sans font-medium leading-relaxed pt-0.5">
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom feedback section */}
        <AnimatePresence>
          {selectedAnswer !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isCorrect
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border border-[0.5px] border-emerald-500/20 text-emerald-800 dark:text-emerald-400'
                  : 'bg-[#FFF5F5] dark:bg-[#170B0E] border border-[0.5px] border-rose-200/40 dark:border-rose-950/30 text-rose-700 dark:text-rose-400'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-bold">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {isCorrect
                    ? 'სწორი პასუხი.'
                    : 'არასწორია! დაიმახსოვრეთ სწორი პასუხი (მონიშნულია მწვანედ).'}
                </span>
              </div>

              <button
                onClick={onNext}
                className="py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 focus:outline-none transition-all shadow-md active:scale-95 cursor-pointer bg-white hover:bg-slate-100 text-slate-900 border border-slate-200"
              >
                {currentIndex + 1 === totalQuestions ? 'შედეგების ნახვა' : 'შემდეგი კითხვა'}
                <ArrowRight className="h-3.5 w-3.5 text-slate-900" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pause/Branch into Interim Mistakes Mode */}
      {mistakesCountSoFar > 0 && !isMistakesSession && onPracticeMistakesNow && (
        <div className="flex justify-end animate-fade-in">
          <button
            onClick={onPracticeMistakesNow}
            className={`px-3 py-2 text-xs font-bold rounded-lg shrink-0 flex items-center gap-1.5 focus:outline-none transition-all border ${
              chosenMode === 'simulator'
                ? 'bg-red-50/60 hover:bg-red-100 dark:bg-red-955/30 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200/60'
                : chosenMode === 'residents'
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                : 'bg-teal-50/60 hover:bg-teal-100 dark:bg-teal-950/30 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-400 border-teal-200/60 border-teal-800/80'
            }`}
          >
            <RotateCw className="h-3.5 w-3.5" />
            შეცდომების გავლა ახლავე
          </button>
        </div>
      )}

      {/* Keyboard guide overlay bar */}
      <div className="text-center">
        <span className="text-[10px] text-slate-450 dark:text-slate-550 font-mono tracking-wide">
          კლავიატურა: [1-4] ან [A-D] პასუხის ასარჩევად • [Space/Enter] შემდეგ კითხვაზე გადასასვლელად
        </span>
      </div>

      {/* Sliding Sidebar Drawer (სარჩევი) */}
      <AnimatePresence>
        {showSidebar && (
          <>
            {/* Blurred Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-xs"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-80 max-w-full bg-white dark:bg-[#121824] border-l border-slate-200 dark:border-slate-800 z-50 flex flex-col shadow-2xl overflow-hidden font-sans text-left"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                  <span className="font-extrabold text-[#0f172a] dark:text-white text-base">სარჩევი</span>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer focus:outline-none"
                >
                  ✕
                </button>
              </div>

              {/* Content - Category List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {/* Option to Reset and see All Questions */}
                <button
                  onClick={() => {
                    if (onFilterByCategory) {
                      onFilterByCategory(null);
                      setShowSidebar(false);
                    }
                  }}
                  className="w-full p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 text-xs font-bold text-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer"
                >
                  ყველა კითხვის ჩვენება (გაფილტვრის მოხსნა)
                </button>

                {categoriesWithCounts.map((cat) => {
                  return (
                    <button
                      key={cat.name}
                      onClick={() => {
                        if (onFilterByCategory) {
                          onFilterByCategory(cat.name);
                          setShowSidebar(false);
                        }
                      }}
                      className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 dark:bg-[#161B22]/50 dark:hover:bg-[#161B22]/90 border border-slate-150 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-left transition-all cursor-pointer group flex flex-col gap-1 focus:outline-none"
                    >
                      <div className="text-sm font-bold text-[#0f172a] dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {cat.name}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                        {cat.count}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
