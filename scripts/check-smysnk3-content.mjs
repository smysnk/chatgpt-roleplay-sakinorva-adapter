#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "lib", "smysnk3Questions.ts");

const loadSmysnk3Module = () => {
  const source = fs.readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: sourcePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    }
  }).outputText;

  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require: (specifier) => {
      if (specifier === "@/lib/smysnkQuestions") {
        return {};
      }
      throw new Error(`Unsupported import while loading SMYSNK3 module: ${specifier}`);
    },
    __filename: sourcePath,
    __dirname: path.dirname(sourcePath),
    console,
    process
  };

  vm.runInNewContext(transpiled, sandbox, { filename: sourcePath });
  return module.exports;
};

const lib = loadSmysnk3Module();
const {
  SMYSNK3_SCENARIOS,
  SMYSNK3_ARCHETYPE_ORDER,
  SMYSNK3_SITUATION_CONTEXT_ORDER,
  SMYSNK3_MODES,
  selectSmysnk3QuestionIds,
  hasBalancedSmysnk3QuestionIds
} = lib;

const errors = [];

const fail = (message) => {
  errors.push(message);
};

const normalizeText = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const expectedScoreByOption = {
  A: { function: "N", orientation: "introverted" },
  B: { function: "N", orientation: "extraverted" },
  C: { function: "S", orientation: "introverted" },
  D: { function: "S", orientation: "extraverted" },
  E: { function: "T", orientation: "introverted" },
  F: { function: "T", orientation: "extraverted" },
  G: { function: "F", orientation: "introverted" },
  H: { function: "F", orientation: "extraverted" }
};

const legacyCuePatterns = [
  "you are expected to take clear ownership",
  "others are relying on you for steady support",
  "part of you wants this to feel energizing, not just correct",
  "relational trust and authenticity are on the line",
  "you feel pushed and need to protect your position",
  "you need to correct what has drifted off course",
  "the situation feels like a double bind that needs reframing",
  "the moment feels make or break"
];

const emergencyMismatchPattern = /\b(launch|release|deploy|software|bug|code|repository|production)\b/i;
const leisureMismatchPattern = /\b(deadline|time-box|on the clock|milestone|stakeholder|delivery)\b/i;

const scenariosById = new Map();
const archetypeCounts = Object.fromEntries(SMYSNK3_ARCHETYPE_ORDER.map((archetype) => [archetype, 0]));

for (const scenario of SMYSNK3_SCENARIOS) {
  if (scenariosById.has(scenario.id)) {
    fail(`Duplicate scenario id found: ${scenario.id}`);
  }
  scenariosById.set(scenario.id, scenario);

  if (!(scenario.archetype in archetypeCounts)) {
    fail(`${scenario.id}: unknown archetype ${scenario.archetype}`);
  } else {
    archetypeCounts[scenario.archetype] += 1;
  }

  const scenarioLower = scenario.scenario.toLowerCase();
  for (const phrase of legacyCuePatterns) {
    if (scenarioLower.includes(phrase)) {
      fail(`${scenario.id}: scenario still contains legacy cue phrase '${phrase}'.`);
    }
  }

  if (scenario.situationContext === "emergency_medical_situation" && emergencyMismatchPattern.test(scenario.scenario)) {
    fail(`${scenario.id}: emergency context contains non-medical launch/software language.`);
  }

  if (
    (scenario.situationContext === "leisure_with_friends" || scenario.situationContext === "alone_time_relax") &&
    leisureMismatchPattern.test(scenario.scenario)
  ) {
    fail(`${scenario.id}: leisure/alone context contains explicit deadline/work-clock language.`);
  }

  const normalizedOptionTexts = new Set();
  const prefixSet = new Set();
  const domainLabel = scenario.domain.replace(/_/g, " ").toLowerCase();

  for (const option of scenario.options) {
    const byPattern = /\b(?:begin|start|open)\s+by\s+([a-z-]+)/i.exec(option.text);
    if (byPattern && !byPattern[1].toLowerCase().endsWith("ing")) {
      fail(`${scenario.id}-${option.key}: grammar anti-pattern '${byPattern[0]}'.`);
    }

    const optionLower = option.text.toLowerCase();
    if (optionLower.includes(`about ${domainLabel}`) || optionLower.includes(`around ${domainLabel}`)) {
      fail(`${scenario.id}-${option.key}: domain-tail artifact found in option text.`);
    }

    const normalized = normalizeText(option.text);
    if (normalizedOptionTexts.has(normalized)) {
      fail(`${scenario.id}: duplicate normalized option text found.`);
    }
    normalizedOptionTexts.add(normalized);

    const prefix = normalized.split(" ").slice(0, 3).join(" ");
    if (prefixSet.has(prefix)) {
      fail(`${scenario.id}: duplicate option opening prefix '${prefix}'.`);
    }
    prefixSet.add(prefix);

    const expectedScore = expectedScoreByOption[option.key];
    if (!expectedScore) {
      fail(`${scenario.id}: unexpected option key ${option.key}.`);
      continue;
    }
    if (
      option.score.function !== expectedScore.function ||
      option.score.orientation !== expectedScore.orientation
    ) {
      fail(`${scenario.id}-${option.key}: score mapping mismatch.`);
    }
  }

  if (scenario.options.length !== 8) {
    fail(`${scenario.id}: expected 8 options, found ${scenario.options.length}.`);
  }
}

if (SMYSNK3_SCENARIOS.length !== 96) {
  fail(`Expected 96 scenarios, found ${SMYSNK3_SCENARIOS.length}.`);
}

for (const archetype of SMYSNK3_ARCHETYPE_ORDER) {
  if (archetypeCounts[archetype] !== 12) {
    fail(`Archetype ${archetype} expected 12 scenarios, found ${archetypeCounts[archetype]}.`);
  }
}

for (const mode of SMYSNK3_MODES) {
  const selected = selectSmysnk3QuestionIds({ mode, seed: `validation-${mode}` });
  if (selected.length !== mode) {
    fail(`Mode ${mode}: selection returned ${selected.length} questions.`);
  }
  if (!hasBalancedSmysnk3QuestionIds(selected, mode)) {
    fail(`Mode ${mode}: selection is not archetype-balanced.`);
  }

  const contextCounts = Object.fromEntries(SMYSNK3_SITUATION_CONTEXT_ORDER.map((context) => [context, 0]));
  const perArchetypeContexts = Object.fromEntries(SMYSNK3_ARCHETYPE_ORDER.map((archetype) => [archetype, new Set()]));
  for (const id of selected) {
    const scenario = scenariosById.get(id);
    if (!scenario) {
      fail(`Mode ${mode}: missing scenario for id ${id}.`);
      continue;
    }
    contextCounts[scenario.situationContext] += 1;
    perArchetypeContexts[scenario.archetype].add(scenario.situationContext);
  }

  const countValues = Object.values(contextCounts);
  const min = Math.min(...countValues);
  const max = Math.max(...countValues);
  const spread = max - min;
  if (mode === 16 && spread > 1) {
    fail(`Mode ${mode}: context distribution imbalance too high (${spread}).`);
  }
  if (mode !== 16 && spread > 5) {
    fail(`Mode ${mode}: context distribution imbalance too high (${spread}).`);
  }

  const expectedPerArchetype = mode / SMYSNK3_ARCHETYPE_ORDER.length;
  for (const archetype of SMYSNK3_ARCHETYPE_ORDER) {
    const availableContexts = new Set(
      SMYSNK3_SCENARIOS.filter((scenario) => scenario.archetype === archetype).map((scenario) => scenario.situationContext)
    ).size;
    const expectedUniqueContexts = Math.min(expectedPerArchetype, availableContexts);
    if (perArchetypeContexts[archetype].size < expectedUniqueContexts) {
      fail(
        `Mode ${mode}: archetype ${archetype} lacks context diversity (expected >= ${expectedUniqueContexts}, got ${perArchetypeContexts[archetype].size}).`
      );
    }
  }
}

if (errors.length) {
  console.error(`SMYSNK3 content check failed with ${errors.length} issue(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`SMYSNK3 content check passed (${SMYSNK3_SCENARIOS.length} scenarios).`);
