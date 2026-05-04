import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("../../admin/src/App.tsx", import.meta.url), "utf8");
const auditSource = readFileSync(new URL("../../../docs/product-completeness-audit.md", import.meta.url), "utf8");

test("phase 58 mail and chat feedback uses floating auto-dismiss toasts", () => {
  assert.match(appSource, /setMailNotice\(""\);\s*setMailError\(""\);[\s\S]*mailError \? 3200 : 2200/, "mail feedback should auto dismiss");
  assert.match(appSource, /setChatNotice\(""\);\s*setChatError\(""\);[\s\S]*chatError \? 3200 : 2200/, "chat feedback should auto dismiss");
  assert.match(appSource, /nativeHomePage === "mail"[\s\S]*main-gameplay-toast/, "mail page should render floating feedback");
  assert.match(appSource, /nativeHomePage === "chat"[\s\S]*main-gameplay-toast/, "chat page should render floating feedback");
  assert.doesNotMatch(appSource, /\(mailNotice \|\| mailError\) && <p className=\{mailError \? "task-error mt-2" : "task-notice mt-2"\}/);
  assert.doesNotMatch(appSource, /\(chatNotice \|\| chatError\) && <p className=\{chatError \? "task-error mx-3 mb-2" : "task-notice mx-3 mb-2"\}/);
});

test("phase 58 mail and chat actions expose client-side boundaries", () => {
  assert.match(appSource, /mailClaimableCount/, "mail should derive claimable attachment count");
  assert.match(appSource, /mailUnreadCount/, "mail should derive unread count");
  assert.match(appSource, /disabled=\{mailClaimableCount <= 0\}/, "claim attachments should disable when nothing can be claimed");
  assert.match(appSource, /disabled=\{mailUnreadCount <= 0\}/, "mark all read should disable when nothing is unread");
  assert.match(appSource, /canSendChatMessage/, "chat should derive send readiness");
  assert.match(appSource, /disabled=\{!canSendChatMessage\}/, "chat send should disable when channel or content is not ready");
});

test("phase 58 admin support systems stay covered without broad player-surface changes", () => {
  for (const copy of ["/admin/mail/compensate", "/admin/chat-keywords", "/admin/audit-logs", "window.confirm"]) {
    assert.match(adminSource, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${copy} should remain wired in admin app`);
  }
  assert.match(auditSource, /\| 邮件 \/ 聊天 \/ 管理后台 \| 已闭环 \|[^|\n]*邮件中心/, "audit should close mail chat and admin support systems");
  assert.doesNotMatch(auditSource, /\| 邮件 \/ 聊天 \/ 管理后台 \| 后续阶段 \|/);
});
