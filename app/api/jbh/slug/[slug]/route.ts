import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { initializeJbhRunModel, JbhRun } from "@/lib/models/JbhRun";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  initializeJbhRunModel();
  await initializeDatabase();

  const run = await JbhRun.findOne({
    where: { slug: params.slug }
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({
    slug: run.slug,
    runMode: run.runMode,
    subject: run.subject,
    context: run.context,
    responses: run.responses,
    scores: run.scores,
    createdAt: run.createdAt
  });
}
