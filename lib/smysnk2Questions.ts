import type { SmysnkFunction, SmysnkOrientation } from "@/lib/smysnkQuestions";

export type Smysnk2ContextType = "default" | "moderate" | "stress";
export type Smysnk2SituationContext =
  | "leisure_with_friends"
  | "alone_time_relax"
  | "work_time_constraints"
  | "overwhelming_work_tasks"
  | "unexpected_interpersonal_conflict"
  | "emergency_medical_situation"
  | "creative_expression_hobby";
export type Smysnk2ContextPolarity = "persona" | "shadow";
export type Smysnk2OptionKey = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
export type Smysnk2Mode = 16 | 32 | 64;
export type Smysnk2Archetype =
  | "hero"
  | "good_parent"
  | "child"
  | "anima_animus"
  | "opposing_perspective"
  | "witch"
  | "trickster"
  | "demon";

export type Smysnk2ScenarioOption = {
  key: Smysnk2OptionKey;
  text: string;
  score: {
    function: SmysnkFunction;
    orientation: SmysnkOrientation;
  };
};

export type Smysnk2Scenario = {
  id: string;
  contextType: Smysnk2ContextType;
  situationContext: Smysnk2SituationContext;
  contextPolarity: Smysnk2ContextPolarity;
  archetype: Smysnk2Archetype;
  domain: string;
  scenario: string;
  options: Smysnk2ScenarioOption[];
};

type Smysnk2ScenarioId = string;

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

const SCORE_BY_OPTION: Record<Smysnk2OptionKey, { function: SmysnkFunction; orientation: SmysnkOrientation }> = {
  A: { function: "N", orientation: "introverted" },
  B: { function: "N", orientation: "extraverted" },
  C: { function: "S", orientation: "introverted" },
  D: { function: "S", orientation: "extraverted" },
  E: { function: "T", orientation: "introverted" },
  F: { function: "T", orientation: "extraverted" },
  G: { function: "F", orientation: "introverted" },
  H: { function: "F", orientation: "extraverted" }
};

type OptionTextMap = Record<Smysnk2OptionKey, string>;

type ScenarioSeed = {
  id: string;
  contextType: Smysnk2ContextType;
  situationContext?: Smysnk2SituationContext;
  archetype?: Smysnk2Archetype;
  domain: string;
  scenario: string;
  optionSet?: keyof typeof OPTION_SETS;
  options?: OptionTextMap;
};

const buildOptions = (texts: OptionTextMap): Smysnk2ScenarioOption[] =>
  OPTION_KEYS.map((key) => ({
    key,
    text: texts[key],
    score: SCORE_BY_OPTION[key]
  }));

type OptionTextVariant = (baseSentence: string, baseClause: string, domainLabel: string) => string;
type ScenarioTextVariant = (scenarioClause: string) => string;

const GENERIC_OPTION_VARIANTS: OptionTextVariant[] = [
  (_baseSentence, baseClause) => `You begin by ${baseClause}.`,
  (baseSentence) => `First move: ${baseSentence}`,
  (_baseSentence, baseClause) => `Your initial response is to ${baseClause}.`,
  (_baseSentence, baseClause) => `At the outset, you ${baseClause}.`,
  (_baseSentence, baseClause) => `You start by trying to ${baseClause}.`,
  (_baseSentence, baseClause) => `Your first priority is to ${baseClause}.`,
  (_baseSentence, baseClause) => `The way you open is to ${baseClause}.`,
  (baseSentence) => `You lead with this approach: ${baseSentence}`
];

const CONTEXTUAL_OPTION_VARIANTS: Record<Smysnk2SituationContext, OptionTextVariant[]> = {
  leisure_with_friends: [
    (_baseSentence, baseClause, domainLabel) => `While out with friends, you ${baseClause} around ${domainLabel}.`,
    (_baseSentence, baseClause) => `In the group moment, your first move is to ${baseClause}.`,
    (_baseSentence, baseClause) => `When everyone is deciding together, you start by ${baseClause}.`,
    (baseSentence) => `Around friends, your opening approach is: ${baseSentence}`,
    (_baseSentence, baseClause) => `Socially, you lead by ${baseClause}.`,
    (_baseSentence, baseClause) => `You respond to the group by ${baseClause}.`,
    (_baseSentence, baseClause) => `Your first shared-step is to ${baseClause}.`,
    (_baseSentence, baseClause) => `In friend-time decisions, you usually ${baseClause}.`
  ],
  alone_time_relax: [
    (_baseSentence, baseClause, domainLabel) => `During solo downtime, you ${baseClause} about ${domainLabel}.`,
    (_baseSentence, baseClause) => `When relaxing alone, your first step is to ${baseClause}.`,
    (_baseSentence, baseClause) => `In private reset time, you start by ${baseClause}.`,
    (baseSentence) => `Alone, your opening choice is: ${baseSentence}`,
    (_baseSentence, baseClause) => `Without outside pressure, you begin by ${baseClause}.`,
    (_baseSentence, baseClause) => `Your self-guided move is to ${baseClause}.`,
    (_baseSentence, baseClause) => `In quiet time, you naturally ${baseClause}.`,
    (_baseSentence, baseClause) => `For personal recharge, you first ${baseClause}.`
  ],
  work_time_constraints: [
    (_baseSentence, baseClause, domainLabel) => `With deadline pressure at work, you ${baseClause} on ${domainLabel}.`,
    (_baseSentence, baseClause) => `Under time constraints, your first action is to ${baseClause}.`,
    (_baseSentence, baseClause) => `When the clock matters, you open by ${baseClause}.`,
    (baseSentence) => `In timed work execution, your first move is: ${baseSentence}`,
    (_baseSentence, baseClause) => `To stay on schedule, you start by ${baseClause}.`,
    (_baseSentence, baseClause) => `In delivery mode, you lead by ${baseClause}.`,
    (_baseSentence, baseClause) => `You handle the time-box by ${baseClause}.`,
    (_baseSentence, baseClause) => `In deadline work, you usually ${baseClause}.`
  ],
  overwhelming_work_tasks: [
    (_baseSentence, baseClause, domainLabel) => `When workload spikes, you ${baseClause} around ${domainLabel}.`,
    (_baseSentence, baseClause) => `In task overload, your first reaction is to ${baseClause}.`,
    (_baseSentence, baseClause) => `When everything feels urgent, you start by ${baseClause}.`,
    (baseSentence) => `Under heavy workload strain, your move is: ${baseSentence}`,
    (_baseSentence, baseClause) => `To regain control, you begin by ${baseClause}.`,
    (_baseSentence, baseClause) => `When capacity is maxed, you lead by ${baseClause}.`,
    (_baseSentence, baseClause) => `Your stabilizing move is to ${baseClause}.`,
    (_baseSentence, baseClause) => `In overload mode, you usually ${baseClause}.`
  ],
  unexpected_interpersonal_conflict: [
    (_baseSentence, baseClause, domainLabel) => `When conflict flares unexpectedly, you ${baseClause} around ${domainLabel}.`,
    (_baseSentence, baseClause) => `In social friction, your first move is to ${baseClause}.`,
    (_baseSentence, baseClause) => `When tension rises suddenly, you start by ${baseClause}.`,
    (baseSentence) => `In interpersonal conflict, your opening approach is: ${baseSentence}`,
    (_baseSentence, baseClause) => `To handle the clash, you begin by ${baseClause}.`,
    (_baseSentence, baseClause) => `In disagreement pressure, you lead by ${baseClause}.`,
    (_baseSentence, baseClause) => `When relational stakes rise, you ${baseClause}.`,
    (_baseSentence, baseClause) => `In a sharp social moment, you usually ${baseClause}.`
  ],
  emergency_medical_situation: [
    (_baseSentence, baseClause, domainLabel) => `In a medical emergency, you ${baseClause} around ${domainLabel}.`,
    (_baseSentence, baseClause) => `When immediate care is needed, your first move is to ${baseClause}.`,
    (_baseSentence, baseClause) => `With health risk in front of you, you start by ${baseClause}.`,
    (baseSentence) => `In urgent medical conditions, your opening response is: ${baseSentence}`,
    (_baseSentence, baseClause) => `To stabilize the situation fast, you begin by ${baseClause}.`,
    (_baseSentence, baseClause) => `Under emergency pressure, you lead by ${baseClause}.`,
    (_baseSentence, baseClause) => `When seconds matter, you ${baseClause}.`,
    (_baseSentence, baseClause) => `In crisis care mode, you usually ${baseClause}.`
  ],
  creative_expression_hobby: [
    (_baseSentence, baseClause, domainLabel) => `While creating for fun, you ${baseClause} around ${domainLabel}.`,
    (_baseSentence, baseClause) => `In hobby expression, your first move is to ${baseClause}.`,
    (_baseSentence, baseClause) => `When making something personal, you start by ${baseClause}.`,
    (baseSentence) => `In a creative flow state, your opening approach is: ${baseSentence}`,
    (_baseSentence, baseClause) => `To express your style, you begin by ${baseClause}.`,
    (_baseSentence, baseClause) => `In playful creation mode, you lead by ${baseClause}.`,
    (_baseSentence, baseClause) => `For creative momentum, you ${baseClause}.`,
    (_baseSentence, baseClause) => `In a hobby session, you usually ${baseClause}.`
  ]
};

const CONTEXTUAL_SCENARIO_VARIANTS: Record<Smysnk2SituationContext, ScenarioTextVariant[]> = {
  leisure_with_friends: [
    (scenarioClause) => `While hanging out with friends, ${scenarioClause}.`,
    (scenarioClause) => `During social downtime with friends, ${scenarioClause}.`,
    (scenarioClause) => `In a casual group setting, ${scenarioClause}.`
  ],
  alone_time_relax: [
    (scenarioClause) => `During personal recharge time, ${scenarioClause}.`,
    (scenarioClause) => `When you have quiet time to yourself, ${scenarioClause}.`,
    (scenarioClause) => `In a solo downtime block, ${scenarioClause}.`
  ],
  work_time_constraints: [
    (scenarioClause) => `During a time-boxed work task, ${scenarioClause}.`,
    (scenarioClause) => `With a tight work deadline, ${scenarioClause}.`,
    (scenarioClause) => `When work is on the clock, ${scenarioClause}.`
  ],
  overwhelming_work_tasks: [
    (scenarioClause) => `While overloaded with work demands, ${scenarioClause}.`,
    (scenarioClause) => `When too many work tasks pile up at once, ${scenarioClause}.`,
    (scenarioClause) => `During a heavy workload spike, ${scenarioClause}.`
  ],
  unexpected_interpersonal_conflict: [
    (scenarioClause) => `During an unexpected interpersonal clash, ${scenarioClause}.`,
    (scenarioClause) => `When tension rises suddenly between people, ${scenarioClause}.`,
    (scenarioClause) => `In a social conflict that catches you off guard, ${scenarioClause}.`
  ],
  emergency_medical_situation: [
    (scenarioClause) => `In an urgent medical situation, ${scenarioClause}.`,
    (scenarioClause) => `During an emergency care moment, ${scenarioClause}.`,
    (scenarioClause) => `When immediate health response is needed, ${scenarioClause}.`
  ],
  creative_expression_hobby: [
    (scenarioClause) => `While working on a creative hobby, ${scenarioClause}.`,
    (scenarioClause) => `During personal creative expression, ${scenarioClause}.`,
    (scenarioClause) => `In a hobby session where you are creating, ${scenarioClause}.`
  ]
};

const CONTEXT_SCENARIO_HINTS: Record<Smysnk2SituationContext, RegExp[]> = {
  leisure_with_friends: [/friend/i, /hangout/i, /group/i, /social/i, /weekend/i, /casual/i],
  alone_time_relax: [/alone/i, /quiet/i, /solo/i, /relax/i, /free evening/i, /downtime/i, /recharge/i],
  work_time_constraints: [
    /deadline/i,
    /timeline/i,
    /milestone/i,
    /handoff/i,
    /stakeholder/i,
    /workflow/i,
    /process/i,
    /project/i,
    /\bteam\b/i,
    /\bwork\b/i,
    /implementation/i,
    /status update/i,
    /inbox/i,
    /bug/i,
    /release/i,
    /outage/i
  ],
  overwhelming_work_tasks: [/overload/i, /overwhelmed/i, /capacity/i, /pile/i, /workload/i, /escalating/i, /urgent/i],
  unexpected_interpersonal_conflict: [/conflict/i, /disagree/i, /friction/i, /tension/i, /relationship/i, /confronted/i, /pushback/i],
  emergency_medical_situation: [/medical/i, /emergency/i, /triage/i, /care/i, /health/i],
  creative_expression_hobby: [/creative/i, /hobby/i, /craft/i, /expression/i, /outline/i, /writing/i, /brainstorm/i]
};

const withTerminalPeriod = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const sentenceToClause = (sentence: string) => {
  const trimmed = sentence.trim().replace(/[.!?]+$/, "");
  if (!trimmed) {
    return trimmed;
  }
  return `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
};

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const makeSeededRng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const buildTemplateOrder = (seedText: string, length: number) => {
  const order = Array.from({ length }, (_, index) => index);
  const random = makeSeededRng(hashString(seedText));
  for (let right = order.length - 1; right > 0; right -= 1) {
    const left = Math.floor(random() * (right + 1));
    [order[right], order[left]] = [order[left], order[right]];
  }
  return order;
};

const findCuedScenarioContext = (scenario: string): Smysnk2SituationContext | null =>
  SMYSNK2_SITUATION_CONTEXT_ORDER.find((context) =>
    CONTEXT_SCENARIO_HINTS[context].some((hint) => hint.test(scenario))
  ) ?? null;

const shouldPrefixScenarioWithContext = (scenario: string, context: Smysnk2SituationContext) => {
  const cuedContext = findCuedScenarioContext(scenario);
  if (cuedContext && cuedContext !== context) {
    return false;
  }
  return !CONTEXT_SCENARIO_HINTS[context].some((hint) => hint.test(scenario));
};

const shouldUseContextualOptionWording = (scenario: string, context: Smysnk2SituationContext) => {
  const cuedContext = findCuedScenarioContext(scenario);
  return !cuedContext || cuedContext === context;
};

const buildVariantScenarioText = (seed: ScenarioSeed, context: Smysnk2SituationContext) => {
  const normalized = withTerminalPeriod(seed.scenario);
  if (!shouldPrefixScenarioWithContext(normalized, context)) {
    return normalized;
  }

  const variants = CONTEXTUAL_SCENARIO_VARIANTS[context];
  const variantOrder = buildTemplateOrder(`${seed.id}:${seed.domain}:scenario`, variants.length);
  const variant = variants[variantOrder[0] ?? 0];
  return variant(sentenceToClause(normalized));
};

const buildVariantOptionTexts = (
  seed: ScenarioSeed,
  baseOptions: OptionTextMap,
  context: Smysnk2SituationContext,
  useContextualWording: boolean
): OptionTextMap => {
  const variants = useContextualWording ? CONTEXTUAL_OPTION_VARIANTS[context] : GENERIC_OPTION_VARIANTS;
  const templateOrder = buildTemplateOrder(`${seed.id}:${seed.scenario}:${seed.domain}:options`, variants.length);

  return OPTION_KEYS.reduce((acc, key, optionIndex) => {
    const baseSentence = withTerminalPeriod(baseOptions[key]);
    const baseClause = sentenceToClause(baseSentence);
    const variant = variants[templateOrder[optionIndex] ?? optionIndex] ?? variants[optionIndex % variants.length];
    acc[key] = variant(baseSentence, baseClause, seed.domain.replace(/_/g, " "));
    return acc;
  }, {} as OptionTextMap);
};

const OPTION_SETS = {
  defaultIdea: {
    A: "Pause and infer the underlying trajectory before deciding.",
    B: "Generate several interpretations and keep alternatives live.",
    C: "Anchor to familiar references and prior examples.",
    D: "Probe the situation directly to see what is actually there.",
    E: "Test internal logic until the model is coherent.",
    F: "Select the most workable path and define next actions.",
    G: "Choose the option that feels personally right.",
    H: "Choose the option that keeps interaction flow smooth."
  },
  defaultExecution: {
    A: "Frame a longer-term direction and align choices to it.",
    B: "Spin out multiple possible routes before narrowing.",
    C: "Start from known methods and stable routines.",
    D: "Take concrete action and adapt in real time.",
    E: "Clarify definitions and resolve logical gaps first.",
    F: "Prioritize efficiency and execution throughput.",
    G: "Protect personal alignment even if slower.",
    H: "Calibrate to group expectations and momentum."
  },
  moderateDecision: {
    A: "Step back to infer where this pattern is likely heading.",
    B: "Hold open multiple paths while gathering signal.",
    C: "Use precedent as a stabilizing baseline.",
    D: "Handle the most immediately concrete constraint.",
    E: "Break claims apart and check consistency line by line.",
    F: "Set a decision threshold and move to action.",
    G: "Keep to what feels non-negotiable internally.",
    H: "Reduce relational friction while deciding."
  },
  moderateSocial: {
    A: "Look for the deeper dynamic beneath what is being said.",
    B: "Explore different framings so the conflict can shift.",
    C: "Reference prior agreements and established norms.",
    D: "Respond to current tone and concrete cues in the moment.",
    E: "Separate facts from assumptions and tighten reasoning.",
    F: "Drive toward an actionable resolution quickly.",
    G: "State your position from personal conviction.",
    H: "Continuously tune delivery for social impact."
  },
  stressOverload: {
    A: "Compress noise into one guiding direction.",
    B: "Rapidly scan alternate exits and pivots.",
    C: "Retreat to known routines to regain footing.",
    D: "Act on the most tangible lever immediately.",
    E: "Strip the problem to core logic and contradictions.",
    F: "Impose structure, priorities, and execution order.",
    G: "Protect inner integrity before external demands.",
    H: "Track emotional pressure and adapt to it."
  },
  stressFriction: {
    A: "Interpret the moment as a signal about what matters most right now.",
    B: "Mentally branch into multiple explanations and next moves.",
    C: "Recall how similar high-pressure moments unfolded before.",
    D: "Ground attention in immediate sensory facts.",
    E: "Test whether incoming claims are logically consistent.",
    F: "Move straight to stabilizing actions and outcome recovery.",
    G: "Notice your internal line on what feels right and hold to it.",
    H: "Monitor emotional tone around you and adjust your approach."
  }
} as const;

export const SMYSNK2_ARCHETYPE_ORDER: Smysnk2Archetype[] = [
  "hero",
  "good_parent",
  "child",
  "anima_animus",
  "opposing_perspective",
  "witch",
  "trickster",
  "demon"
];

export const SMYSNK2_ARCHETYPE_LABELS: Record<Smysnk2Archetype, string> = {
  hero: "Hero",
  good_parent: "Good Parent",
  child: "Child",
  anima_animus: "Anima/Animus",
  opposing_perspective: "Opposing Perspective",
  witch: "Witch",
  trickster: "Trickster",
  demon: "Demon"
};

export const SMYSNK2_SITUATION_CONTEXT_ORDER: Smysnk2SituationContext[] = [
  "leisure_with_friends",
  "alone_time_relax",
  "work_time_constraints",
  "overwhelming_work_tasks",
  "unexpected_interpersonal_conflict",
  "emergency_medical_situation",
  "creative_expression_hobby"
];

export const SMYSNK2_SITUATION_CONTEXT_LABELS: Record<Smysnk2SituationContext, string> = {
  leisure_with_friends: "Leisure time hanging out with friends",
  alone_time_relax: "Alone time to relax",
  work_time_constraints: "Work tasks with time constraints",
  overwhelming_work_tasks: "Overwhelming work tasks",
  unexpected_interpersonal_conflict: "Unexpected interpersonal conflict",
  emergency_medical_situation: "Emergency medical situation",
  creative_expression_hobby: "Creative expression via a hobby"
};

export const SMYSNK2_CONTEXT_POLARITY_BY_CONTEXT: Record<Smysnk2SituationContext, Smysnk2ContextPolarity> = {
  leisure_with_friends: "persona",
  alone_time_relax: "persona",
  work_time_constraints: "persona",
  creative_expression_hobby: "persona",
  overwhelming_work_tasks: "shadow",
  unexpected_interpersonal_conflict: "shadow",
  emergency_medical_situation: "shadow"
};

const resolveSituationContext = (seed: ScenarioSeed, index: number): Smysnk2SituationContext => {
  if (seed.situationContext) {
    return seed.situationContext;
  }

  if (seed.domain.includes("medical")) {
    return "emergency_medical_situation";
  }

  if (seed.contextType === "default") {
    const personaRotation: Smysnk2SituationContext[] = [
      "leisure_with_friends",
      "alone_time_relax",
      "creative_expression_hobby",
      "work_time_constraints"
    ];
    return personaRotation[index % personaRotation.length];
  }

  if (seed.contextType === "moderate") {
    const socialModerateDomains = new Set([
      "social",
      "boundaries",
      "alignment",
      "feedback",
      "mediation",
      "interruption",
      "tense_meeting",
      "alignment_tension",
      "relationship_repair",
      "social_misalignment",
      "hard_no"
    ]);
    return socialModerateDomains.has(seed.domain)
      ? "unexpected_interpersonal_conflict"
      : "work_time_constraints";
  }

  const stressConflictDomains = new Set([
    "social_friction",
    "public_confrontation",
    "emotional_overflow",
    "trust_break",
    "communication_breakdown",
    "intense_scrutiny",
    "high_pressure_handoff"
  ]);
  const medicalStressDomains = new Set([
    "duress_call",
    "ambiguous_urgency",
    "decision_delay",
    "medical_triage",
    "medical_response",
    "late_surprise",
    "critical_bug"
  ]);
  if (stressConflictDomains.has(seed.domain)) {
    return "unexpected_interpersonal_conflict";
  }
  if (medicalStressDomains.has(seed.domain)) {
    return "emergency_medical_situation";
  }
  return "overwhelming_work_tasks";
};

const SCENARIO_SEEDS: ScenarioSeed[] = [
  {
    id: "Q01",
    contextType: "default",
    domain: "personal_time",
    scenario: "You have a free evening with no obligations, but you want to use it intentionally. What do you do first?",
    options: {
      A: "Think about what this time should ultimately contribute to your life direction.",
      B: "Mentally explore several interesting things you could do and see what sticks.",
      C: "Fall back on a familiar activity you know you enjoy.",
      D: "Go out and see what grabs your attention in the moment.",
      E: "Decide based on what makes the most internal logical sense.",
      F: "Plan something that makes efficient use of the time.",
      G: "Choose what feels personally meaningful or right.",
      H: "Think about how to spend the time connecting with others."
    }
  },
  {
    id: "Q02",
    contextType: "default",
    domain: "learning",
    scenario: "You are learning a new concept you may need to explain clearly to someone else.",
    options: {
      A: "Look for the underlying pattern that ties everything together.",
      B: "Explore related ideas and possibilities it connects to.",
      C: "Relate it to similar things you already understand.",
      D: "Experiment with it directly to see how it behaves.",
      E: "Work through the logic until it is internally consistent.",
      F: "Learn it the way it is typically applied in practice.",
      G: "Notice whether it aligns with how you prefer to think.",
      H: "Notice how it might affect collaboration or communication."
    }
  },
  {
    id: "Q03",
    contextType: "default",
    domain: "ideas",
    scenario: "You come across an interesting idea online.",
    options: {
      A: "Quietly reflect until its deeper implication becomes clear.",
      B: "Immediately think of multiple ways it could be expanded or remixed.",
      C: "Compare it to ideas you have seen before.",
      D: "React to how engaging or stimulating it is right now.",
      E: "Analyze whether it actually makes logical sense.",
      F: "Consider whether it would work in the real world.",
      G: "Notice whether it resonates with your personal values.",
      H: "Notice how others are responding to it socially."
    }
  },
  {
    id: "Q04",
    contextType: "default",
    domain: "conversation",
    scenario: "You are in a discussion that starts drifting.",
    options: {
      A: "Try to sense the core point the discussion is moving toward.",
      B: "Enjoy letting the discussion branch into new directions.",
      C: "Reference what was originally agreed upon.",
      D: "Respond to whatever is being said in the moment.",
      E: "Pull it back to a logically coherent thread.",
      F: "Guide it toward a practical conclusion.",
      G: "Check whether the discussion feels authentic.",
      H: "Monitor how engaged or disengaged people seem."
    }
  },
  {
    id: "Q05",
    contextType: "moderate",
    domain: "decision",
    scenario: "You need to make a decision with incomplete information.",
    options: {
      A: "Rely on an internal sense of where things are heading.",
      B: "Keep options open while exploring alternatives.",
      C: "Base it on what has worked before.",
      D: "Act on what is most immediately workable.",
      E: "Check which option is most internally consistent.",
      F: "Choose the option with the best practical payoff.",
      G: "Choose what aligns best with your personal stance.",
      H: "Choose what will cause the least friction socially."
    }
  },
  {
    id: "Q06",
    contextType: "moderate",
    domain: "work",
    scenario: "You are asked to improve an existing process.",
    options: {
      A: "Re-envision what the process is ultimately trying to achieve.",
      B: "Generate several new ways the process could work.",
      C: "Refer to how the process has been done historically.",
      D: "Test changes directly and adjust as you go.",
      E: "Analyze the system for logical inefficiencies.",
      F: "Optimize the process for speed or output.",
      G: "Check whether the process aligns with your principles.",
      H: "Consider how changes will affect people involved."
    }
  },
  {
    id: "Q07",
    contextType: "moderate",
    domain: "social",
    scenario: "Someone disagrees with you but is calm and open.",
    options: {
      A: "Try to see what this disagreement means in the bigger picture.",
      B: "Explore different angles of the disagreement.",
      C: "Recall similar disagreements you have had.",
      D: "Respond based on what is being said right now.",
      E: "Examine the internal logic of their position.",
      F: "Focus on resolving the disagreement efficiently.",
      G: "Notice how the disagreement sits with your values.",
      H: "Focus on keeping the exchange comfortable."
    }
  },
  {
    id: "Q08",
    contextType: "stress",
    domain: "overload",
    scenario: "You are overwhelmed by too many tasks at once.",
    options: {
      A: "Reduce everything to one guiding priority.",
      B: "Mentally jump between possible ways out.",
      C: "Retreat into familiar routines.",
      D: "Take immediate physical action to regain momentum.",
      E: "Stop and analyze what does not make sense.",
      F: "Take charge and reorganize everything.",
      G: "Feel internally conflicted about what you should be doing.",
      H: "Become very aware of emotional tension around you."
    }
  },
  {
    id: "Q09",
    contextType: "stress",
    domain: "criticism",
    scenario: "Your work is criticized publicly.",
    options: {
      A: "Interpret what this signals about your longer-term path.",
      B: "Think through multiple explanations for why this happened.",
      C: "Recall how similar situations ended before.",
      D: "Focus on what is tangibly happening in the room.",
      E: "Evaluate whether the criticism is logically valid.",
      F: "Focus on fixing outcomes quickly.",
      G: "Feel personally hurt or defensive.",
      H: "Track others' reactions and adjust behavior."
    }
  },
  {
    id: "Q10",
    contextType: "stress",
    domain: "fatigue",
    scenario: "You are exhausted but still have responsibilities.",
    options: {
      A: "Withdraw to reassess what truly matters.",
      B: "Mentally distract yourself with new ideas.",
      C: "Stick rigidly to routine.",
      D: "Use physical activity to push through.",
      E: "Simplify by analyzing what can be removed.",
      F: "Force execution mode.",
      G: "Protect your emotional integrity.",
      H: "Seek reassurance or emotional support."
    }
  },
  {
    id: "Q11",
    contextType: "default",
    domain: "planning",
    scenario: "You are starting a personal project with open scope and no fixed requirements. What is your first move?",
    optionSet: "defaultIdea"
  },
  {
    id: "Q12",
    contextType: "default",
    domain: "communication",
    scenario: "You need to respond to a long thread with mixed viewpoints.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q13",
    contextType: "default",
    domain: "research",
    scenario: "You read two analyses that both sound plausible but conflict.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q14",
    contextType: "default",
    domain: "project_start",
    scenario: "A vague request lands in front of you and nobody clearly owns it yet.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q15",
    contextType: "default",
    domain: "advice",
    scenario: "A friend asks for quick advice on a complex issue.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q16",
    contextType: "default",
    domain: "exploration",
    scenario: "You are planning a weekend and many options are equally attractive.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q17",
    contextType: "default",
    domain: "knowledge_work",
    scenario: "You notice a recurring issue that is hard to pin down.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q18",
    contextType: "default",
    domain: "commitment",
    scenario: "You are deciding whether to commit to one idea or keep searching.",
    options: {
      A: "Pause and ask which path best matches the long-term direction you sense.",
      B: "Keep scanning adjacent possibilities before locking anything in.",
      C: "Compare the choice with similar decisions that worked for you before.",
      D: "Prototype one promising direction immediately and learn from the result.",
      E: "Commit only after the reasoning is internally consistent from end to end.",
      F: "Pick the option with the clearest action plan and measurable payoff.",
      G: "Choose the direction that feels most personally authentic to you.",
      H: "Favor the option that is easiest to communicate and coordinate with others."
    }
  },
  {
    id: "Q19",
    contextType: "default",
    domain: "synthesis",
    scenario: "After a meeting full of scattered points, you summarize next steps.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q20",
    contextType: "moderate",
    domain: "leadership",
    scenario: "Your group asks you to lead an effort with an unclear deadline.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q21",
    contextType: "moderate",
    domain: "boundaries",
    scenario: "A close friend asks for help while your week is already overloaded.",
    options: {
      A: "Step back and gauge what this means for the bigger direction of your week.",
      B: "Consider multiple ways to help without locking into one approach immediately.",
      C: "Think of similar times and rely on what has worked before.",
      D: "Respond to what is most urgent right now and handle it directly.",
      E: "Sort the request logically and decide what is actually feasible.",
      F: "Set a clear plan for what you can do and when you can do it.",
      G: "Check how helping fits with your personal priorities and emotional capacity.",
      H: "Find a response that supports your friend while keeping the relationship smooth."
    }
  },
  {
    id: "Q22",
    contextType: "moderate",
    domain: "alignment",
    scenario: "A shared effort stalls because people want different directions.",
    optionSet: "moderateSocial"
  },
  {
    id: "Q23",
    contextType: "moderate",
    domain: "handoff",
    scenario: "You inherit work with missing details and handoff gaps.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q24",
    contextType: "moderate",
    domain: "feedback",
    scenario: "You must give difficult feedback to a capable but defensive person.",
    optionSet: "moderateSocial"
  },
  {
    id: "Q25",
    contextType: "moderate",
    domain: "priority_shift",
    scenario: "Key priorities are changed mid-week and expectations remain high.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q26",
    contextType: "stress",
    domain: "deadline",
    scenario: "A deadline is moved up suddenly and your plan no longer fits.",
    optionSet: "stressOverload"
  },
  {
    id: "Q27",
    contextType: "stress",
    domain: "execution_failure",
    scenario: "Your execution plan collapses in the middle of delivery.",
    options: {
      A: "Step back and identify the one outcome that matters most right now.",
      B: "Quickly branch through backup approaches before committing to one.",
      C: "Return to the most reliable process you can execute under pressure.",
      D: "Get hands-on immediately and stabilize the next concrete step.",
      E: "Diagnose what broke logically before making more moves.",
      F: "Rebuild a practical recovery plan and assign immediate actions.",
      G: "Check what still feels personally right before pushing forward.",
      H: "Coordinate tone and expectations so the team can re-synchronize."
    }
  },
  {
    id: "Q28",
    contextType: "stress",
    domain: "social_friction",
    scenario: "Conflict escalates in a group conversation and you are pulled in.",
    optionSet: "stressFriction"
  },
  {
    id: "Q29",
    contextType: "stress",
    domain: "signal_noise",
    scenario: "You receive many urgent messages with conflicting requests.",
    optionSet: "stressOverload"
  },
  {
    id: "Q30",
    contextType: "stress",
    domain: "setback",
    scenario: "Something important goes off track when you are already under pressure.",
    optionSet: "stressFriction"
  },
  {
    id: "Q31",
    contextType: "stress",
    domain: "error_recovery",
    scenario: "You discover a mistake you made late in the process.",
    optionSet: "stressOverload"
  },
  {
    id: "Q32",
    contextType: "stress",
    domain: "duress_call",
    scenario: "You are sleep deprived and still in a high-stakes call.",
    optionSet: "stressFriction"
  },
  {
    id: "Q33",
    contextType: "default",
    domain: "open_block",
    scenario: "You unexpectedly get a free morning before your first commitment.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q34",
    contextType: "default",
    domain: "learning_policy",
    scenario: "You are learning a new set of rules and guidelines you have never used before.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q35",
    contextType: "default",
    domain: "brainstorm",
    scenario: "You are invited into a speculative brainstorm with no clear target yet.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q36",
    contextType: "default",
    domain: "meeting_flow",
    scenario: "A conversation keeps jumping topics and losing continuity.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q37",
    contextType: "default",
    domain: "tooling",
    scenario: "You and your friends want to start a recurring activity, and you need to decide how to structure it.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q38",
    contextType: "default",
    domain: "pattern_detection",
    scenario: "You notice the same pattern repeating across unrelated situations.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q39",
    contextType: "default",
    domain: "writing",
    scenario: "You begin an outline for a complex topic with many moving parts.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q40",
    contextType: "default",
    domain: "self_development",
    scenario: "You choose what to study next for your own growth.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q41",
    contextType: "default",
    domain: "opportunity",
    scenario: "An opportunity appears with uncertain upside and uncertain cost.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q42",
    contextType: "default",
    domain: "success_definition",
    scenario: "People ask what success should look like before starting.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q43",
    contextType: "default",
    domain: "revisit",
    scenario: "You revisit an idea you parked months ago.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q44",
    contextType: "default",
    domain: "difficult_conversation",
    scenario: "You decide how to open a difficult but necessary conversation.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q45",
    contextType: "default",
    domain: "knowledge_transfer",
    scenario: "You prepare to explain a complex concept to a mixed audience.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q46",
    contextType: "moderate",
    domain: "missed_milestone",
    scenario: "Someone misses an important milestone for the first time this quarter.",
    optionSet: "moderateSocial"
  },
  {
    id: "Q47",
    contextType: "moderate",
    domain: "scope_cut",
    scenario: "You must negotiate a scope reduction without losing core outcomes.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q48",
    contextType: "moderate",
    domain: "mediation",
    scenario: "Two coworkers are stuck in a recurring disagreement and ask you to mediate.",
    optionSet: "moderateSocial"
  },
  {
    id: "Q49",
    contextType: "moderate",
    domain: "status_pressure",
    scenario: "A key decision-maker asks for an update while key facts are still uncertain.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q50",
    contextType: "moderate",
    domain: "timeline_conflict",
    scenario: "You disagree with the current plan but the timeline is fixed.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q51",
    contextType: "moderate",
    domain: "project_inheritance",
    scenario: "You inherit a disorganized set of responsibilities and must stabilize quickly.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q52",
    contextType: "moderate",
    domain: "interruption",
    scenario: "A colleague asks for a favor during your deepest focus block.",
    optionSet: "moderateSocial"
  },
  {
    id: "Q53",
    contextType: "moderate",
    domain: "tense_meeting",
    scenario: "A meeting turns tense after a misunderstood comment.",
    optionSet: "moderateSocial"
  },
  {
    id: "Q54",
    contextType: "moderate",
    domain: "priority_pressure",
    scenario: "You must reprioritize with partial data and visible social pressure.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q55",
    contextType: "stress",
    domain: "outage",
    scenario: "A major disruption hits and incoming information is inconsistent.",
    optionSet: "stressOverload"
  },
  {
    id: "Q56",
    contextType: "stress",
    domain: "demand_spike",
    scenario: "Multiple people demand immediate answers you do not yet have.",
    optionSet: "stressFriction"
  },
  {
    id: "Q57",
    contextType: "stress",
    domain: "interruptions",
    scenario: "You are repeatedly interrupted while finishing critical work.",
    optionSet: "stressOverload"
  },
  {
    id: "Q58",
    contextType: "stress",
    domain: "routine_break",
    scenario: "Your trusted routine stops working under pressure.",
    optionSet: "stressOverload"
  },
  {
    id: "Q59",
    contextType: "stress",
    domain: "public_confrontation",
    scenario: "You are confronted angrily in a public setting.",
    optionSet: "stressFriction"
  },
  {
    id: "Q60",
    contextType: "stress",
    domain: "decision_delay",
    scenario: "Delay in one decision is now causing cascading issues.",
    optionSet: "stressOverload"
  },
  {
    id: "Q61",
    contextType: "stress",
    domain: "environmental_noise",
    scenario: "Your environment becomes chaotic and loud during urgent work.",
    optionSet: "stressFriction"
  },
  {
    id: "Q62",
    contextType: "stress",
    domain: "ambiguous_urgency",
    scenario: "You have severe time pressure plus ambiguous instructions.",
    optionSet: "stressOverload"
  },
  {
    id: "Q63",
    contextType: "stress",
    domain: "emotional_overflow",
    scenario: "After continuous strain, you feel emotionally raw.",
    optionSet: "stressFriction"
  },
  {
    id: "Q64",
    contextType: "stress",
    domain: "deadline_endgame",
    scenario: "In the final hour before a deadline, blockers are still unresolved.",
    optionSet: "stressOverload"
  },
  {
    id: "Q65",
    contextType: "default",
    domain: "unscheduled_time",
    scenario: "Your afternoon unexpectedly opens up with no urgent tasks waiting.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q66",
    contextType: "default",
    domain: "dense_reading",
    scenario: "You need to absorb a dense article quickly and explain it afterward.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q67",
    contextType: "default",
    domain: "initiative_start",
    scenario: "You are asked to launch an initiative with only a rough objective.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q68",
    contextType: "default",
    domain: "idea_filtering",
    scenario: "You have more ideas than time and need to narrow what to pursue.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q69",
    contextType: "default",
    domain: "knowledge_conflict",
    scenario: "Two experts give opposite advice and both arguments seem strong.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q70",
    contextType: "default",
    domain: "workflow_design",
    scenario: "You are redesigning your personal routine for the next quarter.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q71",
    contextType: "default",
    domain: "planning_depth",
    scenario: "You need to decide how much planning to do before taking action.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q72",
    contextType: "default",
    domain: "concept_testing",
    scenario: "You have a theory but limited evidence and want to test it quickly.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q73",
    contextType: "default",
    domain: "new_environment",
    scenario: "You enter a new team where norms are not yet clear.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q74",
    contextType: "default",
    domain: "choice_overload",
    scenario: "You have several strong opportunities and can only choose one.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q75",
    contextType: "default",
    domain: "discussion_structure",
    scenario: "A productive discussion starts to splinter into side topics.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q76",
    contextType: "default",
    domain: "long_game",
    scenario: "You are deciding whether to optimize for immediate gains or long-term leverage.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q77",
    contextType: "moderate",
    domain: "delegation",
    scenario: "You need to share important responsibilities but trust is mixed across the group.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q78",
    contextType: "moderate",
    domain: "mixed_feedback",
    scenario: "You receive mixed feedback from people whose opinions all matter.",
    optionSet: "moderateSocial"
  },
  {
    id: "Q79",
    contextType: "moderate",
    domain: "resource_tradeoff",
    scenario: "You must choose between speed, quality, and group capacity.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q80",
    contextType: "moderate",
    domain: "relationship_repair",
    scenario: "A key relationship is strained but still salvageable.",
    optionSet: "moderateSocial"
  },
  {
    id: "Q81",
    contextType: "moderate",
    domain: "timeline_reset",
    scenario: "An important timeline slips and everyone looks to you for next steps.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q82",
    contextType: "moderate",
    domain: "social_misalignment",
    scenario: "Your intent is good, but others are reading your actions negatively.",
    optionSet: "moderateSocial"
  },
  {
    id: "Q83",
    contextType: "moderate",
    domain: "strategy_shift",
    scenario: "New information forces a strategic shift midstream.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q84",
    contextType: "moderate",
    domain: "hard_no",
    scenario: "You have to decline a request from someone important while preserving trust.",
    optionSet: "moderateSocial"
  },
  {
    id: "Q85",
    contextType: "moderate",
    domain: "execution_scope",
    scenario: "You must define a smaller scope that still achieves the core result.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q86",
    contextType: "moderate",
    domain: "alignment_tension",
    scenario: "Another group is aligned in words but not in behavior.",
    optionSet: "moderateSocial"
  },
  {
    id: "Q87",
    contextType: "stress",
    domain: "critical_bug",
    scenario: "A major problem appears right before an important launch.",
    optionSet: "stressOverload"
  },
  {
    id: "Q88",
    contextType: "stress",
    domain: "public_pushback",
    scenario: "Your recommendation is challenged sharply in front of key decision-makers.",
    optionSet: "stressFriction"
  },
  {
    id: "Q89",
    contextType: "stress",
    domain: "task_collision",
    scenario: "Multiple urgent tasks collide and all of them look time-sensitive.",
    optionSet: "stressOverload"
  },
  {
    id: "Q90",
    contextType: "stress",
    domain: "trust_break",
    scenario: "Someone you relied on misses a critical commitment.",
    optionSet: "stressFriction"
  },
  {
    id: "Q91",
    contextType: "stress",
    domain: "late_surprise",
    scenario: "A major constraint appears late and invalidates your original plan.",
    optionSet: "stressOverload"
  },
  {
    id: "Q92",
    contextType: "stress",
    situationContext: "emergency_medical_situation",
    domain: "medical_triage",
    scenario: "You are first to respond in a medical emergency and must triage quickly.",
    optionSet: "stressFriction"
  },
  {
    id: "Q93",
    contextType: "stress",
    domain: "capacity_limit",
    scenario: "You are at capacity and still receive escalating high-priority requests.",
    optionSet: "stressOverload"
  },
  {
    id: "Q94",
    contextType: "stress",
    domain: "communication_breakdown",
    scenario: "Communication breaks down at the exact moment coordination is essential.",
    optionSet: "stressFriction"
  },
  {
    id: "Q95",
    contextType: "stress",
    situationContext: "emergency_medical_situation",
    domain: "medical_response",
    scenario: "You must make urgent choices while emergency care is still en route.",
    optionSet: "stressOverload"
  },
  {
    id: "Q96",
    contextType: "stress",
    domain: "high_pressure_handoff",
    scenario: "A high-pressure handoff is failing and the next team is already waiting.",
    optionSet: "stressFriction"
  }
];

export const SMYSNK2_SCENARIOS: Smysnk2Scenario[] = SCENARIO_SEEDS.map((seed, index) => {
  const situationContext = resolveSituationContext(seed, index);
  const useContextualOptionWording = shouldUseContextualOptionWording(seed.scenario, situationContext);
  const baseOptionTexts = seed.options
    ? seed.options
    : seed.optionSet
      ? OPTION_SETS[seed.optionSet]
      : OPTION_SETS.defaultIdea;
  const optionTexts = buildVariantOptionTexts(
    seed,
    baseOptionTexts,
    situationContext,
    useContextualOptionWording
  );
  const archetype = seed.archetype ??
    SMYSNK2_ARCHETYPE_ORDER[(Number(seed.id.replace("Q", "")) - 1) % SMYSNK2_ARCHETYPE_ORDER.length];
  const contextPolarity = SMYSNK2_CONTEXT_POLARITY_BY_CONTEXT[situationContext];
  return {
    id: seed.id,
    contextType: seed.contextType,
    situationContext,
    contextPolarity,
    archetype,
    domain: seed.domain,
    scenario: buildVariantScenarioText(seed, situationContext),
    options: buildOptions(optionTexts)
  };
});

const DUPLICATE_OPTION_SETS = (() => {
  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  SMYSNK2_SCENARIOS.forEach((scenario) => {
    const signature = scenario.options
      .map((option) => option.text.trim().toLowerCase())
      .join("||");
    const existing = seen.get(signature);
    if (existing) {
      duplicates.push(`${existing} = ${scenario.id}`);
      return;
    }
    seen.set(signature, scenario.id);
  });
  return duplicates;
})();

if (DUPLICATE_OPTION_SETS.length) {
  throw new Error(`SMYSNK2 duplicate option sets found: ${DUPLICATE_OPTION_SETS.join(", ")}`);
}

const SCENARIO_MAP = new Map(SMYSNK2_SCENARIOS.map((question) => [question.id, question]));
const SCENARIOS_BY_ARCHETYPE = SMYSNK2_ARCHETYPE_ORDER.reduce(
  (acc, archetype) => {
    acc[archetype] = [];
    return acc;
  },
  {} as Record<Smysnk2Archetype, Smysnk2Scenario[]>
);
SMYSNK2_SCENARIOS.forEach((scenario) => {
  SCENARIOS_BY_ARCHETYPE[scenario.archetype].push(scenario);
});
export const SMYSNK2_MODES = [16, 32, 64] as const;

export const DEFAULT_SMYSNK2_MODE: Smysnk2Mode = 32;

export const SMYSNK2_MODE_LABELS: Record<Smysnk2Mode, string> = {
  16: "16 questions (fast)",
  32: "32 questions (balanced)",
  64: "64 questions (high confidence)"
};

const LEGACY_MODE_IDS: Record<Smysnk2Mode, string[]> = {
  16: [
    "Q01",
    "Q02",
    "Q04",
    "Q11",
    "Q15",
    "Q18",
    "Q05",
    "Q06",
    "Q21",
    "Q24",
    "Q08",
    "Q09",
    "Q10",
    "Q27",
    "Q30",
    "Q32"
  ],
  32: SCENARIO_SEEDS.slice(0, 32).map((seed) => seed.id),
  64: SCENARIO_SEEDS.slice(0, 64).map((seed) => seed.id)
};

const shuffleBySeed = <T>(items: T[], seedText: string) => {
  const copy = [...items];
  const random = makeSeededRng(hashString(seedText));
  for (let right = copy.length - 1; right > 0; right -= 1) {
    const left = Math.floor(random() * (right + 1));
    [copy[right], copy[left]] = [copy[left], copy[right]];
  }
  return copy;
};

const getContextTargets = (mode: Smysnk2Mode, seedText: string) => {
  const base = Math.floor(mode / SMYSNK2_SITUATION_CONTEXT_ORDER.length);
  const remainder = mode % SMYSNK2_SITUATION_CONTEXT_ORDER.length;
  const contextOrder = shuffleBySeed([...SMYSNK2_SITUATION_CONTEXT_ORDER], `${seedText}:context-target-order`);
  return contextOrder.reduce(
    (acc, context, index) => {
      acc[context] = base + (index < remainder ? 1 : 0);
      return acc;
    },
    {} as Record<Smysnk2SituationContext, number>
  );
};

const getSituationContextCountsByIds = (ids: string[]) =>
  ids.reduce(
    (acc, id) => {
      const scenario = SCENARIO_MAP.get(id);
      if (scenario) {
        acc[scenario.situationContext] += 1;
      }
      return acc;
    },
    SMYSNK2_SITUATION_CONTEXT_ORDER.reduce(
      (counts, context) => {
        counts[context] = 0;
        return counts;
      },
      {} as Record<Smysnk2SituationContext, number>
    )
  );

export const selectSmysnk2QuestionIds = ({
  mode,
  seed
}: {
  mode: Smysnk2Mode;
  seed?: string | null;
}): Smysnk2ScenarioId[] => {
  const countPerArchetype = mode / SMYSNK2_ARCHETYPE_ORDER.length;
  const baseSeed = seed?.trim() || `mode-${mode}`;

  const contextTargets = getContextTargets(mode, baseSeed);
  const remainingContexts = { ...contextTargets };
  const selectedByArchetype = SMYSNK2_ARCHETYPE_ORDER.reduce(
    (acc, archetype) => {
      acc[archetype] = [];
      return acc;
    },
    {} as Record<Smysnk2Archetype, Smysnk2ScenarioId[]>
  );
  const selectedSet = new Set<Smysnk2ScenarioId>();

  SMYSNK2_ARCHETYPE_ORDER.forEach((archetype, archetypeIndex) => {
    const pool = shuffleBySeed(SCENARIOS_BY_ARCHETYPE[archetype], `${baseSeed}:${archetype}:pool`);
    if (pool.length < countPerArchetype) {
      throw new Error(`Insufficient SMYSNK2 scenarios for archetype ${archetype}.`);
    }

    for (let pickIndex = 0; pickIndex < countPerArchetype; pickIndex += 1) {
      const remainingPool = pool.filter((scenario) => !selectedSet.has(scenario.id));
      if (!remainingPool.length) {
        throw new Error(`Insufficient SMYSNK2 scenarios while selecting ${archetype}.`);
      }
      const sortedCandidates = shuffleBySeed(
        remainingPool,
        `${baseSeed}:${archetypeIndex}:${pickIndex}:candidate-order`
      ).sort(
        (left, right) =>
          (remainingContexts[right.situationContext] ?? 0) - (remainingContexts[left.situationContext] ?? 0)
      );
      const picked = sortedCandidates[0];
      selectedSet.add(picked.id);
      selectedByArchetype[archetype].push(picked.id);
      remainingContexts[picked.situationContext] -= 1;
    }
  });

  let rebalancePass = 0;
  while (rebalancePass < mode * 3) {
    rebalancePass += 1;
    const deficitContexts = SMYSNK2_SITUATION_CONTEXT_ORDER
      .filter((context) => remainingContexts[context] > 0)
      .sort((left, right) => remainingContexts[right] - remainingContexts[left]);
    if (!deficitContexts.length) {
      break;
    }

    let swapped = false;
    for (const deficitContext of deficitContexts) {
      const surplusContexts = SMYSNK2_SITUATION_CONTEXT_ORDER
        .filter((context) => remainingContexts[context] < 0)
        .sort((left, right) => remainingContexts[left] - remainingContexts[right]);
      if (!surplusContexts.length) {
        continue;
      }

      for (const archetype of shuffleBySeed(SMYSNK2_ARCHETYPE_ORDER, `${baseSeed}:${deficitContext}:archetype-order`)) {
        const selectedIds = selectedByArchetype[archetype];
        for (const selectedId of shuffleBySeed(selectedIds, `${baseSeed}:${archetype}:${deficitContext}:selected-order`)) {
          const selectedScenario = SCENARIO_MAP.get(selectedId);
          if (!selectedScenario) {
            continue;
          }
          if (remainingContexts[selectedScenario.situationContext] >= 0) {
            continue;
          }

          const replacementPool = shuffleBySeed(
            SCENARIOS_BY_ARCHETYPE[archetype].filter(
              (scenario) =>
                scenario.situationContext === deficitContext && !selectedSet.has(scenario.id)
            ),
            `${baseSeed}:${selectedId}:${deficitContext}:replacement-order`
          );
          const replacement = replacementPool[0];
          if (!replacement) {
            continue;
          }

          selectedSet.delete(selectedId);
          selectedSet.add(replacement.id);
          selectedByArchetype[archetype] = selectedIds.map((id) => (id === selectedId ? replacement.id : id));
          remainingContexts[selectedScenario.situationContext] += 1;
          remainingContexts[deficitContext] -= 1;
          swapped = true;
          break;
        }
        if (swapped) {
          break;
        }
      }

      if (swapped) {
        break;
      }
    }

    if (!swapped) {
      break;
    }
  }

  const selected = SMYSNK2_ARCHETYPE_ORDER.flatMap((archetype) => selectedByArchetype[archetype]);
  return shuffleBySeed(selected, `${baseSeed}:order`);
};

export const normalizeSmysnk2QuestionIds = (ids: unknown): Smysnk2ScenarioId[] | null => {
  if (!Array.isArray(ids)) {
    return null;
  }
  const normalized = ids
    .filter((id): id is string => typeof id === "string")
    .filter((id, index, list) => list.indexOf(id) === index)
    .filter((id) => SCENARIO_MAP.has(id));
  return normalized.length ? normalized : null;
};

export const hasBalancedSmysnk2QuestionIds = (ids: string[], mode: Smysnk2Mode) => {
  if (ids.length !== mode) {
    return false;
  }
  const targetPerArchetype = mode / SMYSNK2_ARCHETYPE_ORDER.length;
  const counts = SMYSNK2_ARCHETYPE_ORDER.reduce(
    (acc, archetype) => {
      acc[archetype] = 0;
      return acc;
    },
    {} as Record<Smysnk2Archetype, number>
  );

  for (const id of ids) {
    const scenario = SCENARIO_MAP.get(id);
    if (!scenario) {
      return false;
    }
    counts[scenario.archetype] += 1;
  }

  return SMYSNK2_ARCHETYPE_ORDER.every((archetype) => counts[archetype] === targetPerArchetype);
};

export const parseSmysnk2Mode = (value: unknown): Smysnk2Mode => {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  if (parsed === 16 || parsed === 32 || parsed === 64) {
    return parsed;
  }
  return DEFAULT_SMYSNK2_MODE;
};

export const getSmysnk2ScenarioById = (id: string) => SCENARIO_MAP.get(id);

export const getSmysnk2ScenariosByIds = (ids: string[]): Smysnk2Scenario[] =>
  ids
    .map((id) => SCENARIO_MAP.get(id))
    .filter((scenario): scenario is Smysnk2Scenario => Boolean(scenario));

export const getSmysnk2Scenarios = (
  mode: Smysnk2Mode,
  questionIds?: unknown,
  seed?: string | null
): Smysnk2Scenario[] => {
  const normalized = normalizeSmysnk2QuestionIds(questionIds);
  const expected = mode;
  if (normalized && normalized.length === expected && hasBalancedSmysnk2QuestionIds(normalized, mode)) {
    return getSmysnk2ScenariosByIds(normalized);
  }
  if (!seed) {
    return getSmysnk2ScenariosByIds(LEGACY_MODE_IDS[mode]);
  }
  const selectedIds = selectSmysnk2QuestionIds({ mode, seed });
  return getSmysnk2ScenariosByIds(selectedIds);
};

export const getSmysnk2SituationContextCounts = (
  mode: Smysnk2Mode,
  questionIds?: unknown,
  seed?: string | null
) => {
  return getSituationContextCountsByIds(getSmysnk2Scenarios(mode, questionIds, seed).map((scenario) => scenario.id));
};
