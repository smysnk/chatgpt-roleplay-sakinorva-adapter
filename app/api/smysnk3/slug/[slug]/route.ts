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
    where: { slug: params.slug, indicator: "smysnk3" }
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({
    slug: run.slug,
    runMode: run.runMode,
    subject: run.subject,
    context: run.context,
    questionMode: run.questionMode,
    questionCount: run.questionCount,
    questionIds: run.questionIds,
    redditProfile: run.redditProfile,
    responses: run.responses,
    scores: run.functionScores,
    analysis: run.analysis,
    state: run.state,
    errors: run.errors,
    createdAt: run.createdAt
  });
}
