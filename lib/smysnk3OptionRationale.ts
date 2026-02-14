import {
  SMYSNK3_ARCHETYPE_LABELS,
  type Smysnk3Archetype,
  type Smysnk3Scenario,
  type Smysnk3ScenarioOption
} from "@/lib/smysnk3Questions";

const FUNCTION_CODE_BY_SCORE_KEY: Record<string, "Ni" | "Ne" | "Si" | "Se" | "Ti" | "Te" | "Fi" | "Fe"> = {
  "N:introverted": "Ni",
  "N:extraverted": "Ne",
  "S:introverted": "Si",
  "S:extraverted": "Se",
  "T:introverted": "Ti",
  "T:extraverted": "Te",
  "F:introverted": "Fi",
  "F:extraverted": "Fe"
};

const FUNCTION_LENS: Record<
  "Ni" | "Ne" | "Si" | "Se" | "Ti" | "Te" | "Fi" | "Fe",
  string
> = {
  Ni: "pattern-forecasting and singular direction from inner synthesis",
  Ne: "option generation and reframing through external possibilities",
  Si: "stability via memory, precedent, and known reliability",
  Se: "direct engagement with immediate facts and real-time action",
  Ti: "internal precision, consistency, and structural logic checks",
  Te: "external organization, prioritization, and executable outcomes",
  Fi: "inner alignment with personal values and integrity boundaries",
  Fe: "social calibration, relational impact, and group regulation"
};

const ARCHETYPE_LENS: Record<Smysnk3Archetype, string> = {
  hero: "asserting ownership and carrying forward agency under ambiguity",
  good_parent: "stabilizing and guiding others through dependable support",
  child: "seeking energizing engagement, curiosity, and motivational momentum",
  anima_animus: "preserving trust, reciprocity, and authenticity in relationship dynamics",
  opposing_perspective: "protecting boundaries and resisting pressure from outside demands",
  witch: "correcting drift, enforcing standards, and confronting misalignment",
  trickster: "escaping false binds by reframing the frame and exposing hidden assumptions",
  demon: "responding under existential urgency to prevent collapse or rupture"
};

const getFunctionCode = (option: Smysnk3ScenarioOption) => {
  return FUNCTION_CODE_BY_SCORE_KEY[`${option.score.function}:${option.score.orientation}`] ?? "Ni";
};

export const getSmysnk3OptionRationalBullets = (
  question: Smysnk3Scenario,
  option: Smysnk3ScenarioOption
): string[] => {
  const functionCode = getFunctionCode(option);
  const archetypeLabel = SMYSNK3_ARCHETYPE_LABELS[question.archetype];

  return [
    `Targets: ${functionCode} + ${archetypeLabel}`,
    `Why this maps to ${functionCode}: It emphasizes ${FUNCTION_LENS[functionCode]}.`,
    `Why this maps to ${archetypeLabel}: It frames response as ${ARCHETYPE_LENS[question.archetype]}.`
  ];
};
