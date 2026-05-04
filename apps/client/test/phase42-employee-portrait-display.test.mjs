import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("phase 42 employee portraits use resource first and stable placeholders", () => {
  assert.match(appSource, /selectedEmployeeCollectionEntry/, "team detail should reuse collection portrait data");
  assert.match(appSource, /entry\.portraitUrl && <img src=\{entry\.portraitUrl\}/, "codex should render portraitUrl images when available");
  assert.match(appSource, /selectedEmployeeCollectionEntry\?\.portraitUrl && <img src=\{selectedEmployeeCollectionEntry\.portraitUrl\}/, "team detail should render portraitUrl images when available");
  assert.match(appSource, /entry\.portraitUrl \? "" : entry\.name\.slice\(0, 1\)/, "codex should keep name placeholder without art");
  assert.match(appSource, /selectedEmployeeCollectionEntry\?\.portraitUrl \? "" : selectedEmployee\.name\.slice\(0, 1\)/, "team detail should keep name placeholder without art");
  assert.match(appSource, /employee-avatar-source/, "cards should show a short source label");
  assert.match(styleSource, /\.employee-avatar-slot img/);
  assert.match(styleSource, /\.employee-portrait img/);
  assert.match(styleSource, /\.employee-avatar-source/);
  assert.doesNotMatch(appSource + styleSource, /皮肤商店|限定付费池|战力爆发|买了就赢|直接冲榜|羁绊 [a-z-]+/);
});
