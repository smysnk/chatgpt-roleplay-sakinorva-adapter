import * as cheerio from "cheerio";

const FUNCTION_CODES = ["Ne", "Ni", "Se", "Si", "Te", "Ti", "Fe", "Fi"] as const;

const FUNCTION_SET = new Set(FUNCTION_CODES);

const normalizeType = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const match = trimmed.match(/[IE][NS][FT][JP]/i);
  if (match) {
    return match[0].toUpperCase();
  }
  return trimmed;
};

export const extractSummary = (htmlFragment: string) => {
  const $ = cheerio.load(htmlFragment);
  const summary = $.text().replace(/\s+/g, " ").trim();
  if (!summary) {
    return "Summary unavailable.";
  }
  return summary.length > 220 ? `${summary.slice(0, 217)}...` : summary;
};

export const extractTypeSummary = (htmlFragment: string) => {
  const $ = cheerio.load(htmlFragment);
  const getRowValue = (selector: string) => {
    const value = $(selector).find("span").last().text();
    return normalizeType(value);
  };

  const grantList = $(".row.grant_itirann span:last-child")
    .map((_index, element) => normalizeType($(element).text()))
    .get()
    .filter(Boolean);

  const grant = getRowValue(".row.grant");
  const axis = getRowValue(".row.axis");
  const myers = getRowValue(".row.myers");

  return {
    gft: grantList[0] || grant || null,
    second: grantList[1] || null,
    third: grantList[2] || null,
    axis: axis || null,
    myers: myers || null
  };
};

const getFunctionScores = ($: cheerio.CheerioAPI) => {
  const scores = new Map<string, number>();
  $(".row").each((_index, element) => {
    const spans = $(element).find("span");
    if (spans.length < 2) {
      return;
    }
    const label = $(spans[0]).text().trim();
    if (!FUNCTION_SET.has(label as typeof FUNCTION_CODES[number])) {
      return;
    }
    const rawScore = $(spans[1]).text().trim();
    const score = Number.parseFloat(rawScore);
    if (Number.isNaN(score)) {
      return;
    }
    scores.set(label, score);
  });
  return scores;
};

const scoreToBucket = (score: number, min: number, max: number) => {
  if (Number.isNaN(score)) {
    return 5;
  }
  const range = max - min || 1;
  const normalized = Math.max(0, Math.min(1, (score - min) / range));
  return Math.max(1, Math.min(10, Math.round(normalized * 9) + 1));
};

export const decorateResultsHtml = (htmlFragment: string) => {
  const $ = cheerio.load(htmlFragment);
  const scores = getFunctionScores($);
  const scoreValues = Array.from(scores.values());
  const minScore = scoreValues.length ? Math.min(...scoreValues) : 0;
  const maxScore = scoreValues.length ? Math.max(...scoreValues) : 0;
  const overallBucket = scoreToBucket(maxScore, minScore, maxScore || minScore + 1);

  $(".row").each((_index, element) => {
    const spans = $(element).find("span");
    if (spans.length < 2) {
      return;
    }
    const label = $(spans[0]).text().trim();
    if (!scores.has(label)) {
      return;
    }
    const score = scores.get(label) ?? 0;
    const bucket = scoreToBucket(score, minScore, maxScore || minScore + 1);
    $(element)
      .addClass(`function-score function-${label.toLowerCase()} score-${bucket}`);
    $(spans[0]).addClass("function-label");
    $(spans[1]).addClass("function-value");
  });

  const typeSelectors = [
    ".row.grant span:last-child",
    ".row.myers span:last-child",
    ".row.axis span:last-child",
    ".myers_letter_type span"
  ];
  typeSelectors.forEach((selector) => {
    $(selector).each((_index, element) => {
      $(element).addClass(`type-badge score-${overallBucket}`);
    });
  });

  const results = $(".kekka").first();
  return results.length ? $.html(results) : htmlFragment;
};
