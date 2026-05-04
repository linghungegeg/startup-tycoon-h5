import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("phase 61 cross-server reads like a business matchup instead of a plain ranking page", () => {
  for (const copy of [
    "跨服经营战",
    "对阵",
    "商会战",
    "我方",
    "对手",
    "VS",
    "本轮赛况",
    "暂居上风",
    "对手压线领先",
    "差一轮冲刺",
    "商会活跃不足",
    "结算后邮件发奖",
    "下一步"
  ]) {
    assert.ok(source.includes(copy), `missing cross-server battle-feel copy: ${copy}`);
  }

  assert.match(source, /crossServerMatchup\?\.selfLabel/, "cross-server should render server-derived self matchup label");
  assert.match(source, /crossServerMatchup\?\.opponentLabel/, "cross-server should render server-derived opponent label");
  assert.match(source, /crossServerRound\?\.phaseLabel/, "cross-server should render server-derived round phase");
  assert.match(source, /data-testid="cross-server-matchup-panel"/, "cross-server matchup panel should stay testable");
  assert.match(source, /activeCrossServerMode !== "season"/, "matchup tab should reuse the existing first cross-server section");
  assert.match(source, /phase14Error \? 3200 : 2200/, "cross-server feedback should keep the centered auto-dismiss overlay");
  assert.doesNotMatch(source, /跨服创业赛/, "cross-server title should no longer read like a generic ranking event");
  assert.doesNotMatch(source, /实时战斗|即时开打|不改变跨服结算算法|奖励预览：|长期目标：/, "cross-server copy should avoid combat overpromise and system wording");
});
