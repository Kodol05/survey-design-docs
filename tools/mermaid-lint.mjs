#!/usr/bin/env node
/**
 * Mermaid 코드블록 검증기
 *
 * 마크다운 파일 안의 ```mermaid 블록을 전부 뽑아 실제 Mermaid 파서로 검사합니다.
 * GitHub에 올리기 전에 돌리면 "깨진 다이어그램"을 사전에 잡을 수 있습니다.
 *
 * 준비:
 *   cd tools && npm install
 *
 * 사용:
 *   node tools/mermaid-lint.mjs docs/*.md
 *   node tools/mermaid-lint.mjs docs          # 디렉터리를 주면 재귀 탐색
 *
 * 종료코드: 문제가 하나라도 있으면 1 (CI에서 그대로 실패 처리 가능)
 */
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

// ---- Mermaid는 브라우저 전제라 최소한의 DOM을 깔아준다 ----
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
for (const k of ['HTMLElement', 'SVGElement', 'Element', 'Node', 'MutationObserver', 'getComputedStyle']) {
  global[k] = dom.window[k];
}

const mermaid = (await import('mermaid')).default;
mermaid.initialize({ startOnLoad: false, suppressErrorRendering: true });

const MERMAID_VERSION = JSON.parse(
  fs.readFileSync(new URL('./node_modules/mermaid/package.json', import.meta.url), 'utf8')
).version;

// ---- 사내 규칙: GitHub(구버전 렌더러)에서 깨지는 문법 차단 ----
const BANNED = [
  [/^\s*swimlane-beta\b/m,     'swimlane-beta 는 Mermaid 11.16+ 필요 — GitHub에서 깨질 수 있음'],
  [/^\s*architecture-beta\b/m, 'architecture-beta 는 Mermaid 11.1+ 필요 — GitHub에서 깨질 수 있음'],
  [/^\s*usecase-beta\b/m,      'usecase-beta 는 아직 미출시 문법'],
  [/^\s*(radar|wardley|cynefin|treemap|venn|ishikawa|treeView|railroad[a-z-]*)-beta\b/m,
                               '신규 beta 다이어그램 — GitHub 렌더러가 지원하지 않을 가능성 높음'],
  [/\blayout:\s*elk\b/,        'layout: elk 는 별도 패키지 필요 — GitHub에서 무시됨'],
  [/@\{\s*icon:/,              'icon 셰이프는 registerIconPacks() 호출이 필요 — GitHub 불가'],
  [/@\{\s*img:/,               'img 셰이프는 Mermaid 11+ 전용 — 구버전에서 파싱 실패'],
];

// ---- 흔한 한글 문서 실수 ----
function styleWarnings(code) {
  const out = [];
  const type = code.trim().split('\n')[0];

  if (/^(flowchart|graph)\b/.test(type)) {
    // 따옴표로 감싼 라벨은 안전하므로 검사 전에 제거한다
    const bare = code.replace(/"[^"]*"/g, '""');

    // [/... 는 평행사변형 셰이프로 해석되어 경로 문자열이 깨진다
    if (/\[\/[^/\]]*\]/.test(bare)) {
      out.push('노드 라벨이 "/"로 시작하면 평행사변형 셰이프로 해석됨 → 따옴표로 감싸세요: ["/login"]');
    }
    // 따옴표 없는 라벨 안의 괄호는 파싱 실패.
    // 단 [( )] 원통, [[ ]] 서브루틴, [/ /] [\ \] 사다리꼴은 정상 셰이프이므로 제외한다.
    const label = /\[(?![([/\\|])([^[\]]*)\]/g;
    let m;
    while ((m = label.exec(bare)) !== null) {
      if (/[()]/.test(m[1])) {
        out.push('따옴표 없는 라벨 안의 괄호는 파싱 실패 → ["주문(결제)"] 처럼 감싸세요');
        break;
      }
    }
    if (/\[end\]/.test(bare)) {
      out.push('flowchart 노드에 소문자 end 금지 → "End" 또는 "END"');
    }
  }

  if (/^sequenceDiagram\b/.test(type)) {
    // participant X as "이름" → 따옴표가 화면에 그대로 찍힌다
    if (/^\s*(participant|actor)\s+\S+\s+as\s+".*"/m.test(code)) {
      out.push('participant ... as "이름" → 따옴표가 그대로 렌더됩니다. 따옴표를 빼세요');
    }
    if (/rect\s+#[0-9a-fA-F]/.test(code)) {
      out.push('sequenceDiagram 에서 hex 색상 불가(#은 주석) → rect rgb(240,240,240)');
    }
  }
  return out;
}

function extractBlocks(src) {
  const lines = src.split(/\r?\n/);
  const blocks = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (cur === null && /^\s*```\s*mermaid\s*$/.test(l)) cur = { start: i + 1, body: [] };
    else if (cur !== null && /^\s*```\s*$/.test(l)) { blocks.push({ start: cur.start, code: cur.body.join('\n') }); cur = null; }
    else if (cur !== null) cur.body.push(l);
  }
  return blocks;
}

function collect(target) {
  const st = fs.statSync(target);
  if (st.isFile()) return target.endsWith('.md') ? [target] : [];
  return fs.readdirSync(target).flatMap((n) => collect(path.join(target, n)));
}

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error('usage: node tools/mermaid-lint.mjs <파일 또는 디렉터리> ...');
  process.exit(2);
}

const files = [...new Set(targets.flatMap(collect))].sort();
console.log(`Mermaid ${MERMAID_VERSION} 로 검사합니다.\n`);

let nBlocks = 0, nErr = 0, nWarn = 0;

for (const f of files) {
  const blocks = extractBlocks(fs.readFileSync(f, 'utf8'));
  if (!blocks.length) continue;
  console.log(`${path.relative(process.cwd(), f)}  (${blocks.length} blocks)`);

  for (const b of blocks) {
    nBlocks++;
    const head = b.code.trim().split('\n')[0].slice(0, 44);
    const problems = [];

    for (const [re, msg] of BANNED) if (re.test(b.code)) problems.push(msg);
    problems.push(...styleWarnings(b.code));

    let parseErr = null;
    try {
      await mermaid.parse(b.code);
    } catch (e) {
      parseErr = String(e.message || e).split('\n').slice(0, 5).join('\n            ');
    }

    if (parseErr) {
      nErr++;
      console.log(`  FAIL  L${b.start}  ${head}\n            ${parseErr}`);
    } else if (problems.length) {
      nWarn += problems.length;
      console.log(`  WARN  L${b.start}  ${head}`);
    } else {
      console.log(`  ok    L${b.start}  ${head}`);
    }
    for (const p of problems) console.log(`            · ${p}`);
  }
  console.log('');
}

console.log(`검사 완료 — ${nBlocks}개 블록, 파싱 실패 ${nErr}건, 경고 ${nWarn}건`);
process.exit(nErr ? 1 : 0);
