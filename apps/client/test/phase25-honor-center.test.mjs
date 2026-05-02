import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("phase 25 rank center exposes my honor summary copy", () => {
  for (const text of ["我的荣誉", "当前装备", "已获得称号", "成就进度", "赛季荣誉", "活动回顾", "商会历史", "跨服历史"]) {
    assert.ok(source.includes(text), `missing honor center copy: ${text}`);
  }
});
