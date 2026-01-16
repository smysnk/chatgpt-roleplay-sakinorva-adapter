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
  border: 1px solid rgb(var(--fn-color) / calc(var(--fn-alpha) + 0.18));
}
.kekka .function-label {
  font-weight: 700;
}
.kekka .function-value {
  font-weight: 700;
}
.kekka .function-ne {
  --fn-color: 78 129 255;
}
.kekka .function-ni {
  --fn-color: 255 159 64;
}
.kekka .function-se {
  --fn-color: 66 196 123;
}
.kekka .function-si {
  --fn-color: 210 86 214;
}
.kekka .function-te {
  --fn-color: 64 201 222;
}
.kekka .function-ti {
  --fn-color: 246 196 61;
}
.kekka .function-fe {
  --fn-color: 234 78 98;
}
.kekka .function-fi {
  --fn-color: 162 88 234;
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
  --type-color: 214 178 90;
  --type-alpha: var(--fn-alpha, 0.55);
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgb(var(--type-color) / calc(var(--type-alpha) + 0.2));
  background: rgb(var(--type-color) / var(--type-alpha));
  color: #0b0d12;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.kekka .type-letter-n {
  --type-color: 78 129 255;
}
.kekka .type-letter-s {
  --type-color: 66 196 123;
}
.kekka .type-letter-t {
  --type-color: 64 201 222;
}
.kekka .type-letter-f {
  --type-color: 197 82 200;
}
.kekka .myers_letter_type span {
  display: inline-flex;
  margin-left: 6px;
}
`;
