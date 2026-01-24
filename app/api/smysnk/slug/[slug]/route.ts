import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { initializeSmysnkRunModel, SmysnkRun } from "@/lib/models/SmysnkRun";
import { initializeInteractionModel } from "@/lib/models/Interaction";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  initializeSmysnkRunModel();
  initializeInteractionModel();
  await initializeDatabase();

  const run = await SmysnkRun.findOne({
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
