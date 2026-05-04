import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const auditSource = readFileSync(new URL("../../../docs/product-completeness-audit.md", import.meta.url), "utf8");

test("phase 57 support systems use floating feedback instead of layout notices", () => {
  assert.match(appSource, /setSeasonNotice\(""\);\s*setSeasonError\(""\);[\s\S]*seasonError \? 3200 : 2200/, "season feedback should auto dismiss");
  assert.match(appSource, /setPhase14Notice\(""\);\s*setPhase14Error\(""\);[\s\S]*phase14Error \? 3200 : 2200/, "guild and cross-server feedback should auto dismiss");
  assert.match(appSource, /main-gameplay-toast/);
  assert.doesNotMatch(appSource, /<p className=\{`[^`]*phase14Error \? "bg-red-500\/15 text-red-200" : "bg-emerald-500\/15 text-emerald-100"[^`]*`\}>/);
  assert.doesNotMatch(appSource, /<p className=\{`[^`]*seasonError \? "bg-red-500\/15 text-red-200" : "bg-emerald-500\/15 text-emerald-100"[^`]*`\}>/);
});

test("phase 57 support buttons keep resource and state boundaries visible", () => {
  assert.match(appSource, /canPurchaseSeasonPass/, "pass purchase should check platform coin balance before click");
  assert.match(appSource, /平台币不足/, "pass purchase button should show a player-facing insufficient currency label");
  assert.match(appSource, /disabled=\{!seasonCenter \|\| seasonCenter\.season\.pass\.isPurchased \|\| !canPurchaseSeasonPass\}/);
  assert.match(appSource, /disabled=\{!crossServerCenter \|\| crossServerCenter\.isRegistered\}/, "cross-server registration should wait for loaded state");
  assert.match(appSource, /disabled=\{!crossServerCenter\}/, "cross-server settlement should wait for loaded state");
  assert.match(appSource, /disabled=\{!guildCenter\}/, "guild recommended action should wait for loaded state");
});

test("phase 57 audit closes the support-system batch without expanding admin systems", () => {
  assert.match(auditSource, /\| 商会 \| 已闭环 \|[^|\n]*按钮边界、反馈浮层/, "guild audit should record closed button and feedback boundaries");
  assert.match(auditSource, /\| 商城 \/ 活动 \| 已闭环 \|[^|\n]*商城、首充、赛季/, "commerce and activity audit should be closed");
  assert.match(auditSource, /\| 排行榜 \/ 跨服 \| 已闭环 \|[^|\n]*排行榜和跨服榜/, "leaderboard and cross-server audit should be closed");
  assert.match(auditSource, /\| 邮件 \/ 聊天 \/ 管理后台 \| 已闭环 \|/, "mail, chat and admin should be closed by the support-system follow-up batch");
});
