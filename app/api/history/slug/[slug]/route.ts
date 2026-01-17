import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { initializeInteractionModel, Interaction } from "@/lib/models/Interaction";
import { SAKINORVA_RESULTS_CSS } from "@/lib/sakinorvaStyles";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  initializeInteractionModel();
  await initializeDatabase();

  const interaction = await Interaction.findOne({
    where: { slug: params.slug }
  });

  if (!interaction) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: interaction.id,
    slug: interaction.slug,
    character: interaction.character,
    context: interaction.context,
    answers: interaction.answers,
    explanations: interaction.explanations,
    resultsHtmlFragment: interaction.resultsHtmlFragment,
    resultsCss: SAKINORVA_RESULTS_CSS,
    functionScores: interaction.functionScores,
    createdAt: interaction.createdAt
  });
}
