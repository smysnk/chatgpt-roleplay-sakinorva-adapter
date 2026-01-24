import { NextResponse } from "next/server";
import { z } from "zod";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";
import { startRunQueue } from "@/lib/runQueue";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  character: z.string().min(2).max(80),
  context: z.string().max(500).optional().default("")
});

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
    const slugBase = slugify(payload.character);
    const slug = `${slugBase || "run"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    initializeRunModel();
    await initializeDatabase();
    const interaction = await Run.create({
      slug,
      indicator: "sakinorva",
      runMode: "ai",
      state: "QUEUED",
      errors: 0,
      subject: payload.character,
      context: payload.context || null,
      answers: null,
      explanations: null,
      responses: null,
      functionScores: null
    });
    startRunQueue();

    return NextResponse.json({
      runId: interaction.id,
      slug: interaction.slug,
      character: interaction.subject,
      context: interaction.context,
      state: interaction.state,
      errors: interaction.errors,
      createdAt: interaction.createdAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  initializeRunModel();
  await initializeDatabase();
  const interactions = await Run.findAll({
    where: { runMode: "ai", indicator: "sakinorva" },
    order: [["createdAt", "DESC"]],
    attributes: [
      "id",
      "slug",
      "subject",
      "context",
      "functionScores",
      "state",
      "errors",
      "createdAt"
    ]
  });

  return NextResponse.json({
    items: interactions.map((interaction) => ({
      id: interaction.id.toString(),
      slug: interaction.slug,
      character: interaction.subject,
      context: interaction.context,
      functionScores: interaction.functionScores,
      state: interaction.state,
      errors: interaction.errors,
      createdAt: interaction.createdAt
    }))
  });
}
