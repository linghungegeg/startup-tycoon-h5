import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import test from "node:test";

const seedSource = readFileSync(new URL("../../api/prisma/seed.ts", import.meta.url), "utf8");
const auditSource = readFileSync(new URL("../../../docs/product-completeness-audit.md", import.meta.url), "utf8");
const portraitDir = new URL("../public/game-ui/employees/", import.meta.url);

const employeeConfigSection = seedSource.slice(
  seedSource.indexOf("const employeeConfigs = ["),
  seedSource.indexOf("].map((config) => ({", seedSource.indexOf("const employeeConfigs = ["))
);
const employeeIds = [...employeeConfigSection.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);

test("phase 55 product completeness audit covers main gameplay systems", () => {
  for (const label of [
    "首页 / 公司 HUD",
    "员工团队",
    "员工图鉴",
    "市场中心",
    "项目交付",
    "产品研发",
    "市场竞争",
    "融资路演",
    "贷款",
    "商会",
    "背包",
    "商城 / 活动",
    "排行榜 / 跨服",
    "任务",
    "专属经理事件"
  ]) {
    assert.ok(auditSource.includes(label), `audit should include ${label}`);
  }

  assert.match(auditSource, /已闭环|待补强|资源缺口|后续阶段/, "audit should use clear completion statuses");
  assert.doesNotMatch(auditSource, /买了就赢|直接冲榜|战力爆发/, "audit copy should avoid hard-sell copy");
});

test("phase 55 employee portraits are wired through existing fields", async () => {
  assert.equal(employeeIds.length, 60, "employee pool should stay at 60");
  assert.match(seedSource, /portraitAssetId: `employee-portrait-\$\{config\.id\}`/);
  assert.match(seedSource, /portraitUrl: `\/game-ui\/employees\/\$\{config\.id\}\.svg`/);
  assert.doesNotMatch(seedSource, /portraitUrl: null/);

  const portraitFiles = await readdir(portraitDir);
  assert.equal(portraitFiles.filter((file) => file.endsWith(".svg")).length, 60, "there should be one formal portrait resource per employee");

  for (const employeeId of employeeIds) {
    assert.ok(existsSync(new URL(`${employeeId}.svg`, portraitDir)), `${employeeId} should have a portrait resource`);
  }
});
