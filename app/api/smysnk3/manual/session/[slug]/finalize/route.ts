import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSmysnk3Scenarios,
  normalizeSmysnk3QuestionIds,
  parseSmysnk3Mode,
  type Smysnk3OptionKey
} from "@/lib/smysnk3Questions";
import { normalizeSmysnk3OptionKey, scoreSmysnk3Responses } from "@/lib/smysnk3Score";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";

export const dynamic = "force-dynamic";

const finalizeSchema = z.object({
  subject: z.string().max(80).optional(),
  context: z.string().max(500).optional()
});

type StoredResponse = {
  questionId: string;
  answer: Smysnk3OptionKey;
  rationale: string;
};

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const payload = finalizeSchema.parse(await request.json().catch(() => ({})));

    initializeRunModel();
    await initializeDatabase();

    const run = await Run.findOne({
      where: { slug: params.slug, indicator: "smysnk3", runMode: "user" }
    });

    if (!run) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const mode = parseSmysnk3Mode(run.questionMode ?? run.questionCount ?? 32);
    const questionIds = normalizeSmysnk3QuestionIds(run.questionIds);
    const scenarios = getSmysnk3Scenarios(mode, questionIds, questionIds ? run.slug : null);
    const idSet = new Set(scenarios.map((scenario) => scenario.id));

    const label = payload.subject ? payload.subject.trim() : run.subject;
    if (label.length < 2 || label.length > 80) {
      return NextResponse.json(
        { error: "Participant label must be between 2 and 80 characters." },
        { status: 400 }
      );
    }

    const rawResponses = Array.isArray(run.responses)
      ? (run.responses as { questionId: string; answer: string | number; rationale?: string }[])
      : [];

    const byQuestionId = new Map<string, StoredResponse>();
    rawResponses.forEach((response) => {
      if (!idSet.has(response.questionId)) {
        return;
      }
      const key = normalizeSmysnk3OptionKey(response.answer);
      if (!key) {
        return;
      }
      byQuestionId.set(response.questionId, {
        questionId: response.questionId,
        answer: key,
        rationale: response.rationale?.trim() || `User selected ${key}.`
      });
    });

    if (byQuestionId.size !== scenarios.length) {
      const unanswered = scenarios.length - byQuestionId.size;
      return NextResponse.json(
        { error: `Please answer every scenario before finalizing. Remaining: ${unanswered}.` },
        { status: 400 }
      );
    }

    const orderedResponses = scenarios.map((scenario) => byQuestionId.get(scenario.id) as StoredResponse);
    const scoring = scoreSmysnk3Responses(
      orderedResponses.map((response) => ({ questionId: response.questionId, answerKey: response.answer }))
    );

    await run.update({
      subject: label,
      context: typeof payload.context === "string" ? payload.context.trim() || null : run.context,
      questionMode: mode.toString(),
      questionCount: scenarios.length,
      questionIds: scenarios.map((scenario) => scenario.id),
      responses: orderedResponses,
      functionScores: scoring.functionScores,
      analysis: scoring.analysis,
      state: "COMPLETED"
    });

    return NextResponse.json({
      slug: run.slug,
      runMode: run.runMode,
      subject: run.subject,
      context: run.context,
      questionMode: run.questionMode,
      questionCount: run.questionCount,
      questionIds: run.questionIds,
      responses: run.responses,
      scores: run.functionScores,
      analysis: run.analysis,
      state: run.state,
      errors: run.errors,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
