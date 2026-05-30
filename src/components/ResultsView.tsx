import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  BookOpen,
  Star,
  Download,
  Save,
  Home,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  BatteryCharging
} from 'lucide-react';
import { RawQuestion, PlayableQuestion } from '../types';
import { serializeToCustomFormat } from '../utils';

interface ResultsViewProps {
  questions: PlayableQuestion[];
  answers: { [id: string]: { selected: string; isCorrect: boolean } };
  originalQuestions: RawQuestion[];
  onRestart: () => void;
  onPracticeMistakes: () => void;
  onReviewFlagged: () => void;
  onSaveMistakesToHistory: (customName: string, subset: RawQuestion[]) => void;
  flaggedQuestionIds: Set<string>;
  elapsedTime: string;
  historyCount?: number;
}

export default function ResultsView({
  questions,
  answers,
  originalQuestions,
  onRestart,
  onPracticeMistakes,
  onReviewFlagged,
  onSaveMistakesToHistory,
  flaggedQuestionIds,
  elapsedTime,
  historyCount = 0,
}: ResultsViewProps) {
  const [mistakeCollectionName, setMistakeCollectionName] = useState(() => {
    const d = new Date();
    const dateStr = `${d.getDate()}_${d.toLocaleString('ka-GE', { month: 'short' })}_${d.getFullYear()}`;
    return `შეცდომები_ბაზიდან_${dateStr}`;
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Compute stats
  const totalCompleted = questions.length;
  let correctCount = 0;
  let mistakeCount = 0;

  // Track the raw question format of mistakes
  const mistakenRawQuestions: RawQuestion[] = [];

  questions.forEach((q) => {
    const ans = answers[q.id];
    if (ans) {
      // Bulletproof direct comparison of selected string against correctAnswer
      const isCorrectValue = ans.selected === q.correctAnswer || ans.isCorrect === true;
      if (isCorrectValue) {
        correctCount++;
      } else {
        mistakeCount++;
        const rawMatch = originalQuestions.find((oq) => oq.id === q.id);
        if (rawMatch) {
          mistakenRawQuestions.push(rawMatch);
        }
      }
    }
  });

  const actualSuccessPercent = totalCompleted > 0 ? Math.round((correctCount / totalCompleted) * 100) : 0;

  // Download export triggers
  const downloadAsOriginalText = () => {
    if (mistakenRawQuestions.length === 0) return;
    const content = serializeToCustomFormat(mistakenRawQuestions);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${mistakeCollectionName}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAsJSON = () => {
    if (mistakenRawQuestions.length === 0) return;
    const content = JSON.stringify(mistakenRawQuestions, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${mistakeCollectionName}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToLocalHistory = () => {
    if (mistakenRawQuestions.length === 0) return;
    onSaveMistakesToHistory(mistakeCollectionName.trim(), mistakenRawQuestions);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div id="results-view" className="space-y-6 max-w-2xl mx-auto py-2">
      {/* Top micro tag */}
      <div className="text-center font-sans">
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block mb-1">
          ვარჯიშის შედეგი
        </span>
        
        {/* Huge Percentage Center Score */}
        <div className="text-[84px] leading-none font-black text-slate-900 dark:text-white tracking-tighter my-2 block">
          {actualSuccessPercent}%
        </div>

        {/* Correct metrics indicator */}
        <div className="inline-block bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-extrabold px-4 py-1.5 rounded-full shadow-sm mt-1">
          {correctCount} / {totalCompleted} სწორი პასუხი
        </div>
      </div>

      {/* Motivational dopaminergic panel matching mockup precisely */}
      <div className="bg-transparent border border-teal-500/30 rounded-2xl p-5 text-center shadow-sm relative overflow-hidden backdrop-blur-md">
        <p className="text-sm md:text-base font-semibold leading-relaxed text-slate-800 dark:text-slate-200 font-sans">
          „მე ვარსებობ შენი წარმატებისთვის. ახლა მთავარია დოფამინის დონე აიმაღლო, ცოტა დაისვენო და კვლავ თავიდან ვცადოთ.“
        </p>
      </div>

      {/* 4-column metrics box grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Stat 1: სწორი */}
        <div className="bg-slate-50/60 dark:bg-[#161B22] border border-slate-200/55 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between font-sans">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
            ✓ სწორი
          </span>
          <span className="text-2xl font-black text-emerald-500 dark:text-emerald-400 mt-2 font-mono">
            {correctCount}
          </span>
        </div>

        {/* Stat 2: შეცდომები */}
        <div className="bg-slate-50/60 dark:bg-[#161B22] border border-slate-200/55 dark:border-slate-805 rounded-xl p-4 flex flex-col justify-between font-sans">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
            ✕ შეცდომები
          </span>
          <span className="text-xl md:text-2xl font-black text-rose-500 dark:text-rose-400 mt-2 font-mono">
            {mistakeCount}
          </span>
        </div>

        {/* Stat 3: გავლილი */}
        <div className="bg-slate-50/60 dark:bg-[#161B22] border border-[#E2E8F0]/30 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between font-sans">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
            ◎ გავლილი
          </span>
          <span className="text-xl md:text-2xl font-black text-slate-700 dark:text-slate-300 mt-2 font-mono">
            {totalCompleted}
          </span>
        </div>

        {/* Stat 4: დრო */}
        <div className="bg-slate-50/60 dark:bg-[#161B22] border border-[#E2E8F0]/30 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between font-sans">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
            🕒 დრო
          </span>
          <span className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 mt-2 font-mono truncate">
            {elapsedTime}
          </span>
        </div>
      </div>

      {/* Total Mistakes in Bank Badge */}
      <div className="bg-slate-50/40 dark:bg-[#161B22]/50 border border-slate-200/40 dark:border-slate-850 rounded-2xl p-4 text-center select-none font-sans">
        <label className="text-xs font-bold text-slate-705 dark:text-slate-350 flex items-center justify-center gap-1.5">
          <span>🗃️ შეცდომების ბანკში შენახულია სულ {historyCount} კითხვა</span>
        </label>
      </div>

      {/* Bottom Main Button Flow Actions layout */}
      <div className="flex flex-col gap-3 pt-2 font-sans">
        {/* Only mistakes review trigger button if any exist */}
        {mistakeCount > 0 && (
          <button
            onClick={onPracticeMistakes}
            className="w-full py-4 bg-[#E11D48] hover:bg-rose-500 text-white font-extrabold text-xs md:text-sm rounded-2xl transition-all shadow-sm focus:outline-none cursor-pointer flex items-center justify-center gap-2 animate-pulse"
          >
            <span>⚠ მხოლოდ შეცდომების გავლა ({mistakeCount})</span>
          </button>
        )}

        {/* Home & retry button grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onRestart}
            className="py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-2xl shadow-sm transition-all focus:outline-none cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>↻ ხელახლა ცდა</span>
          </button>

          <button
            onClick={() => onRestart()}
            className="py-3.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-[#161B22] text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-2xl shadow-sm transition-all focus:outline-none cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>მთავარი</span>
          </button>
        </div>
      </div>

      {/* Original downloads segment preserved and layout enhanced */}
      {mistakeCount > 0 && (
        <div className="bg-slate-50/40 dark:bg-[#161B22]/40 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 space-y-4 mt-8">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-305 uppercase tracking-wider font-sans border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
              შეცდომების შენახვა / ექსპორტი
            </h3>
          </div>
          <p className="text-[11px] text-slate-550 dark:text-slate-450 leading-relaxed font-sans">
            შეინახეთ ან ჩამოტვირთეთ მხოლოდ შეცდომით ნაპასუხები {mistakeCount} კითხვა. მონიშნული შეცდომების ფაილი სრულად თავსებადია პლატფორმის ატვირთვის სისტემასთან.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={mistakeCollectionName}
              onChange={(e) => setMistakeCollectionName(e.target.value)}
              placeholder="კოლექციის სახელი"
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-100 font-sans focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={handleSaveToLocalHistory}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none transition-all shadow-sm font-sans"
            >
              {saveSuccess ? 'შენახულია!' : 'შეცდომების შენახვა'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 font-sans">
            <button
              onClick={downloadAsOriginalText}
              className="p-3 bg-slate-100/80 dark:bg-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer focus:outline-none transition-colors"
            >
              .txt ექსპორტი (ფორმატირებული)
            </button>
            <button
              onClick={downloadAsJSON}
              className="p-3 bg-slate-100/80 dark:bg-[#161B22] hover:bg-slate-250 dark:hover:bg-[#0A0C10] border border-slate-200 dark:border-slate-800 text-slate-755 dark:text-slate-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer focus:outline-none transition-colors"
            >
              .json ექსპორტი
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
