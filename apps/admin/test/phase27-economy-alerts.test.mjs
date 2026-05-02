import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("phase 27 admin exposes read-only economy alerts", () => {
  for (const copy of [
    "EconomyAlerts",
    "/admin/economy-alerts",
    "经济巡检",
    "平台币异常增长",
    "VIP 经验异常",
    "离线现金异常",
    "重复结算风险",
    "经营时钟同步频率",
    "只读巡检"
  ]) {
    assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${copy} should be wired into admin economy alerts`);
  }
});
