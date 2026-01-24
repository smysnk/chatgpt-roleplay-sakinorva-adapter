import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";
import { startRunQueue } from "@/lib/runQueue";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  initializeRunModel();
  await initializeDatabase();

  const run = await Run.findOne({
    where: { slug: params.slug }
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  await run.update({ state: "QUEUED", errors: 0 });
  startRunQueue();

  return NextResponse.json({
    slug: run.slug,
    state: run.state,
    errors: run.errors
  });
}
