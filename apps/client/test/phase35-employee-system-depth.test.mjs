import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const seedSource = readFileSync(new URL("../../api/prisma/seed.ts", import.meta.url), "utf8");
const schemaSource = readFileSync(new URL("../../api/prisma/schema.prisma", import.meta.url), "utf8");

const employeeIds = [...seedSource.matchAll(/id: "[a-z]+-[a-z]+"/g)]
  .map((match) => match[0])
  .filter((line) => {
    const index = seedSource.indexOf(line);
    const employeeStart = seedSource.indexOf("const employeeConfigs = [");
    const projectStart = seedSource.indexOf("const projectConfigs = [");
    return index > employeeStart && index < projectStart;
  });

assert.ok(employeeIds.length >= 36, "first employee big-system phase should seed at least 36 employees");
assert.match(seedSource, /role: "公关"/, "employee seed should include PR role");
assert.match(seedSource, /role: "高管"/, "employee seed should include executive role");
assert.match(seedSource, /role: "顾问"/, "employee seed should include advisor role");
assert.match(seedSource, /obtainSource: config\.sortOrder >= 28 && config\.sortOrder <= 30 \? "限时人才池" : "常驻人才池"/, "seed should mark limited and permanent sources");

assert.match(schemaSource, /portraitAssetId String\?/, "employee config should reserve portrait asset id");
assert.match(schemaSource, /avatarFrameId String\?/, "employee config should reserve avatar frame");
assert.match(schemaSource, /employeeRecruitPityCount Int @default\(0\)/, "profile should persist headhunter pity count");
assert.match(schemaSource, /limitedEmployeeRecruitPityCount Int @default\(0\)/, "profile should persist limited-pool pity count");
assert.match(schemaSource, /pressureState String/, "player employee should persist pressure state");
assert.match(schemaSource, /eventState String/, "player employee should persist event state");

assert.match(appSource, /10 抽内保底顶尖或传奇/, "recruit UI should explain the pity rule");
assert.match(appSource, /限时人才池/, "recruit UI should expose limited pool");
assert.match(appSource, /图鉴岗位筛选/, "codex should include role filtering");
assert.match(appSource, /图鉴稀有度筛选/, "codex should include rarity filtering");

console.log("phase35 employee big-system depth static checks passed");
