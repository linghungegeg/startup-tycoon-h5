import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("phase 49 employee event feedback stays visible and compact", () => {
  assert.match(appSource, /formatEmployeeEventFeedback/, "employee event rows should use a dedicated short feedback label");
  assert.match(appSource, /已缓解压力/, "resolved employee events should show recovery feedback");
  assert.match(appSource, /已保留观察/, "dismissed employee events should show retained feedback");
  assert.match(appSource, /忠诚回升/, "positive employee event handling should surface loyalty recovery");
  assert.match(appSource, /const employeeRandomTask = pendingEmployeeRandomTasks\[0\]/, "manager recommendation should prioritize pending employee events");
  assert.match(appSource, /pendingEmployeeEventArchiveRows/, "handled employee events should not be counted as pending");
  assert.match(appSource, /employeeEventArchiveRows\.slice\(0, 3\)/, "employee event archive should stay capped at three rows");
  assert.doesNotMatch(appSource, /剧情树|皮肤商店|头像抽取|限定付费池|战力爆发|买了就赢|直接冲榜|羁绊 xxx/);
});
