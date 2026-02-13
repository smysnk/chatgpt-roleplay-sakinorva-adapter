import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  hasBalancedSmysnk3QuestionIds,
  getSmysnk3Scenarios,
  normalizeSmysnk3QuestionIds,
  parseSmysnk3Mode,
  selectSmysnk3QuestionIds
} from "@/lib/smysnk3Questions";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  subject: z.string().max(80).optional().default("Self"),
  context: z.string().max(500).optional().default(""),
  mode: z.union([z.string(), z.number()]).optional(),
  questionIds: z.array(z.string()).optional()
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

    const mode = parseSmysnk3Mode(payload.mode);
    const slug = crypto.randomUUID();
    const requestedIds = normalizeSmysnk3QuestionIds(payload.questionIds);
    const questionIds =
      requestedIds && requestedIds.length === mode && hasBalancedSmysnk3QuestionIds(requestedIds, mode)
        ? requestedIds
        : selectSmysnk3QuestionIds({ mode, seed: slug });
    const scenarios = getSmysnk3Scenarios(mode, questionIds);

    initializeRunModel();
    await initializeDatabase();

    const run = await Run.create({
      slug,
      indicator: "smysnk3",
      runMode: "user",
      state: "PROCESSING",
      errors: 0,
      subject: label,
      context: payload.context.trim() || null,
      questionMode: mode.toString(),
      questionCount: scenarios.length,
      questionIds,
      responses: [],
      functionScores: null,
      analysis: null,
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
      responses: run.responses ?? [],
      answeredCount: 0,
      totalCount: scenarios.length,
      state: run.state,
      createdAt: run.createdAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
