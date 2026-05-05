# Startup Tycoon H5

[English](README.en.md) | 简体中文

`startup-tycoon-h5` 是一套自研的创业模拟经营文字游戏源码。项目围绕“从 0 创业到公司成长”的经营过程，提供玩家端 H5、运营后台、后端 API、Prisma/MySQL 数据库模型、玩法设计文档和概念图资源，方便开发者学习、研究和二次开发。

玩家扮演创业公司创始人，需要在员工、项目、产品、现金流、融资、贷款、市场竞争、商会、活动、排行榜和跨服玩法之间做经营决策。项目不是纯前端演示，也不是通用换皮模板，而是一套带前后端、数据库和运营后台的模拟经营游戏工程。

## 快捷功能

| 目标 | 入口 |
| --- | --- |
| 快速启动项目 | 查看 [快速启动](#快速启动) |
| 查看玩家端源码 | `apps/client` |
| 查看运营后台源码 | `apps/admin` |
| 查看后端 API | `apps/api` |
| 查看数据库结构 | `apps/api/prisma/schema.prisma` |
| 查看初始化数据 | `apps/api/prisma/seed.ts` |
| 查看概念图和 UI 图 | `img` |
| 查看游戏正式资源 | `apps/client/public/game-ui` |
| 查看产品设计文档 | `docs/development-plan.md` |
| 查看商业化设计 | `docs/monetization-design.md` |
| 查看留存设计 | `docs/retention-design.md` |
| 查看活动设计 | `docs/activity-design.md` |
| 查看上线准备说明 | `docs/production-readiness.md` |

## 常用命令

```bash
npm install
npm run db:generate -w @wenziyouxi/api
npm run db:push -w @wenziyouxi/api
npm run db:seed -w @wenziyouxi/api
npm run dev
```

访问地址：

- 玩家端：`http://127.0.0.1:5173`
- 运营后台：`http://127.0.0.1:5174`
- API：`http://127.0.0.1:3001`

## 二开入口

| 想改什么 | 优先看哪里 |
| --- | --- |
| 改首页 UI | `apps/client/src/App.tsx`、`apps/client/src/styles.css`、`img/ui-preview.png` |
| 改员工系统 | `apps/api/src/employee.ts`、`apps/api/prisma/seed.ts`、`docs/employee-design.md` |
| 改项目/产品/市场 | `apps/api/src/project.ts`、`apps/api/src/product.ts`、`apps/api/src/market.ts` |
| 改融资/贷款/财务 | `apps/api/src/finance.ts`、`apps/api/src/repository.ts` |
| 改商城/VIP/付费 | `apps/api/src/repository.ts`、`docs/monetization-design.md` |
| 改活动/赛季/通行证 | `apps/api/src/repository.ts`、`docs/activity-design.md` |
| 改商会/跨服 | `apps/api/src/repository.ts`、`docs/cross-server-art-handoff.md` |
| 改后台运营工具 | `apps/admin/src/App.tsx`、`apps/admin/src/styles.css` |
| 改数据库模型 | `apps/api/prisma/schema.prisma` |
| 改种子配置 | `apps/api/prisma/seed.ts` |

## 截图与概念图

| 首页 UI | 财务系统 |
| --- | --- |
| ![首页 UI](img/ui-preview.png) | ![财务系统](img/caiwu.png) |
| 跨服玩法概念图 | 对战概念图 |
| ![跨服玩法概念图](img/ChatGPT%20Image%202026年5月4日%2022_18_12.png) | ![对战概念图](img/0c4eddc8-62aa-4e4e-bf60-fede9d88bf13.png) |
| 回放概念图 | 更多概念图 |
| ![回放概念图](img/ChatGPT%20Image%202026年5月4日%2022_29_15.png) | 更多图片见 `img/` |

## 项目特色

- 自研创业题材模拟经营文字游戏，不是通用 RPG 换皮。
- 包含玩家端、运营后台、后端 API、数据库模型和初始化数据。
- 玩法覆盖员工、项目、产品、财务、融资、贷款、市场竞争、商会、赛季、活动、排行榜和跨服。
- `docs` 中包含产品设计、商业化、留存、活动、上线准备和 UI 规范，方便理解二开方向。
- `img` 和 `apps/client/public/game-ui` 中包含概念图、首页 UI、功能入口图、员工头像和跨服资源。
- 后台包含玩家管理、补偿、配置、活动、审计、数据看板和运营告警等基础运营能力。

## 功能总览

### 玩家账号与角色流程

已具备注册、登录、登录态校验、区服选择、头像选择、创始人命名、公司命名、创建公司档案、新号初始资源和 VIP3 起步福利。玩家档案写入 MySQL，适合继续扩展手机号登录、平台登录、游客绑定、多角色切换和防沉迷。

### 竖版 H5 玩家端

已具备竖版 H5 手游首页、顶部资源栏、左右功能入口、底部导航、公司状态、主线任务和待办提醒。视觉基线是深色商务手游风格，包含玻璃面板、金色强调、图标入口和浮层反馈。当前跨服页面和部分功能页还没有完全按概念图重做，二开时可优先对齐 `img` 和 `apps/client/public/game-ui` 中的 UI 资源。

### 公司经营系统

已具备公司等级、经验、估值、现金、月收入、月支出、负债、风险状态、客户满意度、员工满意度、声望、行动力、经营时钟和财务报表。经营结果会影响融资、贷款、项目、市场、任务和随机经营事件，不是单纯点击升级。

### 员工系统

已具备员工配置、员工招募、员工列表、员工岗位、等级、薪资、压力、忠诚、成长潜力、管理、谈判、执行属性、员工培养、员工图鉴、员工事件和经营影响。员工会影响项目推进、融资谈判、市场竞争和经营风险，适合继续扩展员工池、立绘、羁绊、股权激励、离职和员工专属剧情。

### 项目、产品与市场

项目交付包含项目配置、分类、推进成本、周期、成功率、现金奖励、声望奖励、客户满意度影响、失败惩罚和员工分配。产品研发包含用户数、留存、付费率、客单价、获客成本、服务器成本、技术债、产品推进和重构。市场竞争包含市场赛道、行业热度、政策风险、玩家份额、竞品份额、价格压力、人才压力、声誉压力、专利风险和竞品行动。

### 财务、融资与贷款

财务系统包含日结算、月结算、收入、支出、净现金流、期末现金、总负债、负债率和风险提示。融资系统包含投资人、轮次、金额、估值倍数、股权稀释、成功率、董事会压力、投资条款、法务审核、打款暂停和追加投资。贷款系统包含贷款申请、信用评级、本金、利率、分期还款、逾期、罚息、提前结清、危机贷款和过桥贷款。

### 任务、随机经营与专属经理

已具备主线任务、日常任务、支线任务、任务进度、奖励领取、公司经验奖励、知识卡解锁、随机经营任务、专属经理待办、稍后处理、任务过期、行动力消耗和任务类别轮换。随机任务可结合风险保险、市场情报、财务顾问卡和通行证额外赛季任务，适合继续扩展行业事件、连续事件链和高风险危机任务。

### 商城、VIP、通行证与背包

已具备平台币钱包、平台币流水、商城商品、购买记录、首充、VIP 等级、VIP 每日礼包、特权、成长基金、通行证、每日经营礼包、购买限制、背包、道具数量、道具流水、行动力饮料、赛季经验券、风险保险、市场情报和财务顾问卡。外部支付目前只是预留订单链路，未接真实支付回调、验签和自动发货。

### 活动、赛季、排行榜与经营残局

已具备赛季配置、赛季任务、赛季积分、通行证购买、限时活动、活动报名、活动进度、活动领奖、活动临时榜、活动商店、活动配置草稿、活动审核、活动发布、活动榜结算、排行榜快照、排行榜奖励、称号、成就、知识库和经营残局。适合继续扩展多赛季轮换、节日活动、活动日历、更多经营残局和排行榜回放。

### 商会、多服与跨服

商会包含创建/加入、入会申请、成员管理、角色权限、互助、任务、贡献、科技、协作项目、活动日志、排行榜和奖励结算。多服与跨服包含区服、跨服分组、跨服报名、个人竞技、挑战次数、次数恢复、奖励、结算、跨服商会报名和跨服商会结算。当前跨服页面还没有完全按照概念图进行 UI 改造，后续主要工作是视觉表现、内容量和战报体验。

### 邮件、聊天与运营后台

邮件包含邮件中心、奖励、补偿和未读数量。聊天包含频道和后台词库管理。运营后台包含登录、玩家查询、封禁/解封、平台币调整、VIP 调整、称号发放/回收、邮件补偿、配置中心、活动草稿/审核/发布、跨服分组、跨服规则、商会管理、知识库管理、聊天词库、数据看板、经济告警、运营配置告警和审计日志。

## 当前已知不足

- 跨服页面还没有完全按照概念图进行 UI 改造。
- 部分前端功能页仍保持原生样式，没有完全统一到概念图视觉。
- 外部支付目前是预留订单链路，未接入真实支付回调、验签和自动发货。
- Redis 配置已预留，生产级缓存、队列、限流和运营任务可继续扩展。
- 后台权限目前更偏单一超管模式，多人运营分岗 RBAC 可继续增强。
- 内容池仍可继续扩容，包括员工事件、融资/贷款随机任务、赛季活动、经营残局和知识卡。
- 生产部署、监控、备份、压测、备案、隐私政策和用户协议需要上线前自行补齐。

## 技术栈

基础环境：

- Node.js 20+
- npm workspaces
- TypeScript
- MySQL 8+
- Redis 7+，当前主要作为配置预留和后续扩展依赖
- Git

前端：

- React 19
- React DOM 19
- Vite 7
- ESLint

后端：

- Node.js HTTP Server
- Prisma 6
- MySQL
- tsx
- Node test runner

## 快速启动

1. 安装依赖：

```bash
npm install
```

2. 复制环境变量：

```powershell
Copy-Item .env.example .env
```

macOS / Linux 可使用：

```bash
cp .env.example .env
```

3. 修改 `.env` 中的数据库和本地密钥配置，至少需要确认：

```env
DATABASE_URL=mysql://root:password@127.0.0.1:3306/wenziyouxi
JWT_SECRET=replace-with-local-secret
ADMIN_PASSWORD=replace-with-local-admin-password
```

4. 创建 MySQL 数据库：

```sql
CREATE DATABASE wenziyouxi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. 初始化 Prisma 和种子数据：

```bash
npm run db:generate -w @wenziyouxi/api
npm run db:push -w @wenziyouxi/api
npm run db:seed -w @wenziyouxi/api
```

6. 启动开发服务：

```bash
npm run dev
```

## 数据库说明

项目使用 MySQL + Prisma。完整数据库模型在 `apps/api/prisma/schema.prisma`，初始化种子数据在 `apps/api/prisma/seed.ts`。仓库不包含生产数据库、真实用户数据、真实订单数据、真实支付密钥或生产管理员密码。

核心模型分组：

| 分组 | 主要模型 |
| --- | --- |
| 账号与权限 | `Account`、`AccountSession`、`AdminUser`、`AdminSession`、`AdminAuditLog` |
| 区服与角色 | `GameServer`、`AvatarOption`、`PlayerProfile` |
| 公司经营 | `CompanyFinanceReport`、`TaskConfig`、`PlayerTaskProgress`、`RandomTaskConfig`、`PlayerRandomTask` |
| 员工、项目、产品、市场 | `EmployeeConfig`、`PlayerEmployee`、`ProjectConfig`、`PlayerProject`、`ProductConfig`、`PlayerProduct`、`MarketTrackConfig`、`PlayerMarketState`、`CompetitorActionConfig`、`PlayerCompetitorAction` |
| 财务、融资、贷款 | `LoanConfig`、`PlayerLoan`、`InvestorConfig`、`PlayerFunding`、`PlayerPlatformWallet`、`PlatformCoinLedger` |
| 商城、VIP、道具 | `ShopProductConfig`、`PlayerShopPurchase`、`VipLevelConfig`、`PlayerVipDailyGift`、`ItemConfig`、`PlayerInventoryItem`、`PlayerItemLedger` |
| 活动、赛季、排行榜 | `SeasonConfig`、`SeasonTaskConfig`、`ActivityConfig`、`ActivityConfigDraft`、`ActivityShopItemConfig`、`LeaderboardSnapshot`、`LeaderboardRewardDelivery` |
| 商会与跨服 | `Guild`、`GuildMember`、`GuildTaskConfig`、`GuildTechConfig`、`GuildHelpRequest`、`CrossServerGroup`、`CrossServerSignup`、`CrossServerGuildSignup`、`PlayerCrossServerArenaState` |
| 内容、邮件、聊天和知识库 | `EventConfig`、`PlayerEvent`、`KnowledgeCategory`、`KnowledgeEntry`、`PlayerKnowledgeUnlock`、`AdminMailCompensation` |

## 目录结构

```text
startup-tycoon-h5/
├── apps/
│   ├── client/              # 玩家端 H5 游戏
│   │   ├── src/             # React 前端源码
│   │   ├── public/game-ui/  # 游戏 UI、员工头像、跨服资源
│   │   └── test/            # 玩家端页面和文案测试
│   ├── admin/               # 运营后台
│   │   ├── src/             # 后台 React 源码
│   │   └── test/            # 后台页面测试
│   └── api/                 # 后端 API
│       ├── src/             # 后端业务逻辑和 HTTP 接口
│       ├── prisma/          # Prisma schema 和种子数据
│       └── test/            # 后端接口测试
├── packages/
│   └── shared/              # 前后端共享类型
├── docs/                    # 产品设计、留存、商业化、活动、上线说明
├── img/                     # 概念图、首页 UI、功能入口图
├── .env.example             # 本地环境变量示例
├── package.json             # npm workspaces 根配置
└── README.md
```

## 脚本说明

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 同时启动全部 workspace 的开发服务 |
| `npm run dev:client` | 只启动玩家端 |
| `npm run dev:admin` | 只启动运营后台 |
| `npm run dev:api` | 只启动后端 API |
| `npm run build` | 构建全部 workspace |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 检查 |
| `npm run test` | 运行测试 |
| `npm run db:generate -w @wenziyouxi/api` | 生成 Prisma Client |
| `npm run db:push -w @wenziyouxi/api` | 同步数据库结构 |
| `npm run db:seed -w @wenziyouxi/api` | 写入初始化配置和种子数据 |

## 新手研究路线

1. 先跑通本地环境：安装依赖、初始化数据库、启动玩家端、后台和 API。
2. 体验玩家端主流程：注册、选服、创建公司、进入首页、招募员工、推进项目、处理待办。
3. 查看运营后台：玩家查询、平台币/VIP、邮件补偿、活动配置和审计日志。
4. 阅读数据库模型：优先看 `PlayerProfile`、`EmployeeConfig`、`TaskConfig`、`ShopProductConfig`、`Guild`、`SeasonConfig`、`ActivityConfig`。
5. 想改玩法，优先改 `apps/api/prisma/seed.ts` 和对应后端逻辑。
6. 想改 UI，优先参考 `img` 和 `apps/client/public/game-ui`。
7. 想上线，先补支付、部署、监控、备份、日志、权限分岗、备案和协议文档。

## 常见问题

### 启动后页面打不开？

请确认三个服务是否已启动：API `3001`、玩家端 `5173`、后台 `5174`。

### 注册或进入游戏失败？

请确认 MySQL 已启动，并且 `.env` 中的 `DATABASE_URL` 正确。然后重新执行：

```bash
npm run db:push -w @wenziyouxi/api
npm run db:seed -w @wenziyouxi/api
```

### 后台登录密码是什么？

后台密码来自 `.env` 中的 `ADMIN_PASSWORD`。本地开发请设置自己的密码。

### 可以直接商用吗？

项目建议使用 MIT License。你可以学习、修改、二开和商用，但需要自行处理美术版权、支付接入、服务器部署、安全、合规、备案、隐私政策和用户协议。

### 为什么部分页面视觉不统一？

当前首页、部分功能入口和概念图已经整理在 `img` 与 `game-ui` 目录中，但跨服页面和部分前端功能页仍未完全按概念图重做。二开时可优先从这些页面开始统一视觉。

## License

本项目使用 MIT License，详见根目录 `LICENSE` 文件。

## 联系与赞赏

如果这个项目对你有帮助，欢迎赞赏支持后续维护；商业合作、二开定制、部署上线、玩法扩展和前端 UI 重做，可以通过微信联系作者。

| 微信联系 | 赞赏支持 |
| --- | --- |
| ![微信联系](wx.jpg) | ![赞赏码](zhanshang.png) |
