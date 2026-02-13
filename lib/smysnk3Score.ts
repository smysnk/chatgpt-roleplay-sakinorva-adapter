import {
  calculateSmysnk2Scores,
  deriveSmysnk2Stack,
  isSmysnk2OptionKey,
  normalizeSmysnk2OptionKey,
  scoreSmysnk2Responses,
  type Smysnk2Analysis,
  type Smysnk2ArchetypeBreakdown,
  type Smysnk2AssertiveModeAnalysis,
  type Smysnk2ContextTypeAnalysis,
  type Smysnk2FunctionConfidence,
  type Smysnk2PolarityAnalysis,
  type Smysnk2Response,
  type Smysnk2ScoringResult,
  type Smysnk2StackSummary,
  type Smysnk2Summary,
  type Smysnk2TemperamentConfidence,
  type Smysnk2TurbulentModeAnalysis,
  type Smysnk2TypeMatch,
  type Smysnk2TypeMatchingSummary
} from "@/lib/smysnk2Score";

export type Smysnk3Response = Smysnk2Response;
export type Smysnk3StackSummary = Smysnk2StackSummary;
export type Smysnk3ArchetypeBreakdown = Smysnk2ArchetypeBreakdown;
export type Smysnk3FunctionConfidence = Smysnk2FunctionConfidence;
export type Smysnk3TypeMatch = Smysnk2TypeMatch;
export type Smysnk3TypeMatchingSummary = Smysnk2TypeMatchingSummary;
export type Smysnk3ContextTypeAnalysis = Smysnk2ContextTypeAnalysis;
export type Smysnk3PolarityAnalysis = Smysnk2PolarityAnalysis;
export type Smysnk3AssertiveModeAnalysis = Smysnk2AssertiveModeAnalysis;
export type Smysnk3TurbulentModeAnalysis = Smysnk2TurbulentModeAnalysis;
export type Smysnk3TemperamentConfidence = Smysnk2TemperamentConfidence;
export type Smysnk3Summary = Smysnk2Summary;
export type Smysnk3Analysis = Smysnk2Analysis;
export type Smysnk3ScoringResult = Smysnk2ScoringResult;

export const deriveSmysnk3Stack = deriveSmysnk2Stack;

export const isSmysnk3OptionKey = isSmysnk2OptionKey;

export const normalizeSmysnk3OptionKey = normalizeSmysnk2OptionKey;

export const scoreSmysnk3Responses = (responses: Smysnk3Response[]): Smysnk3ScoringResult =>
  scoreSmysnk2Responses(responses);

export const calculateSmysnk3Scores = (responses: Smysnk3Response[]) => calculateSmysnk2Scores(responses);
