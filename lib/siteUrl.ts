const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
};

export const getSiteUrl = () => {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_BASE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    "http://localhost:3000"
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const normalized = normalizeUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return "http://localhost:3000";
};
