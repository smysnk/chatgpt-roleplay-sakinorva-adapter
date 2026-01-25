import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  initializeRunModel();
  await initializeDatabase();

  const interaction = await Run.findOne({
    where: { slug: params.slug, indicator: "sakinorva" }
  });

  if (!interaction) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: interaction.id,
    slug: interaction.slug,
    character: interaction.subject,
    context: interaction.context,
    redditProfile: interaction.redditProfile,
    answers: interaction.answers,
    explanations: interaction.explanations,
    functionScores: interaction.functionScores,
    state: interaction.state,
    errors: interaction.errors,
    createdAt: interaction.createdAt
  });
}
