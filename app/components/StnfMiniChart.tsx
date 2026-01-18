import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

type StnfBarPair = {
  extroverted: number;
  introverted: number;
};

type StnfMiniChartProps = {
  sensing: StnfBarPair;
  thinking: StnfBarPair;
  intuition: StnfBarPair;
  feeling: StnfBarPair;
  minScore?: number;
  maxScore?: number;
  className?: string;
  style?: CSSProperties;
};

const MAX_FUNCTION_SCORE = 40;

const getCssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const clampHeight = (value: number, maxHeight: number, minScore: number, maxScore: number) => {
  const range = maxScore - minScore;
  if (range <= 0) {
    return Math.max(0, Math.min(maxHeight, Math.round((Math.abs(value) / MAX_FUNCTION_SCORE) * maxHeight)));
  }
  const normalized = (value - minScore) / range;
  const height = Math.round(Math.max(0, Math.min(1, normalized)) * maxHeight);
  return Math.max(0, Math.min(maxHeight, height));
};

const brightenHexColor = (color: string, amount: number) => {
  if (!color.startsWith("#")) {
    return color;
  }
  const hex = color.replace("#", "");
  const parsed = hex.length === 3
    ? hex.split("").map((char) => char + char).join("")
    : hex;
  if (parsed.length !== 6) {
    return color;
  }
  const toNumber = (value: string) => Number.parseInt(value, 16);
  const r = toNumber(parsed.slice(0, 2));
  const g = toNumber(parsed.slice(2, 4));
  const b = toNumber(parsed.slice(4, 6));
  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return color;
  }
  const brighten = (value: number) => Math.min(255, Math.round(value + (255 - value) * amount));
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(brighten(r))}${toHex(brighten(g))}${toHex(brighten(b))}`;
};

export default function StnfMiniChart({
  sensing,
  thinking,
  intuition,
  feeling,
  minScore,
  maxScore,
  className,
  style
}: StnfMiniChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const colors = {
      zeroLine: getCssVar("--border", "rgba(255, 255, 255, 0.2)"),
      sensingExtro: getCssVar("--func-se", "#f1b44b"),
      sensingIntro: getCssVar("--func-si", "#d98b3a"),
      thinkingExtro: getCssVar("--func-te", "#4b8bff"),
      thinkingIntro: getCssVar("--func-ti", "#3cc7ff"),
      intuitionExtro: getCssVar("--func-ne", "#41d89d"),
      intuitionIntro: getCssVar("--func-ni", "#2fb36f"),
      feelingExtro: getCssVar("--func-fe", "#e45b6f"),
      feelingIntro: getCssVar("--func-fi", "#a05cff")
    };

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const scale = window.devicePixelRatio || 1;

      if (width === 0 || height === 0) {
        return;
      }

      canvas.width = width * scale;
      canvas.height = height * scale;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.clearRect(0, 0, width, height);

      const zeroLineY = Math.floor(height / 2) + 0.5;
      context.strokeStyle = colors.zeroLine;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, zeroLineY);
      context.lineTo(width, zeroLineY);
      context.stroke();

      const maxHeight = Math.max(0, Math.floor(height / 2) - 1);
      if (maxHeight <= 0) {
        return;
      }

      const gap = Math.max(2, Math.round(width * 0.05));
      const totalGap = gap * 3;
      const barWidth = Math.max(2, Math.floor((width - totalGap) / 4));
      const totalWidth = barWidth * 4 + totalGap;
      const startX = Math.max(0, Math.floor((width - totalWidth) / 2));

      const bars = [
        {
          key: "S",
          extroverted: sensing.extroverted,
          introverted: sensing.introverted,
          extroColor: colors.sensingExtro,
          introColor: colors.sensingIntro
        },
        {
          key: "T",
          extroverted: thinking.extroverted,
          introverted: thinking.introverted,
          extroColor: colors.thinkingExtro,
          introColor: colors.thinkingIntro
        },
        {
          key: "N",
          extroverted: intuition.extroverted,
          introverted: intuition.introverted,
          extroColor: colors.intuitionExtro,
          introColor: colors.intuitionIntro
        },
        {
          key: "F",
          extroverted: feeling.extroverted,
          introverted: feeling.introverted,
          extroColor: colors.feelingExtro,
          introColor: colors.feelingIntro
        }
      ].sort((first, second) => {
        const firstScore = Math.max(first.extroverted, first.introverted);
        const secondScore = Math.max(second.extroverted, second.introverted);
        return secondScore - firstScore;
      });

      const fallbackMin = 0;
      const fallbackMax = MAX_FUNCTION_SCORE;
      const resolvedMin = minScore ?? fallbackMin;
      const resolvedMax = maxScore ?? fallbackMax;
      const sumRangeMax = resolvedMax > resolvedMin ? resolvedMax - resolvedMin : MAX_FUNCTION_SCORE;

      bars.forEach((bar, index) => {
        const x = startX + index * (barWidth + gap);
        const extroHeight = clampHeight(bar.extroverted, maxHeight, resolvedMin, resolvedMax);
        const introHeight = clampHeight(bar.introverted, maxHeight, resolvedMin, resolvedMax);

        if (extroHeight > 0) {
          context.fillStyle = bar.extroColor;
          context.fillRect(x, Math.floor(height / 2) - extroHeight, barWidth, extroHeight);
        }

        if (introHeight > 0) {
          context.fillStyle = bar.introColor;
          context.fillRect(x, Math.floor(height / 2) + 1, barWidth, introHeight);
        }

        const sum = bar.extroverted - bar.introverted;
        if (sum !== 0) {
          const sumHeight = clampHeight(Math.abs(sum), maxHeight, 0, sumRangeMax);
          if (sumHeight > 0) {
            const brighterColor = sum > 0
              ? brightenHexColor(bar.extroColor, 0.35)
              : brightenHexColor(bar.introColor, 0.35);
            const sumBarWidth = Math.max(2, Math.floor(barWidth * 0.5));
            const sumX = x + Math.floor((barWidth - sumBarWidth) / 2);
            context.fillStyle = brighterColor;
            if (sum > 0) {
              context.fillRect(sumX, Math.floor(height / 2) - sumHeight, sumBarWidth, sumHeight);
            } else {
              context.fillRect(sumX, Math.floor(height / 2) + 1, sumBarWidth, sumHeight);
            }
          }
        }
      });
    };

    const observer = new ResizeObserver(() => {
      draw();
    });

    observer.observe(container);
    draw();

    return () => {
      observer.disconnect();
    };
  }, [sensing, thinking, intuition, feeling, minScore, maxScore]);

  return (
    <div className={`stnf-chart ${className ?? ""}`.trim()} ref={containerRef} style={style}>
      <canvas ref={canvasRef} role="img" aria-label="STNF chart" />
    </div>
  );
}
