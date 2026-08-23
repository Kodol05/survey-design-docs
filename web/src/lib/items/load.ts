import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { ItemFile } from "./types";
import { validateItemFile, type Problem } from "./validate";

/** 문항 파일을 읽고 형식 검사를 통과한 것만 돌려준다. seed가 이 함수만 쓴다. */
export function loadItemFile(
  path: string,
  opts: { strictCount?: boolean } = {},
): ItemFile {
  const file = parse(readFileSync(path, "utf8")) as ItemFile;
  const problems = validateItemFile(file, opts);
  if (problems.length) throw new ItemFileError(path, problems);
  return file;
}

export class ItemFileError extends Error {
  constructor(
    readonly path: string,
    readonly problems: Problem[],
  ) {
    super(
      `${path} — 문항 파일 검사 실패 ${problems.length}건\n` +
        problems.map((p) => `  [${p.code}] ${p.message}`).join("\n"),
    );
    this.name = "ItemFileError";
  }
}
