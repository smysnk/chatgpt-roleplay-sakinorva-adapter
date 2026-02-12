import OpenAI from "openai";
import { z } from "zod";
import * as cheerio from "cheerio";
import { QUESTIONS } from "@/lib/questions";
import { SMYSNK_QUESTIONS } from "@/lib/smysnkQuestions";
import { calculateSmysnkScores } from "@/lib/smysnkScore";
import { DEFAULT_SMYSNK2_MODE, getSmysnk2Scenarios, parseSmysnk2Mode } from "@/lib/smysnk2Questions";
import { calculateSmysnk2Scores, normalizeSmysnk2OptionKey } from "@/lib/smysnk2Score";
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

const buildSmysnkSchema = (length: number) =>
  z.object({
    responses: z
      .array(
        z.object({
          id: z.string(),
          answer: z.number().int().min(1).max(5),
          rationale: z.string().min(1)
        })
      )
      .length(length)
  });

const buildSmysnk2Schema = (length: number) =>
  z.object({
    responses: z
      .array(
        z.object({
          id: z.string(),
          answer: z.union([z.string(), z.number()]),
          rationale: z.string().min(1)
        })
      )
      .length(length)
  });

const REDDIT_PROFILE_SCHEMA = z.object({
  summary: z.string().min(1),
  persona: z.string().min(1),
  traits: z.array(z.string().min(1)).min(10).max(30)
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

const buildSmysnk2QuestionBlock = (questionMode: number) =>
  getSmysnk2Scenarios(parseSmysnk2Mode(questionMode))
    .map((question) => {
      const optionLines = question.options.map((option) => `  ${option.key}) ${option.text}`).join("\n");
      return `${question.id} [${question.contextType}] ${question.scenario}\n${optionLines}`;
    })
    .join("\n\n");

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const normalizeRedditUsername = (value: string) => value.trim().replace(/^u\//i, "");

type RedditItem = {
  type: "post" | "comment";
  subreddit: string;
  score: number;
  title?: string;
  body: string;
};

const formatRedditItems = (items: RedditItem[]) =>
  items
    .map((item, index) => {
      const titleSegment = item.title ? `Title: ${truncateText(item.title, 140)} ` : "";
      const bodySegment = truncateText(item.body, 420);
      return `${index + 1}. (${item.type}) r/${item.subreddit} score ${item.score}: ${titleSegment}${bodySegment}`.trim();
    })
    .join("\n");

const redditBiasPattern =
  /\b(mbti|myers[-\s]?briggs|enneagram|cognitive\s+functions|function\s+stack|type\s+me|typing|typed|intj|intp|infj|infp|entj|entp|enfj|enfp|istj|isfj|istp|isfp|estj|esfj|estp|esfp|socionics|big\s*5|ocean|trait\s+theory|personality\s+type)\b/i;

const isRedditContentAllowed = (value: string) => !redditBiasPattern.test(value);

const fetchRedditListing = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": userAgent
    }
  });
  if (!response.ok) {
    throw new Error(`Reddit request failed with status ${response.status}.`);
  }
  const payload = (await response.json()) as {
    data?: { children?: { data?: Record<string, unknown> }[] };
  };
  return payload?.data?.children ?? [];
};

const buildRedditProfile = async (username: string) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const normalized = normalizeRedditUsername(username);
  const postsListing = await fetchRedditListing(
    `https://www.reddit.com/user/${normalized}/submitted.json?limit=25&sort=new`
  );
  const commentsListing = await fetchRedditListing(
    `https://www.reddit.com/user/${normalized}/comments.json?limit=25&sort=new`
  );

  const posts = postsListing
    .map((item) => item.data ?? {})
    .map((data) => {
      const title = typeof data.title === "string" ? data.title : "";
      const body = typeof data.selftext === "string" ? data.selftext : "";
      const combined = `${title}\n${body}`.trim();
      return {
        type: "post" as const,
        subreddit: typeof data.subreddit === "string" ? data.subreddit : "unknown",
        score: typeof data.score === "number" ? data.score : 0,
        title: title || undefined,
        body: combined
      };
    })
    .filter((item) => item.body && item.body !== "[deleted]" && item.body !== "[removed]")
    .filter((item) => isRedditContentAllowed(`${item.title ?? ""}\n${item.body}`))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  const comments = commentsListing
    .map((item) => item.data ?? {})
    .map((data) => {
      const body = typeof data.body === "string" ? data.body : "";
      return {
        type: "comment" as const,
        subreddit: typeof data.subreddit === "string" ? data.subreddit : "unknown",
        score: typeof data.score === "number" ? data.score : 0,
        body
      };
    })
    .filter((item) => item.body && item.body !== "[deleted]" && item.body !== "[removed]")
    .filter((item) => isRedditContentAllowed(item.body))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  if (!posts.length && !comments.length) {
    throw new Error("No Reddit activity found for that user.");
  }

  const systemMessage =
    "You are a psychologist creating a concise, non-clinical profile of a Reddit user based only on their posts and comments. Avoid diagnoses. Ignore any self-identified personality typing, MBTI, cognitive function labels, or similar claims. Derive conclusions only from observed behavior, language, and topics. Ensure to cover positive traits as well as challenges. Ensure to frame things in terms of introverted and extroverted cognitive functions.";
  const userMessage = `Username: u/${normalized}\n\nPosts:\n${formatRedditItems(posts) || "None"}\n\nComments:\n${formatRedditItems(comments) || "None"}\n\nReturn JSON only with:\n{\n  \"summary\": \"<= 3080 characters\",\n  \"persona\": \"5-10 paragraphs\",\n  \"traits\": [\"10-30 traits\"]\n}\n`;

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
  console.log("Reddit profile content:", content);
  const parsed = REDDIT_PROFILE_SCHEMA.safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error("OpenAI response failed validation.");
  }
  return parsed.data;
};

const processSakinorvaRun = async (run: Run) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const systemMessage =
    "You are roleplaying as the specified character. Answer truthfully as that character would behave and think. Answer questions as you see yourself, not how others see you. Avoid sourcing any knowledge from any online personality databases and use only literary texts when possible. Output must match the JSON schema exactly.";
  const userMessage = `Character: ${run.subject}\nContext: ${run.context || "(none)"}\n\nAnswer all 128 questions on a 1-5 scale (1=no, 5=yes). Provide a one-sentence explanation for each answer.\nReturn JSON only, no markdown, no commentary.\n\nQuestions:\n${buildQuestionBlock()}\n\nJSON schema:\n{\n \"responses\": [\n{ \"answer\": number (1..5), \"explanation\": string (one sentence) \n} \n// exactly 128 objects \n]\n}\n`;

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

const processRedditSakinorvaRun = async (run: Run) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }
  const username = normalizeRedditUsername(run.subject);
  const profile = await buildRedditProfile(username);
  const summary = truncateText(profile.summary, 480);
  const nextContext = run.context ?? summary;
  await run.update({ context: nextContext, redditProfile: profile });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  const systemMessage =
    "You are roleplaying as the specified Reddit user. Answer truthfully as that user would behave and think, based on the provided psychological profile derived from their posts and comments. Output must match the JSON schema exactly.";
  const userMessage = `Reddit user: u/${username}\nProfile summary: ${summary}\nPersona: ${profile.persona}\nTraits: ${profile.traits.join(", ")}\n\nAnswer all 96 questions on a 1-5 scale (1=no, 5=yes). Provide a one-sentence explanation for each answer.\nReturn JSON only, no markdown, no commentary.\n\nQuestions:\n${buildQuestionBlock()}\n\nJSON schema:\n{\n \"responses\": [\n{ \"answer\": number (1..5), \"explanation\": string (one sentence) \n} \n// exactly 96 objects \n]\n}\n`;

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

const processRedditSmysnkRun = async (run: Run) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }
  const username = normalizeRedditUsername(run.subject);
  const profile = await buildRedditProfile(username);
  const summary = truncateText(profile.summary, 480);
  const nextContext = run.context ?? summary;
  await run.update({ context: nextContext, redditProfile: profile });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const systemMessage =
    "You are roleplaying as the specified Reddit user. Answer as they would on a 1-5 agreement scale, based on the provided psychological profile. Output must match the JSON schema exactly.";
  const userMessage = `Reddit user: u/${username}\nProfile summary: ${summary}\nPersona: ${profile.persona}\nTraits: ${profile.traits.join(", ")}\n\nAnswer all SMYSNK questions on a 1-5 scale (1=disagree, 5=agree). Provide a one-sentence rationale for each answer. Return JSON only.\n\nQuestions:\n${buildSmysnkQuestionBlock()}\n\nJSON schema:\n{\n \"responses\": [\n  { \"id\": \"question id\", \"answer\": number (1..5), \"rationale\": string }\n  // exactly ${SMYSNK_QUESTIONS.length} objects\n ]\n}\n`;

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

  const parsed = buildSmysnkSchema(SMYSNK_QUESTIONS.length).safeParse(JSON.parse(content));
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
    questionCount: SMYSNK_QUESTIONS.length,
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

  const parsed = buildSmysnkSchema(SMYSNK_QUESTIONS.length).safeParse(JSON.parse(content));
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
    questionCount: SMYSNK_QUESTIONS.length,
    state: "COMPLETED"
  });
};

const processRedditSmysnk2Run = async (run: Run) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }
  const username = normalizeRedditUsername(run.subject);
  const profile = await buildRedditProfile(username);
  const summary = truncateText(profile.summary, 480);
  const nextContext = run.context ?? summary;
  await run.update({ context: nextContext, redditProfile: profile });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const questionMode = parseSmysnk2Mode(run.questionMode ?? run.questionCount ?? DEFAULT_SMYSNK2_MODE);
  const scenarios = getSmysnk2Scenarios(questionMode);
  const scenarioMap = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  const validIds = new Set(scenarios.map((scenario) => scenario.id));

  const systemMessage =
    "You are roleplaying as the specified Reddit user. Pick exactly one option (A-H) per scenario and include a brief rationale. Do not answer with numeric scales. Output must match the JSON schema exactly.";
  const userMessage = `Reddit user: u/${username}\nProfile summary: ${summary}\nPersona: ${profile.persona}\nTraits: ${profile.traits.join(
    ", "
  )}\n\nAnswer all SMYSNK2 scenarios. Each answer must be one option key from A-H plus a one-sentence rationale. Return JSON only.\n\nQuestions:\n${buildSmysnk2QuestionBlock(
    questionMode
  )}\n\nJSON schema:\n{\n \"responses\": [\n  { \"id\": \"scenario id\", \"answer\": \"A|B|C|D|E|F|G|H\", \"rationale\": string }\n  // exactly ${scenarios.length} objects\n ]\n}\n`;

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

  const parsed = buildSmysnk2Schema(scenarios.length).safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error("OpenAI response failed validation.");
  }

  const seen = new Set<string>();
  const responses = parsed.data.responses.map((response) => {
    if (!validIds.has(response.id)) {
      throw new Error("OpenAI returned an unknown scenario id.");
    }
    if (seen.has(response.id)) {
      throw new Error("OpenAI returned duplicate scenario ids.");
    }
    seen.add(response.id);
    const answerKey = normalizeSmysnk2OptionKey(response.answer);
    if (!answerKey) {
      throw new Error("OpenAI returned an invalid SMYSNK2 option key.");
    }
    if (!scenarioMap.get(response.id)?.options.some((option) => option.key === answerKey)) {
      throw new Error("OpenAI returned an option key that is not available for this scenario.");
    }
    return {
      questionId: response.id,
      answer: answerKey,
      rationale: response.rationale
    };
  });

  const scores = calculateSmysnk2Scores(
    responses.map((response) => ({ questionId: response.questionId, answerKey: response.answer }))
  );

  await run.update({
    responses,
    functionScores: scores,
    questionMode: questionMode.toString(),
    questionCount: scenarios.length,
    state: "COMPLETED"
  });
};

const processSmysnk2Run = async (run: Run) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const questionMode = parseSmysnk2Mode(run.questionMode ?? run.questionCount ?? DEFAULT_SMYSNK2_MODE);
  const scenarios = getSmysnk2Scenarios(questionMode);
  const scenarioMap = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  const validIds = new Set(scenarios.map((scenario) => scenario.id));

  const systemMessage =
    "You are roleplaying as the specified character. Pick exactly one option (A-H) per scenario and include a brief rationale. Do not use numeric scales. Output must match the JSON schema exactly.";
  const userMessage = `Character: ${run.subject}\nContext: ${run.context || "(none)"}\n\nAnswer all SMYSNK2 scenarios. Each answer must be one option key from A-H plus a one-sentence rationale. Return JSON only.\n\nQuestions:\n${buildSmysnk2QuestionBlock(
    questionMode
  )}\n\nJSON schema:\n{\n \"responses\": [\n  { \"id\": \"scenario id\", \"answer\": \"A|B|C|D|E|F|G|H\", \"rationale\": string }\n  // exactly ${scenarios.length} objects\n ]\n}\n`;

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

  const parsed = buildSmysnk2Schema(scenarios.length).safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error("OpenAI response failed validation.");
  }

  const seen = new Set<string>();
  const responses = parsed.data.responses.map((response) => {
    if (!validIds.has(response.id)) {
      throw new Error("OpenAI returned an unknown scenario id.");
    }
    if (seen.has(response.id)) {
      throw new Error("OpenAI returned duplicate scenario ids.");
    }
    seen.add(response.id);
    const answerKey = normalizeSmysnk2OptionKey(response.answer);
    if (!answerKey) {
      throw new Error("OpenAI returned an invalid SMYSNK2 option key.");
    }
    if (!scenarioMap.get(response.id)?.options.some((option) => option.key === answerKey)) {
      throw new Error("OpenAI returned an option key that is not available for this scenario.");
    }
    return {
      questionId: response.id,
      answer: answerKey,
      rationale: response.rationale
    };
  });

  const scores = calculateSmysnk2Scores(
    responses.map((response) => ({ questionId: response.questionId, answerKey: response.answer }))
  );

  await run.update({
    responses,
    functionScores: scores,
    questionMode: questionMode.toString(),
    questionCount: scenarios.length,
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
        state: "QUEUED",
        runMode: ["ai", "reddit"]
      },
      order: [["createdAt", "ASC"]]
    });
    if (!run) {
      return;
    }

    const [claimed] = await Run.update(
      { state: "PROCESSING" },
      {
        where: {
          id: run.id,
          state: "QUEUED"
        }
      }
    );
    if (!claimed) {
      return;
    }
    await run.reload();
    console.log(`[runQueue] Processing ${run.indicator} run ${run.slug} (state=${run.state}, errors=${run.errors ?? 0})`);

    try {
      if (run.indicator === "sakinorva") {
        if (run.runMode === "reddit") {
          await processRedditSakinorvaRun(run);
        } else {
          await processSakinorvaRun(run);
        }
      } else if (run.indicator === "smysnk2") {
        if (run.runMode === "reddit") {
          await processRedditSmysnk2Run(run);
        } else {
          await processSmysnk2Run(run);
        }
      } else if (run.runMode === "reddit") {
        await processRedditSmysnkRun(run);
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
