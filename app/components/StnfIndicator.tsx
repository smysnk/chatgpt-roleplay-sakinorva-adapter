import type { CSSProperties } from "react";

const AXES = [
  {
    key: "S",
    label: "Sensing",
    extroverted: { key: "Se", label: "extraverted sensing", colorVar: "--func-se" },
    introverted: { key: "Si", label: "introverted sensing", colorVar: "--func-si" }
  },
  {
    key: "T",
    label: "Thinking",
    extroverted: { key: "Te", label: "extraverted thinking", colorVar: "--func-te" },
    introverted: { key: "Ti", label: "introverted thinking", colorVar: "--func-ti" }
  },
  {
    key: "N",
    label: "Intuition",
    extroverted: { key: "Ne", label: "extraverted intuition", colorVar: "--func-ne" },
    introverted: { key: "Ni", label: "introverted intuition", colorVar: "--func-ni" }
  },
  {
    key: "F",
    label: "Feeling",
    extroverted: { key: "Fe", label: "extraverted feeling", colorVar: "--func-fe" },
    introverted: { key: "Fi", label: "introverted feeling", colorVar: "--func-fi" }
  }
] as const;

const formatScore = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);

const getScore = (scores: Record<string, number> | null, key: string) => {
  if (!scores) {
    return 0;
  }
  const value = scores[key];
  return Number.isFinite(value) ? value : 0;
};

const getScoreRange = (scores: Record<string, number> | null) => {
  if (!scores) {
    return { min: 0, max: 40 };
  }
  const values = Object.values(scores).filter((value) => Number.isFinite(value));
  if (!values.length) {
    return { min: 0, max: 40 };
  }
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
};

const getHeightPercent = (value: number, min: number, max: number, fallbackMax: number) => {
  const range = max - min;
  if (range <= 0) {
    if (fallbackMax <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (Math.abs(value) / fallbackMax) * 100));
  }
  const normalized = (value - min) / range;
  return Math.max(0, Math.min(100, normalized * 100));
};

export default function StnfIndicator({
  functionScores,
  className,
  style
}: {
  functionScores: Record<string, number> | null;
  className?: string;
  style?: CSSProperties;
}) {
  const { min: minScore, max: maxScore } = getScoreRange(functionScores);
  const rangeMax = maxScore > minScore ? maxScore - minScore : 40;

  return (
    <div className={`stnf-indicator ${className ?? ""}`.trim()} style={style}>
      {AXES.map((axis) => {
        const extroScore = getScore(functionScores, axis.extroverted.key);
        const introScore = getScore(functionScores, axis.introverted.key);
        const delta = extroScore - introScore;
        const extroHeight = getHeightPercent(extroScore, minScore, maxScore, 40);
        const introHeight = getHeightPercent(introScore, minScore, maxScore, 40);
        const deltaHeight = getHeightPercent(Math.abs(delta), 0, rangeMax, 40);

        return (
          <div className="stnf-column" key={axis.key}>
            <div className="stnf-column-title">{axis.key}</div>
            <div className="stnf-bar-column">
              <div
                className="stnf-bar-area stnf-bar-area--extro"
                title={`${axis.extroverted.key} (${axis.extroverted.label})`}
              >
                <div className="stnf-bar-stack stnf-bar-stack--extro">
                  <div
                    className="stnf-bar stnf-bar--extro"
                    style={{
                      height: `${extroHeight}%`,
                      ["--stnf-bar-color" as string]: `var(${axis.extroverted.colorVar})`
                    }}
                    title={`${axis.extroverted.key} (${axis.extroverted.label}): ${formatScore(extroScore)}`}
                  />
                  {delta > 0 ? (
                    <div
                      className="stnf-bar stnf-bar--delta"
                      style={{
                        height: `${deltaHeight}%`,
                        ["--stnf-bar-color" as string]: `var(${axis.extroverted.colorVar})`
                      }}
                      title={`${axis.extroverted.key} − ${axis.introverted.key}: +${formatScore(delta)}`}
                    />
                  ) : null}
                </div>
              </div>
              <div className="stnf-zero-line" />
              <div
                className="stnf-bar-area stnf-bar-area--intro"
                title={`${axis.introverted.key} (${axis.introverted.label})`}
              >
                <div className="stnf-bar-stack stnf-bar-stack--intro">
                  <div
                    className="stnf-bar stnf-bar--intro"
                    style={{
                      height: `${introHeight}%`,
                      ["--stnf-bar-color" as string]: `var(${axis.introverted.colorVar})`
                    }}
                    title={`${axis.introverted.key} (${axis.introverted.label}): ${formatScore(introScore)}`}
                  />
                  {delta < 0 ? (
                    <div
                      className="stnf-bar stnf-bar--delta"
                      style={{
                        height: `${deltaHeight}%`,
                        ["--stnf-bar-color" as string]: `var(${axis.introverted.colorVar})`
                      }}
                      title={`${axis.introverted.key} − ${axis.extroverted.key}: +${formatScore(
                        Math.abs(delta)
                      )}`}
                    />
                  ) : null}
                </div>
              </div>
            </div>
            <div className="stnf-axis-label">{axis.label}</div>
          </div>
        );
      })}
    </div>
  );
}
