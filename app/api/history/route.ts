import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { initializeInteractionModel, Interaction } from "@/lib/models/Interaction";
import { createRunSlug } from "@/lib/slug";
import { parseSakinorvaResults } from "@/lib/sakinorvaParser";

export const dynamic = "force-dynamic";
export async function GET() {
  initializeInteractionModel();
  await initializeDatabase();
  const interactions = await Interaction.findAll({
    order: [["createdAt", "DESC"]],
    attributes: ["id", "character", "context", "resultsSummary", "resultsHtmlFragment", "createdAt"]
  });

  return NextResponse.json({
    items: interactions.map((interaction) => ({
      id: interaction.id,
      character: interaction.character,
      context: interaction.context,
      resultsSummary: interaction.resultsSummary,
      createdAt: interaction.createdAt,
      slug: createRunSlug(interaction.character, interaction.id),
      typeSummary: parseSakinorvaResults(interaction.resultsHtmlFragment).typeSummary
    }))
  });
}
