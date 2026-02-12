import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSmysnk2Scenarios, parseSmysnk2Mode } from "@/lib/smysnk2Questions";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  subject: z.string().max(80).optional().default("Self"),
  context: z.string().max(500).optional().default(""),
  mode: z.union([z.string(), z.number()]).optional()
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

    const mode = parseSmysnk2Mode(payload.mode);
    const scenarios = getSmysnk2Scenarios(mode);

    initializeRunModel();
    await initializeDatabase();

    const run = await Run.create({
      slug: crypto.randomUUID(),
      indicator: "smysnk2",
      runMode: "user",
      state: "PROCESSING",
      errors: 0,
      subject: label,
      context: payload.context.trim() || null,
      questionMode: mode.toString(),
      questionCount: scenarios.length,
      responses: [],
      functionScores: null,
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
