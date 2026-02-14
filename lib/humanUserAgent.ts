const BOT_OR_AUTOMATION_PATTERN =
  /(bot|crawler|spider|slurp|preview|headless|curl|wget|postman|insomnia|python|node-fetch|httpclient|go-http-client)/i;

const BROWSER_ENGINE_PATTERN =
  /(mozilla\/5\.0|chrome\/|safari\/|firefox\/|edg\/|applewebkit\/|gecko\/)/i;

export const isLikelyHumanUserAgent = (userAgent: string | null | undefined) => {
  const normalized = (userAgent ?? "").trim();
  if (normalized.length < 18) {
    return false;
  }
  if (BOT_OR_AUTOMATION_PATTERN.test(normalized)) {
    return false;
  }
  return BROWSER_ENGINE_PATTERN.test(normalized);
};
