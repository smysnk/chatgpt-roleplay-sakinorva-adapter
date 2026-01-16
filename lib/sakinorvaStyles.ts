export const SAKINORVA_RESULTS_CSS = `
.kekka {
  font-family: "Inter", "Segoe UI", system-ui, sans-serif;
}
.kekka .primary {
  color: #f0c96a;
  font-weight: 700;
}
.kekka .secondary {
  color: #9aa3b2;
  font-weight: 600;
}
.kekka .header {
  margin-top: 16px;
}
.kekka .row.grant span:last-child,
.kekka .row.myers span:last-child,
.kekka .row.axis span:last-child {
  color: #f0c96a;
}
.kekka .row.grant_itirann span:last-child {
  color: #f5f7fb;
}
.kekka .myers_letter_type span {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(214, 178, 90, 0.4);
  margin-left: 6px;
}
.kekka .function-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  padding: 4px 10px;
  border-radius: 999px;
  color: #0b0d12;
  font-weight: 700;
  letter-spacing: 0.02em;
  border: 1px solid rgba(0, 0, 0, 0.2);
}
.kekka .function-score {
  color: #f5f7fb;
  font-weight: 600;
}
.kekka .function-fe {
  --function-color: 214 74 104;
}
.kekka .function-fi {
  --function-color: 140 76 214;
}
.kekka .function-te {
  --function-color: 76 118 214;
}
.kekka .function-ti {
  --function-color: 214 166 76;
}
.kekka .function-ne {
  --function-color: 76 214 170;
}
.kekka .function-ni {
  --function-color: 214 76 170;
}
.kekka .function-se {
  --function-color: 214 118 76;
}
.kekka .function-si {
  --function-color: 76 214 124;
}
.kekka .function-badge.intensity-1 {
  background-color: rgba(var(--function-color), 0.2);
}
.kekka .function-badge.intensity-2 {
  background-color: rgba(var(--function-color), 0.35);
}
.kekka .function-badge.intensity-3 {
  background-color: rgba(var(--function-color), 0.5);
}
.kekka .function-badge.intensity-4 {
  background-color: rgba(var(--function-color), 0.7);
}
.kekka .function-badge.intensity-5 {
  background-color: rgba(var(--function-color), 0.9);
}
`;
