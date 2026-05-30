import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ArrowRight, ArrowLeft, Play, AlertCircle, HelpCircle, CheckCircle, RotateCw, Sliders, MoreVertical, LogOut, BookOpen, Scissors } from 'lucide-react';
import { PlayableQuestion } from '../types';

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
  onUpdateParams,
}: QuestionCardProps) {
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const [jumpTarget, setJumpTarget] = useState((currentIndex + 1).toString());
  const [showCardDropdown, setShowCardDropdown] = useState(false);

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

  const optionsToDisplay = shuffleOptions ? question.options : (question.rawOptions || question.options);

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
            <span className="font-mono text-sm font-black text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 px-2.5 py-1 rounded-xl border border-teal-100/50 dark:border-teal-900/30">
              {currentIndex + 1} / {totalQuestions}
            </span>
          </div>
        </div>

        {/* Centered Bon courage with elegant custom cold blue color */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center pointer-events-none select-none">
          <span className="text-xs font-sans font-black uppercase tracking-[0.2em] text-[#3B82F6] dark:text-[#60A5FA]">
            Bon courage! 🩺
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
              className="w-10 text-center text-xs font-mono font-black border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A0C10] rounded-lg py-1 px-1 focus:outline-none focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 transition-all"
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
              className="px-2 py-1 bg-[#0f172a] hover:bg-[#1e293b] dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-[#0A0C10] disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold rounded-lg transition-all cursor-pointer"
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
                      ბაზა: {question.sourceFile} <span className="text-teal-650 dark:text-teal-400 font-mono">(#{question.originalIndex})</span>
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
                          <RotateCw className="h-3.5 w-3.5 text-teal-500" />
                          <span>შეცდომების გავლა ({mistakesCountSoFar})</span>
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
          className="bg-teal-500 dark:bg-teal-400 h-full rounded-full"
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
          <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-2.5 py-1 rounded-md border border-teal-200 dark:border-teal-900/50">
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
              btnStyle = 'border-teal-500 dark:border-teal-400 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300';
              circleStyle = 'bg-teal-600 text-white border-transparent';
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
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30 text-rose-800 dark:text-rose-450'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-bold">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {isCorrect
                    ? 'სწორია! შესანიშნავი ნაბიჯია.'
                    : 'არასწორია! დაიმახსოვრეთ სწორი პასუხი (მონიშნულია მწვანედ).'}
                </span>
              </div>

              <button
                onClick={onNext}
                className="py-2.5 px-4 bg-teal-500 hover:bg-teal-400 dark:bg-teal-500 dark:hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 focus:outline-none transition-all shadow-sm"
              >
                {currentIndex + 1 === totalQuestions ? 'შედეგების ნახვა' : 'შემდეგი კითხვა'}
                <ArrowRight className="h-3.5 w-3.5 text-slate-950" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pause/Branch into Interim Mistakes Mode */}
      {mistakesCountSoFar > 0 && !isMistakesSession && onPracticeMistakesNow && (
        <div className="bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-sans font-medium">
            ნახეთ შეცდომები? შეგიძლიათ ნებისმიერ დროს გაიაროთ ისინი ახლავე, ძირითადი ტესტის პაუზით.
          </div>
          <button
            onClick={onPracticeMistakesNow}
            className="px-3 py-2 bg-teal-50/60 hover:bg-teal-100 dark:bg-teal-950/30 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/80 text-xs font-bold rounded-lg shrink-0 flex items-center gap-1.5 focus:outline-none transition-all"
          >
            <RotateCw className="h-3.5 w-3.5" />
            შეცდომების გავლა ახლავე ({mistakesCountSoFar})
          </button>
        </div>
      )}

      {/* Keyboard guide overlay bar */}
      <div className="text-center">
        <span className="text-[10px] text-slate-450 dark:text-slate-550 font-mono tracking-wide">
          კლავიატურა: [1-4] ან [A-D] პასუხის ასარჩევად • [Space/Enter] შემდეგ კითხვაზე გადასასვლელად
        </span>
      </div>
    </div>
  );
}
