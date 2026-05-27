import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface GenerateParams {
  subject: string;
  className: string;
  questionTypes: Array<{ type: string; numberOfQuestions: number; marksPerQuestion: number }>;
  totalMarks: number;
  additionalInstructions?: string;
}

export async function generateQuestionPaper(params: GenerateParams) {
  const prompt = `
You are an expert academic exam paper generator. Create a question paper strictly following these specifications:

Subject: ${params.subject}
Class: ${params.className}
Total Marks: ${params.totalMarks}
${params.additionalInstructions ? `Additional Instructions: ${params.additionalInstructions}` : ''}

Question Types and Distribution:
${params.questionTypes.map(qt => `- ${qt.type}: ${qt.numberOfQuestions} questions, ${qt.marksPerQuestion} marks each`).join('\n')}

Generate a JSON response EXACTLY in this format:
{
  "sections": [
    {
      "title": "Section A - <Question Type Here>",
      "instruction": "Attempt all questions",
      "questions": [
        {
          "text": "Question text here",
          "difficulty": "Easy",
          "marks": 2
        }
      ]
    }
  ],
  "answerKey": "String containing the full answer key here. DO NOT make this a nested object or array."
}

CRITICAL FORMATTING RULES FOR THE "text" FIELD:
1. Multiple Choice Questions: You MUST append 4 options (A, B, C, D) directly inside the "text" string, separated by the newline character (\\n). 
   Example: "What is the powerhouse of the cell?\\nA) Nucleus\\nB) Mitochondria\\nC) Ribosome\\nD) Endoplasmic Reticulum"
2. Diagram/Graph-Based Questions: Phrase the "text" to either ask the student to DRAW a specific diagram/graph, or ask them to analyze a standard conceptual graph (e.g., "Draw a well-labeled diagram of...").
3. Fill in the Blanks: Use underscores to represent the blank space. Example: "The chemical formula for water is ________."
4. Match the question count and marks exactly to the "Question Types and Distribution" provided above. Group identical question types into their own sections.

Difficulty levels: Easy, Moderate, Challenging.
Distribute difficulties appropriately (approx. 60% Easy, 30% Moderate, 10% Challenging).
`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.1-8b-instant',
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) throw new Error('No response from AI');

  const parsedData = JSON.parse(response);

  // SAFETY NET: Prevent Mongoose "Cast to string failed" error on answerKey.
  // If the LLM disobeys and returns an object/array, we forcefully format it into a pretty string.
  if (parsedData.answerKey && typeof parsedData.answerKey === 'object') {
    parsedData.answerKey = JSON.stringify(parsedData.answerKey, null, 2);
  }

  return parsedData;
}