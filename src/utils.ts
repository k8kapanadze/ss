import { RawQuestion, PlayableQuestion, QuestionParseSummary } from './types';

/**
 * Detects whether the raw uploaded text is in the "messy" export format
 * (¢ ID=..., ❌/✔️ markers, * separators, ⮲ block terminator) rather than
 * the platform's strict //// // /// format.
 */
export function isMessyFormat(text: string): boolean {
  return /¢\s*ID=/i.test(text) || text.includes('⮲') || text.includes('❌') || text.includes('✔');
}

/**
 * Converts the messy raw export format into the strict //// // /// format
 * understood by parseQuestionFile.
 *
 * Messy format example:
 *   ¢ ID=00001 Question text? * ❌ა. Wrong * ✔️ბ. Right * ❌გ. Wrong ⮲
 *
 * Rules applied:
 * - Blocks are separated by ⮲
 * - Segments within a block are separated by *
 * - The first segment holds "¢ ID=..." followed by the question text
 * - ❌ marks an incorrect option, ✔️ marks the correct option
 * - Georgian letter prefixes ("ა. ", "ბ. ", etc.) right after the emoji are stripped
 */
export function preprocessMessyFormat(raw: string): string {
  // Normalize away emoji variation selectors (U+FE0F) so "✔️" and "✔" match the same way
  const normalized = raw.replace(/\uFE0F/g, '');
  const blocks = normalized.split('⮲').map((b) => b.trim()).filter(Boolean);
  const output: string[] = [];

  for (const block of blocks) {
    // Skip stray fragments that don't actually look like a question block
    if (!/¢\s*ID=/i.test(block) && !/[❌✔]/.test(block)) continue;

    const parts = block.split('*').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) continue;

    let questionText = '';
    const options: { text: string; correct: boolean }[] = [];

    parts.forEach((part, idx) => {
      const isOption = /^[❌✔]/.test(part);

      if (isOption) {
        const correct = part.startsWith('✔');
        let optText = part.replace(/^[❌✔]\s*/, '');
        // Strip Georgian letter prefixes like "ა. ", "ბ. ", "გ. ", "დ. "
        optText = optText.replace(/^[ა-ჰ]\s*\.\s*/u, '').trim();
        if (optText) options.push({ text: optText, correct });
      } else if (idx === 0) {
        // The first non-option segment carries the "¢ ID=xxxxx" prefix + question text
        questionText = part.replace(/¢\s*ID=\S+\s*/i, '').trim();
      } else if (!questionText) {
        // Fallback: stray text segment before any option was found
        questionText = part.trim();
      }
    });

    if (!questionText) continue;
    if (options.length === 0) continue;

    const correctOpt = options.find((o) => o.correct);
    const incorrectOpts = options.filter((o) => !o.correct);

    let blockOut = `//// ${questionText}`;
    if (correctOpt) blockOut += `\n// ${correctOpt.text}`;
    incorrectOpts.forEach((o) => {
      blockOut += `\n/// ${o.text}`;
    });

    output.push(blockOut);
  }

  return output.join('\n\n');
}

/**
 * Walks an already strict-format (//// // ///) text and builds a validation
 * summary: how many question blocks were detected, how many are well formed
 * (have text + a correct answer + at least one incorrect answer), and which
 * ones have problems (e.g. missing a correct answer).
 */
function summarizeStrictFormat(text: string): Omit<QuestionParseSummary, 'wasMessyFormat'> {
  const lines = text.split(/\r?\n/);
  type Block = { text: string; hasCorrect: boolean; hasIncorrect: boolean };
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('////')) {
      if (current) blocks.push(current);
      current = { text: line.substring(4).trim(), hasCorrect: false, hasIncorrect: false };
    } else if (line.startsWith('///')) {
      if (current) current.hasIncorrect = true;
    } else if (line.startsWith('//')) {
      if (current) current.hasCorrect = true;
    } else if (current && !current.hasCorrect && !current.hasIncorrect) {
      current.text = (current.text ? current.text + ' ' : '') + line;
    }
  }
  if (current) blocks.push(current);

  const errors: QuestionParseSummary['errors'] = [];
  let successCount = 0;

  blocks.forEach((b, idx) => {
    const preview = (b.text && b.text.slice(0, 50)) || `კითხვა #${idx + 1}`;
    if (!b.text) {
      errors.push({ index: idx + 1, preview, reason: 'კითხვის ტექსტი არ მოიძებნა' });
    } else if (!b.hasCorrect) {
      errors.push({ index: idx + 1, preview, reason: 'სწორი პასუხი ვერ მოიძებნა' });
    } else if (!b.hasIncorrect) {
      errors.push({ index: idx + 1, preview, reason: 'არასწორი პასუხები ვერ მოიძებნა' });
    } else {
      successCount++;
    }
  });

  return {
    totalDetected: blocks.length,
    successCount,
    errorCount: errors.length,
    errors,
  };
}

/**
 * Single entry point for handling an uploaded quiz file. Auto-detects the
 * messy raw export format, converts it to the strict format when needed,
 * parses it into RawQuestion[], and returns a validation summary describing
 * how many questions parsed cleanly vs. had formatting problems.
 */
export function parseUploadedQuizText(
  text: string,
  fileName: string
): { questions: RawQuestion[]; summary: QuestionParseSummary } {
  const messy = isMessyFormat(text);
  const strictText = messy ? preprocessMessyFormat(text) : text;

  const baseSummary = summarizeStrictFormat(strictText);
  const summary: QuestionParseSummary = { ...baseSummary, wasMessyFormat: messy };

  const questions = parseQuestionFile(strictText, fileName);

  return { questions, summary };
}

/**
 * Parses medical question text file into RawQuestion array.
 * Syntax:
 * //// — Question start
 * /// — Incorrect option
 * // — Correct option
 */
export function parseQuestionFile(text: string, fileName: string): RawQuestion[] {
  const lines = text.split(/\r?\n/);
  const questions: RawQuestion[] = [];
  let currentQuestion: Partial<RawQuestion> | null = null;
  let originalIdx = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('////')) {
      // Save previous question if valid
      if (currentQuestion && currentQuestion.text && (currentQuestion.correctAnswer || currentQuestion.incorrectAnswers?.length)) {
        questions.push({
          id: `${fileName}-${originalIdx}-${Math.random().toString(36).substring(2, 9)}`,
          text: currentQuestion.text,
          correctAnswer: currentQuestion.correctAnswer || '',
          incorrectAnswers: currentQuestion.incorrectAnswers || [],
          sourceFile: fileName,
          originalIndex: originalIdx++,
        } as RawQuestion);
      }
      
      currentQuestion = {
        text: line.substring(4).trim(),
        incorrectAnswers: [],
      };
    } else if (line.startsWith('///')) {
      if (!currentQuestion) {
        currentQuestion = { text: 'უტექსტო კითხვა', incorrectAnswers: [] };
      }
      currentQuestion.incorrectAnswers?.push(line.substring(3).trim());
    } else if (line.startsWith('//') && !line.startsWith('///') && !line.startsWith('////')) {
      if (!currentQuestion) {
        currentQuestion = { text: 'უტექსტო კითხვა', incorrectAnswers: [] };
      }
      let ans = line.substring(2).trim();
      // Strip leading checkmarks/emojis of correct answer indicator
      ans = ans.replace(/^[❌✅☑️✔️✓✔☑\u2714\u2611\u2705]\s*/g, '').trim();
      ans = ans.replace(/^️\s*/g, '').trim(); // Remove specific variation selectors if any
      currentQuestion.correctAnswer = ans;
    } else {
      // Append text block to question text
      if (currentQuestion) {
        if (!currentQuestion.correctAnswer && (!currentQuestion.incorrectAnswers || currentQuestion.incorrectAnswers.length === 0)) {
          currentQuestion.text = (currentQuestion.text ? currentQuestion.text + '\n' : '') + line;
        }
      }
    }
  }

  // Save the last question
  if (currentQuestion && currentQuestion.text && (currentQuestion.correctAnswer || currentQuestion.incorrectAnswers?.length)) {
    questions.push({
      id: `${fileName}-${originalIdx}-${Math.random().toString(36).substring(2, 9)}`,
      text: currentQuestion.text,
      correctAnswer: currentQuestion.correctAnswer || '',
      incorrectAnswers: currentQuestion.incorrectAnswers || [],
      sourceFile: fileName,
      originalIndex: originalIdx,
    } as RawQuestion);
  }

  return questions;
}

/**
 * Standard Fisher-Yates array shuffling algorithm.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Builds playable questions by scrambling the option order and optionally shuffling the questions too.
 */
export function prepareSessionQuestions(
  rawQuestions: RawQuestion[],
  shuffleQuestions: boolean,
  shuffleOptions: boolean
): PlayableQuestion[] {
  let list = [...rawQuestions];
  if (shuffleQuestions) {
    list = shuffleArray(list);
  }

  return list.map((q) => {
    const rawOptions = [q.correctAnswer, ...q.incorrectAnswers].filter(Boolean);
    let options = [...rawOptions];
    if (shuffleOptions) {
      options = shuffleArray(options);
    }
    return {
      id: q.id,
      text: q.text,
      correctAnswer: q.correctAnswer,
      options,
      rawOptions,
      originalIndex: q.originalIndex,
      sourceFile: q.sourceFile,
    };
  });
}

/**
 * Serializes raw questions to the platform-compatible text format.
 */
export function serializeToCustomFormat(questions: RawQuestion[]): string {
  return questions
    .map((q) => {
      const qText = `//// ${q.text}`;
      const correct = `// ${q.correctAnswer}`;
      const incorrects = q.incorrectAnswers.map((opt) => `/// ${opt}`).join('\n');
      return `${qText}\n${correct}\n${incorrects}`;
    })
    .join('\n\n');
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Classifies medical question text into standardized Georgian medical directions.
 */
export function getQuestionCategory(text: string): string {
  const lower = text.toLowerCase();

  // 1. ნევროლოგია (Neurology)
  if (
    lower.includes('නერვ') ||
    lower.includes('ტვინ') ||
    lower.includes('ნევრო') ||
    lower.includes('რეფლექს') ||
    lower.includes('დამბლა') ||
    lower.includes('თვალის კაკალ') ||
    lower.includes('მიასთენია') ||
    lower.includes('ატაქსია') ||
    lower.includes('სიელმე') ||
    lower.includes('ინსულტ') ||
    lower.includes('ენცეფალოპათ') ||
    lower.includes('მენინგიტ')
  ) {
    return 'ნევროლოგია';
  }

  // 2. პედიატრია (Pediatrics)
  if (
    lower.includes('ახალშობილ') ||
    lower.includes('ბავშვ') ||
    lower.includes('ჩვილ') ||
    lower.includes('ძუძუთი კვება') ||
    lower.includes('რაქიტ') ||
    lower.includes('დროული') ||
    lower.includes('დღენაკლ') ||
    lower.includes('ვაქცინ') ||
    lower.includes('აცრა') ||
    lower.includes('პედიატრ')
  ) {
    return 'პედიატრია';
  }

  // 3. მეანობა-გინეკოლოგია (OB/GYN)
  if (
    lower.includes('ორსულ') ||
    lower.includes('ნაყოფ') ||
    lower.includes('ყელის') ||
    lower.includes('საშვილოსნო') ||
    lower.includes('პლაცენტ') ||
    lower.includes('ოვულაცი') ||
    lower.includes('მენსტრუა') ||
    lower.includes('ვაგინ') ||
    lower.includes('კლიტორი') ||
    lower.includes('საკვერცხე') ||
    lower.includes('საშო') ||
    lower.includes('ამენორეა') ||
    lower.includes('მშობიარ') ||
    lower.includes('मელოგინ') || // geo მელოგინ
    lower.includes('ჭიპლარ') ||
    lower.includes('აბორტ') ||
    lower.includes('ესტროგ') ||
    lower.includes('პროგესტ') ||
    lower.includes('მეანობა')
  ) {
    return 'მეანობა-გინეკოლოგია';
  }

  // 4. ქირურგია (Surgery / Oncology / trauma)
  if (
    lower.includes('აპენდიციტ') ||
    lower.includes('თიაქარ') ||
    lower.includes('ქირურგ') ||
    lower.includes('ოპერაცი') ||
    lower.includes('ნაკერ') ||
    lower.includes('ნაწლავთა გაუვალობ') ||
    lower.includes('სარძევე ჯირკვლის') ||
    lower.includes('მასტიტ') ||
    lower.includes('ბუასილ') ||
    lower.includes('პარაპროქტიტ') ||
    lower.includes('სიმსივნე') ||
    lower.includes('კიბო') ||
    lower.includes('მეტასტაზ') ||
    lower.includes('ენდარტერიიტ') ||
    lower.includes('ტრავმა') ||
    lower.includes('მოტეხილ') ||
    lower.includes('ჭრილობ') ||
    lower.includes('დამწვრობ')
  ) {
    return 'ქირურგია';
  }

  // 5. ნეფროლოგია (Nephrology)
  if (
    lower.includes('თირკმელ') ||
    lower.includes('შარდ') ||
    lower.includes('ნეფრ') ||
    lower.includes('პროტეინურია') ||
    lower.includes('ლეიკოციტურია') ||
    lower.includes('ჰემატურია') ||
    lower.includes('კრეატინინ') ||
    lower.includes('შარდოვანა') ||
    lower.includes('გორგლ') ||
    lower.includes('მილაკ') ||
    lower.includes('ცისტიტ') ||
    lower.includes('დიურეზ') ||
    lower.includes('პიელონეფრიტ') ||
    lower.includes('გლომერულ')
  ) {
    return 'ნეფროლოგია';
  }

  // 6. ჰემატოლოგია (Hematology)
  if (
    lower.includes('სისხლ') ||
    lower.includes('ანემია') ||
    lower.includes('ერითრო') ||
    lower.includes('ლეიკოზ') ||
    lower.includes('ლიმფ') ||
    lower.includes('თრომბო') ||
    lower.includes('კოაგულ') ||
    lower.includes('ჰემოფილია') ||
    lower.includes('ედს') ||
    lower.includes('შედედება') ||
    lower.includes('ჰემოგლობინ')
  ) {
    return 'ჰემატოლოგია';
  }

  // 7. ენდოკრინოლოგია (Endocrinology)
  if (
    lower.includes('დიაბეტ') ||
    lower.includes('ინსულინ') ||
    lower.includes('ჰორმონ') ||
    lower.includes('თირეო') ||
    lower.includes('ჩიყვი') ||
    lower.includes('ჰიპოფიზ') ||
    lower.includes('კორტიზოლ') ||
    lower.includes('ალდოსტერონ') ||
    lower.includes('კუშინგ') ||
    lower.includes('ადისონ') ||
    lower.includes('გლიკემია') ||
    lower.includes('ფეოქრომოციტომა') ||
    lower.includes('აკრომეგალია')
  ) {
    return 'ენდოკრინოლოგია';
  }

  // 8. რევმატოლოგია (Rheumatology)
  if (
    lower.includes('სახსარ') ||
    lower.includes('ართრიტ') ||
    lower.includes('რევმატ') ||
    lower.includes('მგლურა') ||
    lower.includes('სკლეროდერმია') ||
    lower.includes('პოდაგრა') ||
    lower.includes('ოსტეო') ||
    lower.includes('ძვალ') ||
    lower.includes('კუნთ') ||
    lower.includes('ბეხტერევ') ||
    lower.includes('ტოფუს')
  ) {
    return 'რევმატოლოგია';
  }

  // 9. გასტროენტეროლოგია (Gastroenterology)
  if (
    lower.includes('კუჭ') ||
    lower.includes('ნაწლავ') ||
    lower.includes('ღვიძლ') ||
    lower.includes('ნაღვლ') ||
    lower.includes('პანკრეას') ||
    lower.includes('წყლულ') ||
    lower.includes('ჰეპატიტ') ||
    lower.includes('გასტრიტ') ||
    lower.includes('კოლიტ') ||
    lower.includes('ამილაზა') ||
    lower.includes('ლიპაზა') ||
    lower.includes('ყლაპვა') ||
    lower.includes('ქოლეცისტიტ') ||
    lower.includes('ამებური') ||
    lower.includes('სტეატორეა') ||
    lower.includes('ციროზი') ||
    lower.includes('საყლაპავ')
  ) {
    return 'გასტროენტეროლოგია';
  }

  // 10. ალერგოლოგია-იმუნოლოგია (Allergy & Immunology)
  if (
    lower.includes('ალერგ') ||
    lower.includes('ალერგი') ||
    lower.includes('იმუნ') ||
    lower.includes('ანაფილაქს') ||
    lower.includes('ჭინჭრის ციება') ||
    lower.includes('კვინკე') ||
    lower.includes('პოლინოზ') ||
    lower.includes('შრატი') ||
    lower.includes('ანტიგენ') ||
    lower.includes('ანტისხეულ') ||
    lower.includes('ატოპ') ||
    lower.includes('ნაცხ')
  ) {
    return 'ალერგოლოგია-იმუნოლოგია';
  }

  // 11. კარდიოლოგია (Cardiology / Vascular)
  if (
    lower.includes('გულ') ||
    lower.includes('არითმია') ||
    lower.includes('ბლოკადა') ||
    lower.includes('სტენოზი') ||
    lower.includes('მიოკარდ') ||
    lower.includes('კორონარ') ||
    lower.includes('შუილი') ||
    lower.includes('წნევა') ||
    lower.includes('პულსი') ||
    lower.includes('ზეწოლა') ||
    lower.includes('ტონ') ||
    lower.includes('აორტ') ||
    lower.includes('მიტრალურ') ||
    lower.includes('კარდიო') ||
    lower.includes('ეკგ')
  ) {
    return 'კარდიოლოგია';
  }

  // 12. პულმონოლოგია (Pulmonology / Resp)
  if (
    lower.includes('ფილტვ') ||
    lower.includes('ბრონქ') ||
    lower.includes('ასთმა') ||
    lower.includes('პლევრ') ||
    lower.includes('პნევმონ') ||
    lower.includes('ქოშინი') ||
    lower.includes('ნახველი') ||
    lower.includes('კრეპიტაცი') ||
    lower.includes('ჟანგბად') ||
    lower.includes('სუნთქვა') ||
    lower.includes('ემფიზემ') ||
    lower.includes('პლევრიტ') ||
    lower.includes('რესპირატორ')
  ) {
    return 'პულმონოლოგია';
  }

  return 'სხვა მიმართულებები';
}
