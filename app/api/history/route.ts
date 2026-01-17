import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { initializeInteractionModel, Interaction } from "@/lib/models/Interaction";

export const dynamic = "force-dynamic";
export async function GET() {
  initializeInteractionModel();
  await initializeDatabase();
  const interactions = await Interaction.findAll({
    order: [["createdAt", "DESC"]],
    attributes: [
      "id",
      "slug",
      "character",
      "context",
      "grantType",
      "secondType",
      "thirdType",
      "axisType",
      "myersType",
      "functionScores",
      "createdAt"
    ]
  });

  return NextResponse.json({
    items: interactions.map((interaction) => ({
      id: interaction.id.toString(),
      slug: interaction.slug,
      character: interaction.character,
      context: interaction.context,
      grantType: interaction.grantType,
      secondType: interaction.secondType,
      thirdType: interaction.thirdType,
      axisType: interaction.axisType,
      myersType: interaction.myersType,
      functionScores: interaction.functionScores,
      createdAt: interaction.createdAt
    }))
  });
}
