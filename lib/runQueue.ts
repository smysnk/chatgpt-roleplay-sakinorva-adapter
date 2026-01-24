import OpenAI from "openai";
import { z } from "zod";
import * as cheerio from "cheerio";
import { QUESTIONS } from "@/lib/questions";
import { SMYSNK_QUESTIONS } from "@/lib/smysnkQuestions";
import { calculateSmysnkScores } from "@/lib/smysnkScore";
import { initializeRunModel, Run } from "@/lib/models/Run";
import { initializeDatabase } from "@/lib/db";
import { extractResultMetadata } from "@/lib/runMetadata";

const ANSWER_SCHEMA = z.object({
  responses: z
    .array(
      z.object({
        answer: z.number().int().min(1).max(5),
        explanation: z.string().min(1)
      })
    )
    .length(96)
});

const SMYSNK_SCHEMA = z.object({
  responses: z
    .array(
      z.object({
        id: z.string(),
        answer: z.number().int().min(1).max(5),
        rationale: z.string().min(1)
      })
    )
    .length(SMYSNK_QUESTIONS.length)
});

const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const toAbsoluteScores = (scores: Record<string, number> | null) =>
  scores
    ? Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, Math.abs(value)]))
    : null;

let queueStarted = false;
let queueRunning = false;
let queueTimer: ReturnType<typeof setInterval> | null = null;

const buildQuestionBlock = () =>
  QUESTIONS.map((question, index) => `#${index + 1} ${question}`).join("\n");

const buildSmysnkQuestionBlock = () =>
  SMYSNK_QUESTIONS.map((question) => `${question.id}: ${question.question}`).join("\n");

const processSakinorvaRun = async (run: Run) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const systemMessage =
    "You are roleplaying as the specified character. Answer truthfully as that character would behave and think. Answer questions as you see yourself, not how others see you. Output must match the JSON schema exactly.";
  const userMessage = `Character: ${run.subject}\nContext: ${run.context || "(none)"}\n\nAnswer all 96 questions on a 1-5 scale (1=no, 5=yes). Provide a one-sentence explanation for each answer.\nReturn JSON only, no markdown, no commentary.\n\nQuestions:\n${buildQuestionBlock()}\n\nJSON schema:\n{\n \"responses\": [\n{ \"answer\": number (1..5), \"explanation\": string (one sentence) \n} \n// exactly 96 objects \n]\n}\n`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    response_format: { type: "json_object" },
    temperature: 1
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response was empty.");
  }

  const parsed = ANSWER_SCHEMA.safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error("OpenAI response failed validation.");
  }

  const { responses } = parsed.data;
  const params = new URLSearchParams();
  const { answers, explanations } = responses.reduce(
    (acc, response, index) => {
      acc.answers.push(response.answer);
      acc.explanations.push(response.explanation);
      params.set(`q${index + 1}`, response.answer.toString());
      return acc;
    },
    { answers: [] as number[], explanations: [] as string[] }
  );
  params.set("age", "");
  params.set("idmbti", "");
  params.set("enneagram", "");
  params.set("comments", "");
  params.set("token", "");
  params.set("sousin", "＜submit results＞");

  const response = await fetch("https://sakinorva.net/functions", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      origin: "https://sakinorva.net",
      referer: "https://sakinorva.net/functions",
      "user-agent": userAgent
    },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error("Sakinorva request failed.");
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const results = $("#my_results.kekka");
  if (!results.length) {
    throw new Error("Could not find results block in response.");
  }

  const resultsHtmlFragment = $.html(results);
  const metadata = extractResultMetadata(resultsHtmlFragment);
  const absoluteScores = toAbsoluteScores(
    Object.keys(metadata.functionScores).length ? metadata.functionScores : null
  );

  await run.update({
    answers,
    explanations,
    functionScores: absoluteScores,
    state: "COMPLETED"
  });
};

const processSmysnkRun = async (run: Run) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const systemMessage =
    "You are roleplaying as the specified character. Answer as they would on a 1-5 agreement scale. Include a brief rationale for each answer. Output must match the JSON schema exactly.";
  const userMessage = `Character: ${run.subject}\nContext: ${run.context || "(none)"}\n\nAnswer all SMYSNK questions on a 1-5 scale (1=disagree, 5=agree). Provide a one-sentence rationale for each answer. Return JSON only.\n\nQuestions:\n${buildSmysnkQuestionBlock()}\n\nJSON schema:\n{\n \"responses\": [\n  { \"id\": \"question id\", \"answer\": number (1..5), \"rationale\": string }\n  // exactly ${SMYSNK_QUESTIONS.length} objects\n ]\n}\n`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    response_format: { type: "json_object" },
    temperature: 1
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response was empty.");
  }

  const parsed = SMYSNK_SCHEMA.safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error("OpenAI response failed validation.");
  }

  const validIds = new Set(SMYSNK_QUESTIONS.map((question) => question.id));
  const seen = new Set<string>();
  for (const response of parsed.data.responses) {
    if (!validIds.has(response.id)) {
      throw new Error("OpenAI returned an unknown question id.");
    }
    if (seen.has(response.id)) {
      throw new Error("OpenAI returned duplicate question ids.");
    }
    seen.add(response.id);
  }

  const responses = parsed.data.responses.map((response) => ({
    questionId: response.id,
    answer: response.answer,
    rationale: response.rationale
  }));

  const scores = calculateSmysnkScores(responses);

  await run.update({
    responses,
    functionScores: scores,
    state: "COMPLETED"
  });
};

const processQueuedRun = async () => {
  if (queueRunning) {
    return;
  }
  queueRunning = true;
  try {
    initializeRunModel();
    await initializeDatabase();
    const run = await Run.findOne({
      where: {
        state: ["QUEUED", "PROCESSING"],
        runMode: "ai"
      },
      order: [["createdAt", "ASC"]]
    });
    if (!run) {
      return;
    }

    console.log(`[runQueue] Processing ${run.indicator} run ${run.slug} (state=${run.state}, errors=${run.errors ?? 0})`);
    if (run.state === "QUEUED") {
      await run.update({ state: "PROCESSING" });
    }

    try {
      if (run.indicator === "sakinorva") {
        await processSakinorvaRun(run);
      } else {
        await processSmysnkRun(run);
      }
      console.log(`[runQueue] Completed ${run.indicator} run ${run.slug}`);
    } catch (error) {
      const nextErrors = (run.errors ?? 0) + 1;
      const nextState = nextErrors >= 3 ? "ERROR" : "QUEUED";
      await run.update({
        errors: nextErrors,
        state: nextState
      });
      console.warn(
        `[runQueue] ${run.indicator} run ${run.slug} failed (errors=${nextErrors}, state=${nextState})`,
        error
      );
    }
  } finally {
    queueRunning = false;
  }
};

export const startRunQueue = () => {
  if (queueStarted) {
    return;
  }
  queueStarted = true;
  queueTimer = setInterval(processQueuedRun, 4000);
  processQueuedRun();
};

export const stopRunQueue = () => {
  if (queueTimer) {
    clearInterval(queueTimer);
  }
  queueTimer = null;
  queueStarted = false;
};
