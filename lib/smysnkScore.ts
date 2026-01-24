import { SMYSNK_QUESTIONS } from "@/lib/smysnkQuestions";

export type SmysnkResponse = {
  questionId: string;
  answer: number;
};

const QUESTION_MAP = new Map(SMYSNK_QUESTIONS.map((question) => [question.id, question]));

const MAX_POINTS_PER_FUNCTION = 16 * 4;

const scoreKey = (functionLetter: string, orientation: string) =>
  `${functionLetter}${orientation === "introverted" ? "i" : "e"}`;

export const calculateSmysnkScores = (responses: SmysnkResponse[]) => {
  const totals: Record<string, number> = {
    Ni: 0,
    Ne: 0,
    Si: 0,
    Se: 0,
    Ti: 0,
    Te: 0,
    Fi: 0,
    Fe: 0
  };

  responses.forEach((response) => {
    const question = QUESTION_MAP.get(response.questionId);
    if (!question) {
      return;
    }
    const points = Math.max(0, Math.min(4, response.answer - 1));
    const key = scoreKey(question.function, question.orientation);
    totals[key] = (totals[key] ?? 0) + points;
  });

  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [key, Math.round((value / MAX_POINTS_PER_FUNCTION) * 40)])
  ) as Record<string, number>;
};
