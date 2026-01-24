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

  const run = await Run.findOne({
    where: { slug: params.slug, indicator: "sakinorva" }
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: run.id,
    slug: run.slug,
    character: run.character,
    context: run.context,
    answers: run.answers,
    explanations: run.explanations,
    functionScores: run.functionScores,
    grantType: run.grantType,
    axisType: run.axisType,
    myersType: run.myersType,
    createdAt: run.createdAt
  });
}
