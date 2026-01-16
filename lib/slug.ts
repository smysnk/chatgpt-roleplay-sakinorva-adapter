export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const createRunSlug = (character: string, id: number) => {
  const base = slugify(character) || "run";
  return `${base}-${id}`;
};

export const extractRunId = (slug: string) => {
  const match = slug.match(/(\d+)$/);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
};
