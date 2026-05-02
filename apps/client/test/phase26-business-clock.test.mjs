import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

test("phase 26 finance page exposes business clock pulse summary copy", async () => {
  const source = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

  for (const copy of [
    "BusinessClockPulse",
    "经营时钟",
    "最近经营脉冲",
    "夜间经营简报",
    "建议动作",
    "行动力恢复",
    "平台币 / VIP / 榜单不变",
    "离线经营"
  ]) {
    assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${copy} should be rendered or typed`);
  }
});
