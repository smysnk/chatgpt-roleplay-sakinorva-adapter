import * as cheerio from "cheerio";

const parseScore = (value: string) => {
  const normalized = value.replace(/,/g, "");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

export const extractResultMetadata = (htmlFragment: string) => {
  const $ = cheerio.load(htmlFragment);
  const metadata: {
    grantType: string | null;
    secondType: string | null;
    thirdType: string | null;
    axisType: string | null;
    myersType: string | null;
    functionScores: Record<string, number>;
  } = {
    grantType: null,
    secondType: null,
    thirdType: null,
    axisType: null,
    myersType: null,
    functionScores: {}
  };

  $(".row").each((_, row) => {
    const rowElement = $(row);
    const spans = rowElement.find("span");
    if (spans.length < 2) {
      return;
    }
    const label = $(spans[0]).text().trim();
    const valueText = $(spans[spans.length - 1]).text().trim();
    const labelLower = label.toLowerCase();

    if (!metadata.grantType && labelLower.includes("grant")) {
      metadata.grantType = valueText || null;
    } else if (!metadata.secondType && /(2nd|second)/i.test(labelLower)) {
      metadata.secondType = valueText || null;
    } else if (!metadata.thirdType && /(3rd|third)/i.test(labelLower)) {
      metadata.thirdType = valueText || null;
    } else if (!metadata.axisType && labelLower.includes("axis")) {
      metadata.axisType = valueText || null;
    } else if (!metadata.myersType && labelLower.includes("myers")) {
      metadata.myersType = valueText || null;
    }

    const functionMatch = label.match(/\b(Te|Ti|Fe|Fi|Ne|Ni|Se|Si)\b/i);
    const classMatch = rowElement
      .attr("class")
      ?.match(/\b(ne|ni|se|si|te|ti|fe|fi)\b/i);
    const functionKey = functionMatch?.[1] ?? classMatch?.[1];
    if (functionKey) {
      const score = parseScore(valueText);
      if (score !== null) {
        const normalizedKey = `${functionKey[0].toUpperCase()}${functionKey[1].toLowerCase()}`;
        metadata.functionScores[normalizedKey] = score;
      }
    }
  });

  return metadata;
};
