import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { initializeInteractionModel, Interaction } from "@/lib/models/Interaction";
import { extractTypeSummary } from "@/lib/sakinorva";

export const dynamic = "force-dynamic";
export async function GET() {
  initializeInteractionModel();
  await initializeDatabase();
  const interactions = await Interaction.findAll({
    order: [["createdAt", "DESC"]],
    attributes: ["id", "character", "context", "resultsHtmlFragment", "createdAt"]
  });

  return NextResponse.json({
    items: interactions.map((interaction) => ({
      ...extractTypeSummary(interaction.resultsHtmlFragment),
      id: interaction.id,
      character: interaction.character,
      context: interaction.context,
      createdAt: interaction.createdAt
    }))
  });
}
