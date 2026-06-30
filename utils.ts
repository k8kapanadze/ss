import { RawQuestion, PlayableQuestion } from './types';

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
 * Result of pre-processing a raw, messy question file into the platform's
 * strict //// // /// format.
 */
export interface RawPreprocessResult {
  formatted: string;
  successCount: number;
  errorCount: number;
  errors: { index: number; reason: string }[];
}

const RAW_ID_TAG_RE = /¢\s*ID\s*=\s*\d+/gu;
const RAW_TERMINATOR_RE = /⮲/gu;
const RAW_LETTER_PREFIX_RE = /^[ \t]*[ა-ჰa-zA-Z]\.\s*/u;
const RAW_OPTION_SPLIT_RE = /(❌|✔️)/gu;

/**
 * Detects whether a raw text file uses the messy "¢ ID=" / emoji format
 * rather than the platform's native //// // /// syntax.
 */
export function isRawEmojiFormat(text: string): boolean {
  return /¢\s*ID\s*=\s*\d+/u.test(text) && (/❌/u.test(text) || /✔️/u.test(text));
}

function cleanRawText(raw: string): string {
  if (!raw) return '';
  let t = raw;
  t = t.replace(RAW_ID_TAG_RE, ' ');
  t = t.replace(RAW_TERMINATOR_RE, ' ');
  t = t.replace(/❌|✔️/gu, ' ');
  t = t.replace(/\*/g, ' ');
  t = t.replace(RAW_LETTER_PREFIX_RE, '');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function splitRawIntoBlocks(rawText: string): string[] {
  if (!rawText) return [];
  const matches = [...rawText.matchAll(/¢\s*ID\s*=\s*\d+/gu)];
  if (matches.length === 0) return [];

  const blocks: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index as number;
    const end = i + 1 < matches.length ? (matches[i + 1].index as number) : rawText.length;
    const block = rawText.slice(start, end).trim();
    if (block) blocks.push(block);
  }
  return blocks;
}

/**
 * Pre-processes a raw, messy question text file (using the
 * "¢ ID=00001 ... ❌wrong ✔️correct ... ⮲" emoji format) into the
 * platform's strict //// // /// format, ready to be passed to
 * parseQuestionFile.
 *
 * Validation: a block is kept only if it has exactly 1 correct (✔️) answer
 * and at least 1 incorrect (❌) answer; otherwise it's skipped and counted
 * as an error.
 */
export function preprocessRawQuizText(rawText: string): RawPreprocessResult {
  const blocks = splitRawIntoBlocks(rawText);
  const formattedQuestions: string[] = [];
  const errors: { index: number; reason: string }[] = [];
  let successCount = 0;

  blocks.forEach((block, idx) => {
    const withoutId = block.replace(RAW_ID_TAG_RE, '').trim();
    const withoutTerminator = withoutId.split(RAW_TERMINATOR_RE)[0];
    const tokens = withoutTerminator.split(RAW_OPTION_SPLIT_RE);

    const question = cleanRawText(tokens[0] || '');
    const correct: string[] = [];
    const incorrect: string[] = [];

    for (let i = 1; i < tokens.length; i += 2) {
      const marker = tokens[i];
      const optionText = cleanRawText(tokens[i + 1] || '');
      if (!optionText) continue;
      if (marker === '✔️') correct.push(optionText);
      else if (marker === '❌') incorrect.push(optionText);
    }

    if (!question) {
      errors.push({ index: idx + 1, reason: 'ცარიელი კითხვის ტექსტი' });
      return;
    }
    if (correct.length !== 1) {
      errors.push({
        index: idx + 1,
        reason: `საჭიროა ზუსტად 1 სწორი პასუხი, ნაპოვნია ${correct.length}`,
      });
      return;
    }
    if (incorrect.length < 1) {
      errors.push({ index: idx + 1, reason: 'არ მოიძებნა არასწორი პასუხი (საჭიროა მინიმუმ 1)' });
      return;
    }

    const lines = [`//// ${question}`, `// ${correct[0]}`, ...incorrect.map((o) => `/// ${o}`)];
    formattedQuestions.push(lines.join('\n'));
    successCount++;
  });

  return {
    formatted: formattedQuestions.join('\n\n'),
    successCount,
    errorCount: errors.length,
    errors,
  };
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
