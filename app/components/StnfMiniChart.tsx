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
  className?: string;
};

const MAX_FUNCTION_SCORE = 40;

const getCssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const clampHeight = (value: number, maxHeight: number) =>
  Math.max(0, Math.min(maxHeight, Math.round((Math.abs(value) / MAX_FUNCTION_SCORE) * maxHeight)));

export default function StnfMiniChart({
  sensing,
  thinking,
  intuition,
  feeling,
  className
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
          extroverted: sensing.extroverted,
          introverted: sensing.introverted,
          extroColor: colors.sensingExtro,
          introColor: colors.sensingIntro
        },
        {
          extroverted: thinking.extroverted,
          introverted: thinking.introverted,
          extroColor: colors.thinkingExtro,
          introColor: colors.thinkingIntro
        },
        {
          extroverted: intuition.extroverted,
          introverted: intuition.introverted,
          extroColor: colors.intuitionExtro,
          introColor: colors.intuitionIntro
        },
        {
          extroverted: feeling.extroverted,
          introverted: feeling.introverted,
          extroColor: colors.feelingExtro,
          introColor: colors.feelingIntro
        }
      ];

      bars.forEach((bar, index) => {
        const x = startX + index * (barWidth + gap);
        const extroHeight = clampHeight(bar.extroverted, maxHeight);
        const introHeight = clampHeight(bar.introverted, maxHeight);

        if (extroHeight > 0) {
          context.fillStyle = bar.extroColor;
          context.fillRect(x, Math.floor(height / 2) - extroHeight, barWidth, extroHeight);
        }

        if (introHeight > 0) {
          context.fillStyle = bar.introColor;
          context.fillRect(x, Math.floor(height / 2) + 1, barWidth, introHeight);
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
  }, [sensing, thinking, intuition, feeling]);

  return (
    <div className={`stnf-chart ${className ?? ""}`.trim()} ref={containerRef}>
      <canvas ref={canvasRef} role="img" aria-label="STNF chart" />
    </div>
  );
}
