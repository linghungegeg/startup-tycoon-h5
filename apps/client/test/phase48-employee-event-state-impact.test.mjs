import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const repositorySource = readFileSync(new URL("../../api/src/repository.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("phase 48 employee event results land on employee state", () => {
  assert.match(repositorySource, /applyEmployeeRandomTaskResult/, "employee random tasks should update employee state after resolve or dismiss");
  assert.match(repositorySource, /"风险缓解"/, "resolved employee events should leave readable relief state");
  assert.match(repositorySource, /"继续关注"/, "passive employee event choices should leave readable follow-up state");
  assert.match(repositorySource, /"已保留"/, "dismissed employee events should be visible without direct penalty");
  assert.match(repositorySource, /pressure: \{ set: nextPressure \}/, "employee event should write pressure");
  assert.match(repositorySource, /loyalty: \{ set: nextLoyalty \}/, "employee event should write loyalty");
  assert.match(appSource, /formatEmployeeEventState/, "employee detail should keep player-facing event state copy");
  assert.doesNotMatch(appSource + repositorySource, /剧情树|皮肤商店|头像抽取|限定付费池|战力爆发|买了就赢|直接冲榜|羁绊 xxx/);
});
