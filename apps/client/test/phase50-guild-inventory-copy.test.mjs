import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(path.resolve(__dirname, "../src/App.tsx"), "utf8");

assert.doesNotMatch(appSource, /Inventory 背包/);
assert.doesNotMatch(appSource, /公司等级和服务器规则/);

assert.match(appSource, /经营背包/);
assert.match(appSource, /行动力饮料、赛季经验券可在背包直接使用/);
assert.match(appSource, /风险保险、市场情报、财务顾问卡会在专属经理随机任务中使用/);

assert.match(appSource, /加入后参与互助、贡献、协作项目和跨服商会赛季/);
assert.match(appSource, /今日商会目标/);
assert.match(appSource, /成员互助/);
assert.match(appSource, /商会任务/);
assert.match(appSource, /协作项目/);
assert.match(appSource, /跨服商会赛季/);

assert.doesNotMatch(appSource, /剧情树|皮肤商店|头像抽取|限定付费池|战力爆发|买了就赢|直接冲榜|羁绊 xxx/);
