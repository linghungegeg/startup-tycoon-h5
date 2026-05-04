import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

const projectToastStyle = styleSource.match(/\.project-toast \{[\s\S]*?\n\}/)?.[0] ?? "";
const projectToastErrorStyle = styleSource.match(/\.project-toast\.is-error \{[\s\S]*?\n\}/)?.[0] ?? "";

test("phase 53 project delivery surface closes empty, dispatch, and settlement states", () => {
  assert.match(appSource, /projectCanStartMore/, "project delivery should keep a local exhausted state for the start button");
  assert.match(appSource, /\/projects\/availability/, "project delivery should restore exhausted state after refresh");
  assert.match(appSource, /"暂无新项目"/, "project start button should show a closed empty state when the pool is exhausted");
  assert.match(appSource, /项目已全部接完/, "project delivery should explain why no new project can be started");

  assert.match(appSource, />重新派遣</, "project dispatch action should use clear player-facing copy");
  assert.match(appSource, /负责人会影响推进速度和结算成功率/, "project dispatch should explain why assignment matters");

  assert.match(appSource, /推进成本/, "project detail should show the next advance cost");
  assert.match(appSource, /selectedProject\.advanceCost/, "project advance button should use server-side advance cost");
  assert.match(appSource, /profile\.cash < selectedProject\.advanceCost/, "project advance should be disabled when cash is not enough");

  assert.match(appSource, /项目结算成功/, "project settlement should feed back success impact");
  assert.match(appSource, /项目结算失败/, "project settlement should feed back failure impact");
  assert.match(appSource, /现金.*声誉.*满意度/s, "project settlement feedback should mention the affected business stats");
});

test("phase 53 project delivery feedback uses an overlay toast", () => {
  assert.match(appSource, /project-toast/, "project feedback should use a centered toast");
  assert.doesNotMatch(appSource, /<p className="project-notice"/, "project feedback should not take layout space");
  assert.match(projectToastStyle, /position:\s*absolute/, "project toast should overlay the project panel");
  assert.match(projectToastStyle, /top:\s*42%/, "project toast should sit near the center of the screen");
  assert.match(projectToastStyle, /width:\s*min\(70%, 300px\)/, "project toast should stay compact on H5");
  assert.match(projectToastStyle, /border-radius:\s*8px/, "project toast should use a rectangular game popup shape");
  assert.match(projectToastErrorStyle, /background:\s*rgba\(48, 20, 20, 0\.96\)/, "project error toast should use a restrained dark red palette");
  assert.match(appSource, /setProjectNotice\(""\);\s*setProjectError\(""\);[\s\S]*projectError \? 3200 : 2200/, "project toast should auto dismiss");
});
