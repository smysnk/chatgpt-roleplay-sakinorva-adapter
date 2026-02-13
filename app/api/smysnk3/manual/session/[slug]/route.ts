import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSmysnk3Scenarios,
  normalizeSmysnk3QuestionIds,
  parseSmysnk3Mode,
  type Smysnk3Mode,
  type Smysnk3OptionKey
} from "@/lib/smysnk3Questions";
import { normalizeSmysnk3OptionKey } from "@/lib/smysnk3Score";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";

export const dynamic = "force-dynamic";

const saveAnswerSchema = z.object({
  subject: z.string().max(80).optional(),
  context: z.string().max(500).optional(),
  questionId: z.string(),
  answer: z.union([z.string(), z.number()]),
  rationale: z.string().min(1).optional()
});

type StoredResponse = {
  questionId: string;
  answer: Smysnk3OptionKey;
  rationale: string;
};

const resolveScenarios = (run: Run) => {
  const mode = parseSmysnk3Mode(run.questionMode ?? run.questionCount ?? 32) as Smysnk3Mode;
  const questionIds = normalizeSmysnk3QuestionIds(run.questionIds);
  const scenarios = getSmysnk3Scenarios(mode, questionIds, questionIds ? run.slug : null);
  const orderedIds = scenarios.map((scenario) => scenario.id);
  const idSet = new Set(orderedIds);
  return { mode, scenarios, orderedIds, idSet, questionIds: orderedIds };
};

const normalizeStoredResponses = (run: Run, allowedIds: Set<string>): StoredResponse[] => {
  const rawResponses = Array.isArray(run.responses)
    ? (run.responses as { questionId: string; answer: string | number; rationale?: string }[])
    : [];

  const normalized: StoredResponse[] = [];
  rawResponses.forEach((response) => {
    if (!allowedIds.has(response.questionId)) {
      return;
    }
    const key = normalizeSmysnk3OptionKey(response.answer);
    if (!key) {
      return;
    }
    normalized.push({
      questionId: response.questionId,
      answer: key,
      rationale: response.rationale?.trim() || `User selected ${key}.`
    });
  });

  return normalized;
};

const sortResponses = (responses: StoredResponse[], orderedIds: string[]) => {
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
  return [...responses].sort((a, b) => {
    const left = orderMap.get(a.questionId) ?? Number.MAX_SAFE_INTEGER;
    const right = orderMap.get(b.questionId) ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });
};

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  initializeRunModel();
  await initializeDatabase();

  const run = await Run.findOne({
    where: { slug: params.slug, indicator: "smysnk3", runMode: "user" }
  });

  if (!run) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const { mode, scenarios, orderedIds, idSet, questionIds } = resolveScenarios(run);
  const responses = sortResponses(normalizeStoredResponses(run, idSet), orderedIds);

  return NextResponse.json({
    slug: run.slug,
    runMode: run.runMode,
    subject: run.subject,
    context: run.context,
    questionMode: mode,
    questionCount: scenarios.length,
    questionIds,
    responses,
    answeredCount: responses.length,
    totalCount: scenarios.length,
    state: run.state,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const payload = saveAnswerSchema.parse(await request.json());

    initializeRunModel();
    await initializeDatabase();

    const run = await Run.findOne({
      where: { slug: params.slug, indicator: "smysnk3", runMode: "user" }
    });

    if (!run) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (run.state === "COMPLETED") {
      return NextResponse.json({ error: "This session is already finalized." }, { status: 409 });
    }

    const { mode, scenarios, orderedIds, idSet, questionIds } = resolveScenarios(run);
    if (!idSet.has(payload.questionId)) {
      return NextResponse.json({ error: "Unknown scenario id for this session." }, { status: 400 });
    }

    const answerKey = normalizeSmysnk3OptionKey(payload.answer);
    if (!answerKey) {
      return NextResponse.json({ error: "Invalid answer option." }, { status: 400 });
    }

    const label = payload.subject ? payload.subject.trim() : run.subject;
    if (label.length < 2 || label.length > 80) {
      return NextResponse.json(
        { error: "Participant label must be between 2 and 80 characters." },
        { status: 400 }
      );
    }

    const responses = normalizeStoredResponses(run, idSet).filter(
      (response) => response.questionId !== payload.questionId
    );
    responses.push({
      questionId: payload.questionId,
      answer: answerKey,
      rationale: payload.rationale?.trim() || `User selected ${answerKey}.`
    });

    const sortedResponses = sortResponses(responses, orderedIds);

    await run.update({
      subject: label,
      context: typeof payload.context === "string" ? payload.context.trim() || null : run.context,
      questionMode: mode.toString(),
      questionCount: scenarios.length,
      questionIds,
      responses: sortedResponses,
      functionScores: null,
      analysis: null,
      state: "PROCESSING"
    });

    return NextResponse.json({
      slug: run.slug,
      subject: run.subject,
      context: run.context,
      questionMode: mode,
      questionCount: scenarios.length,
      questionIds,
      responses: sortedResponses,
      answeredCount: sortedResponses.length,
      totalCount: scenarios.length,
      state: run.state,
      updatedAt: run.updatedAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
