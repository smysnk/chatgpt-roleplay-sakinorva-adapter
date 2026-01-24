import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";
import { startRunQueue } from "@/lib/runQueue";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  character: z.string().min(2).max(80),
  context: z.string().max(500).optional().default("")
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const slug = crypto.randomUUID();

    initializeRunModel();
    await initializeDatabase();
    const run = await Run.create({
      slug,
      indicator: "smysnk",
      runMode: "ai",
      state: "QUEUED",
      errors: 0,
      subject: payload.character,
      context: payload.context || null,
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

export async function GET() {
  initializeRunModel();
  await initializeDatabase();

  const runs = await Run.findAll({
    where: { indicator: "smysnk" },
    order: [["createdAt", "DESC"]],
    attributes: ["id", "slug", "subject", "context", "functionScores", "state", "errors", "createdAt"]
  });

  return NextResponse.json({
    items: runs.map((run) => ({
      id: run.id.toString(),
      slug: run.slug,
      subject: run.subject,
      context: run.context,
      functionScores: run.functionScores,
      state: run.state,
      errors: run.errors,
      createdAt: run.createdAt
    }))
  });
}
