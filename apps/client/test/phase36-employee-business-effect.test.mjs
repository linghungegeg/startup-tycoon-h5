import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const repositorySource = readFileSync(new URL("../../api/src/repository.ts", import.meta.url), "utf8");

assert.match(repositorySource, /type EmployeeEffectRecord/, "API should expose a lightweight employeeEffect record");
assert.match(repositorySource, /employeeEffect: EmployeeEffectRecord/, "product, market and funding centers should include employeeEffect");
assert.match(repositorySource, /buildEmployeeEffect/, "employee role coverage should be calculated in one bounded helper");
assert.match(repositorySource, /applyProductEmployeeEffect/, "product advancement should use employee support");
assert.match(repositorySource, /applyFundingEmployeeEffect/, "funding offers should use employee support");
assert.match(repositorySource, /marketEmployeeEffect/, "market response should use employee support");
assert.match(repositorySource, /effectLabels/, "employee support should expose readable numeric effect labels");
assert.match(repositorySource, /primaryMissingRoles/, "employee support should expose short primary missing roles");
assert.match(repositorySource, /targetTab/, "employee support should expose a target tab for routed recovery");

assert.match(appSource, /employeeEffect: EmployeeEffect/, "client center types should include employeeEffect");
assert.match(appSource, /团队支撑/, "product, market and funding pages should show team support");
assert.match(appSource, /短板/, "team support UI should surface missing roles without hard locks");
assert.match(appSource, /effectLabels/, "funding team support should show numeric support effects");
assert.match(appSource, /primaryMissingRoles/, "funding team support should keep missing-role copy compact");
assert.match(appSource, /setEmployeeCodexRoleFilter\("投资关系"\)/, "funding support should route to employee codex with a capital role filter");
assert.doesNotMatch(appSource, /羁绊 \\$\\{entry\.bondGroupId\\}/, "employee codex should not expose technical bond ids");

console.log("phase36 employee business effect static checks passed");
