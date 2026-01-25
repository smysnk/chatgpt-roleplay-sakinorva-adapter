import { NextResponse } from "next/server";
import { z } from "zod";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";
import { startRunQueue } from "@/lib/runQueue";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  username: z.string().min(3).max(25)
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

    const slugBase = slugify(`reddit-${normalized}`);
    const slug = `${slugBase || "run"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    initializeRunModel();
    await initializeDatabase();
    const run = await Run.create({
      slug,
      indicator: "smysnk",
      runMode: "reddit",
      state: "QUEUED",
      errors: 0,
      subject: `u/${normalized}`,
      context: null,
      responses: null,
      functionScores: null,
      answers: null,
      explanations: null
    });
    startRunQueue();

    return NextResponse.json({
      slug: run.slug,
      runMode: run.runMode,
      subject: run.subject,
      context: run.context,
      state: run.state,
      errors: run.errors,
      createdAt: run.createdAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
