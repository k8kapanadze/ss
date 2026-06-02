import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Sliders,
  Settings,
  Flame,
  Award,
  ChevronRight,
  BookOpen,
  HelpCircle,
  Clock,
  LogOut,
  FolderOpen,
  ArrowRight,
  AlertTriangle,
  Moon,
  Trash2,
  RefreshCw,
  Plus,
  Compass,
  CheckCircle,
  Eye,
  Scissors,
  MoreVertical,
  Activity,
  Stethoscope,
  GraduationCap
} from 'lucide-react';

import { RawQuestion, PlayableQuestion, MistakeCollection, ActiveSession, FileData } from './types';
import { prepareSessionQuestions, serializeToCustomFormat, parseQuestionFile, getQuestionCategory } from './utils';

import ThemeToggle from './components/ThemeToggle';
import UploadSection from './components/UploadSection';
import SimulationSetup from './components/SimulationSetup';
import MistakesHistory from './components/MistakesHistory';
import QuestionCard from './components/QuestionCard';
import ResultsView from './components/ResultsView';
import { RESIDENTS_QUESTIONS } from './data/residents_questions';

export default function App() {
  // Global persistence states
  const [files, setFiles] = useState<FileData[]>(() => {
    const saved = localStorage.getItem('med_quiz_files');
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState<MistakeCollection[]>(() => {
    const saved = localStorage.getItem('med_quiz_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [flaggedIds, setFlaggedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('med_quiz_flagged');
    return saved ? JSON.parse(saved) : [];
  });

  // Chosen mode: practice = Standalone Practice, simulator = Exam Simulator, residents = Residents Base Testing
  const [chosenMode, setChosenMode] = useState<'practice' | 'simulator' | 'residents' | null>(null);
  const [residentsRawInput, setResidentsRawInput] = useState('');

  // Architectural State Management additions for robust isolated activePool and sourceQuestions
  const [sourceQuestions, setSourceQuestions] = useState<RawQuestion[]>([]);
  const [activePool, setActivePool] = useState<PlayableQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const activeFiles = useMemo(() => {
    if (chosenMode === 'residents') {
      const stored = localStorage.getItem('residents_stored_questions');
      const questionsList = stored ? JSON.parse(stored) : RESIDENTS_QUESTIONS;
      return [
        {
          name: 'რეზიდენტების ბაზა.txt',
          questions: questionsList,
          sizeStr: stored ? `${(stored.length / 1024).toFixed(1)} KB` : '25.3 KB'
        }
      ];
    }
    return files;
  }, [chosenMode, files]);

  // Active UI Navigation Tab
  // 'all' = Main Test Config, 'simulation' = Multi-file Simulator, 'history' = My Mistakes Collections
  const [activeTab, setActiveTab] = useState<'all' | 'simulation' | 'history'>('all');

  // Active Practicing Session state (When null, user is in configuration workspace)
  const [session, setSession] = useState<ActiveSession | null>(null);

  // Elapsed session duration stopwatch matching medcore-pro layout
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [sessionDurationSecs, setSessionDurationSecs] = useState<number>(0);

  const timerActive = session !== null && currentIndex < activePool.length;

  useEffect(() => {
    if (!timerActive) return;

    const interval = setInterval(() => {
      setSessionDurationSecs((prev) => {
        const next = prev + 1;
        const hrs = String(Math.floor(next / 3600)).padStart(2, '0');
        const mins = String(Math.floor((next % 3600) / 60)).padStart(2, '0');
        const secs = String(next % 60).padStart(2, '0');
        setElapsedTime(`${hrs}:${mins}:${secs}`);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive]);

  // Active Single File Configuration state
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  // Slicing Range states
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');

  // Cutting Range states
  const [cutStart, setCutStart] = useState<string>('');
  const [cutEnd, setCutEnd] = useState<string>('');

  // Starting position pointer index
  const [continueFromIdx, setContinueFromIdx] = useState<string>('');

  // Double Shuffle states
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(false);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(false);

  // Auto Advance (Automatic mode vs Manual mode)
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);

  // Question Options validation locks
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Custom portaled confirm overlay states
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [showDeleteModalId, setShowDeleteModalId] = useState<string | null>(null);
  
  // Custom dashboard error messages
  const [globalConfigError, setGlobalConfigError] = useState<string | null>(null);

  // Collapsible active file config accordion state
  const [expandedFileName, setExpandedFileName] = useState<string | null>(null);

  // Show active session top-right settings dropdown
  const [showSessionSettings, setShowSessionSettings] = useState<boolean>(false);

  // Active Category Filter within the Table of Contents Menu (სარჩევი)
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  const handleFilterActiveSessionByCategory = (category: string | null) => {
    setActiveCategoryFilter(category);
    if (!session) return;
    
    let pool = [...sourceQuestions];
    if (category) {
      pool = pool.filter((q) => getQuestionCategory(q.text) === category);
    }
    
    if (pool.length === 0) {
      alert('ამ კატეგორიაში კითხვები არ მოიძებნა!');
      return;
    }

    // Apply any active ranges/cuts to this pool as well.
    let slicedPool = [...pool];
    const totalCount = slicedPool.length;
    if (rangeStart || rangeEnd) {
      const s = parseInt(rangeStart) || 1;
      const e = parseInt(rangeEnd) || totalCount;
      const validS = Math.max(1, Math.min(s, totalCount));
      const validE = Math.max(validS, Math.min(e, totalCount));
      slicedPool = slicedPool.slice(validS - 1, validE);
    }
    if (cutStart && cutEnd) {
      const cutS = parseInt(cutStart) || 0;
      const cutE = parseInt(cutEnd) || 0;
      if (cutS > 0 && cutE >= cutS) {
        slicedPool = slicedPool.filter(q => q.originalIndex < cutS || q.originalIndex > cutE);
      }
    }
    
    // Prepare session questions
    const playable = prepareSessionQuestions(slicedPool, shuffleQuestions, shuffleOptions);
    
    setActivePool(playable);
    setCurrentIndex(0);

    setSession({
      ...session,
      questions: playable,
      currentIndex: 0,
      answers: {}, // Reset answers for the new isolated test
    });
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  // Dynamic on-the-fly parameters adjustment during active test
  const handleUpdateActiveSessionParamsOnTheFly = (
    newShuffleQ: boolean,
    newShuffleO: boolean,
    newAutoAdv: boolean,
    newRangeS: string,
    newRangeE: string,
    newCutS: string,
    newCutE: string
  ) => {
    const rangeSChanged = rangeStart !== newRangeS;
    const rangeEChanged = rangeEnd !== newRangeE;
    const cutSChanged = cutStart !== newCutS;
    const cutEChanged = cutEnd !== newCutE;
    const isRangeOrCutChanged = rangeSChanged || rangeEChanged || cutSChanged || cutEChanged;

    // Keep parameters in sync
    setShuffleQuestions(newShuffleQ);
    setShuffleOptions(newShuffleO);
    setAutoAdvance(newAutoAdv);
    setRangeStart(newRangeS);
    setRangeEnd(newRangeE);
    setCutStart(newCutS);
    setCutEnd(newCutE);

    if (!session) return;

    // Find the original questions pool representing this session (sourceQuestions)
    let pool = [...sourceQuestions];

    // In residents mode, also filter by activeCategoryFilter
    if (chosenMode === 'residents' && activeCategoryFilter) {
      pool = pool.filter((q) => getQuestionCategory(q.text) === activeCategoryFilter);
    }

    const totalCount = pool.length;

    // Apply numerical range slice if set
    if (newRangeS || newRangeE) {
      const s = parseInt(newRangeS) || 1;
      const e = parseInt(newRangeE) || totalCount;
      const validS = Math.max(1, Math.min(s, totalCount));
      const validE = Math.max(validS, Math.min(e, totalCount));
      pool = pool.slice(validS - 1, validE);
    }

    // Apply cuts if set
    if (newCutS && newCutE) {
      const cutS = parseInt(newCutS) || 0;
      const cutE = parseInt(newCutE) || 0;
      if (cutS > 0 && cutE >= cutS) {
        pool = pool.filter(q => q.originalIndex < cutS || q.originalIndex > cutE);
      }
    }

    if (pool.length === 0) {
      alert('ამ პარამეტრებში კითხვები არ მოიძებნა!');
      return;
    }

    // Prepare playable scrambled questions
    const playable = prepareSessionQuestions(pool, newShuffleQ, newShuffleO);

    let newIdx = currentIndex;
    let newAnswers = session.answers;

    if (isRangeOrCutChanged) {
      // ყოველი დიაპაზონის შეცვლისას, currentIndex ჩამოყარე ნულზე
      newIdx = 0;
      newAnswers = {};
      setSelectedAnswer(null);
      setIsCorrect(null);
    } else {
      // Just option or question shuffle switched: stay on the same index safely
      newIdx = Math.min(currentIndex, playable.length - 1);
      newIdx = Math.max(0, newIdx);

      // Keep answer status in sync
      if (playable[newIdx]) {
        const ans = session.answers[playable[newIdx].id];
        if (ans) {
          setSelectedAnswer(ans.selected);
          setIsCorrect(ans.isCorrect);
        } else {
          setSelectedAnswer(null);
          setIsCorrect(null);
        }
      }
    }

    setActivePool(playable);
    setCurrentIndex(newIdx);

    setSession({
      ...session,
      questions: playable,
      currentIndex: newIdx,
      answers: newAnswers,
    });
  };

  // Clock Bedtime Awareness state
  const [isLateNight, setIsLateNight] = useState(false);

  // Synchronize storage
  useEffect(() => {
    localStorage.setItem('med_quiz_files', JSON.stringify(files));
    if (files.length > 0 && !selectedFileName) {
      setSelectedFileName(files[0].name);
    }
  }, [files]);

  useEffect(() => {
    localStorage.setItem('med_quiz_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('med_quiz_flagged', JSON.stringify(flaggedIds));
  }, [flaggedIds]);

  // Update bedtime indicator
  useEffect(() => {
    const checkTime = () => {
      const hrs = new Date().getHours();
      // Midnight (00:00) to 5:00 AM is considered sleep time
      setIsLateNight(hrs === 0 || (hrs > 0 && hrs < 5));
    };
    checkTime();
    const t = setInterval(checkTime, 60000);
    return () => clearInterval(t);
  }, []);

  // Sync selected file fallback when files list is modified
  useEffect(() => {
    if (activeFiles.length > 0 && (!selectedFileName || !activeFiles.some(f => f.name === selectedFileName))) {
      setSelectedFileName(activeFiles[0].name);
    }
  }, [activeFiles, selectedFileName]);

  // Auto-expand last added file config when files count increases
  const prevFilesLengthRef = React.useRef(files.length);
  React.useEffect(() => {
    if (files.length > prevFilesLengthRef.current) {
      const newlyAdded = files[files.length - 1];
      if (newlyAdded) {
        setExpandedFileName(newlyAdded.name);
        setSelectedFileName(newlyAdded.name);
      }
    }
    prevFilesLengthRef.current = files.length;
  }, [files]);

  // Derived current loaded file data
  const currentFile = useMemo(() => {
    return activeFiles.find((f) => f.name === selectedFileName) || null;
  }, [activeFiles, selectedFileName]);

  // Toggle flags
  const handleToggleFlag = (id: string) => {
    setFlaggedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleDeleteFile = (fileName: string) => {
    const updated = files.filter((f) => f.name !== fileName);
    setFiles(updated);
    localStorage.setItem('med_quiz_files', JSON.stringify(updated));
    if (expandedFileName === fileName) setExpandedFileName(null);
    if (selectedFileName === fileName) setSelectedFileName('');
  };

  const handleStartResidentsDirectly = () => {
    const stored = localStorage.getItem('residents_stored_questions');
    const questionsList = stored ? JSON.parse(stored) : RESIDENTS_QUESTIONS;

    const targetFile = {
      name: 'რეზიდენტების ბაზა.txt',
      questions: questionsList,
      sizeStr: '25.3 KB'
    };

    setActiveCategoryFilter(null);
    setSourceQuestions(targetFile.questions);

    const playable = prepareSessionQuestions(targetFile.questions, false, false);
    setActivePool(playable);
    setCurrentIndex(0);

    setChosenMode('residents');
    setSession({
      type: 'main',
      sourceFiles: [targetFile.name],
      originalQuestions: targetFile.questions,
      questions: playable,
      currentIndex: 0,
      answers: {},
    });
    setSessionDurationSecs(0);
    setElapsedTime('00:00:00');
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const handleImportResidentsPasted = () => {
    if (!residentsRawInput.trim()) {
      alert('გთხოვთ, ჯერ ჩაწეროთ ან ჩასვათ ტექსტი.');
      return;
    }
    const parsed = parseQuestionFile(residentsRawInput, 'რეზიდენტების ბაზა.txt');
    if (parsed.length === 0) {
      alert('ტექსტიდან კითხვების პარსვა ვერ მოხერხდა. გთხოვთ შეამოწმოთ ფორმატი (////, //, ///).');
      return;
    }
    localStorage.setItem('residents_stored_questions', JSON.stringify(parsed));
    setResidentsRawInput('');
    // Trigger React render
    setFiles([...files]);
    alert(`წარმატებით ჩაიტვირთა ${parsed.length} კითხვა!`);
  };

  /**
   * Action: Start practicing a single file with custom ranges, shuffles, cuts, and starting indices.
   */
  const handleStartPractice = (customFileName?: string) => {
    const targetFile = customFileName
      ? (activeFiles.find((f) => f.name === customFileName) || null)
      : currentFile;

    if (!targetFile || targetFile.questions.length === 0) return;

    setActiveCategoryFilter(null);
    setSourceQuestions(targetFile.questions);

    let pool = [...targetFile.questions];
    const totalCount = pool.length;

    // 1. Dynamic range slicing (e.g. "Only questions 50 to 100")
    if (rangeStart || rangeEnd) {
      const start = parseInt(rangeStart) || 1;
      const end = parseInt(rangeEnd) || totalCount;
      const validStart = Math.max(1, Math.min(start, totalCount));
      const validEnd = Math.max(validStart, Math.min(end, totalCount));
      
      // Slices inclusion coordinates (e.g. index 49 to 99 for 50-100)
      pool = pool.slice(validStart - 1, validEnd);
    }

    // 2. Question cut-out cutting (e.g. "Cut out 50 to 60")
    if (cutStart && cutEnd) {
      const cutS = parseInt(cutStart) || 0;
      const cutE = parseInt(cutEnd) || 0;
      if (cutS > 0 && cutE >= cutS) {
        // Exclude questions that fit in original index bounds
        pool = pool.filter((q) => q.originalIndex < cutS || q.originalIndex > cutE);
      }
    }

    if (pool.length === 0) {
      setGlobalConfigError('არჩეული ფილტრაციის პირობებში კითხვები ვერ მოიძებნა. გთხოვთ დააზუსტოთ დიაპაზონები.');
      return;
    }
    setGlobalConfigError(null);

    // Prepare playable scrambled questions
    const playable = prepareSessionQuestions(pool, shuffleQuestions, shuffleOptions);

    // 3. Continue from specific question index
    let startPointer = 0;
    if (continueFromIdx) {
      const targetOriginalIdx = parseInt(continueFromIdx) || 0;
      if (targetOriginalIdx > 0) {
        const foundIndexInPlayable = playable.findIndex((q) => q.originalIndex === targetOriginalIdx);
        if (foundIndexInPlayable !== -1) {
          startPointer = foundIndexInPlayable;
        } else {
          // Fallback, find the closest original index remaining
          const sorted = [...playable].sort((a,b) => Math.abs(a.originalIndex - targetOriginalIdx) - Math.abs(b.originalIndex - targetOriginalIdx));
          if (sorted.length > 0) {
            startPointer = playable.indexOf(sorted[0]);
          }
        }
      }
    }

    setActivePool(playable);
    setCurrentIndex(startPointer);

    setSession({
      type: 'main',
      sourceFiles: [targetFile.name],
      originalQuestions: targetFile.questions,
      questions: playable,
      currentIndex: startPointer,
      answers: {},
    });

    setSessionDurationSecs(0);
    setElapsedTime('00:00:00');
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  /**
   * Action: Start Multi-file mixed simulator exams.
   */
  const handleStartSimulation = (selectedQuestions: RawQuestion[], sourceNames: string[]) => {
    setActiveCategoryFilter(null);
    setSourceQuestions(selectedQuestions);

    const playable = prepareSessionQuestions(selectedQuestions, true, shuffleOptions);
    setActivePool(playable);
    setCurrentIndex(0);

    setSession({
      type: 'simulation',
      sourceFiles: sourceNames,
      originalQuestions: selectedQuestions,
      questions: playable,
      currentIndex: 0,
      answers: {},
    });

    setSessionDurationSecs(0);
    setElapsedTime('00:00:00');
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  /**
   * Action: Practice a saved mistake collection from the mistakes tab.
   */
  const handleStartCollectionPractice = (col: MistakeCollection) => {
    setActiveCategoryFilter(null);
    setSourceQuestions(col.questions);

    const playable = prepareSessionQuestions(col.questions, true, true);
    setActivePool(playable);
    setCurrentIndex(0);

    setSession({
      type: 'mistakes_only',
      sourceFiles: [col.sourceFile],
      originalQuestions: col.questions,
      questions: playable,
      currentIndex: 0,
      answers: {},
    });

    setSessionDurationSecs(0);
    setElapsedTime('00:00:00');
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  /**
   * Action: Practice interim mistakes immediately ("შეცდომების გავლა ახლავე")
   */
  const handlePracticeInterimMistakesNow = () => {
    if (!session) return;

    // Collect all incorrect answers from current session
    const mistakenPlayable: PlayableQuestion[] = [];
    const rawMatches: RawQuestion[] = [];

    activePool.forEach((q) => {
      const record = session.answers[q.id];
      if (record && !record.isCorrect) {
        mistakenPlayable.push(q);
        const match = sourceQuestions.find(oq => oq.id === q.id);
        if (match) {
          rawMatches.push(match);
        }
      }
    });

    if (mistakenPlayable.length === 0) return;

    // Scramble the mistakes list so they don't solve it in the same order
    const reshuffledMistakes = prepareSessionQuestions(rawMatches, true, shuffleOptions);

    // Swap session to temporary interim errors practicing mode, storing the main progress index
    setSession({
      ...session,
      type: 'mistakes_interim',
      pausedIndex: currentIndex, // Remember main quiz current spot
      pausedActivePool: activePool, // Save the pre-interim pool
      questions: reshuffledMistakes,
      currentIndex: 0,
    });

    setActivePool(reshuffledMistakes);
    setCurrentIndex(0);

    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  /**
   * Handling answer submissions
   */
  const handleAnswerSelected = (selected: string) => {
    if (!session || selectedAnswer !== null) return;

    const currentQ = activePool[currentIndex];
    const correct = currentQ.correctAnswer === selected;

    setSelectedAnswer(selected);
    setIsCorrect(correct);

    // Save transaction state
    setSession((prev) => {
      if (!prev) return null;
      const updatedAnswers = {
        ...prev.answers,
        [currentQ.id]: { selected, isCorrect: correct },
      };
      return {
        ...prev,
        answers: updatedAnswers,
      };
    });

    // Automatic mode logic:
    // If the answer is correct, immediately move to next question with a brief 600ms delay.
    // If incorrect, auto-advance is disabled, requiring the student to review and click "Next".
    if (correct && autoAdvance) {
      setTimeout(() => {
        advanceNextQuestion();
      }, 650);
    }
  };

  const advanceNextQuestion = () => {
    const nextIndex = currentIndex + 1;

    if (nextIndex < activePool.length) {
      setCurrentIndex(nextIndex);
      
      // Update session's currentIndex for consistency
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentIndex: nextIndex,
        };
      });

      // Clear or retrieve answers for the next question
      const nextQ = activePool[nextIndex];
      const answerRecord = session?.answers[nextQ.id];
      if (answerRecord) {
        setSelectedAnswer(answerRecord.selected);
        setIsCorrect(answerRecord.isCorrect);
      } else {
        setSelectedAnswer(null);
        setIsCorrect(null);
      }
    } else {
      // Finished the current pool
      if (session && session.type === 'mistakes_interim') {
        const resumeIdx = session.pausedIndex || 0;
        const restoredPool = session.pausedActivePool || [];
        
        setActivePool(restoredPool);
        setCurrentIndex(resumeIdx);
        
        setSession({
          ...session,
          type: 'main',
          currentIndex: resumeIdx,
          pausedIndex: undefined,
          pausedActivePool: undefined
        });

        const resumedQ = restoredPool[resumeIdx];
        if (resumedQ && session.answers[resumedQ.id]) {
          setSelectedAnswer(session.answers[resumedQ.id].selected);
          setIsCorrect(session.answers[resumedQ.id].isCorrect);
        } else {
          setSelectedAnswer(null);
          setIsCorrect(null);
        }
      } else {
        // Terminate full session, routes to results summaries
        setCurrentIndex(activePool.length);
        setSession((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            currentIndex: activePool.length,
          };
        });
      }
    }

    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const handleJumpToQuestion = (targetIdx: number) => {
    if (!session) return;
    if (targetIdx >= 0 && targetIdx < activePool.length) {
      setCurrentIndex(targetIdx);
      
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentIndex: targetIdx,
        };
      });

      // Clear/Retrieve answer states for the jumped question
      const targetQ = activePool[targetIdx];
      const answerRecord = session.answers[targetQ.id];
      if (answerRecord) {
        setSelectedAnswer(answerRecord.selected);
        setIsCorrect(answerRecord.isCorrect);
      } else {
        setSelectedAnswer(null);
        setIsCorrect(null);
      }
    }
  };

  /**
   * Re-routing loops
   */
  const handleResultsPracticeMistakes = () => {
    if (!session) return;

    // Filter only mistaken questions from the finished quiz session
    const mistakenRaw: RawQuestion[] = [];
    activePool.forEach((q) => {
      const record = session.answers[q.id];
      if (record && !record.isCorrect) {
        const rawMatch = sourceQuestions.find((oq) => oq.id === q.id);
        if (rawMatch) {
          mistakenRaw.push(rawMatch);
        }
      }
    });

    if (mistakenRaw.length === 0) return;

    const playable = prepareSessionQuestions(mistakenRaw, true, shuffleOptions);

    setSourceQuestions(mistakenRaw);
    setActivePool(playable);
    setCurrentIndex(0);

    setSession({
      type: 'mistakes_only',
      sourceFiles: session.sourceFiles,
      originalQuestions: mistakenRaw,
      questions: playable,
      currentIndex: 0,
      answers: {},
    });

    setSessionDurationSecs(0);
    setElapsedTime('00:00:00');
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const handleResultsReviewFlagged = () => {
    if (!session) return;

    // Filter questions that the user starred during the quiz or already has starred
    const flaggedRaw: RawQuestion[] = [];
    activePool.forEach((q) => {
      if (flaggedIds.includes(q.id)) {
        const rawMatch = sourceQuestions.find((oq) => oq.id === q.id);
        if (rawMatch) {
          flaggedRaw.push(rawMatch);
        }
      }
    });

    if (flaggedRaw.length === 0) {
      return;
    }

    const playable = prepareSessionQuestions(flaggedRaw, true, shuffleOptions);

    setSourceQuestions(flaggedRaw);
    setActivePool(playable);
    setCurrentIndex(0);

    setSession({
      type: 'flagged_only',
      sourceFiles: session.sourceFiles,
      originalQuestions: flaggedRaw,
      questions: playable,
      currentIndex: 0,
      answers: {},
    });

    setSessionDurationSecs(0);
    setElapsedTime('00:00:00');
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const handleSaveMistakesToHistory = (customName: string, subset: RawQuestion[]) => {
    const freshCollection: MistakeCollection = {
      id: `mistake-col-${Date.now()}`,
      name: customName,
      timestamp: new Date().toLocaleDateString('ka-GE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      sourceFile: session?.sourceFiles.join(', ') || 'ბაზა',
      questions: subset,
      completedCount: subset.length,
      successRate: session ? Math.round(((activePool.length - subset.length) / activePool.length) * 100) : 0,
    };

    setHistory([freshCollection, ...history]);
  };

  const handleDeleteHistoryCollection = (id: string) => {
    setShowDeleteModalId(id);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0C10] font-sans transition-colors duration-200">
      
      {/* Late bedtime system-wide alert warning */}
      {isLateNight && (
        <div id="bedtime-warning-banner" className="bg-red-500/10 dark:bg-red-500/5 border-b border-red-500/20 text-red-700 dark:text-red-405 py-2.5 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2 animate-pulse">
          <Moon className="h-4 w-4 text-red-500 animate-spin" style={{ animationDuration: '8s' }} />
          <span>შეხედე საათს! ძილის დროა. 🌙 გამეორება ხვალაც შეიძლება!</span>
        </div>
      )}

      {/* Modern High-End Nav Header bar - Styled à la SIMED Bento Grid - Only on the main screens */}
      {!session && (
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 shadow-sm dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] gap-4 transition-all">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSession(null)}>
              <div className="w-10 h-10 bg-gradient-to-tr from-amber-700 to-teal-750 dark:from-amber-900 dark:to-teal-900 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(180,50,55,0.35)] dark:shadow-[0_0_15px_rgba(180,50,55,0.55)] text-white select-none">
                <Stethoscope className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  SIMED
                  <span className="text-teal-600 dark:text-teal-400 font-extrabold text-[10px] tracking-wider px-2 py-0.5 border border-teal-200 dark:border-teal-850 rounded-full bg-teal-50 dark:bg-teal-950/25">
                    Status In MEDicina
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <ThemeToggle />
            </div>
          </header>
        </div>
      )}

      {/* Main Container Workspace */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {session ? (
          <div id="practicing-session-view" className="space-y-6">
            
            {activeCategoryFilter && (
              <div className="max-w-2xl mx-auto p-3.5 bg-slate-100 dark:bg-[#161B22]/65 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs font-sans text-slate-850 dark:text-slate-200">
                <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                  <span>მიმდინარეობს ფილტრი:</span>
                  <span className="text-teal-650 dark:text-teal-400 font-extrabold pr-1.5">{activeCategoryFilter}</span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">({activePool.length} კითხვა)</span>
                </div>
                <button
                  onClick={() => handleFilterActiveSessionByCategory(null)}
                  className="px-2.5 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-[10px] font-bold tracking-tight text-slate-700 dark:text-slate-300 transition-all cursor-pointer focus:outline-none"
                >
                  გაფილტვრის მოხსნა ✕
                </button>
              </div>
            )}

            {/* If there's an active session index, render single playable question card */}
            {currentIndex < activePool.length ? (
              <QuestionCard
                question={activePool[currentIndex]}
                currentIndex={currentIndex}
                totalQuestions={activePool.length}
                autoAdvance={autoAdvance}
                onAnswerSelected={handleAnswerSelected}
                selectedAnswer={selectedAnswer}
                isCorrect={isCorrect}
                onNext={() => advanceNextQuestion()}
                flagged={flaggedIds.includes(activePool[currentIndex].id)}
                onToggleFlag={() => handleToggleFlag(activePool[currentIndex].id)}
                onPracticeMistakesNow={handlePracticeInterimMistakesNow}
                mistakesCountSoFar={
                  activePool.filter((q) => {
                    const ans = session.answers[q.id];
                    return ans && !ans.isCorrect;
                  }).length
                }
                isMistakesSession={session.type === 'mistakes_interim'}
                onJumpToQuestion={handleJumpToQuestion}
                shuffleOptions={shuffleOptions}
                onCancelTest={() => setShowCancelModal(true)}
                shuffleQuestions={shuffleQuestions}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                cutStart={cutStart}
                cutEnd={cutEnd}
                onUpdateParams={handleUpdateActiveSessionParamsOnTheFly}
                chosenMode={chosenMode}
                originalQuestions={sourceQuestions}
                onFilterByCategory={handleFilterActiveSessionByCategory}
              />
            ) : (
              // Else, we completed the active session, route to summaries
              <ResultsView
                questions={activePool}
                answers={session.answers}
                originalQuestions={sourceQuestions}
                onRestart={() => {
                  setSession(null);
                  setActiveCategoryFilter(null);
                }}
                onPracticeMistakes={handleResultsPracticeMistakes}
                onReviewFlagged={handleResultsReviewFlagged}
                onSaveMistakesToHistory={handleSaveMistakesToHistory}
                flaggedQuestionIds={new Set(flaggedIds)}
                elapsedTime={elapsedTime}
                historyCount={history.reduce((acc, curr) => acc + (curr.questions?.length || 0), 0)}
              />
            )}

          </div>
        ) : chosenMode === null ? (
          // Welcome Mode Selector Page
          <div id="welcome-mode-selection" className="space-y-8 animate-fade-in text-center py-4">
            <div className="max-w-2xl mx-auto space-y-4">
              <span className="text-[10px] uppercase font-extrabold tracking-[0.15em] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/25 px-3.5 py-1.5 rounded-md border border-teal-200 dark:border-teal-853 flex items-center justify-center gap-1.5 w-fit mx-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
                SIMED • STATUS IN MEDICINA
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight max-w-xl mx-auto">
                მტკიცებულებითი თერაპია მწვავე საგამოცდო სინდრომისთვის
              </h1>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
                ციფრული პროტოკოლი მედიცინის სტუდენტებისთვის. ატვირთე საგამოცდო კითხვები, ჩართე სიმულაციის რეჟიმი და დაამტკიცე, რომ შენი ცოდნა პლაცებო ეფექტი არ არის.
              </p>
            </div>

            {/* Mode Option Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-4">
              {/* Card 1: Practice Mode */}
              <div 
                onClick={() => {
                  setChosenMode('practice');
                  setActiveTab('all');
                }}
                className="group relative bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 text-left shadow-sm hover:shadow-md hover:border-teal-500/40 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 px-2.5 py-1 rounded-md border border-teal-100 dark:border-teal-900/30">
                      რეჟიმი 01
                    </span>
                    <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-500 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-450 transition-colors">
                    ვარჯიში
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                    უსასრულო ცდები, შეცდომებზე მუშაობა რეალურ დროში.
                  </p>
                </div>
                <div className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5 transition-all group-hover:translate-x-1">
                  <span>დაწყება</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              {/* Card 2: Exam Simulator Mode */}
              <div 
                onClick={() => {
                  setChosenMode('simulator');
                  setActiveTab('simulation');
                }}
                className="group relative bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 text-left shadow-sm hover:shadow-md hover:border-red-500/40 transition-all duration-300 pointer-events-auto cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2.5 py-1 rounded-md border border-red-100/50 dark:border-red-900/30">
                      რეჟიმი 02
                    </span>
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <Flame className="h-6 w-6 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-[#0f172a] dark:text-white mb-2 group-hover:text-red-650 dark:group-hover:text-red-400 transition-colors">
                    გამოცდის სიმულატორი
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                    რამდენიმე ფაილის გაერთიანება და საგნების გენერირებული ერთობლიობა.
                  </p>
                </div>
                <div className="text-xs font-bold text-red-650 dark:text-red-400 flex items-center gap-1.5 transition-all group-hover:translate-x-1">
                  <span>დაწყება</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              {/* Card 3: Residents Base Mode */}
              <div 
                onClick={() => handleStartResidentsDirectly()}
                className="group relative bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 text-left shadow-sm hover:shadow-md hover:border-slate-805 dark:hover:border-slate-600 transition-all duration-300 pointer-events-auto flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase text-slate-900 dark:text-[#F3F4F6] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                      რეჟიმი 03
                    </span>
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-[#F3F4F6] rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <Award className="h-6 w-6" />
                    </div>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    რეზიდენტურის ბაზა
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                    ნაბიჯი პროფესიულ ავტონომიამდე
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-150 dark:border-slate-800">
                  <div 
                    className="text-xs font-bold text-slate-900 dark:text-[#F3F4F6] flex items-center gap-1.5 transition-all group-hover:translate-x-1"
                  >
                    <span>დაწყება</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setChosenMode('residents');
                      setActiveTab('all');
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors focus:outline-none"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>ტექსტის ჩასმა / განახლება</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Access to History Mistakes section if they want */}
            {history.length > 0 && (
              <div className="max-w-4xl mx-auto pt-6">
                <button
                  onClick={() => {
                    setChosenMode('practice');
                    setActiveTab('history');
                  }}
                  className="w-full p-4 sm:p-5 bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-slate-805 rounded-2xl hover:border-slate-300 dark:hover:border-slate-705 text-left transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">შენახული შეცდომების კოლექციები ({history.length})</h4>
                      <p className="text-xs text-slate-505 dark:text-slate-400">სტატისტიკა და შეცდომების ხელახალი გავლა</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-450 dark:text-slate-500 flex items-center gap-1 font-bold">
                    გადასვლა კოლექციებზე <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            )}
          </div>
        ) : (
          // Main Dashboard Configuration Hub
          <div id="config-hub-view" className="space-y-8 animate-fade-in">
            
            {/* Back button and mode identity banner */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-105 dark:border-slate-800 pb-4">
              <button
                onClick={() => {
                  setChosenMode(null);
                  setActiveTab('all');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161B22] text-xs font-black text-slate-600 dark:text-slate-405 hover:text-teal-650 hover:border-teal-500/30 transition-all cursor-pointer focus:outline-none shadow-sm"
              >
                ← მთავარზე დაბრუნება (რეჟიმის შეცვლა)
              </button>
              <div className="text-left sm:text-right">
                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 block">აქტიური რეჟიმი</span>
                <span className="text-xs font-extrabold text-[#008080] dark:text-teal-400">
                  {chosenMode === 'practice' ? 'რეჟიმი 01: ვარჯიში' : chosenMode === 'simulator' ? 'რეჟიმი 02: გამოცდის სიმულატორი' : 'რეჟიმი 03: რეზიდენტურის ბაზა'}
                </span>
              </div>
            </div>

            {/* App Nav Workspace Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              {[
                ...(chosenMode === 'practice' || chosenMode === 'residents' ? [{ id: 'all', label: 'ტესტის პარამეტრები', icon: Sliders }] : []),
                ...(chosenMode === 'simulator' ? [{ id: 'simulation', label: 'საგამოცდო სიმულატორი', icon: Flame }] : []),
                { id: 'history', label: 'ჩემი შეცდომები', icon: BookOpen },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'all' | 'simulation' | 'history')}
                    className={`flex-1 py-3 px-2 text-center text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 focus:outline-none ${
                      isActive
                        ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400 font-bold'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-teal-500 dark:text-teal-400" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Workspace View switch */}
            <div className="space-y-6">
              
              {/* TAB 1: Config and range filtration setup */}
              {activeTab === 'all' && (
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* File uploader dropzone */}
                  {chosenMode !== 'residents' ? (
                    <div className="animate-fade-in">
                      <UploadSection files={files} onFilesChanged={setFiles} />
                    </div>
                  ) : (
                    <div className="animate-fade-in bg-slate-905/5 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
                        <div className="flex items-start gap-3">
                          <div className="p-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl">
                            <Award className="h-6 w-6 text-yellow-500 animate-pulse" />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">რეზიდენტურის ოფიციალური ბაზა</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">კითხვების ჯამური რაოდენობა: <span className="font-extrabold text-slate-900 dark:text-white font-mono">{activeFiles[0].questions.length}</span></p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 h-fit">
                          {localStorage.getItem('residents_stored_questions') ? 'ჩატვირთულია სრული ბაზა ☑️' : 'ჩაშენებულია საცდელი ბაზა ⚠️'}
                        </span>
                      </div>

                      {/* Text paste area for easy import of all 2744 questions */}
                      <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-350 block">ბაზის იმპორტი / ტექსტის ჩასმა (2744 კითხვა):</label>
                        <textarea
                          placeholder="///// ჩასვით თქვენი სრული ტექსტური ბაზა აქ...&#10;//// კითხვა...&#10;// ️ სწორი პასუხი...&#10;/// არასწორი...&#10;/// არასწორი..."
                          className="w-full h-40 p-4 rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-none transition-all resize-none pointer-events-auto"
                          onChange={(e) => setResidentsRawInput(e.target.value)}
                          value={residentsRawInput}
                        />
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                          <button
                            onClick={handleImportResidentsPasted}
                            className="bg-slate-900 hover:bg-slate-950 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black font-extrabold text-xs px-5 py-3 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98 focus:outline-none"
                          >
                            <RefreshCw className="h-4 w-4 shrink-0" />
                            <span>ბაზის განახლება / იმპორტი</span>
                          </button>

                          {localStorage.getItem('residents_stored_questions') && (
                            <button
                              onClick={() => {
                                localStorage.removeItem('residents_stored_questions');
                                setResidentsRawInput('');
                                // Trigger state refresh
                                setFiles([...files]);
                                alert('სრული ბაზა წაიშალა. აღდგენილია საწყისი საცდელი ბაზა.');
                              }}
                              className="text-xs font-extrabold text-rose-600 hover:text-rose-500 py-2.5 px-4 hover:bg-rose-500/5 rounded-xl cursor-pointer transition-all focus:outline-none"
                            >
                              საწყისის აღდგენა
                            </button>
                          )}
                        </div>
                      </div>

                      {/* We also let them drag & drop the txt file directly here! */}
                      <div className="border-t border-slate-200/60 dark:border-slate-800/80 pt-6 space-y-3">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-350">ან ჩააგდეთ რეზიდენტურის ბაზის .TXT ფაილი აქ:</p>
                        <UploadSection
                          files={[]}
                          onFilesChanged={(newFiles) => {
                            if (newFiles.length > 0) {
                              const uploadedFile = newFiles[0];
                              const serializedQuestions = JSON.stringify(uploadedFile.questions);
                              localStorage.setItem('residents_stored_questions', serializedQuestions);
                              // Trigger state update
                              setFiles([...files]);
                              alert(`წარმატებით ჩაიტვირთა ${uploadedFile.questions.length} კითხვა ფაილიდან "${uploadedFile.name}"!`);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* List of active prepared bases with integrated collapsers */}
                  <AnimatePresence mode="popLayout">
                    {activeFiles.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-805 pb-3">
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-150 flex items-center gap-2">
                            <FolderOpen className="h-5 w-5 text-teal-500 animate-pulse" />
                            აქტიური საგამოცდო ბაზები ({activeFiles.length})
                          </h3>
                          <span className="text-[11px] bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full font-bold">
                            ჯამური კითხვები: {activeFiles.reduce((a, b) => a + b.questions.length, 0)}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {activeFiles.map((file, fileIdx) => {
                            const isExpanded = expandedFileName === file.name;
                            return (
                              <motion.div
                                key={file.name + fileIdx}
                                layout
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="bg-white dark:bg-[#161B22] border border-slate-205 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden hover:border-slate-355 dark:hover:border-slate-755 transition-all duration-300"
                              >
                                {/* File Info Header Row */}
                                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <div className="p-3 bg-teal-50/10 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 rounded-xl">
                                      <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                      <h4 className="text-sm font-extrabold text-[#0f172a] dark:text-slate-100 leading-snug">
                                        {file.name}
                                      </h4>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        ზომა: {file.sizeStr} • <span className="text-teal-600 dark:text-teal-400 font-bold">{file.questions.length} კითხვა</span>
                                      </p>
                                    </div>
                                  </div>

                                  {/* Quick Action triggers */}
                                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                                    {/* Quick launch button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedFileName(file.name);
                                        setRangeStart('');
                                        setRangeEnd('');
                                        setCutStart('');
                                        setCutEnd('');
                                        setContinueFromIdx('');
                                        handleStartPractice(file.name);
                                      }}
                                      className="flex-1 sm:flex-none px-4 py-2.5 bg-teal-500 hover:bg-teal-400 dark:bg-teal-500 dark:hover:bg-teal-400 text-[#0A0C10] font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 outline-none"
                                      title="ტესტის დაწყება"
                                    >
                                      <span>ტესტის დაწყება</span>
                                      <ArrowRight className="h-3.5 w-3.5 text-[#0A0C10]" />
                                    </button>

                                    {/* Parameters / Expand settings panel */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedFileName(file.name);
                                        setExpandedFileName(isExpanded ? null : file.name);
                                      }}
                                      className={`px-3 py-2.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1 cursor-pointer outline-none focus:outline-none ${
                                        isExpanded
                                          ? 'border-teal-500/20 bg-teal-50 dark:bg-teal-950/25 text-teal-600 dark:text-teal-400'
                                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#0A0C10] text-[#64748b] dark:text-[#8b949e]'
                                      }`}
                                    >
                                      <Sliders className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                                      <span className="hidden md:inline">პარამეტრები</span>
                                    </button>

                                    {/* Delete database file */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFile(file.name)}
                                      className="p-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50 hover:border-rose-250 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-400 transition-all text-[#64748b] dark:text-[#8b949e] cursor-pointer focus:outline-none"
                                      title="ბაზის წაშლა"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                                      className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/10 dark:bg-[#0A0C10]/5"
                                    >
                                      <div className="p-4 sm:p-5 space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans pt-3">

                                           {/* Card 1: დიაპაზონის ფილტრაცია */}
                                           <div className="space-y-2.5 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161B22]/60 shadow-sm flex flex-col justify-between">
                                             <div>
                                               <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-205">
                                                 <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/20 text-teal-605 dark:text-teal-400">
                                                   <Compass className="h-4 w-4" />
                                                 </div>
                                                 <span>დიაპაზონის ფილტრაცია</span>
                                               </div>
                                               <p className="text-[10px] text-slate-450 dark:text-slate-505 leading-normal mt-2">
                                                 კითხვების დიაპაზონის განსაზღვრა ბაზიდან
                                               </p>
                                             </div>
                                             <div className="grid grid-cols-2 gap-2 pt-2">
                                               <div>
                                                 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">დან</span>
                                                 <input
                                                   type="number"
                                                   min="1"
                                                   value={rangeStart}
                                                   onChange={(e) => setRangeStart(e.target.value)}
                                                   placeholder="მაგ: 1"
                                                   className="w-full px-2.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-100 text-xs font-mono text-center rounded-xl focus:border-teal-500 outline-none"
                                                 />
                                               </div>
                                               <div>
                                                 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">მდე</span>
                                                 <input
                                                   type="number"
                                                   min="1"
                                                   value={rangeEnd}
                                                   onChange={(e) => setRangeEnd(e.target.value)}
                                                   placeholder={file.questions.length.toString()}
                                                   className="w-full px-2.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-100 text-xs font-mono text-center rounded-xl focus:border-teal-500 outline-none"
                                                 />
                                               </div>
                                             </div>
                                           </div>

                                           {/* Card 2: კითხვების ამოჭრა */}
                                           <div className="space-y-2.5 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161B22]/60 shadow-sm flex flex-col justify-between">
                                             <div>
                                               <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-205">
                                                 <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/20 text-teal-605 dark:text-teal-400">
                                                   <Scissors className="h-4 w-4" />
                                                 </div>
                                                 <span>კითხვების ამოჭრა ბაზიდან</span>
                                               </div>
                                               <p className="text-[10px] text-slate-450 dark:text-slate-505 leading-normal mt-2">
                                                 
                                               </p>
                                             </div>
                                             <div className="grid grid-cols-2 gap-2 pt-2">
                                               <div>
                                                 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">დასაწყისი</span>
                                                 <input
                                                   type="number"
                                                   min="1"
                                                   value={cutStart}
                                                   onChange={(e) => setCutStart(e.target.value)}
                                                   placeholder="მაგ: 20"
                                                   className="w-full px-2.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-100 text-xs font-mono text-center rounded-xl focus:border-teal-500 outline-none"
                                                 />
                                               </div>
                                               <div>
                                                 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">დასასრული</span>
                                                 <input
                                                   type="number"
                                                   min="1"
                                                   value={cutEnd}
                                                   onChange={(e) => setCutEnd(e.target.value)}
                                                   placeholder="მაგ: 35"
                                                   className="w-full px-2.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0A0C10] text-[#0f172a] dark:text-slate-100 text-xs font-mono text-center rounded-xl focus:border-teal-500 outline-none"
                                                 />
                                               </div>
                                             </div>
                                           </div>

                                           {/* Card 3: გაგრძელება კითხვიდან */}
                                           <div className="space-y-2.5 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161B22]/60 shadow-sm flex flex-col justify-between">
                                             <div>
                                               <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-205">
                                                 <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/20 text-teal-605 dark:text-teal-400">
                                                   <ArrowRight className="h-4 w-4" />
                                                 </div>
                                                 <span>გაგრძელება კითხვიდან</span>
                                               </div>
                                               <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal mt-2">
                                                 
                                               </p>
                                             </div>
                                             <div className="pt-2">
                                               <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">კითხვის ნომერი</span>
                                               <input
                                                 type="number"
                                                 min="1"
                                                 value={continueFromIdx}
                                                 onChange={(e) => setContinueFromIdx(e.target.value)}
                                                 placeholder="მაგ: 100"
                                                 className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0A0C10] text-slate-900 dark:text-slate-100 text-xs font-mono rounded-xl focus:border-teal-500 outline-none"
                                               />
                                             </div>
                                           </div>

                                           {/* Card 4: ორმაგი არევა */}
                                           <div className="space-y-2.5 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161B22]/60 shadow-sm flex flex-col justify-between">
                                             <div>
                                               <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-205">
                                                 <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/20 text-teal-605 dark:text-teal-400">
                                                   <Sliders className="h-4 w-4" />
                                                 </div>
                                                 <span>ორმაგი არევა (Double Shuffle)</span>
                                               </div>
                                               <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal mt-2">
                                                 
                                               </p>
                                             </div>
                                             <div className="space-y-2.5 pt-2 text-left">
                                               <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-750 dark:text-slate-300 select-none">
                                                 <input
                                                   type="checkbox"
                                                   checked={shuffleQuestions}
                                                   onChange={(e) => setShuffleQuestions(e.target.checked)}
                                                   className="rounded text-teal-600 focus:ring-teal-550 border-slate-200 dark:border-slate-750 h-4 w-4 accent-teal-500 cursor-pointer"
                                                 />
                                                 <span>კითხვების არევა</span>
                                               </label>
                                               <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-755 dark:text-slate-300 select-none">
                                                 <input
                                                   type="checkbox"
                                                   checked={shuffleOptions}
                                                   onChange={(e) => setShuffleOptions(e.target.checked)}
                                                   className="rounded text-teal-600 focus:ring-teal-555 border-slate-200 dark:border-slate-755 h-4 w-4 accent-teal-500 cursor-pointer"
                                                 />
                                                 <span>პასუხების არევა</span>
                                               </label>
                                             </div>
                                           </div>

                                           {/* Card 5: ტესტირების რეჟიმი */}
                                           <div className="space-y-2.5 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161B22]/60 shadow-sm md:col-span-1 lg:col-span-2 flex flex-col justify-between">
                                             <div>
                                               <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-205">
                                                 <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/20 text-teal-605 dark:text-teal-400">
                                                   <Activity className="h-4 w-4" />
                                                 </div>
                                                 <span>ტესტირების რეჟიმი და სიჩქარე</span>
                                               </div>
                                               <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-normal mt-2">
                                                 {autoAdvance
                                                   ? ''
                                                   : ''}
                                               </p>
                                             </div>
                                             <div className="space-y-2 pt-2">
                                               <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                                                 <button
                                                   type="button"
                                                   onClick={() => setAutoAdvance(true)}
                                                   className={`py-2 px-1 text-center rounded-lg text-xs font-bold focus:outline-none transition-all cursor-pointer ${
                                                     autoAdvance
                                                       ? 'bg-teal-500 text-slate-950 font-black shadow-sm border-transparent'
                                                       : 'bg-slate-50 dark:bg-[#0A0C10] text-[#64748b] dark:text-[#8b949e] border border-slate-200 dark:border-slate-805 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                   }`}
                                                 >
                                                   ავტომატური რეჟიმი
                                                 </button>
                                                 <button
                                                   type="button"
                                                   onClick={() => setAutoAdvance(false)}
                                                   className={`py-2 px-1 text-center rounded-lg text-xs font-bold focus:outline-none transition-all cursor-pointer ${
                                                     !autoAdvance
                                                       ? 'bg-teal-500 text-slate-950 font-black shadow-sm border-transparent'
                                                       : 'bg-slate-50 dark:bg-[#0A0C10] text-[#64748b] dark:text-[#8b949e] border border-slate-200 dark:border-slate-805 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                   }`}
                                                 >
                                                   მექანიკური რეჟიმი
                                                 </button>
                                               </div>
                                             </div>
                                           </div>
                                         </div>

                                         {/* Action Start Submit & Custom Errors inside settings */}
                                        {globalConfigError && selectedFileName === file.name && (
                                          <div className="p-3 bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl border border-rose-200/50 dark:border-rose-900/50 flex items-start gap-2 animate-fade-in font-sans">
                                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500 animate-bounce" />
                                            <span>{globalConfigError}</span>
                                          </div>
                                        )}

                                        <div className="flex justify-end pt-1">
                                          <button
                                            type="button"
                                            onClick={() => handleStartPractice(file.name)}
                                            className="w-full px-5 py-3.5 bg-teal-500 hover:bg-teal-400 dark:bg-teal-500 dark:hover:bg-teal-400 text-[#0A0C10] dark:text-[#0A0C10] font-black rounded-xl text-xs shadow-md shadow-teal-500/10 hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer border-transparent outline-none"
                                          >
                                            <span>მორგებული ტესტირების დაწყება</span>
                                            <ArrowRight className="h-4 w-4 text-[#0A0C10]" />
                                          </button>
                                        </div>

                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Empty state prompting upload */}
                  {activeFiles.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white dark:bg-[#161B22] border border-slate-205 dark:border-slate-800 rounded-3xl p-10 text-center shadow-sm max-w-md mx-auto space-y-4"
                    >
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-55/10 dark:bg-teal-950/20 text-[#008080] dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-900/20 animate-pulse">
                        <FolderOpen className="h-8 w-8" />
                      </div>
                      <div className="space-y-1.5 font-sans">
                        <h3 className="text-sm font-extrabold text-slate-855 dark:text-slate-100">საგამოცდო ბაზები ცარიელია</h3>
                        <p className="text-xs text-slate-500 dark:text-[#8b949e] leading-relaxed">
                          დესკტოპიდან ან მობილურიდან ჩააგდეთ ტექსტური ფაილი, რომელიც მოიცავს ტესტებს მონიშნული სწორი და არასწორი პასუხებით.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Purged old form properties block */}
                  <div className="hidden" />
                </div>
              )}

              {/* TAB 2: Multi-file simulation setups */}
              {activeTab === 'simulation' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                  {files.length < 1 ? (
                    <div className="space-y-6">
                      <div className="bg-red-50/10 dark:bg-red-950/10 border border-red-100/20 dark:border-red-900/30 rounded-2xl p-4 text-center font-sans">
                        <p className="text-xs font-bold text-red-650 dark:text-red-400">
                          თქვენ იმყოფებით გამოცდის სიმულატორის რეჟიმში. გთხოვთ, გამოცდის დასაწყებად ატვირთოთ საგამოცდო ბაზების ფაილები:
                        </p>
                      </div>
                      <UploadSection files={files} onFilesChanged={setFiles} />
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <SimulationSetup 
                        files={files} 
                        onStartSimulation={handleStartSimulation} 
                        onDeleteFile={handleDeleteFile}
                      />
                      
                      {/* Separate file upload zone inside simulator */}
                      <div className="bg-white dark:bg-[#161B22] border border-slate-205 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">ახალი საგამოცდო ბაზების დამატება / ატვირთვა</h4>
                        <UploadSection files={files} onFilesChanged={setFiles} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Saved mistakes practice history collections */}
              {activeTab === 'history' && (
                <div className="max-w-2xl mx-auto">
                  <MistakesHistory
                    collections={history}
                    onStartCollectionPractice={handleStartCollectionPractice}
                    onDeleteCollection={handleDeleteHistoryCollection}
                  />
                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* Elegant minimal footer bar */}
      <footer className="border-t border-slate-200/60 dark:border-slate-800 bg-transparent py-10 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            © 2026 SIMED — Status In MEDicina. სპეციალიზებული სამედიცინო საგამოცდო ასისტენტი.
          </p>
          <p className="text-[10px] text-slate-450 dark:text-slate-600 font-sans">
            ციფრული პროტოკოლი მედიცინის სტუდენტებისა და ლიცენზირებისთვის მომზადებული რეზიდენტებისთვის.
          </p>
        </div>
      </footer>

      {/* Dynamic Portaled Confirm Cancel Dialog Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelModal(false)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative z-10 max-w-sm w-full space-y-4 font-sans text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 mb-2 border border-rose-100 dark:border-rose-900/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">ტესტირების შეწყვეტა</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  დარწმუნებული ხართ, რომ გსურთ მიმდინარე ტესტირების შეწყვეტა? თქვენი მიმდინარე პროგრესი და პასუხების სტატისტიკა დაიკარგება.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-[#0A0C10] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  დაბრუნება
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSession(null);
                    setActiveCategoryFilter(null);
                    setShowCancelModal(false);
                  }}
                  className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all focus:outline-none cursor-pointer"
                >
                  შეწყვეტა
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Portaled Delete confirmation overlay */}
      <AnimatePresence>
        {showDeleteModalId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModalId(null)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative z-10 max-w-sm w-full space-y-4 font-sans text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 mb-2 border border-rose-100 dark:border-rose-900/30">
                <Trash2 className="h-6 w-6" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">ნაკრების წაშლა</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  ნამდვილად გსურთ ამ შეცდომების ნაკრების წაშლა? მოქმედების გაუქმება შეუძლებელია.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteModalId(null)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-[#0A0C10] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  გაუქმება
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showDeleteModalId) {
                      setHistory(history.filter((h) => h.id !== showDeleteModalId));
                    }
                    setShowDeleteModalId(null);
                  }}
                  className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all focus:outline-none cursor-pointer"
                >
                  წაშლა
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
