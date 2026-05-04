import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("phase 45 employee growth page shows a lightweight event archive", () => {
  assert.match(appSource, /employeeEventArchiveRows/, "growth tab should derive compact employee event rows");
  assert.match(appSource, /employee-event-archive/, "growth tab should render a dedicated event archive block");
  assert.match(appSource, /employee-event-row/, "employee events should render as compact rows");
  assert.match(appSource, /openEmployeeEventManager/, "pending employee events should route to manager handling");
  assert.match(appSource, /团队状态稳定，继续关注压力和忠诚。/, "empty event state should be clear and player-facing");
  assert.match(appSource, /impactLabel/, "event archive should show the event impact direction");
  assert.match(appSource, /targetEmployeeName/, "event archive should show the associated employee or team");
  assert.match(styleSource, /\.employee-event-archive/, "event archive should have compact vertical-H5 styling");
  assert.match(styleSource, /\.employee-event-row/, "event rows should avoid expanding into a large table");
  assert.doesNotMatch(appSource + styleSource, /剧情树|皮肤商店|头像抽取|限定付费池|战力爆发|买了就赢|直接冲榜|羁绊 xxx/);
});
