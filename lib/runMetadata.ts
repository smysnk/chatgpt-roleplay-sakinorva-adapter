import * as cheerio from "cheerio";

const parseScore = (value: string) => {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
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
    const spans = $(row).find("span");
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

    const functionMatch = label.match(/^(Te|Ti|Fe|Fi|Ne|Ni|Se|Si)$/i);
    if (functionMatch) {
      const score = parseScore(valueText);
      if (score !== null) {
        const normalizedKey = `${functionMatch[0][0].toUpperCase()}${functionMatch[0][1].toLowerCase()}`;
        metadata.functionScores[normalizedKey] = score;
      }
    }
  });

  return metadata;
};
