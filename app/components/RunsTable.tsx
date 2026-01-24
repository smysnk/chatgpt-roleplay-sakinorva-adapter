"use client";

import StnfMiniChart from "@/app/components/StnfMiniChart";
import { getScoreRange, getStnfValues } from "@/app/components/stnfUtils";

type RunItem = {
  id: string;
  slug: string;
  testLabel: string;
  character: string;
  context: string | null;
  grantType: string | null;
  axisType: string | null;
  myersType: string | null;
  functionScores: Record<string, number> | null;
  createdAt: string;
  runPath: string;
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const getTypeLetters = (typeValue: string | null) => {
  if (!typeValue) {
    return [];
  }
  return typeValue
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .split("")
    .filter(Boolean);
};

const renderTypeCell = (typeValue: string | null) => {
  const letters = getTypeLetters(typeValue);
  if (!letters.length) {
    return <span className="helper">—</span>;
  }
  return (
    <span className="type-badges">
      {letters.map((letter, index) => (
        <span key={`${letter}-${index}`} className={`type-letter ${letter.toLowerCase()}`}>
          {letter}
        </span>
      ))}
    </span>
  );
};

export default function RunsTable({
  title,
  description,
  items,
  loading,
  error,
  onRowClick
}: {
  title: string;
  description: string;
  items: RunItem[];
  loading: boolean;
  error: string | null;
  onRowClick: (path: string) => void;
}) {
  return (
    <div className="app-card">
      <h2>{title}</h2>
      <p className="helper">{description}</p>
      {loading ? (
        <p style={{ marginTop: "20px" }}>Loading runs…</p>
      ) : error ? (
        <div className="error">{error}</div>
      ) : items.length ? (
        <div className="table-wrapper" style={{ marginTop: "20px" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Character</th>
                <th>Context</th>
                <th>Grant</th>
                <th>Axis</th>
                <th>Myers</th>
                <th>STNF</th>
                <th>Run</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const stnfValues = getStnfValues(item.functionScores);
                const scoreRange = getScoreRange(item.functionScores);
                return (
                  <tr
                    key={item.id}
                    className="is-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => onRowClick(item.runPath)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(item.runPath);
                      }
                    }}
                  >
                    <td>{item.testLabel}</td>
                    <td>{item.character}</td>
                    <td>
                      <span
                        className={`badge ${item.context ? "" : "muted"}`}
                        title={item.context || "No context provided."}
                      >
                        Context
                      </span>
                    </td>
                    <td>{renderTypeCell(item.grantType)}</td>
                    <td>{renderTypeCell(item.axisType)}</td>
                    <td>{renderTypeCell(item.myersType)}</td>
                    <td>
                      {stnfValues ? (
                        <StnfMiniChart
                          sensing={stnfValues.sensing}
                          thinking={stnfValues.thinking}
                          intuition={stnfValues.intuition}
                          feeling={stnfValues.feeling}
                          minScore={scoreRange?.min}
                          maxScore={scoreRange?.max}
                        />
                      ) : (
                        <span className="helper">—</span>
                      )}
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ marginTop: "20px" }} className="helper">
          No runs saved yet. Start by running a character.
        </p>
      )}
    </div>
  );
}
