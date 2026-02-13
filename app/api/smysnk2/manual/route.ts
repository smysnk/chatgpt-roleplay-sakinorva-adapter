import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import {
  hasBalancedSmysnk2QuestionIds,
  getSmysnk2Scenarios,
  normalizeSmysnk2QuestionIds,
  parseSmysnk2Mode,
  type Smysnk2OptionKey
} from "@/lib/smysnk2Questions";
import { normalizeSmysnk2OptionKey, scoreSmysnk2Responses } from "@/lib/smysnk2Score";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  subject: z.string().max(80).optional().default("Self"),
  context: z.string().max(500).optional().default(""),
  mode: z.union([z.string(), z.number()]).optional(),
  questionIds: z.array(z.string()).optional(),
  responses: z.array(
    z.object({
      questionId: z.string(),
      answer: z.union([z.string(), z.number()]),
      rationale: z.string().min(1).optional()
    })
  )
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const label = payload.subject.trim() || "Self";
    if (label.length < 2 || label.length > 80) {
      return NextResponse.json(
        { error: "Participant label must be between 2 and 80 characters." },
        { status: 400 }
      );
    }

    const questionMode = parseSmysnk2Mode(payload.mode);
    const slug = crypto.randomUUID();
    const requestedIds = normalizeSmysnk2QuestionIds(payload.questionIds);
    const questionIds =
      requestedIds &&
      requestedIds.length === questionMode &&
      hasBalancedSmysnk2QuestionIds(requestedIds, questionMode)
        ? requestedIds
        : null;
    const scenarios = getSmysnk2Scenarios(questionMode, questionIds, slug);
    if (payload.responses.length !== scenarios.length) {
      return NextResponse.json(
        { error: `Expected ${scenarios.length} responses for the selected mode.` },
        { status: 400 }
      );
    }

    const scenarioMap = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
    const seen = new Set<string>();
    const responses: { questionId: string; answer: Smysnk2OptionKey; rationale: string }[] = [];
    for (const response of payload.responses) {
      const scenario = scenarioMap.get(response.questionId);
      if (!scenario) {
        return NextResponse.json({ error: "Response contained an unknown scenario id." }, { status: 400 });
      }
      if (seen.has(response.questionId)) {
        return NextResponse.json({ error: "Response contained duplicate scenario ids." }, { status: 400 });
      }
      seen.add(response.questionId);

      const answerKey = normalizeSmysnk2OptionKey(response.answer);
      if (!answerKey) {
        return NextResponse.json({ error: "Response contained an invalid answer option." }, { status: 400 });
      }
      if (!scenario.options.some((option) => option.key === answerKey)) {
        return NextResponse.json(
          { error: "Response option was not available for the scenario." },
          { status: 400 }
        );
      }

      responses.push({
        questionId: response.questionId,
        answer: answerKey,
        rationale: response.rationale?.trim() || `User selected ${answerKey}.`
      });
    }

    const scoring = scoreSmysnk2Responses(
      responses.map((response) => ({ questionId: response.questionId, answerKey: response.answer }))
    );

    initializeRunModel();
    await initializeDatabase();
    const run = await Run.create({
      slug,
      indicator: "smysnk2",
      runMode: "user",
      state: "COMPLETED",
      errors: 0,
      subject: label,
      context: payload.context || null,
      questionMode: questionMode.toString(),
      questionCount: scenarios.length,
      questionIds: scenarios.map((scenario) => scenario.id),
      responses,
      functionScores: scoring.functionScores,
      analysis: scoring.analysis,
      answers: null,
      explanations: null
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
      createdAt: run.createdAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
