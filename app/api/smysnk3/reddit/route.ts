import { NextResponse } from "next/server";
import { z } from "zod";
import { getSmysnk3Scenarios, parseSmysnk3Mode, selectSmysnk3QuestionIds } from "@/lib/smysnk3Questions";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";
import { startRunQueue } from "@/lib/runQueue";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  username: z.string().min(3).max(25),
  mode: z.union([z.string(), z.number()]).optional()
});

const usernamePattern = /^[a-zA-Z0-9_-]{3,20}$/;

const normalizeUsername = (value: string) => value.trim().replace(/^u\//i, "");

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const normalized = normalizeUsername(payload.username);
    if (!usernamePattern.test(normalized)) {
      return NextResponse.json(
        { error: "Reddit username must be 3-20 characters of letters, numbers, underscores, or hyphens." },
        { status: 400 }
      );
    }

    const questionMode = parseSmysnk3Mode(payload.mode);
    const slugBase = slugify(`reddit-${normalized}`);
    const slug = `${slugBase || "run"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const questionIds = selectSmysnk3QuestionIds({ mode: questionMode, seed: slug });
    const questionCount = getSmysnk3Scenarios(questionMode, questionIds).length;

    initializeRunModel();
    await initializeDatabase();
    const run = await Run.create({
      slug,
      indicator: "smysnk3",
      runMode: "reddit",
      state: "QUEUED",
      errors: 0,
      subject: `u/${normalized}`,
      context: null,
      questionMode: questionMode.toString(),
      questionCount,
      questionIds,
      responses: null,
      functionScores: null,
      analysis: null,
      answers: null,
      explanations: null
    });
    startRunQueue();

    return NextResponse.json({
      slug: run.slug,
      runMode: run.runMode,
      subject: run.subject,
      context: run.context,
      questionMode: run.questionMode,
      questionCount: run.questionCount,
      questionIds: run.questionIds,
      state: run.state,
      errors: run.errors,
      createdAt: run.createdAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
