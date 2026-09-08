import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * 화면 안내 문서를 만든다 — 텍스트에 사진을 끼워 한 파일로.
 *
 * `보고서-화면안내.md`를 읽어 정해진 자리에 사진을 넣고, 브라우저에서 열거나
 * 인쇄해서 PDF로 만들 수 있는 문서 하나(`화면안내.html`)로 내놓는다.
 *
 * 사진은 파일 안에 통째로 담는다(base64). 문서만 보내면 되고 사진 폴더를
 * 같이 보낼 필요가 없다.
 */

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ""));
const DOC = path.join(HERE, "..", "보고서-화면안내.md");

/** 어느 제목 뒤에 어느 사진을 넣을지 */
const SHOTS = [
  ["## 1. 첫 화면", "01-첫화면.jpg", "처음 들어오면 보이는 화면"],
  ["## 2. 회원가입과 로그인", "02-로그인.jpg", "로그인 화면"],
  ["", "03-회원가입.jpg", "회원가입 화면"],
  ["## 3. 설문 화면", "04-설문.jpg", "설문 화면. 위쪽 막대가 진행 정도"],
  ["## 4. 내 결과", "05-내결과.jpg", "설문을 마치면 보이는 결과"],
  ["## 5. 관리자 로그인", "06-관리자로그인.jpg", "관리자 로그인"],
  ["## 6. 관리자 첫 화면", "07-관리자첫화면.jpg", "관리자 첫 화면"],
  ["### ① 직무능력과 기질·성격", "08-분석-표.jpg", "성향 7축 × 직무능력 3축 표"],
  ["", "09-분석-점분포.jpg", "칸을 누르면 열리는 점 분포"],
  ["### ② 예측 대 실제", "10-예측대실제.jpg", "논문 예측과 실제 비교"],
  ["### ③ 분포", "11-분포.jpg", "축마다 사람들이 퍼진 모양"],
  ["### ④ 평가 대조", "12-평가대조.jpg", "본인 답과 관리자 평가"],
  ["### ⑤ 검사 신뢰도", "13-신뢰도.jpg", "문항과 응답의 신뢰도"],
  ["## 8. 구성원", "14-구성원.jpg", "구성원 목록"],
  ["", "15-구성원상세.jpg", "이름을 누르면 나오는 상세"],
  ["## 9. 관리자 평가", "16-관리자평가.jpg", "1~10점으로 매기는 화면"],
  ["## 10. 문항", "17-문항.jpg", "실제로 나가는 120문항"],
];

const img = (file, caption) => {
  const p = path.join(HERE, file);
  if (!existsSync(p)) return `<p class="missing">[사진 없음: ${file}]</p>`;
  const b64 = readFileSync(p).toString("base64");
  return `<figure><img src="data:image/jpeg;base64,${b64}" alt="${caption}"><figcaption>${caption}</figcaption></figure>`;
};

// ── 마크다운을 아주 단순하게 HTML로 ──
function render(md) {
  const out = [];
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    if (line === "---") {
      out.push('<hr>');
    } else if (/^### /.test(line)) {
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (/^## /.test(line)) {
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (/^# /.test(line)) {
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (/^- /.test(line)) {
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (line === "") {
      out.push("");
    } else {
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  // 연달아 붙은 <li>를 <ul>로 감싼다
  return out
    .join("\n")
    .replace(/(<li>[\s\S]*?<\/li>)(?!\n<li>)/g, (m) => `<ul>${m}</ul>`)
    .replace(/<\/ul>\n<ul>/g, "\n");
}

const inline = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>');

// ── 조립 ──
let md = readFileSync(DOC, "utf8");

/*
  접속 주소는 문서 원본에 적지 않는다. **저장소가 공개**라 주소가 알려지면
  아무나 가입할 수 있고, 그 답이 평균과 상관에 그대로 섞인다.

  주소는 커밋되지 않는 `site-url.txt`(gitignore)에 두고 만들 때만 끼운다.
  파일이 없으면 주소 없이 만들어진다 — 받아서 바로 돌려도 깨지지 않는다.
*/
const urlFile = path.join(HERE, "site-url.txt");
if (existsSync(urlFile)) {
  const url = readFileSync(urlFile, "utf8").trim();
  const NL = String.fromCharCode(10);
  const at = md.indexOf(NL); // 첫 제목 줄 끝
  if (url && at > 0) md = md.slice(0, at + 1) + NL + url + NL + md.slice(at + 1);
}

// 제목 뒤에 사진을 끼운다. 제목이 빈 문자열이면 바로 앞 사진 뒤에 이어 붙인다
let pending = [];
for (const [heading, file, caption] of SHOTS) {
  if (heading === "") {
    pending.push([file, caption]);
    continue;
  }
  if (pending.length) pending = [];
  const group = [[file, caption]];
  // 이 제목에 딸린 뒤따르는 빈-제목 항목들을 모은다
  const idx = SHOTS.findIndex((x) => x[0] === heading && x[1] === file);
  for (let j = idx + 1; j < SHOTS.length && SHOTS[j][0] === ""; j++)
    group.push([SHOTS[j][1], SHOTS[j][2]]);

  const block = group.map(([f, c]) => img(f, c)).join("\n");
  const at = md.indexOf(heading);
  if (at < 0) {
    console.log(`  ⚠ 제목을 못 찾음: ${heading}`);
    continue;
  }
  const eol = md.indexOf("\n", at);
  md = md.slice(0, eol + 1) + `\n@@IMG${group[0][0]}@@\n` + md.slice(eol + 1);
}

let html = render(md);
for (const [, file, caption] of SHOTS) {
  html = html.replace(
    new RegExp(`<p>@@IMG${file.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}@@</p>`),
    () => {
      const idx = SHOTS.findIndex((x) => x[1] === file);
      const group = [SHOTS[idx]];
      for (let j = idx + 1; j < SHOTS.length && SHOTS[j][0] === ""; j++)
        group.push(SHOTS[j]);
      return group.map(([, f, c]) => img(f, c)).join("\n");
    },
  );
}

const page = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>7차원 성향 설문 화면 안내</title>
<style>
  :root { --ink:#1a1917; --muted:#6b6660; --line:#e0dcd5; --wash:#faf9f7; }
  * { box-sizing: border-box; }
  body {
    margin: 0 auto; max-width: 46rem; padding: 4rem 2rem 6rem;
    font-family: "Pretendard", "맑은 고딕", "Malgun Gothic", sans-serif;
    color: var(--ink); line-height: 1.85; font-size: 16px;
    background: #fff;
  }
  h1 { font-size: 1.75rem; margin: 3.5rem 0 1rem; line-height: 1.4; }
  h1:first-child { margin-top: 0; font-size: 2rem; }
  h2 { font-size: 1.3rem; margin: 3rem 0 .9rem; line-height: 1.45; }
  h3 { font-size: 1.08rem; margin: 2.2rem 0 .7rem; }
  p { margin: 0 0 1rem; }
  ul { margin: 0 0 1rem; padding-left: 1.3rem; }
  li { margin-bottom: .3rem; }
  hr { border: 0; border-top: 1px solid var(--line); margin: 3rem 0; }
  code {
    background: var(--wash); border: 1px solid var(--line);
    border-radius: 4px; padding: .1em .4em; font-size: .92em;
  }
  a { color: #2f5fa8; }
  figure { margin: 1.5rem 0 2rem; }
  figure img {
    width: 100%; display: block;
    border: 1px solid var(--line); border-radius: 8px;
  }
  figcaption {
    margin-top: .6rem; font-size: .88rem; color: var(--muted); text-align: center;
  }
  .missing {
    background: #fff6f6; border: 1px dashed #d9a5a5; color: #a15b5b;
    padding: 1rem; border-radius: 8px; text-align: center; font-size: .9rem;
  }
  @media print {
    body { padding: 0; max-width: none; font-size: 11pt; }
    h1, h2, h3 { break-after: avoid; }
    figure { break-inside: avoid; }
    a { color: inherit; text-decoration: none; }
  }
</style>
</head>
<body>
${html}
</body>
</html>`;

const out = path.join(HERE, "..", "화면안내.html");
writeFileSync(out, page, "utf8");

const missing = SHOTS.filter(([, f]) => !existsSync(path.join(HERE, f)));
console.log(`  만들었습니다: ${out}`);
console.log(`  사진 ${SHOTS.length - missing.length} / ${SHOTS.length}장`);
if (missing.length)
  console.log("  아직 없는 사진:", missing.map(([, f]) => f).join(", "));
