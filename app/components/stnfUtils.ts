type FunctionScores = Record<string, number> | null;

export const getStnfValues = (scores: FunctionScores) => {
  if (!scores) {
    return null;
  }
  const value = (key: string) => scores?.[key] ?? 0;
  return {
    sensing: { extroverted: value("Se"), introverted: value("Si") },
    thinking: { extroverted: value("Te"), introverted: value("Ti") },
    intuition: { extroverted: value("Ne"), introverted: value("Ni") },
    feeling: { extroverted: value("Fe"), introverted: value("Fi") }
  };
};

export const getScoreRange = (scores: FunctionScores) => {
  if (!scores) {
    return null;
  }
  const values = Object.values(scores).filter((value) => Number.isFinite(value));
  if (!values.length) {
    return null;
  }
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
};
