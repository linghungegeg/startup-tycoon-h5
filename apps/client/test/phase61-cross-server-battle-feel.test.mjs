import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const crossServerHomeSource = source.slice(
  source.indexOf('data-testid="cross-server-arena-panel"'),
  source.indexOf('data-testid="cross-server-personal-board"')
);

test("phase 61 cross-server reads like a personal arena ladder instead of a mixed report page", () => {
  for (const copy of [
    "跨服竞技",
    "战报回放",
    "规则说明",
    "可挑战对手",
    "挑战次数",
    "上阵员工",
    "挑战",
    "回合",
    "排名提升",
    "挑战次数不足，稍后再来。"
  ]) {
    assert.ok(source.includes(copy), `missing cross-server arena copy: ${copy}`);
  }

  assert.match(source, /crossServerCenter\?\.arena/, "cross-server should render arena data from the API");
  assert.match(source, /data-testid="cross-server-arena-panel"/, "cross-server arena panel should stay testable");
  assert.match(crossServerHomeSource, /slice\(0,\s*4\)\.map\(\(opponent/, "cross-server home should render four challenge opponents");
  assert.match(crossServerHomeSource, /data-testid="cross-server-opponent-avatar-placeholder"/, "opponent portraits should stay as empty placeholders for prototype parity");
  assert.match(crossServerHomeSource, /data-testid="cross-server-lineup-avatar-placeholder"/, "lineup portraits should stay as empty placeholders for prototype parity");
  assert.match(source, /challengeCrossServerOpponent/, "player frontend should challenge arena opponents");
  assert.match(source, /recoverCrossServerAttempts/, "player frontend should support VIP attempt recovery");
  assert.match(source, /phase14Error \? 3200 : 2200/, "cross-server feedback should keep the centered auto-dismiss overlay");
  assert.doesNotMatch(crossServerHomeSource, /奖励邮件发放|赛季说明|三回合战报/, "cross-server home should not keep reward, season, or battle-report copy as persistent content");
  assert.doesNotMatch(crossServerHomeSource, /portraitUrl \? <img/, "cross-server prototype shell should not render existing mismatched portraits");
  assert.doesNotMatch(source, /setActiveCrossServerMode\("history"\);\s*setPhase14Notice/, "challenge result should not jump to battle report");
  assert.doesNotMatch(source, /"guild", "商会战"/, "personal cross-server tabs should not include guild battle");
  assert.doesNotMatch(source, />\s*报名商会赛季\s*</, "personal cross-server action bar should not register guild cross-server");
  assert.doesNotMatch(source, />\s*结算跨服\s*</, "player cross-server action bar should not expose settlement");
  assert.doesNotMatch(source, /onClick=\{\(\) => void settleCrossServer\(\)\}/, "player frontend should not call cross-server settlement directly");
  assert.doesNotMatch(source, /跨服创业赛|跨服经营战/, "cross-server title should no longer read like a generic ranking event");
  assert.doesNotMatch(source, /手动结算|自动结算|候选|快照|算法|实时战斗|即时开打/, "player cross-server copy should avoid operation and combat overpromise wording");
});

test("phase 61 guild page owns guild cross-server", () => {
  assert.match(source, /data-testid="guild-cross-server-section"/, "guild page should expose guild cross-server");
  assert.match(source, /商会跨服/, "guild cross-server copy should live in guild page");
  assert.match(source, /registerCrossServerGuild/, "guild page should keep guild cross-server registration action");
});
