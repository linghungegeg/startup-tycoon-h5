import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const seedSource = readFileSync(new URL("../../api/prisma/seed.ts", import.meta.url), "utf8");
const repositorySource = readFileSync(new URL("../../api/src/repository.ts", import.meta.url), "utf8");

test("phase 40 employee collection goals close recruit and manager loops", () => {
  assert.match(seedSource, /daily-employee-recruit/, "daily tasks should include employee recruit loop");
  assert.match(seedSource, /补齐一个经营团队岗位|完成一次员工招募/, "daily recruit task should be player-facing and light");
  assert.match(repositorySource, /targetTab: "招募"/, "employee guidance should be able to route to recruit tab");
  assert.match(appSource, /goal\.action\.targetTab === "招募"/, "manager action should open employee recruit tab");
  assert.match(appSource, /setEmployeeRecruitMode\("targeted"\)/, "manager action should switch to targeted recruit");
  assert.match(appSource, /setTargetRecruitRole\(goal\.action\.missingRoles\?\.\[0\]/, "targeted recruit should default to the first missing role");
  assert.doesNotMatch(appSource, /买了就赢|直接冲榜|战力爆发|羁绊 [a-z-]+/);
});
