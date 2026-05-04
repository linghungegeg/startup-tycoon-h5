import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("phase 44 employee appearance layer keeps portraits consistent and lightweight", () => {
  assert.match(appSource, /employeeFrameLabel/, "detail and recruit result should share a readable avatar frame label");
  assert.match(appSource, /employee-appearance-card/, "employee detail should reserve a stable large portrait display");
  assert.match(appSource, /employee-frame-note/, "employee detail should explain rare avatar frame display without adding a new system");
  assert.match(appSource, /lastRecruitedEmployee/, "recruit tab should keep the latest recruit result visible");
  assert.match(appSource, /employee-recruit-result/, "recruit result should reuse the portrait display language");
  assert.match(appSource, /lastRecruitedCollectionEntry\?\.portraitUrl && <img src=\{lastRecruitedCollectionEntry\.portraitUrl\}/, "recruit result should use portraitUrl before placeholder");
  assert.match(appSource, /lastRecruitedCollectionEntry\?\.portraitUrl \? "" : lastRecruitedEmployee\.name\.slice\(0, 1\)/, "recruit result should keep name placeholder without art");
  assert.match(styleSource, /\.employee-appearance-card/, "large portrait area should have stable styling");
  assert.match(styleSource, /\.employee-recruit-result/, "recruit result should have compact vertical-H5 styling");
  assert.doesNotMatch(appSource + styleSource, /皮肤商店|头像抽取|限定付费池|战力爆发|买了就赢|直接冲榜|羁绊 xxx/);
});
