import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

assert.match(source, /type EmployeeCollectionEntry = \{/, "employee collection type should exist for the codex");
assert.match(source, /employee-tab/, "employee page should expose team and codex tabs");
assert.match(source, />团队</, "employee page should include a team tab");
assert.match(source, />图鉴</, "employee page should include a codex tab");
assert.match(source, />招募</, "employee page should include a recruit tab");
assert.match(source, />养成</, "employee page should include a growth tab");
assert.match(source, /已招募 \{employeeCollection\?\.owned \?\? 0\}\/\{employeeCollection\?\.total \?\? 24\}/, "codex should show owned and total count");
assert.match(source, /普通招募：免费补位/, "normal recruit condition should be visible");
assert.match(source, /猎头招募：消耗猎头券/, "headhunter recruit condition should be visible");
assert.match(source, /定向猎头：消耗定向猎头函/, "targeted recruit condition should be visible");
assert.match(source, /限时人才池：消耗猎头券/, "limited recruit condition should be visible");
assert.match(source, /employee-avatar-slot/, "employee codex should reserve avatar slots");
assert.match(source, /员工好感礼物/, "employee growth should expose support material");
assert.doesNotMatch(source, /猎头招募 稀缺提升/, "employee page should not keep unclosed recruit slogan");

console.log("phase34 employee closure static checks passed");
