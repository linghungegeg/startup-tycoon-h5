import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const repositorySource = readFileSync(new URL("../../api/src/repository.ts", import.meta.url), "utf8");

assert.match(repositorySource, /today-employee-guidance/, "long-term goals should expose a manager employee guidance goal");
assert.match(repositorySource, /buildEmployeeBusinessGuidance/, "manager guidance should be derived from employee business effects");
assert.match(repositorySource, /targetNav/, "manager guidance actions should include routed target nav");
assert.match(repositorySource, /missingRoles/, "manager guidance should expose missing roles");

assert.match(appSource, /targetNav/, "client should understand routed manager goal actions");
assert.match(appSource, /setEmployeeViewTab\("codex"\)/, "manager guidance should route to employee codex when roles are missing");
assert.match(appSource, /setEmployeeViewTab\("growth"\)/, "manager guidance should route to employee growth for employee events");
assert.match(appSource, /setMarketTab\("产品"\)/, "manager guidance should route to product research");
assert.match(appSource, /setMarketTab\("市场"\)/, "manager guidance should route to market competition");
assert.match(appSource, /openHomePanel\("融资"\)/, "manager guidance should route to funding");

console.log("phase37 manager employee guidance static checks passed");
