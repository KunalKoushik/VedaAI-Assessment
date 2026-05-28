import Groq from 'groq-sdk';
import pdfParse from 'pdf-parse';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface GenerateParams {
  subject: string;
  className: string;
  questionTypes: Array<{ type: string; numberOfQuestions: number; marksPerQuestion: number }>;
  totalMarks: number;
  additionalInstructions?: string;
  // Optional PDF / image uploaded by the teacher
  pdfBase64?: string | null;
  pdfMimeType?: string | null;
}

// ── Extract plain text from a base64-encoded PDF ──────────────────
async function extractPdfText(base64: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const result = await pdfParse(buffer);
    // Trim to ~6000 chars so it fits comfortably in the prompt
    return result.text.slice(0, 6000).trim();
  } catch (err) {
    console.error('PDF parse error:', err);
    return '';
  }
}

// ── Normalise answerKey into a clean plain-text string ────────────
function normalizeAnswerKey(value: unknown): string {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  if (typeof value !== 'string') return '';
  return value
    .replace(/```(?:\w*\n)?/g, '').replace(/```/g, '')
    .replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Build the section list string ────────────────────────────────
function buildSectionList(questionTypes: GenerateParams['questionTypes']): string {
  const letters = 'ABCDEFGHIJ';
  return questionTypes
    .map((qt, i) =>
      `Section ${letters[i]} — ${qt.type}: ${qt.numberOfQuestions} question(s) × ${qt.marksPerQuestion} mark(s) each`
    )
    .join('\n');
}

// ── Count total questions across all types ────────────────────────
function totalQCount(questionTypes: GenerateParams['questionTypes']): number {
  return questionTypes.reduce((s, qt) => s + qt.numberOfQuestions, 0);
}

// ── Main export ───────────────────────────────────────────────────
export async function generateQuestionPaper(params: GenerateParams) {
  // 1. Extract PDF text if a file was uploaded
  let sourceContent = '';
  if (params.pdfBase64) {
    const mime = params.pdfMimeType || '';
    if (mime.includes('pdf')) {
      sourceContent = await extractPdfText(params.pdfBase64);
    }
    // For images (JPEG/PNG) we skip binary extraction and rely on subject alone
  }

  const hasPdfContent = sourceContent.length > 0;
  console.log('PDF extracted text length:', sourceContent.length);
  const totalQ = totalQCount(params.questionTypes);
  const sectionList = buildSectionList(params.questionTypes);
  const letters = 'ABCDEFGHIJ';

  // Build per-question numbering map for the answer key instructions
  // e.g. "Section A: Q1–Q4, Section B: Q5–Q7"
  let qNum = 1;
  const sectionRanges = params.questionTypes.map((qt, i) => {
    const start = qNum;
    qNum += qt.numberOfQuestions;
    return `Section ${letters[i]} (${qt.type}): Q${start}–Q${qNum - 1}`;
  }).join('\n');

  // 2. Build prompt
  const prompt = `
You are a professional exam paper generator. Your task has TWO PARTS: generate the question paper and then write a complete model answer key.

═══════════════════════════════════════════
EXAM SPECIFICATIONS
═══════════════════════════════════════════
Subject      : ${params.subject}
Class        : ${params.className}
Total Marks  : ${params.totalMarks}
Total Questions: ${totalQ}
${params.additionalInstructions ? `Special Instructions: ${params.additionalInstructions}` : ''}

SECTION BREAKDOWN:
${sectionList}

${hasPdfContent ? `
═══════════════════════════════════════════
SOURCE MATERIAL (use ONLY this to create questions — do NOT use your general knowledge for topics)
═══════════════════════════════════════════
${sourceContent}
` : `Generate questions relevant to ${params.subject} for Class ${params.className}.`}

═══════════════════════════════════════════
PART 1 — QUESTION PAPER RULES
═══════════════════════════════════════════
Return a JSON object with keys "sections" and "answerKey".

"sections" is an array. Each section object has:
  • "title"       — e.g. "Section A — Multiple Choice Questions"
  • "instruction" — e.g. "Attempt all questions. Each carries 1 mark."
  • "questions"   — array of { "text", "difficulty", "marks" }

QUESTION TEXT FORMATTING (follow exactly):
• MCQ: append 4 options INSIDE the text field using literal \\n before each:
  "Question text?\\nA) option1\\nB) option2\\nC) option3\\nD) option4"
• Fill in the Blanks: use ______ (6 underscores) for each blank.
• Diagram questions: start with "Draw a well-labelled diagram of …"
• Difficulty: "Easy" (60%), "Moderate" (30%), "Challenging" (10%)
• marks must equal the marksPerQuestion for that section.

═══════════════════════════════════════════
PART 2 — ANSWER KEY RULES (CRITICAL)
═══════════════════════════════════════════
"answerKey" must be a SINGLE plain-text string (NOT an object, NOT nested JSON).

You MUST provide an answer for EVERY question. There are ${totalQ} questions total.
Question numbering across ALL sections:
${sectionRanges}

FORMAT — copy this structure exactly:

ANSWER KEY
Subject: [subject] | Class: [class] | Total Marks: [marks]
------------------------------------------------------------

Section A — [Question Type]
[Section instruction e.g. 1 mark each]

Q1. [For MCQ: write the correct option letter + full option text]
    Reason: [one sentence why this is correct]

Q2. [correct option + text]
    Reason: [one sentence]

[... continue for every question in this section ...]

------------------------------------------------------------

Section B — [Question Type]
[marks per question]

Q5. [Write a complete model answer. Minimum 4-6 sentences.
    Cover: definition, explanation, real-world example.
    If the question involves a diagram, describe it with all labelled parts.]

Q6. [Complete answer, min 4-6 sentences]

[... continue for every question in this section ...]

------------------------------------------------------------

MARKING SCHEME
Section A ([question type]): Q1–Q[n], [x] mark(s) each = [total] marks
Section B ([question type]): Q[n+1]–Q[n+m], [x] mark(s) each = [total] marks
[one line per section]
Grand Total: ${params.totalMarks} marks

IMPORTANT: Do NOT stop early. Answer ALL ${totalQ} questions. Never leave a question without an answer.
`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',   // upgraded — handles long structured output reliably
    temperature: 0.5,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) throw new Error('No response from AI');

  const parsed = JSON.parse(response);

  if (parsed.answerKey && typeof parsed.answerKey === 'object') {
    parsed.answerKey = JSON.stringify(parsed.answerKey, null, 2);
  }
  if (parsed.answerKey && typeof parsed.answerKey === 'string') {
    parsed.answerKey = normalizeAnswerKey(parsed.answerKey);
  }

  return parsed;
}
