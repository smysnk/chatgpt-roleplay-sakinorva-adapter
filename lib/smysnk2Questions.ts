import type { SmysnkFunction, SmysnkOrientation } from "@/lib/smysnkQuestions";

export type Smysnk2ContextType = "default" | "moderate" | "stress";
export type Smysnk2OptionKey = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
export type Smysnk2Mode = 16 | 32 | 64;

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
  domain: string;
  scenario: string;
  options: Smysnk2ScenarioOption[];
};

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
    F: "Set a decision threshold and move to implementation.",
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
    A: "Interpret the event as a signal about the bigger trajectory.",
    B: "Mentally branch into multiple explanations at once.",
    C: "Recall how similar pressure events unfolded before.",
    D: "Ground attention in immediate sensory facts.",
    E: "Test whether the criticism or demand is logically valid.",
    F: "Move straight to damage control and output recovery.",
    G: "Feel the conflict personally and guard your line.",
    H: "Monitor others' reactions and adjust behavior."
  }
} as const;

const SCENARIO_SEEDS: ScenarioSeed[] = [
  {
    id: "Q01",
    contextType: "default",
    domain: "personal_time",
    scenario: "You have a free evening with no obligations. What do you do first?",
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
    scenario: "You are learning a new technical concept.",
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
    scenario: "You are starting a personal project with open scope.",
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
    scenario: "A vague brief lands in your inbox with no clear owner.",
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
    scenario: "You notice an intermittent bug that is hard to reproduce.",
    optionSet: "defaultIdea"
  },
  {
    id: "Q18",
    contextType: "default",
    domain: "commitment",
    scenario: "You are deciding whether to commit to one idea or keep searching.",
    optionSet: "defaultIdea"
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
    scenario: "Your team asks you to lead a project with an unclear deadline.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q21",
    contextType: "moderate",
    domain: "boundaries",
    scenario: "A close friend asks for help while your week is already overloaded.",
    optionSet: "moderateSocial"
  },
  {
    id: "Q22",
    contextType: "moderate",
    domain: "alignment",
    scenario: "A project stalls because people want different directions.",
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
    scenario: "You must give difficult feedback to a skilled but defensive teammate.",
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
    optionSet: "stressOverload"
  },
  {
    id: "Q28",
    contextType: "stress",
    domain: "social_friction",
    scenario: "Conflict escalates in a group channel and you are pulled in.",
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
    scenario: "An unexpected setback hits while you are already under pressure.",
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
    scenario: "You are learning a policy framework you have never used before.",
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
    scenario: "You need to choose tooling for a new workflow.",
    optionSet: "defaultExecution"
  },
  {
    id: "Q38",
    contextType: "default",
    domain: "pattern_detection",
    scenario: "You notice the same pattern repeating across unrelated projects.",
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
    scenario: "Your team asks what success should look like before starting.",
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
    scenario: "A teammate misses a milestone for the first time this quarter.",
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
    scenario: "A stakeholder wants a status update while key facts are still uncertain.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q50",
    contextType: "moderate",
    domain: "timeline_conflict",
    scenario: "You disagree with the implementation plan but the timeline is fixed.",
    optionSet: "moderateDecision"
  },
  {
    id: "Q51",
    contextType: "moderate",
    domain: "project_inheritance",
    scenario: "You inherit a messy project structure and must stabilize quickly.",
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
    scenario: "A production outage hits and incoming information is inconsistent.",
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
    scenario: "You are confronted angrily in a public channel.",
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
  }
];

export const SMYSNK2_SCENARIOS: Smysnk2Scenario[] = SCENARIO_SEEDS.map((seed) => {
  const optionTexts = seed.options ?? (seed.optionSet ? OPTION_SETS[seed.optionSet] : OPTION_SETS.defaultIdea);
  return {
    id: seed.id,
    contextType: seed.contextType,
    domain: seed.domain,
    scenario: seed.scenario,
    options: buildOptions(optionTexts)
  };
});

const SCENARIO_MAP = new Map(SMYSNK2_SCENARIOS.map((question) => [question.id, question]));

export const SMYSNK2_MODES = [16, 32, 64] as const;

export const DEFAULT_SMYSNK2_MODE: Smysnk2Mode = 32;

export const SMYSNK2_MODE_LABELS: Record<Smysnk2Mode, string> = {
  16: "16 questions (fast)",
  32: "32 questions (balanced)",
  64: "64 questions (high confidence)"
};

const MODE_IDS: Record<Smysnk2Mode, string[]> = {
  16: ["Q01", "Q02", "Q04", "Q11", "Q15", "Q18", "Q05", "Q06", "Q21", "Q24", "Q08", "Q09", "Q10", "Q27", "Q30", "Q32"],
  32: SCENARIO_SEEDS.slice(0, 32).map((seed) => seed.id),
  64: SCENARIO_SEEDS.map((seed) => seed.id)
};

export const parseSmysnk2Mode = (value: unknown): Smysnk2Mode => {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  if (parsed === 16 || parsed === 32 || parsed === 64) {
    return parsed;
  }
  return DEFAULT_SMYSNK2_MODE;
};

export const getSmysnk2ScenarioById = (id: string) => SCENARIO_MAP.get(id);

export const getSmysnk2Scenarios = (mode: Smysnk2Mode): Smysnk2Scenario[] =>
  MODE_IDS[mode]
    .map((id) => SCENARIO_MAP.get(id))
    .filter((scenario): scenario is Smysnk2Scenario => Boolean(scenario));

export const getSmysnk2ContextCounts = (mode: Smysnk2Mode) => {
  const counts: Record<Smysnk2ContextType, number> = {
    default: 0,
    moderate: 0,
    stress: 0
  };
  getSmysnk2Scenarios(mode).forEach((question) => {
    counts[question.contextType] += 1;
  });
  return counts;
};
