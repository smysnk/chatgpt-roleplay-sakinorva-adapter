import type { ReactNode } from "react";

type CognitiveFunctionKey =
  | "ni"
  | "ne"
  | "si"
  | "se"
  | "ti"
  | "te"
  | "fi"
  | "fe";
type ArchetypeKey =
  | "hero"
  | "good_parent"
  | "child"
  | "anima_animus"
  | "opposing_perspective"
  | "witch"
  | "trickster"
  | "demon";
type TemperamentKey = "assertive" | "turbulent" | "ieie" | "eiei";

export type GlossaryKey = CognitiveFunctionKey | ArchetypeKey | TemperamentKey;

export type GlossaryEntry = {
  key: GlossaryKey;
  term: string;
  description: string;
  aliases?: string[];
};

export type HelpTopicId =
  | "grant_card"
  | "axis_card"
  | "myers_card"
  | "mbti_axis_map"
  | "best_fit_card"
  | "heatmap";

export type HelpTopic = {
  id: HelpTopicId;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type GlossarySegment =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "term";
      value: string;
      entry: GlossaryEntry;
    };

export const GLOSSARY_ENTRIES: Record<GlossaryKey, GlossaryEntry> = {
  ni: {
    key: "ni",
    term: "Ni",
    description:
      "Introverted Intuition (Ni) tends to narrow many signals into one underlying trajectory. It often appears as foresight, pattern convergence, and a strong sense of where things are heading before all facts are visible."
  },
  ne: {
    key: "ne",
    term: "Ne",
    description:
      "Extraverted Intuition (Ne) explores multiple possibilities at once. It often appears as rapid idea generation, reframing, and linking one concept to many potential directions."
  },
  si: {
    key: "si",
    term: "Si",
    description:
      "Introverted Sensing (Si) references internal impressions of what has worked before. It often appears as consistency, careful comparison to precedent, and stabilizing through known baselines."
  },
  se: {
    key: "se",
    term: "Se",
    description:
      "Extraverted Sensing (Se) engages immediate reality directly. It often appears as rapid situational awareness, concrete action in the moment, and responsiveness to real-time changes."
  },
  ti: {
    key: "ti",
    term: "Ti",
    description:
      "Introverted Thinking (Ti) evaluates internal logical coherence. It often appears as precision, model-cleaning, and refining concepts until they are internally consistent."
  },
  te: {
    key: "te",
    term: "Te",
    description:
      "Extraverted Thinking (Te) organizes for external effectiveness. It often appears as prioritization, execution structure, and decisions driven by measurable outcomes."
  },
  fi: {
    key: "fi",
    term: "Fi",
    description:
      "Introverted Feeling (Fi) evaluates alignment with personal convictions and authenticity. It often appears as value-consistency, personal integrity checks, and internally anchored decisions."
  },
  fe: {
    key: "fe",
    term: "Fe",
    description:
      "Extraverted Feeling (Fe) tracks interpersonal atmosphere and shared norms. It often appears as social calibration, relationship maintenance, and adapting delivery to group impact."
  },
  hero: {
    key: "hero",
    term: "Hero",
    description:
      "Hero is the primary stance of confidence and agency. It is the default 'I can handle this' position, usually expressed through the dominant function."
  },
  good_parent: {
    key: "good_parent",
    term: "Good Parent",
    description:
      "Good Parent supports, guides, and stabilizes others. It often appears as coaching, structuring, and making situations workable through the auxiliary function."
  },
  child: {
    key: "child",
    term: "Child",
    description:
      "Child is playful, energizing, and relief-seeking. It often appears as curiosity, enthusiasm, and comfort-driven expression through the tertiary function."
  },
  anima_animus: {
    key: "anima_animus",
    term: "Anima/Animus",
    aliases: ["Anima", "Animus"],
    description:
      "Anima/Animus represents the aspirational and sensitive edge of the stack. It often appears as insecurity, idealization, or growth pressure around the inferior function."
  },
  opposing_perspective: {
    key: "opposing_perspective",
    term: "Opposing Perspective",
    aliases: ["Opposing"],
    description:
      "Opposing Perspective is defensive pushback when autonomy feels threatened. It often appears as resistance, counter-positioning, and stance-protection in the fifth slot."
  },
  witch: {
    key: "witch",
    term: "Witch",
    description:
      "Witch (Critical Parent) enforces standards under stress. It often appears as corrective critique, sharp boundary-setting, and pressure to restore order in the sixth slot."
  },
  trickster: {
    key: "trickster",
    term: "Trickster",
    description:
      "Trickster disrupts false either-or binds. It often appears as reframing, paradox maneuvers, and destabilizing rigid frames in the seventh slot."
  },
  demon: {
    key: "demon",
    term: "Demon",
    description:
      "Demon is crisis-mode last-resort energy. It often appears as rupture prevention, existential urgency, or scorched-earth correction in the eighth slot."
  },
  assertive: {
    key: "assertive",
    term: "Assertive",
    description:
      "In MBTI-adjacent systems, Assertive usually means lower volatility under pressure. Here it means your persona and shadow context scoring stayed relatively stable around one stack decision."
  },
  turbulent: {
    key: "turbulent",
    term: "Turbulent",
    description:
      "In MBTI-adjacent systems, Turbulent usually means higher reactivity to stress and context. Here it means your context-by-context stack fits varied more, so context-specific typing carries more weight."
  },
  ieie: {
    key: "ieie",
    term: "IEIE",
    description:
      "IEIE/EIEI comes from Grant-style stack notation: it describes whether dominant-to-auxiliary attitude flow begins introverted or extraverted and alternates by position. Here it is used as a stack-orientation diagnostic alongside MBTI type matching."
  },
  eiei: {
    key: "eiei",
    term: "EIEI",
    description:
      "IEIE/EIEI comes from Grant-style stack notation: it describes whether dominant-to-auxiliary attitude flow begins introverted or extraverted and alternates by position. Here it is used as a stack-orientation diagnostic alongside MBTI type matching."
  }
};

export const HELP_TOPICS: Record<HelpTopicId, HelpTopic> = {
  grant_card: {
    id: "grant_card",
    title: "Grant Card",
    paragraphs: [
      "The Grant view follows a function-stack interpretation where dominant and auxiliary functions drive the predicted type shape.",
      "This card uses absolute function scores to build a stack (dominant through inferior), then derives the MBTI letters from that stack orientation."
    ],
    bullets: [
      "Dominant and auxiliary determine stack direction.",
      "Function attitude alternation informs type structure.",
      "Scores are read as absolute magnitudes, not context-sliced."
    ]
  },
  axis_card: {
    id: "axis_card",
    title: "Axis Card",
    paragraphs: [
      "The Axis view compares totals across E/I, N/S, and T/F axes before resolving J/P from attitude-weighted judging/perceiving totals.",
      "This emphasizes directional axis balance rather than strict stack assembly."
    ],
    bullets: [
      "E/I from extroverted vs introverted function sums.",
      "N/S and T/F from paired axis totals.",
      "J/P resolved from attitude-aware judging/perceiving split."
    ]
  },
  myers_card: {
    id: "myers_card",
    title: "Myers Card",
    paragraphs: [
      "The Myers view uses dichotomy totals directly (E/I, S/N, T/F, J/P) from absolute function scores.",
      "It is a dichotomy-style readout and does not require a full Grant stack assumption."
    ],
    bullets: [
      "E/I, S/N, T/F from direct totals.",
      "J/P from aggregate judging vs perceiving totals.",
      "Designed as a concise dichotomy projection."
    ]
  },
  mbti_axis_map: {
    id: "mbti_axis_map",
    title: "MBTI Axis Map",
    paragraphs: [
      "The map places introversion/extraversion and sensing/intuition on one coordinate plane and overlays MBTI region boundaries.",
      "Boundaries are polygonal because each type region is computed by nearest-center partitioning from layer-specific type centers."
    ],
    bullets: [
      "Horizontal axis tracks sensing-intuition pull.",
      "Vertical axis tracks introversion-extraversion pull.",
      "The highlighted marker shows the current layer's predicted type center."
    ]
  },
  best_fit_card: {
    id: "best_fit_card",
    title: "Best Fit and Temperament",
    paragraphs: [
      "In MBTI-adjacent use, Assertive and Turbulent usually describe relative stability vs reactivity under stress.",
      "Here they describe whether stack fit remains stable across persona/shadow contexts (Assertive) or varies by context (Turbulent)."
    ],
    bullets: [
      "Assertive favors one integrated stack decision.",
      "Turbulent favors context-specific stack variation.",
      "The displayed percent reflects fit confidence for each mode."
    ]
  },
  heatmap: {
    id: "heatmap",
    title: "Context Function Heat Map",
    paragraphs: [
      "The heat map shows archetype-hit volume by context (X axis) and function or archetype-aligned function row (Y axis).",
      "Brighter cells indicate higher hit counts for that context/function intersection."
    ],
    bullets: [
      "X axis = contexts.",
      "Y axis = functions (or archetype-mapped function rows).",
      "Cell intensity scales with hit volume in that bucket."
    ]
  }
};

const normalizeTerm = (term: string) =>
  term
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const aliasLookup = (() => {
  const map = new Map<string, GlossaryEntry>();
  Object.values(GLOSSARY_ENTRIES).forEach((entry) => {
    map.set(normalizeTerm(entry.term), entry);
    (entry.aliases ?? []).forEach((alias) => {
      map.set(normalizeTerm(alias), entry);
    });
  });
  return map;
})();

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const glossaryRegex = (() => {
  const terms = [...aliasLookup.keys()].sort((left, right) => right.length - left.length);
  const patterns = terms.map((term) => {
    const escaped = term
      .split(/\s+/)
      .map((part) => escapeRegex(part))
      .join("\\s+");
    return `\\b${escaped}\\b`;
  });
  return new RegExp(patterns.join("|"), "gi");
})();

export const getGlossaryEntry = (term: string) => aliasLookup.get(normalizeTerm(term)) ?? null;

export const renderGlossaryText = (text: string): GlossarySegment[] => {
  if (!text) {
    return [{ type: "text", value: text }];
  }

  const segments: GlossarySegment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null = glossaryRegex.exec(text);
  while (match) {
    const start = match.index;
    const end = start + match[0].length;
    if (start > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, start) });
    }
    const entry = getGlossaryEntry(match[0]);
    if (entry) {
      segments.push({
        type: "term",
        value: match[0],
        entry
      });
    } else {
      segments.push({ type: "text", value: match[0] });
    }
    cursor = end;
    match = glossaryRegex.exec(text);
  }
  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }
  return segments;
};

export const renderGlossaryTextNodes = (
  text: string,
  renderTerm: (entry: GlossaryEntry, originalText: string, index: number) => ReactNode
) =>
  renderGlossaryText(text).map((segment, index) => {
    if (segment.type === "text") {
      return segment.value;
    }
    return renderTerm(segment.entry, segment.value, index);
  });
