"use client";

import { useEffect, useMemo, useRef } from "react";

const MBTI_TYPES = [
  "ISTJ",
  "ISFJ",
  "INFJ",
  "INTJ",
  "ISTP",
  "ISFP",
  "INFP",
  "INTP",
  "ESTP",
  "ESFP",
  "ENFP",
  "ENTP",
  "ESTJ",
  "ESFJ",
  "ENFJ",
  "ENTJ"
] as const;

type MbtiType = (typeof MBTI_TYPES)[number];

type MbtiMapCanvasProps = {
  highlightType?: string | null;
};

const parseMbtiType = (value?: string | null): MbtiType | null => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/[^A-Za-z]/g, "").toUpperCase();
  const match = MBTI_TYPES.find((type) => normalized.includes(type));
  return match ?? null;
};

const getTypePosition = (type: MbtiType) => {
  const letters = type.split("");
  const isExtraverted = letters[0] === "E";
  const isIntuitive = letters[1] === "N";
  const isThinking = letters[2] === "T";
  const isJudging = letters[3] === "J";

  const baseX = isIntuitive ? 0.75 : -0.75;
  const baseY = isExtraverted ? 0.75 : -0.75;
  const tfShiftX = isThinking ? -0.12 : 0.12;
  const tfShiftY = isThinking ? -0.08 : 0.08;
  const jpShiftX = isJudging ? 0.08 : -0.08;
  const jpShiftY = isJudging ? 0.14 : -0.14;

  return {
    x: baseX + tfShiftX + jpShiftX,
    y: baseY + tfShiftY + jpShiftY
  };
};

const getTypeColor = (type: MbtiType) => {
  const letters = type.split("");
  const isIntuitive = letters[1] === "N";
  const isThinking = letters[2] === "T";

  if (isIntuitive && isThinking) {
    return "#f2c94c";
  }
  if (isIntuitive && !isThinking) {
    return "#f2994a";
  }
  if (!isIntuitive && isThinking) {
    return "#56ccf2";
  }
  return "#6fcf97";
};

const drawArrow = (
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number
) => {
  const headLength = 10;
  const angle = Math.atan2(endY - startY, endX - startX);
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();

  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(endX - headLength * Math.cos(angle - Math.PI / 7), endY - headLength * Math.sin(angle - Math.PI / 7));
  context.lineTo(endX - headLength * Math.cos(angle + Math.PI / 7), endY - headLength * Math.sin(angle + Math.PI / 7));
  context.closePath();
  context.fill();
};

const drawMbtiMap = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  highlightType: MbtiType | null
) => {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#0b0d12";
  context.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const axisLength = Math.min(width, height) * 0.36;

  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  context.lineWidth = 1;
  for (let i = 1; i <= 4; i += 1) {
    const offset = (axisLength / 4) * i;
    context.beginPath();
    context.moveTo(centerX - axisLength, centerY - offset);
    context.lineTo(centerX + axisLength, centerY - offset);
    context.stroke();
    context.beginPath();
    context.moveTo(centerX - axisLength, centerY + offset);
    context.lineTo(centerX + axisLength, centerY + offset);
    context.stroke();
    context.beginPath();
    context.moveTo(centerX - offset, centerY - axisLength);
    context.lineTo(centerX - offset, centerY + axisLength);
    context.stroke();
    context.beginPath();
    context.moveTo(centerX + offset, centerY - axisLength);
    context.lineTo(centerX + offset, centerY + axisLength);
    context.stroke();
  }

  context.strokeStyle = "rgba(255, 255, 255, 0.6)";
  context.fillStyle = "rgba(255, 255, 255, 0.6)";
  context.lineWidth = 2;
  drawArrow(context, centerX - axisLength, centerY, centerX + axisLength, centerY);
  drawArrow(context, centerX, centerY + axisLength, centerX, centerY - axisLength);

  context.font = "600 16px ui-sans-serif, system-ui, -apple-system, sans-serif";
  context.fillStyle = "rgba(255, 255, 255, 0.8)";
  context.textAlign = "center";
  context.fillText("Extraverted", centerX, centerY - axisLength - 18);
  context.fillText("Introverted", centerX, centerY + axisLength + 26);
  context.textAlign = "left";
  context.fillText("N", centerX + axisLength + 10, centerY + 6);
  context.textAlign = "right";
  context.fillText("S", centerX - axisLength - 10, centerY + 6);

  const drawType = (type: MbtiType, opacity: number, radius: number, bold: boolean) => {
    const { x, y } = getTypePosition(type);
    const pointX = centerX + x * axisLength;
    const pointY = centerY - y * axisLength;
    const color = getTypeColor(type);
    context.globalAlpha = opacity;
    context.beginPath();
    context.fillStyle = color;
    context.shadowBlur = 12;
    context.shadowColor = color;
    context.arc(pointX, pointY, radius, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.globalAlpha = opacity;
    context.fillStyle = "rgba(255, 255, 255, 0.9)";
    context.font = `${bold ? "700" : "600"} 14px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(type, pointX + radius + 8, pointY);
    context.globalAlpha = 1;
  };

  MBTI_TYPES.forEach((type) => {
    drawType(type, 0.5, 8, false);
  });

  if (highlightType) {
    drawType(highlightType, 1, 10, true);
  }
};

export default function MbtiMapCanvas({ highlightType }: MbtiMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const parsedType = useMemo(() => parseMbtiType(highlightType), [highlightType]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawMbtiMap(context, rect.width, rect.height, parsedType);
    };

    draw();

    const observer = new ResizeObserver(draw);
    observer.observe(canvas);

    return () => {
      observer.disconnect();
    };
  }, [parsedType]);

  return <canvas ref={canvasRef} className="mbti-map-canvas" role="img" aria-label="MBTI axis map" />;
}
