import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { initializeDatabase } from "@/lib/db";
import { isLikelyHumanUserAgent } from "@/lib/humanUserAgent";
import { initializeRunModel, Run } from "@/lib/models/Run";
import {
  getSmysnk2Scenarios,
  parseSmysnk2Mode,
  selectSmysnk2QuestionIds,
  type Smysnk2Mode
} from "@/lib/smysnk2Questions";
import {
  getSmysnk3Scenarios,
  parseSmysnk3Mode,
  selectSmysnk3QuestionIds,
  type Smysnk3Mode
} from "@/lib/smysnk3Questions";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  indicator: z.enum(["smysnk2", "smysnk3"]).default("smysnk3"),
  mode: z.union([z.string(), z.number()]).optional(),
  name: z.string().max(80).optional().default("Self")
});

const encodeQuery = (basePath: string, params: Record<string, string | null | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value) {
      return;
    }
    searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
};

export async function POST(request: Request) {
  try {
    const userAgent = request.headers.get("user-agent");
    if (!isLikelyHumanUserAgent(userAgent)) {
      return NextResponse.json(
        { error: "A browser user agent is required to launch a shared test." },
        { status: 403 }
      );
    }

    const payload = requestSchema.parse(await request.json().catch(() => ({})));
    const label = payload.name.trim() || "Self";
    if (label.length < 2 || label.length > 80) {
      return NextResponse.json(
        { error: "Name must be between 2 and 80 characters." },
        { status: 400 }
      );
    }

    initializeRunModel();
    await initializeDatabase();

    if (payload.indicator === "smysnk2") {
      const mode = parseSmysnk2Mode(payload.mode) as Smysnk2Mode;
      const slug = crypto.randomUUID();
      const questionIds = selectSmysnk2QuestionIds({ mode, seed: slug });
      const questionCount = getSmysnk2Scenarios(mode, questionIds).length;

      await Run.create({
        slug,
        indicator: "smysnk2",
        runMode: "user",
        state: "PROCESSING",
        errors: 0,
        subject: label,
        context: null,
        questionMode: mode.toString(),
        questionCount,
        questionIds,
        responses: [],
        functionScores: null,
        analysis: null,
        answers: null,
        explanations: null
      });

      const redirectPath = encodeQuery("/smysnk2/questions", {
        slug,
        mode: mode.toString(),
        label,
        shared: "1"
      });

      return NextResponse.json({
        slug,
        indicator: "smysnk2",
        mode,
        questionCount,
        redirectPath
      });
    }

    const mode = parseSmysnk3Mode(payload.mode) as Smysnk3Mode;
    const slug = crypto.randomUUID();
    const questionIds = selectSmysnk3QuestionIds({ mode, seed: slug });
    const questionCount = getSmysnk3Scenarios(mode, questionIds).length;

    await Run.create({
      slug,
      indicator: "smysnk3",
      runMode: "user",
      state: "PROCESSING",
      errors: 0,
      subject: label,
      context: null,
      questionMode: mode.toString(),
      questionCount,
      questionIds,
      responses: [],
      functionScores: null,
      analysis: null,
      answers: null,
      explanations: null
    });

    const redirectPath = encodeQuery("/smysnk3/questions", {
      slug,
      mode: mode.toString(),
      label,
      shared: "1"
    });

    return NextResponse.json({
      slug,
      indicator: "smysnk3",
      mode,
      questionCount,
      redirectPath
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
