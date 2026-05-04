import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const seedSource = readFileSync(new URL("../../api/prisma/seed.ts", import.meta.url), "utf8");

const employeeBlock = seedSource.slice(
  seedSource.indexOf("const employeeConfigs = ["),
  seedSource.indexOf("const projectConfigs = [")
);

test("phase 41 prepares employee long-term collection layer without new paid systems", () => {
  const employeeIds = [...employeeBlock.matchAll(/id: "[a-z]+-[a-z]+"/g)].map((match) => match[0]);
  assert.equal(employeeIds.length, 60);

  for (const role of ["投资关系", "财务", "法务", "高管", "顾问", "公关", "客服", "市场"]) {
    assert.match(employeeBlock, new RegExp(`role: "${role}"`), `long-term pool should keep ${role} coverage`);
  }

  for (const rarity of ["普通", "优秀", "稀缺", "顶尖", "传奇"]) {
    assert.match(employeeBlock, new RegExp(`rarity: "${rarity}"`), `long-term pool should keep ${rarity} rarity`);
  }

  assert.match(seedSource, /portraitAssetId: `employee-portrait-\$\{config\.id\}`/);
  assert.match(seedSource, /avatarFrameId:/);
  assert.match(appSource, /管理团队/);
  assert.match(appSource, /服务团队/);
  assert.match(appSource, /employee-avatar-slot/);
  assert.match(appSource, /已招募 \{employeeCollection\?\.owned \?\? 0\}\/\{employeeCollection\?\.total \?\? 60\}/);
  assert.doesNotMatch(appSource, /买了就赢|直接冲榜|战力爆发|皮肤商店|限定付费池|羁绊 [a-z-]+/);
});
