import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { Interaction } from "@/lib/models/Interaction";
import { SAKINORVA_RESULTS_CSS } from "@/lib/sakinorvaStyles";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, context: RouteContext) {
  await initializeDatabase();
  const interaction = await Interaction.findByPk(context.params.id);
  if (!interaction) {
    return NextResponse.json({ error: "Interaction not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: interaction.id,
    character: interaction.character,
    context: interaction.context,
    answers: interaction.answers,
    explanations: interaction.explanations,
    resultsHtmlFragment: interaction.resultsHtmlFragment,
    resultsCss: SAKINORVA_RESULTS_CSS,
    createdAt: interaction.createdAt
  });
}
