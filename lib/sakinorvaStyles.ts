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
  background-color: rgb(var(--fn-color) / var(--fn-alpha));
  border: 1px solid rgb(var(--fn-color) / calc(var(--fn-alpha) + 0.18));
}
.kekka .function-label {
  font-weight: 700;
}
.kekka .function-value {
  font-weight: 700;
}
.kekka .function-ne {
  --fn-color: 0 188 212;
}
.kekka .function-ni {
  --fn-color: 255 111 0;
}
.kekka .function-se {
  --fn-color: 76 175 80;
}
.kekka .function-si {
  --fn-color: 233 30 99;
}
.kekka .function-te {
  --fn-color: 33 150 243;
}
.kekka .function-ti {
  --fn-color: 255 193 7;
}
.kekka .function-fe {
  --fn-color: 229 57 53;
}
.kekka .function-fi {
  --fn-color: 142 36 170;
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
  background-color: rgb(var(--fn-color) / var(--fn-alpha));
  color: #1b1305;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.kekka .myers_letter_type span {
  display: inline-flex;
  margin-left: 6px;
}
`;
