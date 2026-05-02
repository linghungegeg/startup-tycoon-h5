import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("phase 27 admin analytics renders commercial engagement signals", () => {
  for (const copy of [
    "commercialEntryClickTotal",
    "commercialEntryClicks",
    "paidProductEntryClicks",
    "商业入口点击",
    "付费入口点击",
    "长期目标点击",
    "夜间简报打开",
    "经营待办处理"
  ]) {
    assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${copy} should be wired into admin analytics`);
  }
});
