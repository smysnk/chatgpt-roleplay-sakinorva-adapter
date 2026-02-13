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

const { SMYSNK3_SCENARIOS } = loadSmysnk3Module();

const sortByQuestionId = (left, right) => Number(left.id.slice(1)) - Number(right.id.slice(1));
const scenarios = [...SMYSNK3_SCENARIOS].sort(sortByQuestionId);

const jsonPath = path.join(root, "smysnk3-question-list.json");
const mdPath = path.join(root, "smysnk3-question-list.md");

fs.writeFileSync(jsonPath, `${JSON.stringify(scenarios, null, 2)}\n`, "utf8");

const markdownLines = ["# SMYSNK3 Question Bank", "", `Total scenarios: ${scenarios.length}`, ""];

for (const scenario of scenarios) {
  markdownLines.push(`## ${scenario.id} (${scenario.archetype})`);
  markdownLines.push(`- Context type: ${scenario.contextType}`);
  markdownLines.push(`- Situation context: ${scenario.situationContext}`);
  markdownLines.push(`- Domain: ${scenario.domain}`);
  markdownLines.push(`- Scenario: ${scenario.scenario}`);
  markdownLines.push("- Options:");
  for (const option of scenario.options) {
    markdownLines.push(
      `  - ${option.key}. ${option.text} [${option.score.function}-${option.score.orientation === "introverted" ? "i" : "e"}]`
    );
  }
  markdownLines.push("");
}

fs.writeFileSync(mdPath, `${markdownLines.join("\n")}\n`, "utf8");

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);
