import { loadItemFile } from "../src/lib/items/load";
import { ABILITY_AXES, EXPECTED, TRAIT_SCALES } from "../src/lib/items/types";

const f = loadItemFile("data/items/v1.yaml");
const items = f.items;

console.log(`\n문항 진행 — ${items.length} / ${EXPECTED.total}\n`);
for (const s of TRAIT_SCALES) {
  const n = items.filter((i) => i.kind === "trait" && i.scale === s).length;
  const rev = items.filter((i) => i.kind === "trait" && i.scale === s && i.reverse).length;
  const mark = n === 15 ? "OK " : "   ";
  console.log(`${mark}${s.padEnd(7)} ${String(n).padStart(2)} / 15   역방향 ${rev}`);
}
console.log("");
for (const a of ABILITY_AXES) {
  const n = items.filter((i) => i.kind === "ability" && i.axis === a).length;
  const mark = n === EXPECTED.perAbility ? "OK " : "   ";
  console.log(`${mark}${a.padEnd(7)} ${String(n).padStart(2)} / ${EXPECTED.perAbility}`);
}
const rev = items.filter((i) => i.reverse).length;
const pairs = items.filter((i) => i.antonymOf).length / 2;
console.log(`\n역방향 ${rev}/${items.length} = ${((rev / items.length) * 100).toFixed(0)}%  (목표 25~45%)`);
console.log(`반대 문항 짝 ${pairs}쌍\n`);

// 전체 문항이 다 찼을 때만 통과하는 엄격 검사
import { validateItemFile } from "../src/lib/items/validate";
const strict = validateItemFile(f, { strictCount: true });
if (strict.length) {
  console.log(`엄격 검사 실패 ${strict.length}건`);
  for (const p of strict) console.log(`  [${p.code}] ${p.message}`);
  process.exit(1);
}
console.log("엄격 검사 통과 — seed 가능\n");
