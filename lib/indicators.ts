export type Indicator = "sakinorva" | "smysnk" | "smysnk2";

export const INDICATOR_LABELS: Record<Indicator, string> = {
  sakinorva: "Sakinorva",
  smysnk: "SMYSNK",
  smysnk2: "SMYSNK2"
};

export const INDICATOR_API_BASE: Record<Indicator, string> = {
  sakinorva: "/api/run",
  smysnk: "/api/smysnk",
  smysnk2: "/api/smysnk2"
};

export const INDICATOR_INDEX_PATH: Record<Indicator, string> = {
  sakinorva: "/sakinorva-adapter",
  smysnk: "/smysnk",
  smysnk2: "/smysnk2"
};

export const INDICATOR_RUN_BASE: Record<Indicator, string> = {
  sakinorva: "/sakinorva-adapter/run/",
  smysnk: "/smysnk/run/",
  smysnk2: "/smysnk2/run/"
};

export const INDICATOR_QUESTIONS_PATH: Record<Indicator, string> = {
  sakinorva: "/sakinorva-adapter/questions",
  smysnk: "/smysnk/questions",
  smysnk2: "/smysnk2/questions"
};
