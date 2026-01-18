"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

type LayerId = "grant" | "axis" | "myers";

type MbtiMapCanvasProps = {
  grantType?: string | null;
  axisType?: string | null;
  myersType?: string | null;
  functionScores?: Record<string, number> | null;
};

type Point = { x: number; y: number };

const STACK_WEIGHTS = [0.46, 0.26, 0.18, 0.1];

const BORDER_STYLES: Record<LayerId, number[]> = {
  grant: [],
  axis: [6, 6],
  myers: [2, 4]
};

const AXIS_LAYER_SCALE = 0.5;

const LAYER_LABELS: Record<LayerId, string> = {
  grant: "Grant",
  axis: "Axis",
  myers: "Myers"
};

const parseMbtiType = (value?: string | null): MbtiType | null => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/[^A-Za-z]/g, "").toUpperCase();
  const match = MBTI_TYPES.find((type) => normalized.includes(type));
  return match ?? null;
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

const functionVector = (fn: string): Point => {
  const kind = fn[0];
  const attitude = fn[1];
  const attitudeY = attitude === "e" ? 1 : -1;

  if (kind === "N") {
    return { x: 1, y: attitudeY };
  }
  if (kind === "S") {
    return { x: -1, y: attitudeY };
  }
  if (kind === "T") {
    return { x: 0.35, y: attitudeY * 0.7 };
  }
  return { x: -0.35, y: attitudeY * 0.7 };
};

const sumPoints = (points: Point[]) => ({
  x: points.reduce((acc, point) => acc + point.x, 0),
  y: points.reduce((acc, point) => acc + point.y, 0)
});

const scalePoint = (point: Point, scale: number) => ({
  x: point.x * scale,
  y: point.y * scale
});

const oppositeFunctionKind = (func: string) => {
  if (func === "S") {
    return "N";
  }
  if (func === "N") {
    return "S";
  }
  if (func === "T") {
    return "F";
  }
  return "T";
};

const addAttitude = (func: string, attitude: string) => `${func}${attitude}`;

const grantStack = (type: MbtiType) => {
  const letters = type.split("");
  const ei = letters[0];
  const sn = letters[1];
  const tf = letters[2];
  const jp = letters[3];

  const perceiving = sn;
  const judging = tf;
  let dom = "";
  let aux = "";

  if (ei === "E" && jp === "P") {
    dom = addAttitude(perceiving, "e");
    aux = addAttitude(judging, "i");
  } else if (ei === "E" && jp === "J") {
    dom = addAttitude(judging, "e");
    aux = addAttitude(perceiving, "i");
  } else if (ei === "I" && jp === "P") {
    dom = addAttitude(judging, "i");
    aux = addAttitude(perceiving, "e");
  } else {
    dom = addAttitude(perceiving, "i");
    aux = addAttitude(judging, "e");
  }

  const auxKind = aux[0];
  const domKind = dom[0];
  const auxOpposite = oppositeFunctionKind(auxKind);
  const domOpposite = oppositeFunctionKind(domKind);
  const domAttitude = dom[1];
  const tert = addAttitude(auxOpposite, domAttitude);
  const inf = addAttitude(domOpposite, domAttitude === "e" ? "i" : "e");

  return [dom, aux, tert, inf];
};

const myersStack = (type: MbtiType) => {
  const letters = type.split("");
  const ei = letters[0];
  const sn = letters[1];
  const tf = letters[2];
  const jp = letters[3];

  const perceiving = sn;
  const judging = tf;
  const extravertedPreferred = jp === "J" ? "J" : "P";

  const extravertedPreferredFn =
    extravertedPreferred === "J" ? addAttitude(judging, "e") : addAttitude(perceiving, "e");
  const introvertedPreferredFn =
    extravertedPreferred === "J" ? addAttitude(perceiving, "i") : addAttitude(judging, "i");

  const dom = ei === "E" ? extravertedPreferredFn : introvertedPreferredFn;
  const aux = ei === "E" ? introvertedPreferredFn : extravertedPreferredFn;

  const tert = addAttitude(oppositeFunctionKind(aux[0]), aux[1]);
  const inf = addAttitude(oppositeFunctionKind(dom[0]), dom[1]);

  return [dom, aux, tert, inf];
};

const stackCenter = (stack: string[]) => {
  const weightedPoints = stack.map((fn, index) => scalePoint(functionVector(fn), STACK_WEIGHTS[index]));
  return sumPoints(weightedPoints);
};

const axisCenter = (type: MbtiType) => {
  const letters = type.split("");
  const isExtraverted = letters[0] === "E";
  const isIntuitive = letters[1] === "N";
  const isThinking = letters[2] === "T";
  const isJudging = letters[3] === "J";

  const baseX = isIntuitive ? 0.9 : -0.9;
  const baseY = isExtraverted ? 0.9 : -0.9;
  const tfShiftX = isThinking ? -0.12 : 0.12;
  const jpShiftY = isJudging ? 0.18 : -0.18;

  return {
    x: baseX + tfShiftX,
    y: baseY + jpShiftY
  };
};

const axisTypeFromFunctions = (scores: Record<string, number>) => {
  const value = (key: string) => scores[key] ?? 0;
  const neSi = value("Ne") + value("Si");
  const seNi = value("Se") + value("Ni");
  const tiFe = value("Ti") + value("Fe");
  const teFi = value("Te") + value("Fi");

  const prefP = neSi >= seNi ? "NeSi" : "SeNi";
  const prefJ = tiFe >= teFi ? "TiFe" : "TeFi";

  const snLetter = prefP === "NeSi" ? "N" : "S";
  const tTotal = value("Ti") + value("Te");
  const fTotal = value("Fe") + value("Fi");
  const tfLetter = tTotal >= fTotal ? "T" : "F";

  const eTotal = value("Ne") + value("Se") + value("Te") + value("Fe");
  const iTotal = value("Ni") + value("Si") + value("Ti") + value("Fi");
  const eiLetter = eTotal >= iTotal ? "E" : "I";

  const bestEP = Math.max(value("Ne"), value("Se"));
  const bestEJ = Math.max(value("Te"), value("Fe"));
  const jpLetter = bestEJ >= bestEP ? "J" : "P";

  return `${eiLetter}${snLetter}${tfLetter}${jpLetter}`;
};

const buildBaseCenters = (layer: LayerId) => {
  const centers: Record<MbtiType, Point> = {} as Record<MbtiType, Point>;

  MBTI_TYPES.forEach((type) => {
    if (layer === "grant") {
      centers[type] = stackCenter(grantStack(type));
    } else if (layer === "myers") {
      centers[type] = stackCenter(myersStack(type));
    } else {
      centers[type] = axisCenter(type);
    }
  });

  return centers;
};

const createBoundingBox = () => [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 }
];

const clipPolygon = (polygon: Point[], A: number, B: number, C: number) => {
  if (!polygon.length) {
    return [];
  }

  const clipped: Point[] = [];
  const isInside = (point: Point) => A * point.x + B * point.y <= C + 1e-6;
  const intersection = (p1: Point, p2: Point) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const denom = A * dx + B * dy;
    if (Math.abs(denom) < 1e-6) {
      return p2;
    }
    const t = (C - A * p1.x - B * p1.y) / denom;
    return { x: p1.x + dx * t, y: p1.y + dy * t };
  };

  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const currentInside = isInside(current);
    const nextInside = isInside(next);

    if (currentInside && nextInside) {
      clipped.push(next);
    } else if (currentInside && !nextInside) {
      clipped.push(intersection(current, next));
    } else if (!currentInside && nextInside) {
      clipped.push(intersection(current, next));
      clipped.push(next);
    }
  }

  return clipped;
};

const polygonForType = (type: MbtiType, centers: Record<MbtiType, Point>) => {
  let polygon = createBoundingBox();
  const center = centers[type];

  MBTI_TYPES.forEach((otherType) => {
    if (otherType === type) {
      return;
    }
    const other = centers[otherType];
    const A = 2 * (other.x - center.x);
    const B = 2 * (other.y - center.y);
    const C = other.x * other.x + other.y * other.y - (center.x * center.x + center.y * center.y);
    polygon = clipPolygon(polygon, A, B, C);
  });

  return polygon;
};

const buildPolygons = (centers: Record<MbtiType, Point>) => {
  const polygons: Record<MbtiType, Point[]> = {} as Record<MbtiType, Point[]>;
  MBTI_TYPES.forEach((type) => {
    polygons[type] = polygonForType(type, centers);
  });
  return polygons;
};

const pointInPolygon = (point: Point, polygon: Point[]) => {
  if (!polygon.length) {
    return false;
  }
  let sign = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (Math.abs(cross) < 1e-6) {
      continue;
    }
    const currentSign = Math.sign(cross);
    if (sign === 0) {
      sign = currentSign;
    } else if (sign !== currentSign) {
      return false;
    }
  }
  return true;
};

const polygonCentroid = (polygon: Point[]) => {
  if (!polygon.length) {
    return { x: 0, y: 0 };
  }
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const cross = current.x * next.y - next.x * current.y;
    area += cross;
    cx += (current.x + next.x) * cross;
    cy += (current.y + next.y) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-6) {
    const avg = polygon.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 }
    );
    return { x: avg.x / polygon.length, y: avg.y / polygon.length };
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
};

const hashValue = (value: number) => {
  const sin = Math.sin(value) * 43758.5453123;
  return sin - Math.floor(sin);
};

const gaussianNoise = (x: number, y: number, seed: number) => {
  const u1 = Math.max(hashValue(x * 12.9898 + y * 78.233 + seed * 37.719), 1e-6);
  const u2 = hashValue(x * 93.9898 + y * 67.345 + seed * 12.345);
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.exp(-(z * z) / 2);
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

export default function MbtiMapCanvas({
  grantType,
  axisType,
  myersType,
  functionScores
}: MbtiMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerId>("grant");
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotateInterval, setRotateInterval] = useState(2500);
  const [hovered, setHovered] = useState<{ layer: LayerId; type: MbtiType } | null>(null);

  const axisFallback = useMemo(() => {
    if (axisType) {
      return axisType;
    }
    if (!functionScores) {
      return null;
    }
    return axisTypeFromFunctions(functionScores);
  }, [axisType, functionScores]);

  const highlights = useMemo(
    () => ({
      grant: parseMbtiType(grantType),
      axis: parseMbtiType(axisFallback),
      myers: parseMbtiType(myersType)
    }),
    [grantType, axisFallback, myersType]
  );

  const layers = useMemo(() => {
    const entries = (["grant", "axis", "myers"] as LayerId[]).map((layerId) => {
      const baseCenters = buildBaseCenters(layerId);
      let centers = baseCenters;
      let polygons = buildPolygons(centers);

      if (layerId === "axis") {
        centers = Object.fromEntries(
          Object.entries(baseCenters).map(([type, point]) => [
            type,
            { x: point.x * AXIS_LAYER_SCALE, y: point.y * AXIS_LAYER_SCALE }
          ])
        ) as Record<MbtiType, Point>;
        polygons = buildPolygons(centers);
      } else {
        const maxAbs = Math.max(
          ...Object.values(polygons).flatMap((points) =>
            points.map((point) => Math.max(Math.abs(point.x), Math.abs(point.y)))
          )
        );
        if (Number.isFinite(maxAbs) && maxAbs > 0) {
          const scale = 1 / maxAbs;
          centers = Object.fromEntries(
            Object.entries(baseCenters).map(([type, point]) => [
              type,
              { x: point.x * scale, y: point.y * scale }
            ])
          ) as Record<MbtiType, Point>;
          polygons = buildPolygons(centers);
        }
      }
      const polygonBounds = Object.fromEntries(
        MBTI_TYPES.map((type) => {
          const points = polygons[type];
          if (!points.length) {
            return [type, null];
          }
          const xs = points.map((point) => point.x);
          const ys = points.map((point) => point.y);
          return [
            type,
            {
              minX: Math.min(...xs),
              maxX: Math.max(...xs),
              minY: Math.min(...ys),
              maxY: Math.max(...ys)
            }
          ];
        })
      ) as Record<MbtiType, { minX: number; maxX: number; minY: number; maxY: number } | null>;

      const polygonCenters = Object.fromEntries(
        MBTI_TYPES.map((type) => [type, polygonCentroid(polygons[type])])
      ) as Record<MbtiType, Point>;

      return { id: layerId, centers, polygons, polygonBounds, polygonCenters };
    });
    return entries;
  }, []);

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

      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const axisLength = Math.min(width, height) * 0.36;

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#0b0d12";
      context.fillRect(0, 0, width, height);

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
      context.fillText("Extraverted", centerX, centerY - axisLength - 20);
      context.fillText("Introverted", centerX, centerY + axisLength + 28);
      context.textAlign = "left";
      context.fillText("Intuition", centerX + axisLength + 12, centerY + 6);
      context.textAlign = "right";
      context.fillText("Sensing", centerX - axisLength - 12, centerY + 6);

      const imageData = context.createImageData(width, height);
      const data = imageData.data;
      const activeLayers = layers.filter((layer) => layer.id === activeLayer);

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const normX = (x - centerX) / axisLength;
          const normY = (centerY - y) / axisLength;
          if (Math.abs(normX) > 1 || Math.abs(normY) > 1) {
            continue;
          }

          const candidates: { layer: LayerId; type: MbtiType }[] = [];
          activeLayers.forEach((layer) => {
            MBTI_TYPES.forEach((type) => {
              const bounds = layer.polygonBounds[type];
              if (!bounds) {
                return;
              }
              if (
                normX < bounds.minX ||
                normX > bounds.maxX ||
                normY < bounds.minY ||
                normY > bounds.maxY
              ) {
                return;
              }
              if (pointInPolygon({ x: normX, y: normY }, layer.polygons[type])) {
                candidates.push({ layer: layer.id, type });
              }
            });
          });

          if (!candidates.length) {
            continue;
          }

          let chosen = candidates[0];
          if (candidates.length > 1) {
            let bestScore = -Infinity;
            candidates.forEach((candidate) => {
              const seed = candidate.layer === "grant" ? 13 : candidate.layer === "axis" ? 37 : 59;
              const score = gaussianNoise(normX, normY, seed);
              if (score > bestScore) {
                bestScore = score;
                chosen = candidate;
              }
            });
          }

          const color = getTypeColor(chosen.type);
          const opacity =
            highlights[chosen.layer] === chosen.type
              ? 1
              : hovered && hovered.layer === chosen.layer && hovered.type === chosen.type
                ? 0.85
                : 0.5;
          const rgb = color
            .replace("#", "")
            .match(/.{2}/g)
            ?.map((value) => parseInt(value, 16));
          if (!rgb) {
            continue;
          }
          const index = (y * width + x) * 4;
          data[index] = rgb[0];
          data[index + 1] = rgb[1];
          data[index + 2] = rgb[2];
          data[index + 3] = Math.round(opacity * 255);
        }
      }

      context.putImageData(imageData, 0, 0);

      activeLayers.forEach((layer) => {
        MBTI_TYPES.forEach((type) => {
          const points = layer.polygons[type];
          if (!points.length) {
            return;
          }
          context.beginPath();
          points.forEach((point, index) => {
            const x = centerX + point.x * axisLength;
            const y = centerY - point.y * axisLength;
            if (index === 0) {
              context.moveTo(x, y);
            } else {
              context.lineTo(x, y);
            }
          });
          context.closePath();

          const isHighlight = highlights[layer.id] === type;
          const isHover = hovered?.layer === layer.id && hovered.type === type;
          context.lineWidth = isHover ? 3 : isHighlight ? 2.5 : 1;
          context.setLineDash(BORDER_STYLES[layer.id]);
          context.strokeStyle = isHighlight
            ? "rgba(255, 255, 255, 0.9)"
            : "rgba(255, 255, 255, 0.35)";
          context.stroke();
          context.setLineDash([]);
        });
      });

      const drawMarker = (layerId: LayerId, type: MbtiType) => {
        const layer = layers.find((entry) => entry.id === layerId);
        if (!layer) {
          return;
        }
        const center = layer.centers[type];
        const x = centerX + center.x * axisLength;
        const y = centerY - center.y * axisLength;
        context.save();
        context.lineWidth = 2;
        if (layerId === "axis") {
          context.fillStyle = "rgba(255, 255, 255, 0.9)";
          context.strokeStyle = "rgba(255, 255, 255, 0.9)";
          context.beginPath();
          context.rect(x - 5, y - 5, 10, 10);
          context.fill();
          context.stroke();
        } else {
          context.fillStyle = "rgba(255, 255, 255, 0.95)";
          context.strokeStyle = "rgba(11, 13, 18, 0.8)";
          context.beginPath();
          context.arc(x, y, 6, 0, Math.PI * 2);
          context.fill();
          context.stroke();
        }
        context.restore();
      };

      if (highlights[activeLayer]) {
        drawMarker(activeLayer, highlights[activeLayer]);
      }

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = "600 13px ui-sans-serif, system-ui, -apple-system, sans-serif";
      activeLayers.forEach((layer) => {
        MBTI_TYPES.forEach((type) => {
          const center = layer.polygonCenters[type];
          const x = centerX + center.x * axisLength;
          const y = centerY - center.y * axisLength;
          const isHighlight = highlights[layer.id] === type;
          const isHover = hovered?.layer === layer.id && hovered.type === type;
          const opacity = isHighlight ? 1 : isHover ? 0.9 : 0.5;
          context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          context.fillText(type, x, y);
        });
      });
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);

    return () => {
      observer.disconnect();
    };
  }, [layers, activeLayer, highlights, hovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const handleMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const axisLength = Math.min(rect.width, rect.height) * 0.36;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const normX = (x - centerX) / axisLength;
      const normY = (centerY - y) / axisLength;

      if (Math.abs(normX) > 1 || Math.abs(normY) > 1) {
        setHovered(null);
        return;
      }

      const activeLayers = layers.filter((layer) => layer.id === activeLayer);
      const candidates: { layer: LayerId; type: MbtiType }[] = [];
      activeLayers.forEach((layer) => {
        MBTI_TYPES.forEach((type) => {
          const bounds = layer.polygonBounds[type];
          if (!bounds) {
            return;
          }
          if (
            normX < bounds.minX ||
            normX > bounds.maxX ||
            normY < bounds.minY ||
            normY > bounds.maxY
          ) {
            return;
          }
          if (pointInPolygon({ x: normX, y: normY }, layer.polygons[type])) {
            candidates.push({ layer: layer.id, type });
          }
        });
      });

      if (!candidates.length) {
        setHovered(null);
        return;
      }

      let chosen = candidates[0];
      if (candidates.length > 1) {
        let bestScore = -Infinity;
        candidates.forEach((candidate) => {
          const seed = candidate.layer === "grant" ? 13 : candidate.layer === "axis" ? 37 : 59;
          const score = gaussianNoise(normX, normY, seed);
          if (score > bestScore) {
            bestScore = score;
            chosen = candidate;
          }
        });
      }

      setHovered(chosen);
    };

    const handleLeave = () => {
      setHovered(null);
    };

    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseleave", handleLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [layers, activeLayer]);

  useEffect(() => {
    if (!autoRotate) {
      return;
    }
    const order: LayerId[] = ["grant", "axis", "myers"];
    const tick = () => {
      setActiveLayer((current) => {
        const index = order.indexOf(current);
        return order[(index + 1) % order.length];
      });
    };
    const interval = window.setInterval(tick, rotateInterval);
    return () => {
      window.clearInterval(interval);
    };
  }, [autoRotate, rotateInterval]);

  return (
    <div className="mbti-map-panel">
      <div className="mbti-map-controls">
        {(Object.keys(LAYER_LABELS) as LayerId[]).map((layerId) => (
          <button
            key={layerId}
            type="button"
            className={`mbti-map-toggle ${activeLayer === layerId ? "is-active" : ""}`}
            onClick={() => {
              setActiveLayer(layerId);
              setAutoRotate(false);
            }}
            aria-pressed={activeLayer === layerId}
          >
            <span className="mbti-map-toggle-label">{LAYER_LABELS[layerId]}</span>
            <span className="mbti-map-toggle-style" aria-hidden="true">
              <span className={`mbti-map-line ${layerId}`} />
            </span>
          </button>
        ))}
        <button
          type="button"
          className={`mbti-map-toggle ${autoRotate ? "is-active" : ""}`}
          onClick={() => setAutoRotate((value) => !value)}
          aria-pressed={autoRotate}
        >
          <span className="mbti-map-toggle-label">Auto-rotate</span>
          <span className="mbti-map-toggle-style" aria-hidden="true">
            <span className="mbti-map-line rotate" />
          </span>
        </button>
        <label className="mbti-map-speed">
          <span className="mbti-map-speed-label">Speed</span>
          <input
            type="range"
            min={1000}
            max={6000}
            step={250}
            value={rotateInterval}
            onChange={(event) => setRotateInterval(Number(event.target.value))}
            aria-label="Auto-rotate speed"
          />
        </label>
      </div>
      <canvas ref={canvasRef} className="mbti-map-canvas" role="img" aria-label="MBTI axis map" />
    </div>
  );
}
