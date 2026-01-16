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
.kekka .function-score {
  --fn-color: 214 178 90;
  --fn-alpha: 0.25;
  border-radius: 10px;
  padding: 6px 10px;
  background: rgb(var(--fn-color) / var(--fn-alpha));
  border: 1px solid rgb(var(--fn-color) / calc(var(--fn-alpha) + 0.25));
}
.kekka .function-label {
  font-weight: 700;
}
.kekka .function-value {
  font-weight: 700;
}
.kekka .function-ne {
  --fn-color: 250 204 92;
}
.kekka .function-ni {
  --fn-color: 139 92 246;
}
.kekka .function-se {
  --fn-color: 56 189 248;
}
.kekka .function-si {
  --fn-color: 248 113 113;
}
.kekka .function-te {
  --fn-color: 59 130 246;
}
.kekka .function-ti {
  --fn-color: 249 115 22;
}
.kekka .function-fe {
  --fn-color: 239 68 68;
}
.kekka .function-fi {
  --fn-color: 168 85 247;
}
.kekka .score-1 {
  --fn-alpha: 0.12;
}
.kekka .score-2 {
  --fn-alpha: 0.18;
}
.kekka .score-3 {
  --fn-alpha: 0.24;
}
.kekka .score-4 {
  --fn-alpha: 0.3;
}
.kekka .score-5 {
  --fn-alpha: 0.36;
}
.kekka .score-6 {
  --fn-alpha: 0.42;
}
.kekka .score-7 {
  --fn-alpha: 0.5;
}
.kekka .score-8 {
  --fn-alpha: 0.58;
}
.kekka .score-9 {
  --fn-alpha: 0.68;
}
.kekka .score-10 {
  --fn-alpha: 0.78;
}
.kekka .header {
  margin-top: 16px;
}
.kekka .row.grant span:last-child:not(.type-badge),
.kekka .row.myers span:last-child:not(.type-badge),
.kekka .row.axis span:last-child:not(.type-badge) {
  color: #f0c96a;
}
.kekka .row.grant_itirann span:last-child {
  color: #f5f7fb;
}
.kekka .type-badge {
  --fn-color: 214 178 90;
  --fn-alpha: 0.55;
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgb(var(--fn-color) / calc(var(--fn-alpha) + 0.2));
  background: rgb(var(--fn-color) / var(--fn-alpha));
  color: #1b1305;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.kekka .type-letter {
  --fn-color: 214 178 90;
  --fn-border: var(--fn-color);
  --fn-alpha: 0.55;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgb(var(--fn-border) / calc(var(--fn-alpha) + 0.2));
  background: rgb(var(--fn-color) / var(--fn-alpha));
  color: #1b1305;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.kekka .type-letter-n {
  --fn-color: 250 204 92;
  --fn-border: 139 92 246;
}
.kekka .type-letter-s {
  --fn-color: 56 189 248;
  --fn-border: 248 113 113;
}
.kekka .type-letter-t {
  --fn-color: 59 130 246;
  --fn-border: 249 115 22;
}
.kekka .type-letter-f {
  --fn-color: 239 68 68;
  --fn-border: 168 85 247;
}
.kekka .type-letter-e,
.kekka .type-letter-i,
.kekka .type-letter-j,
.kekka .type-letter-p {
  --fn-color: 148 163 184;
  --fn-alpha: 0.3;
  color: #f5f7fb;
}
.kekka .myers_letter_type span {
  display: inline-flex;
  margin-left: 6px;
}
`;
