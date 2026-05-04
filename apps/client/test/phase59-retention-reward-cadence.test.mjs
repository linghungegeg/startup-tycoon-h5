import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const auditSource = readFileSync(new URL("../../../docs/product-completeness-audit.md", import.meta.url), "utf8");

test("phase 59 guild activity and cross-server expose reward cadence summaries", () => {
  for (const marker of ["guildRewardCadence", "activityRewardCadence", "crossServerRewardCadence"]) {
    assert.match(appSource, new RegExp(marker), `${marker} should be derived in the client`);
  }

  for (const testId of ["guild-reward-cadence", "activity-reward-cadence", "cross-server-reward-cadence"]) {
    assert.match(appSource, new RegExp(`data-testid="${testId}"`), `${testId} should be visible in the UI`);
  }
});

test("phase 59 cadence copy stays player-facing and avoids system wording", () => {
  const cadenceSource = appSource.slice(
    appSource.indexOf("const guildRewardCadence"),
    appSource.indexOf("const passBenefitCopy")
  );

  for (const copy of ["今日", "本周", "赛季", "邮件"]) {
    assert.match(cadenceSource, new RegExp(copy), `cadence copy should include ${copy}`);
  }

  assert.doesNotMatch(cadenceSource, /奖励密度|内容节奏|闭环|复核|backend|API|TODO/, "cadence copy should not expose planning or system wording");
});

test("phase 59 audit records cadence review as closed while leaving content expansion separate", () => {
  assert.match(auditSource, /\| 商会 \| 已闭环 \|[^|\n]*内容节奏和奖励节奏已补齐/, "guild audit should mention cadence closure");
  assert.match(auditSource, /\| 商城 \/ 活动 \| 已闭环 \|[^|\n]*活动节奏和奖励去向已补齐/, "activity audit should mention cadence closure");
  assert.match(auditSource, /\| 排行榜 \/ 跨服 \| 已闭环 \|[^|\n]*跨服奖励节奏已补齐/, "cross-server audit should mention cadence closure");
  assert.match(auditSource, /员工事件和市场竞品内容量扩展/, "content pool expansion should stay as a separate follow-up");
});
