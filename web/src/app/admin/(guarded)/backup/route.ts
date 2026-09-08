import { readFile } from "node:fs/promises";
import { requireAdmin } from "@/lib/auth/guard";
import { backupSupported, createBackup } from "@/lib/admin/backup";

/**
 * 백업 파일 내려받기 (D-28).
 *
 * ## 왜 그 자리에서 새로 뜨는가
 *
 * 쌓아 둔 것 중 최신을 보내면 **어제 것일 수 있다.** 받는 사람은 「지금
 * 상태를 받았다」고 생각한다. 그 착각이 정확히 백업이 쓸모없어지는 지점이라
 * 누를 때마다 새로 뜬다. 12MB짜리 DB가 압축하면 100KB 남짓이라 부담이 없고,
 * 뜬 김에 서버 안에도 한 벌 남는다.
 *
 * ## 왜 이 라우트에도 `requireAdmin` 이 있는가
 *
 * 폴더가 `(guarded)` 안에 있어도 **라우트 핸들러는 레이아웃을 거치지 않는다.**
 * 화면은 막히는데 이 주소만 열려 있는 상태가 되기 쉽다. 여기서 다시 건다.
 */
export async function GET() {
  await requireAdmin();

  // 서버리스에는 pg_dump 도 디스크도 없다. 여기까지 오면 화면 쪽이 이미
  // 버튼을 감췄어야 하지만, 주소를 직접 치는 길도 막아 둔다
  if (!backupSupported())
    return new Response("이 서버에서는 백업을 받을 수 없습니다.", {
      status: 501,
      headers: { "Cache-Control": "no-store, private" },
    });

  const backup = await createBackup();
  const body = await readFile(backup.path);

  return new Response(new Uint8Array(body), {
    headers: {
      // gzip 파일 자체를 보내는 것이지 응답을 압축한 게 아니다.
      // Content-Encoding 으로 적으면 브라우저가 풀어 버려서
      // 이름만 .gz 인 파일이 저장된다
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${backup.name}"`,
      "Content-Length": String(body.byteLength),
      // 원본 데이터 전부다. 중간 어디에도 남지 않게 한다
      "Cache-Control": "no-store, private",
    },
  });
}
