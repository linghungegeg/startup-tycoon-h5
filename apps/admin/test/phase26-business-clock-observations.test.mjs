import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("phase 26 admin exposes read-only business clock observations", () => {
  assert.match(source, /type BusinessClockObservations/);
  assert.match(source, /\/admin\/business-clock-observations/);
  assert.match(source, /经营时钟观测/);
  assert.match(source, /离线时长分布/);
  assert.match(source, /现金变化分布/);
  assert.match(source, /只读观测/);
});
