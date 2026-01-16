import * as cheerio from "cheerio";

export type SakinorvaTypeSummary = {
  gft?: string;
  second?: string;
  third?: string;
  axis?: string;
  myers?: string;
};

export type SakinorvaFunctionScore = {
  function: string;
  score: number;
};

const normalizeLabel = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

const cleanTypeValue = (value: string) => value.replace(/\s+/g, "").trim();

const extractTypeSummary = ($: cheerio.CheerioAPI): SakinorvaTypeSummary => {
  const summary: SakinorvaTypeSummary = {};

  $(".row").each((_, row) => {
    const spans = $(row).find("span");
    if (spans.length < 2) {
      return;
    }
    const label = normalizeLabel($(spans[0]).text());
    const value = cleanTypeValue($(spans[1]).text());
    if (!value) {
      return;
    }

    if ((label.includes("grant") && label.includes("function")) || $(row).hasClass("grant")) {
      summary.gft = value;
      return;
    }
    if (label.includes("2nd") || label.includes("second")) {
      summary.second = value;
      return;
    }
    if (label.includes("3rd") || label.includes("third")) {
      summary.third = value;
      return;
    }
    if (label.includes("axis") || $(row).hasClass("axis")) {
      summary.axis = value;
      return;
    }
    if (label.includes("myers") || $(row).hasClass("myers")) {
      summary.myers = value;
    }
  });

  return summary;
};

const extractFunctionScores = ($: cheerio.CheerioAPI): SakinorvaFunctionScore[] => {
  const scores: SakinorvaFunctionScore[] = [];

  $(".zuhyou div").each((_, element) => {
    const text = normalizeLabel($(element).text());
    const match = text.match(/([a-z]{2})\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (!match) {
      return;
    }
    const functionLabel = match[1].slice(0, 2);
    const score = Number.parseFloat(match[2]);
    if (Number.isNaN(score)) {
      return;
    }
    scores.push({ function: `${functionLabel[0].toUpperCase()}${functionLabel[1]}`, score });
  });

  return scores;
};

export const decorateResultsHtml = (htmlFragment: string) => {
  const $ = cheerio.load(htmlFragment);
  $(".zuhyou div").each((_, element) => {
    const text = $(element).text();
    const match = text.match(/([A-Za-z]{2})/);
    if (!match) {
      return;
    }
    $(element).attr("data-function", match[1]);
  });
  return $.html();
};

export const parseSakinorvaResults = (htmlFragment: string) => {
  const $ = cheerio.load(htmlFragment);
  return {
    typeSummary: extractTypeSummary($),
    functionScores: extractFunctionScores($)
  };
};
