const FUNCTION_COLORS: Record<string, { r: number; g: number; b: number }> = {
  Fe: { r: 231, g: 76, b: 60 },
  Fi: { r: 155, g: 89, b: 182 },
  Te: { r: 52, g: 152, b: 219 },
  Ti: { r: 26, g: 188, b: 156 },
  Ne: { r: 46, g: 204, b: 113 },
  Ni: { r: 39, g: 174, b: 96 },
  Se: { r: 243, g: 156, b: 18 },
  Si: { r: 241, g: 196, b: 15 }
};

const FUNCTION_REGEX = /\b(Fe|Fi|Te|Ti|Ne|Ni|Se|Si)\b/;

const sanitizeHtml = (doc: Document) => {
  const allowedTags = new Set(["DIV", "SPAN", "STYLE"]);
  const allowedAttrs = new Set(["class", "id"]);

  const walk = (node: Element) => {
    Array.from(node.children).forEach((child) => {
      if (!allowedTags.has(child.tagName)) {
        child.remove();
        return;
      }
      Array.from(child.attributes).forEach((attr) => {
        if (!allowedAttrs.has(attr.name)) {
          child.removeAttribute(attr.name);
        }
        if (attr.name.startsWith("on")) {
          child.removeAttribute(attr.name);
        }
      });
      walk(child);
    });
  };

  if (doc.body) {
    walk(doc.body);
  }
};

const parseScore = (text: string) => {
  const match = text.match(/(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  const value = Number.parseFloat(match[1]);
  return Number.isNaN(value) ? null : value;
};

const applyFunctionStyles = (doc: Document) => {
  const functionCells = Array.from(doc.querySelectorAll(".zuhyou div"));
  const scoredCells = functionCells
    .map((cell) => {
      const text = cell.textContent?.trim() ?? "";
      const functionMatch = text.match(FUNCTION_REGEX);
      if (!functionMatch) {
        return null;
      }
      const score = parseScore(text);
      if (score === null) {
        return null;
      }
      return { cell, functionName: functionMatch[1], score };
    })
    .filter((item): item is { cell: HTMLDivElement; functionName: string; score: number } => Boolean(item));

  const scores = scoredCells.map((item) => item.score);
  const minScore = scores.length ? Math.min(...scores) : 0;
  const maxScore = scores.length ? Math.max(...scores) : 1;
  const range = maxScore - minScore || 1;

  scoredCells.forEach(({ cell, functionName, score }) => {
    const color = FUNCTION_COLORS[functionName];
    if (!color) {
      return;
    }
    const normalized = (score - minScore) / range;
    const alpha = 0.25 + normalized * 0.55;
    const textColor = alpha > 0.5 ? "#0b0d12" : "#f5f7fb";
    cell.dataset.function = functionName;
    cell.dataset.score = score.toString();
    cell.classList.add("function-score");
    cell.style.backgroundColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    cell.style.borderColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`;
    cell.style.color = textColor;
  });

  const labelCandidates = Array.from(doc.querySelectorAll(".kekka span")).filter((element) => {
    if (element.classList.contains("function-score")) {
      return false;
    }
    if (element.children.length > 0) {
      return false;
    }
    const text = element.textContent?.trim() ?? "";
    if (!text || text.length > 4) {
      return false;
    }
    return FUNCTION_REGEX.test(text);
  });

  labelCandidates.forEach((element) => {
    const text = element.textContent?.trim() ?? "";
    const functionMatch = text.match(FUNCTION_REGEX);
    if (!functionMatch) {
      return;
    }
    const color = FUNCTION_COLORS[functionMatch[1]];
    if (!color) {
      return;
    }
    element.dataset.function = functionMatch[1];
    element.classList.add("function-label");
    element.style.backgroundColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.35)`;
    element.style.borderColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.55)`;
  });
};

export const prepareSakinorvaResults = (input: string) => {
  if (typeof window === "undefined") {
    return "";
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");
  sanitizeHtml(doc);
  applyFunctionStyles(doc);
  return doc.body?.innerHTML ?? "";
};
