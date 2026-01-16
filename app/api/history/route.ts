import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { initializeInteractionModel, Interaction } from "@/lib/models/Interaction";

export async function GET() {
  initializeInteractionModel();
  await initializeDatabase();
  const interactions = await Interaction.findAll({
    order: [["createdAt", "DESC"]],
    attributes: ["id", "character", "context", "resultsSummary", "createdAt"]
  });

  return NextResponse.json({
    items: interactions.map((interaction) => ({
      id: interaction.id,
      character: interaction.character,
      context: interaction.context,
      resultsSummary: interaction.resultsSummary,
      createdAt: interaction.createdAt
    }))
  });
}
