import { PrismaClient } from "@prisma/client";

import { createPasswordRecord } from "../src/password.js";

const prisma = new PrismaClient();

const servers = [
  { id: "s1", name: "长宁一服", status: "recommended", label: "推荐", isRecommended: true, sortOrder: 1 },
  { id: "s2", name: "滨江新区", status: "new", label: "新服", isRecommended: false, sortOrder: 2 },
  { id: "s3", name: "中关村路演场", status: "busy", label: "繁忙", isRecommended: false, sortOrder: 3 }
];

const avatars = [
  { id: "strategist", name: "策略型创始人", glyph: "策", specialty: "融资谈判与方向判断", sortOrder: 1 },
  { id: "builder", name: "产品型创始人", glyph: "造", specialty: "产品研发与团队协作", sortOrder: 2 },
  { id: "operator", name: "运营型创始人", glyph: "营", specialty: "增长运营与现金回收", sortOrder: 3 }
];

const crossServerGroups = [
  {
    id: "new-growth-pool",
    name: "开服成长池",
    ruleLabel: "按开服时间与活跃度分池，避免老服碾压新服。",
    isActive: true,
    sortOrder: 1,
    serverIds: ["s1", "s2"]
  },
  {
    id: "roadshow-pool",
    name: "路演竞争池",
    ruleLabel: "繁忙服单独入池，后续按活跃度扩容。",
    isActive: true,
    sortOrder: 2,
    serverIds: ["s3"]
  }
];

const itemConfigs = [
  {
    id: "training-manual",
    name: "培养手册",
    category: "employee",
    rarity: "普通",
    icon: "file-text",
    summary: "用于员工培养和岗位成长，是首周留存的核心消耗材料。",
    usageHint: "员工培养、每日任务、通行证奖励",
    isConsumable: true,
    sortOrder: 1
  },
  {
    id: "headhunter-ticket",
    name: "猎头券",
    category: "employee",
    rarity: "优秀",
    icon: "user-plus",
    summary: "用于猎头招募池，提高稀缺及以上员工出现概率。",
    usageHint: "员工页猎头招募",
    isConsumable: true,
    sortOrder: 2
  },
  {
    id: "targeted-headhunt-letter",
    name: "定向猎头函",
    category: "employee",
    rarity: "稀缺",
    icon: "send",
    summary: "用于选择岗位方向的高级猎头，是员工付费深度的关键道具。",
    usageHint: "员工页定向猎头",
    isConsumable: true,
    sortOrder: 3
  },
  {
    id: "employee-gift",
    name: "员工好感礼物",
    category: "employee",
    rarity: "优秀",
    icon: "gift",
    summary: "用于提升忠诚度并缓解核心员工离职风险。",
    usageHint: "员工忠诚度和支线故事",
    isConsumable: true,
    sortOrder: 4
  },
  {
    id: "risk-insurance",
    name: "风险保险",
    category: "operation",
    rarity: "优秀",
    icon: "shield-check",
    summary: "用于降低一次经营事件、合同或市场波动的损失。",
    usageHint: "经营事件、市场竞争、活动商店",
    isConsumable: true,
    sortOrder: 10
  },
  {
    id: "action-drink",
    name: "行动力饮料",
    category: "operation",
    rarity: "普通",
    icon: "zap",
    summary: "用于补充行动力，支撑首日和每日经营循环。",
    usageHint: "项目推进、产品研发、每日任务",
    isConsumable: true,
    sortOrder: 11
  },
  {
    id: "project-accelerator",
    name: "项目加速券",
    category: "operation",
    rarity: "优秀",
    icon: "rocket",
    summary: "用于缩短项目交付周期，适合首周冲刺和赛季任务。",
    usageHint: "项目交付和赛季任务",
    isConsumable: true,
    sortOrder: 12
  },
  {
    id: "market-intel",
    name: "市场情报",
    category: "operation",
    rarity: "稀缺",
    icon: "radar",
    summary: "用于查看竞争压力并降低进入新赛道的不确定性。",
    usageHint: "市场竞争、跨服排行准备",
    isConsumable: true,
    sortOrder: 13
  },
  {
    id: "finance-advisor-card",
    name: "财务顾问卡",
    category: "operation",
    rarity: "稀缺",
    icon: "briefcase",
    summary: "用于现金流预警、融资和贷款选择，是中期经营缓冲道具。",
    usageHint: "财务、融资、贷款",
    isConsumable: true,
    sortOrder: 14
  },
  {
    id: "season-exp-ticket",
    name: "赛季经验券",
    category: "season",
    rarity: "优秀",
    icon: "ticket",
    summary: "用于提升赛季通行证进度，补足轻度玩家的赛季缺口。",
    usageHint: "赛季通行证",
    isConsumable: true,
    sortOrder: 20
  },
  {
    id: "founder-title-shard",
    name: "限定称号碎片",
    category: "cosmetic",
    rarity: "顶尖",
    icon: "award",
    summary: "用于兑换赛季限定称号，承接长期展示和排行荣誉。",
    usageHint: "称号、排行、赛季奖励",
    isConsumable: true,
    sortOrder: 30
  },
  {
    id: "office-skin-ticket",
    name: "办公室皮肤券",
    category: "cosmetic",
    rarity: "传奇",
    icon: "building-2",
    summary: "用于兑换限定办公室外观，不提供直接数值胜利。",
    usageHint: "外观、VIP、通行证付费线",
    isConsumable: true,
    sortOrder: 31
  }
];

const expandedMainTaskConfigs = [
  { id: "main-office-signage", title: "确认公司门头", description: "完善办公室门头、公司简介和核心业务一句话，让玩家理解公司身份展示。", rewardLabel: "资金 5万、声望 120", rewardCash: 50000, rewardReputation: 120, rewardItemId: null, rewardItemQuantity: 0, guideAction: "领取奖励" },
  { id: "main-first-budget", title: "制定首周预算", description: "确认现金、行动力和员工培养材料的首周使用顺序，避免资源一开始就分散。", rewardLabel: "财务顾问卡 1", rewardCash: 0, rewardReputation: 120, rewardItemId: "finance-advisor-card", rewardItemQuantity: 1, guideAction: "前往财务" },
  { id: "main-founder-rhythm", title: "建立创始人节奏", description: "理解行动力代表创始人精力，高收益动作需要消耗行动力并等待恢复。", rewardLabel: "行动力 20", rewardCash: 0, rewardReputation: 100, rewardActionPower: 20, rewardItemId: null, rewardItemQuantity: 0, guideAction: "领取奖励" },
  { id: "main-risk-review", title: "查看首次风险提示", description: "进入专属经理待办，了解合同、财务、舆情和随机经营任务会怎样影响公司。", rewardLabel: "风险保险 1", rewardCash: 0, rewardReputation: 140, rewardItemId: "risk-insurance", rewardItemQuantity: 1, guideAction: "处理事件" },
  { id: "main-first-report", title: "阅读经营日报", description: "复盘现金、声望、行动力和公司等级，确认下一步该优先推进什么。", rewardLabel: "资金 6万、经验", rewardCash: 60000, rewardReputation: 80, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往财务" },
  { id: "main-first-week-plan", title: "确定首周目标", description: "把公司启动、团队、项目、产品、融资、市场和赛季拆成首周路线。", rewardLabel: "行动力饮料 1", rewardCash: 0, rewardReputation: 160, rewardItemId: "action-drink", rewardItemQuantity: 1, guideAction: "领取奖励" },
  { id: "main-first-kpi", title: "设置第一组指标", description: "确认现金流、估值、声望和团队满意度是短期最重要的经营指标。", rewardLabel: "声望 180", rewardCash: 0, rewardReputation: 180, rewardItemId: null, rewardItemQuantity: 0, guideAction: "领取奖励" },
  { id: "main-role-map", title: "梳理岗位地图", description: "理解工程、产品、销售、运营、财务、法务和投资关系岗位的经营价值。", rewardLabel: "培养手册 1", rewardCash: 0, rewardReputation: 160, rewardItemId: "training-manual", rewardItemQuantity: 1, guideAction: "前往员工" },
  { id: "main-train-core", title: "培养核心成员", description: "给核心员工安排一次成长动作，形成员工养成和项目成功率之间的联系。", rewardLabel: "培养手册 1、声望 150", rewardCash: 0, rewardReputation: 150, rewardItemId: "training-manual", rewardItemQuantity: 1, guideAction: "前往员工" },
  { id: "main-staff-loyalty", title: "关注员工忠诚", description: "查看忠诚度、压力和好感礼物，理解员工不是一次性战力。", rewardLabel: "员工好感礼物 1", rewardCash: 0, rewardReputation: 160, rewardItemId: "employee-gift", rewardItemQuantity: 1, guideAction: "前往员工" },
  { id: "main-team-pressure", title: "处理团队压力", description: "确认创始人精力、员工压力和项目交付速度之间存在取舍。", rewardLabel: "行动力 15、声望 120", rewardCash: 0, rewardReputation: 120, rewardActionPower: 15, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往员工" },
  { id: "main-equity-plan", title: "讨论股权激励", description: "为核心员工预留长期激励思路，连接团队稳定和公司估值成长。", rewardLabel: "声望 220", rewardCash: 0, rewardReputation: 220, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往员工" },
  { id: "main-recruit-channel", title: "评估招聘渠道", description: "理解普通招募、猎头招募和定向猎头分别适合不同经营阶段。", rewardLabel: "猎头券 1", rewardCash: 0, rewardReputation: 180, rewardItemId: "headhunter-ticket", rewardItemQuantity: 1, guideAction: "前往员工" },
  { id: "main-manager-brief", title: "配置管理分工", description: "把员工放入项目、产品、市场和融资场景，形成公司团队分工。", rewardLabel: "培养手册 2", rewardCash: 0, rewardReputation: 180, rewardItemId: "training-manual", rewardItemQuantity: 2, guideAction: "前往员工" },
  { id: "main-client-brief", title: "阅读客户需求", description: "确认客户预算、验收周期和交付风险，避免项目只看收入不看成本。", rewardLabel: "资金 7万", rewardCash: 70000, rewardReputation: 90, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往项目" },
  { id: "main-scope-confirm", title: "确认项目范围", description: "把需求边界、延期风险和回款节点写清楚，提高项目交付可控性。", rewardLabel: "风险保险 1", rewardCash: 0, rewardReputation: 180, rewardItemId: "risk-insurance", rewardItemQuantity: 1, guideAction: "前往项目" },
  { id: "main-delivery-plan", title: "制定交付计划", description: "安排员工能力和行动力投入，理解项目推进不是无成本点击。", rewardLabel: "项目加速券 1", rewardCash: 0, rewardReputation: 160, rewardItemId: "project-accelerator", rewardItemQuantity: 1, guideAction: "前往项目" },
  { id: "main-quality-check", title: "做一次质量检查", description: "在交付前检查风险，避免客户满意度和公司声望受到损失。", rewardLabel: "声望 220", rewardCash: 0, rewardReputation: 220, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往项目" },
  { id: "main-acceptance-review", title: "推进验收复盘", description: "理解验收、回款和客户复购是项目线长期收益的关键。", rewardLabel: "资金 10万", rewardCash: 100000, rewardReputation: 120, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往项目" },
  { id: "main-repeat-contract", title: "争取客户复购", description: "用更稳定的交付结果争取复购，让项目成为长期现金流来源。", rewardLabel: "资金 12万、声望 180", rewardCash: 120000, rewardReputation: 180, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往项目" },
  { id: "main-project-margin", title: "核算项目毛利", description: "查看收入、成本和员工投入，理解现金流比单次订单金额更重要。", rewardLabel: "财务顾问卡 1", rewardCash: 0, rewardReputation: 160, rewardItemId: "finance-advisor-card", rewardItemQuantity: 1, guideAction: "前往财务" },
  { id: "main-user-research", title: "做用户调研", description: "确认产品目标用户、留存问题和付费理由，为产品线提供方向。", rewardLabel: "市场情报 1", rewardCash: 0, rewardReputation: 180, rewardItemId: "market-intel", rewardItemQuantity: 1, guideAction: "前往产品" },
  { id: "main-mvp-scope", title: "确定 MVP 范围", description: "缩小首版产品范围，控制技术债和现金消耗。", rewardLabel: "项目加速券 1", rewardCash: 0, rewardReputation: 160, rewardItemId: "project-accelerator", rewardItemQuantity: 1, guideAction: "前往产品" },
  { id: "main-tech-debt-check", title: "检查技术债", description: "理解产品增长过快会带来技术债、事故和用户流失。", rewardLabel: "风险保险 1", rewardCash: 0, rewardReputation: 160, rewardItemId: "risk-insurance", rewardItemQuantity: 1, guideAction: "前往产品" },
  { id: "main-retention-review", title: "查看留存指标", description: "把用户数、留存率和付费率放在一起判断产品是否健康。", rewardLabel: "声望 240", rewardCash: 0, rewardReputation: 240, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往产品" },
  { id: "main-payment-test", title: "验证付费理由", description: "理解玩家付费点要来自明确经营需求，不能只靠弹窗。", rewardLabel: "资金 8万、声望 180", rewardCash: 80000, rewardReputation: 180, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往商业" },
  { id: "main-growth-channel", title: "测试增长渠道", description: "用市场情报判断渠道质量，为产品增长和市场竞争做准备。", rewardLabel: "市场情报 1", rewardCash: 0, rewardReputation: 220, rewardItemId: "market-intel", rewardItemQuantity: 1, guideAction: "前往市场" },
  { id: "main-product-roadmap", title: "制定产品路线图", description: "把 MVP、增长、技术债和商业化节点整理成产品路线。", rewardLabel: "资金 10万、声望 220", rewardCash: 100000, rewardReputation: 220, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往产品" },
  { id: "main-cashflow-budget", title: "制定现金流预算", description: "确认月收入、月支出和负债风险，理解融资前先看现金流。", rewardLabel: "财务顾问卡 1", rewardCash: 0, rewardReputation: 180, rewardItemId: "finance-advisor-card", rewardItemQuantity: 1, guideAction: "前往财务" },
  { id: "main-cost-structure", title: "优化成本结构", description: "拆解员工薪资、项目投入和市场预算，降低扩张前的现金压力。", rewardLabel: "资金 12万", rewardCash: 120000, rewardReputation: 120, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往财务" },
  { id: "main-loan-plan", title: "准备贷款方案", description: "了解授信、还款压力和信用评级，不把贷款当作无限现金。", rewardLabel: "资金 10万、风险保险 1", rewardCash: 100000, rewardReputation: 160, rewardItemId: "risk-insurance", rewardItemQuantity: 1, guideAction: "前往贷款" },
  { id: "main-investor-list", title: "整理投资人名单", description: "选择适合阶段的投资人，理解声望和增长指标会影响谈判。", rewardLabel: "声望 260", rewardCash: 0, rewardReputation: 260, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往融资" },
  { id: "main-roadshow-deck", title: "准备路演材料", description: "把团队、项目、产品和财务指标整理成融资叙事。", rewardLabel: "财务顾问卡 1、声望 180", rewardCash: 0, rewardReputation: 180, rewardItemId: "finance-advisor-card", rewardItemQuantity: 1, guideAction: "前往融资" },
  { id: "main-term-review", title: "复核融资条款", description: "权衡估值、股权稀释和现金安全垫，避免只追求高估值。", rewardLabel: "资金 15万、声望 220", rewardCash: 150000, rewardReputation: 220, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往融资" },
  { id: "main-fund-node", title: "查看基金节点", description: "理解成长基金与等级节点、经营动作和经验倍率之间的关系。", rewardLabel: "行动力饮料 1、声望 160", rewardCash: 0, rewardReputation: 160, rewardItemId: "action-drink", rewardItemQuantity: 1, guideAction: "前往特权" },
  { id: "main-market-position", title: "确定市场定位", description: "选择赛道定位，理解市场不是只拼现金，还拼声望和产品质量。", rewardLabel: "市场情报 1", rewardCash: 0, rewardReputation: 200, rewardItemId: "market-intel", rewardItemQuantity: 1, guideAction: "前往市场" },
  { id: "main-competitor-scan", title: "扫描竞争对手", description: "观察竞品价格、渠道和舆情，准备市场反击方案。", rewardLabel: "声望 220", rewardCash: 0, rewardReputation: 220, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往市场" },
  { id: "main-price-strategy", title: "制定定价策略", description: "在现金回收、客户满意度和品牌定位之间做取舍。", rewardLabel: "资金 9万、声望 160", rewardCash: 90000, rewardReputation: 160, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往市场" },
  { id: "main-channel-test", title: "测试渠道投放", description: "用有限预算验证渠道效果，不盲目扩张市场支出。", rewardLabel: "市场情报 1", rewardCash: 0, rewardReputation: 180, rewardItemId: "market-intel", rewardItemQuantity: 1, guideAction: "前往市场" },
  { id: "main-brand-pr", title: "建立品牌曝光", description: "用声望承接融资、市场、商会和排行榜展示价值。", rewardLabel: "声望 320", rewardCash: 0, rewardReputation: 320, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往市场" },
  { id: "main-public-opinion", title: "预案舆情风险", description: "准备舆情应对和风险保险，避免市场增长带来失控成本。", rewardLabel: "风险保险 1", rewardCash: 0, rewardReputation: 180, rewardItemId: "risk-insurance", rewardItemQuantity: 1, guideAction: "处理事件" },
  { id: "main-market-sprint", title: "完成市场冲刺", description: "把市场、产品、项目和团队能力组合成一次增长冲刺。", rewardLabel: "资金 15万、声望 260", rewardCash: 150000, rewardReputation: 260, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往市场" },
  { id: "main-guild-join-plan", title: "规划商会协作", description: "理解商会互助、贡献和长期社交目标，不把商会当成单独按钮。", rewardLabel: "声望 220", rewardCash: 0, rewardReputation: 220, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往商会" },
  { id: "main-guild-help-plan", title: "准备商会互助", description: "通过成员互助连接日常留存、声望和排行榜展示。", rewardLabel: "限定称号碎片 1", rewardCash: 0, rewardReputation: 160, rewardItemId: "founder-title-shard", rewardItemQuantity: 1, guideAction: "前往商会" },
  { id: "main-rank-target", title: "设定本服排行目标", description: "把估值、声望、赛季积分和称号展示变成长期对比目标。", rewardLabel: "声望 260", rewardCash: 0, rewardReputation: 260, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往排行" },
  { id: "main-cross-server-target", title: "了解跨服目标", description: "明确跨服排行更偏长期荣誉和展示，不直接出售碾压胜利。", rewardLabel: "限定称号碎片 1", rewardCash: 0, rewardReputation: 180, rewardItemId: "founder-title-shard", rewardItemQuantity: 1, guideAction: "前往排行" },
  { id: "main-season-task-plan", title: "制定赛季任务计划", description: "把每日任务、随机任务和赛季任务组合成 7 日留存路线。", rewardLabel: "赛季经验券 1", rewardCash: 0, rewardReputation: 180, rewardItemId: "season-exp-ticket", rewardItemQuantity: 1, guideAction: "前往通行证" },
  { id: "main-pass-value", title: "查看通行证价值", description: "理解通行证提供奖励线、赛季任务和经验倍率参与上限。", rewardLabel: "赛季经验券 1、声望 160", rewardCash: 0, rewardReputation: 160, rewardItemId: "season-exp-ticket", rewardItemQuantity: 1, guideAction: "前往通行证" },
  { id: "main-activity-shop-plan", title: "规划活动商店", description: "把活动积分兑换成道具、称号碎片和行动力补给。", rewardLabel: "限定称号碎片 1", rewardCash: 0, rewardReputation: 180, rewardItemId: "founder-title-shard", rewardItemQuantity: 1, guideAction: "前往通行证" },
  { id: "main-vip-benefit-review", title: "查看 VIP 起步权益", description: "确认新号 VIP3 是身份和便利起点，不计入真实消费。", rewardLabel: "行动力 25、声望 180", rewardCash: 0, rewardReputation: 180, rewardActionPower: 25, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往VIP" },
  { id: "main-week-card-value", title: "评估经营周卡", description: "理解周卡提供经验倍率、每日行动力和经营材料，不直接卖胜利。", rewardLabel: "行动力饮料 1", rewardCash: 0, rewardReputation: 180, rewardItemId: "action-drink", rewardItemQuantity: 1, guideAction: "前往特权" },
  { id: "main-growth-fund-check", title: "查看成长基金", description: "把等级节点奖励和首日冲级目标连接起来，形成 7 日付费承接。", rewardLabel: "资金 12万、声望 180", rewardCash: 120000, rewardReputation: 180, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往特权" },
  { id: "main-action-power-plan", title: "制定行动力计划", description: "理解恢复、饮料、礼包和 VIP 上限，避免行动力成为无限购买资源。", rewardLabel: "行动力饮料 1", rewardCash: 0, rewardReputation: 160, rewardItemId: "action-drink", rewardItemQuantity: 1, guideAction: "前往背包" },
  { id: "main-reputation-plan", title: "规划声望成长", description: "确认声望影响融资、市场、商会、排行和随机任务选择。", rewardLabel: "声望 360", rewardCash: 0, rewardReputation: 360, rewardItemId: null, rewardItemQuantity: 0, guideAction: "前往排行" },
  { id: "main-full-level-plan", title: "了解满级去向", description: "提前理解 80 级后经验不会浪费，将进入声望积分、赛季贡献或满级宝箱。", rewardLabel: "赛季经验券 1", rewardCash: 0, rewardReputation: 220, rewardItemId: "season-exp-ticket", rewardItemQuantity: 1, guideAction: "前往通行证" },
  { id: "main-founder-summary", title: "完成首轮创业闭环", description: "完成公司启动、团队、项目、产品、财务、市场、商会和赛季的首轮理解。", rewardLabel: "资金 30万、声望 500", rewardCash: 300000, rewardReputation: 500, rewardItemId: "office-skin-ticket", rewardItemQuantity: 1, guideAction: "领取奖励" }
].map((task, index) => ({
  type: "main",
  target: 1,
  initialProgress: task.guideAction === "领取奖励" ? 1 : 0,
  rewardPlatformCoins: 0,
  rewardActionPower: 0,
  unlockKind: "none",
  sortOrder: index + 9,
  ...task
}));

const expandedMainTaskExperienceRewards = Object.fromEntries(expandedMainTaskConfigs.map((task, index) => [task.id, 90 + (index % 8) * 10]));

const taskConfigs = [
  {
    id: "main-profile-created",
    type: "main",
    title: "完成公司档案",
    description: "创建创始人和公司档案，正式进入写字楼创业阶段。",
    target: 1,
    initialProgress: 1,
    rewardLabel: "资金 10万、行动力饮料 1",
    rewardCash: 100000,
    rewardPlatformCoins: 0,
    rewardReputation: 0,
    rewardActionPower: 0,
    rewardItemId: "action-drink",
    rewardItemQuantity: 1,
    guideAction: "领取奖励",
    unlockKind: "none",
    sortOrder: 1
  },
  {
    id: "main-first-project",
    type: "main",
    title: "推进第一单项目",
    description: "进入项目中心推进一个经营项目，为公司拿到第一笔稳定收入。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "资金 20万、声望 500",
    rewardCash: 200000,
    rewardPlatformCoins: 0,
    rewardReputation: 500,
    rewardActionPower: 0,
    rewardItemId: "project-accelerator",
    rewardItemQuantity: 1,
    guideAction: "前往项目",
    unlockKind: "none",
    sortOrder: 2
  },
  {
    id: "main-first-employee",
    type: "main",
    title: "招募首位员工",
    description: "建立第一支核心团队，理解员工岗位对项目、产品和融资成功率的影响。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "猎头券 1、培养手册 2",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 300,
    rewardActionPower: 0,
    rewardItemId: "headhunter-ticket",
    rewardItemQuantity: 1,
    guideAction: "前往员工",
    unlockKind: "none",
    sortOrder: 3
  },
  {
    id: "main-product-launch",
    type: "main",
    title: "启动第一条产品线",
    description: "进入产品研发，观察用户、留存、付费率和技术债对长期现金流的影响。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "资金 18万、市场情报 1",
    rewardCash: 180000,
    rewardPlatformCoins: 0,
    rewardReputation: 500,
    rewardActionPower: 0,
    rewardItemId: "market-intel",
    rewardItemQuantity: 1,
    guideAction: "前往产品",
    unlockKind: "none",
    sortOrder: 4
  },
  {
    id: "main-finance-report",
    type: "main",
    title: "完成财务复盘",
    description: "查看公司现金流、负债和风险状态，理解月卡、基金、顾问卡的经营价值。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "财务顾问卡 1、声望 600",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 600,
    rewardActionPower: 0,
    rewardItemId: "finance-advisor-card",
    rewardItemQuantity: 1,
    guideAction: "前往财务",
    unlockKind: "none",
    sortOrder: 5
  },
  {
    id: "main-capital-choice",
    type: "main",
    title: "完成一次资本选择",
    description: "在融资和贷款之间选择现金流方案，推动公司进入扩张准备期。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "资金 25万、风险保险 1",
    rewardCash: 250000,
    rewardPlatformCoins: 0,
    rewardReputation: 700,
    rewardActionPower: 0,
    rewardItemId: "risk-insurance",
    rewardItemQuantity: 1,
    guideAction: "前往融资",
    unlockKind: "none",
    sortOrder: 6
  },
  {
    id: "main-market-entry",
    type: "main",
    title: "进入市场竞争",
    description: "选择一个赛道并处理竞争压力，开始连接排行榜、商会和跨服目标。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "市场情报 1、项目加速券 1",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 900,
    rewardActionPower: 0,
    rewardItemId: "market-intel",
    rewardItemQuantity: 1,
    guideAction: "前往市场",
    unlockKind: "none",
    sortOrder: 7
  },
  {
    id: "main-season-start",
    type: "main",
    title: "参与赛季活动",
    description: "进入赛季目标，理解通行证、活动商店和排行榜的长期循环。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "赛季经验券 1、限定称号碎片 1",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 1000,
    rewardActionPower: 0,
    rewardItemId: "season-exp-ticket",
    rewardItemQuantity: 1,
    guideAction: "前往通行证",
    unlockKind: "none",
    sortOrder: 8
  },
  ...expandedMainTaskConfigs,
  {
    id: "daily-login",
    type: "daily",
    title: "每日登录",
    description: "进入公司并查看今日经营目标，稳定首日和 7 日留存。",
    target: 1,
    initialProgress: 1,
    rewardLabel: "行动力 15、行动力饮料 1",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 0,
    rewardActionPower: 15,
    rewardItemId: "action-drink",
    rewardItemQuantity: 1,
    guideAction: "领取奖励",
    unlockKind: "none",
    sortOrder: 9
  },
  {
    id: "daily-train-employee",
    type: "daily",
    title: "培训员工",
    description: "完成一次员工培养，提高团队能力并维持员工成长节奏。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "培养手册 1、声望 120",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 120,
    rewardActionPower: 0,
    rewardItemId: "training-manual",
    rewardItemQuantity: 1,
    guideAction: "前往员工",
    unlockKind: "none",
    sortOrder: 10
  },
  {
    id: "daily-project-push",
    type: "daily",
    title: "推进项目",
    description: "推进一次项目进度，确保公司每天都有经营动作。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "资金 8万、体力 20",
    rewardCash: 80000,
    rewardPlatformCoins: 0,
    rewardReputation: 0,
    rewardActionPower: 20,
    rewardItemId: "project-accelerator",
    rewardItemQuantity: 0,
    guideAction: "前往项目",
    unlockKind: "none",
    sortOrder: 11
  },
  {
    id: "daily-handle-event",
    type: "daily",
    title: "处理经营事件",
    description: "完成一次消息、合同或财务事件决策，保持公司经营节奏。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "资金 5万、声望 200",
    rewardCash: 50000,
    rewardPlatformCoins: 0,
    rewardReputation: 200,
    rewardActionPower: 0,
    rewardItemId: "risk-insurance",
    rewardItemQuantity: 1,
    guideAction: "处理事件",
    unlockKind: "none",
    sortOrder: 12
  },
  {
    id: "daily-finance-review",
    type: "daily",
    title: "财务复盘",
    description: "查看一次财务或现金流状态，形成每日经营复盘习惯。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "资金 6万、财务顾问卡 1",
    rewardCash: 60000,
    rewardPlatformCoins: 0,
    rewardReputation: 120,
    rewardActionPower: 0,
    rewardItemId: "finance-advisor-card",
    rewardItemQuantity: 1,
    guideAction: "前往财务",
    unlockKind: "none",
    sortOrder: 13
  },
  {
    id: "daily-season-progress",
    type: "daily",
    title: "赛季推进",
    description: "完成一次赛季任务或活动操作，让通行证成为每日目标的一部分。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "赛季经验券 1、声望 180",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 180,
    rewardActionPower: 0,
    rewardItemId: "season-exp-ticket",
    rewardItemQuantity: 1,
    guideAction: "前往通行证",
    unlockKind: "none",
    sortOrder: 14
  },
  {
    id: "daily-guild-contribution",
    type: "daily",
    title: "商会协作",
    description: "参与商会贡献或互助，连接长期社交和排行榜目标。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "声望 220、限定称号碎片 1",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 220,
    rewardActionPower: 0,
    rewardItemId: "founder-title-shard",
    rewardItemQuantity: 1,
    guideAction: "前往商会",
    unlockKind: "none",
    sortOrder: 15
  },
  {
    id: "side-knowledge-labor-contract",
    type: "side",
    title: "阅读用工合规知识",
    description: "查看劳动合同风险知识卡，理解创业公司基础用工合规要求。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "声望 300、知识点 1",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 300,
    rewardActionPower: 0,
    rewardItemId: "employee-gift",
    rewardItemQuantity: 1,
    guideAction: "查看知识",
    unlockKind: "knowledge",
    sortOrder: 20
  },
  {
    id: "side-compliance-contract-review",
    type: "side",
    title: "完成合同复核",
    description: "推进一次合同复核支线，降低项目签约和回款风险。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "资金 6万、合规评分 2",
    rewardCash: 60000,
    rewardPlatformCoins: 0,
    rewardReputation: 0,
    rewardActionPower: 0,
    rewardItemId: "risk-insurance",
    rewardItemQuantity: 1,
    guideAction: "处理支线",
    unlockKind: "compliance",
    sortOrder: 21
  },
  {
    id: "side-investor-relation",
    type: "side",
    title: "维护投资人关系",
    description: "准备路演材料并建立投资人关系，提高后续融资成功率。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "财务顾问卡 1、声望 400",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 400,
    rewardActionPower: 0,
    rewardItemId: "finance-advisor-card",
    rewardItemQuantity: 1,
    guideAction: "前往融资",
    unlockKind: "none",
    sortOrder: 22
  },
  {
    id: "side-bank-credit",
    type: "side",
    title: "建立银行信用",
    description: "整理现金流和负债记录，为贷款额度和信用等级做准备。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "资金 8万、风险保险 1",
    rewardCash: 80000,
    rewardPlatformCoins: 0,
    rewardReputation: 260,
    rewardActionPower: 0,
    rewardItemId: "risk-insurance",
    rewardItemQuantity: 1,
    guideAction: "前往贷款",
    unlockKind: "none",
    sortOrder: 23
  },
  {
    id: "side-product-incident",
    type: "side",
    title: "处理产品事故",
    description: "修复技术债和用户反馈，理解工程、产品、运营员工组合的价值。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "项目加速券 1、培养手册 1",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 360,
    rewardActionPower: 0,
    rewardItemId: "project-accelerator",
    rewardItemQuantity: 1,
    guideAction: "前往产品",
    unlockKind: "none",
    sortOrder: 24
  },
  {
    id: "side-competitor-response",
    type: "side",
    title: "应对竞争对手",
    description: "处理价格战、人才挖角或舆论压力，连接市场、员工和风险保险。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "市场情报 1、声望 500",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 500,
    rewardActionPower: 0,
    rewardItemId: "market-intel",
    rewardItemQuantity: 1,
    guideAction: "前往市场",
    unlockKind: "none",
    sortOrder: 25
  },
  {
    id: "side-founder-pressure",
    type: "side",
    title: "创始人压力管理",
    description: "处理团队压力和创始人决策负担，稳定长期经营节奏。",
    target: 1,
    initialProgress: 0,
    rewardLabel: "员工好感礼物 1、行动力 25",
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardReputation: 420,
    rewardActionPower: 25,
    rewardItemId: "employee-gift",
    rewardItemQuantity: 1,
    guideAction: "前往员工",
    unlockKind: "none",
    sortOrder: 26
  }
];

const taskCompanyExperienceRewards: Record<string, number> = {
  "main-profile-created": 80,
  "main-first-project": 140,
  "main-first-employee": 120,
  "main-product-launch": 160,
  "main-finance-report": 120,
  "main-capital-choice": 180,
  "main-market-entry": 180,
  "main-season-start": 220,
  ...expandedMainTaskExperienceRewards,
  "daily-login": 40,
  "daily-train-employee": 50,
  "daily-project-push": 60,
  "daily-handle-event": 60,
  "daily-finance-review": 50,
  "daily-season-progress": 60,
  "daily-guild-contribution": 60,
  "side-knowledge-labor-contract": 70,
  "side-compliance-contract-review": 70,
  "side-investor-relation": 80,
  "side-bank-credit": 70,
  "side-product-incident": 80,
  "side-competitor-response": 90,
  "side-founder-pressure": 80
};

const randomTaskConfigs = [
  {
    id: "random-customer-pressure",
    category: "project",
    title: "客户临时压缩验收",
    description: "客户希望提前验收当前项目，团队可以加班推进，也可以坚持原计划降低风险。",
    source: "客户邮件",
    optionALabel: "投入精力加班推进",
    optionAResult: "项目节点提前，客户认可度提升，但创始人精力被消耗。",
    optionAActionPower: -20,
    optionACash: 90000,
    optionAReputation: 260,
    optionACompanyExperience: 70,
    optionBLabel: "坚持原计划交付",
    optionBResult: "团队压力稳定，收益较低，但保留后续经营精力。",
    optionBActionPower: 5,
    optionBCash: 30000,
    optionBReputation: 80,
    optionBCompanyExperience: 40,
    riskLabel: "项目节奏",
    sortOrder: 1,
    isActive: true
  },
  {
    id: "random-employee-burnout",
    category: "employee",
    title: "核心员工压力升高",
    description: "一名核心员工连续加班，专属经理建议你立即介入处理。",
    source: "员工私信",
    optionALabel: "亲自沟通并安排补休",
    optionAResult: "团队信任提升，短期效率略降，但降低离职风险。",
    optionAActionPower: -15,
    optionACash: -20000,
    optionAReputation: 300,
    optionACompanyExperience: 65,
    optionBLabel: "发放小额激励",
    optionBResult: "现金支出增加，员工状态暂时稳定。",
    optionBActionPower: -5,
    optionBCash: -50000,
    optionBReputation: 120,
    optionBCompanyExperience: 45,
    riskLabel: "员工压力",
    sortOrder: 2,
    isActive: true
  },
  {
    id: "random-media-interview",
    category: "reputation",
    title: "行业媒体采访邀约",
    description: "一家垂直媒体希望采访你的创业方法论，是否投入时间准备？",
    source: "媒体邀约",
    optionALabel: "准备采访提纲",
    optionAResult: "品牌曝光上升，声望提升明显。",
    optionAActionPower: -20,
    optionACash: 0,
    optionAReputation: 520,
    optionACompanyExperience: 80,
    optionBLabel: "提供简短回复",
    optionBResult: "曝光有限，但不影响主线经营节奏。",
    optionBActionPower: 0,
    optionBCash: 0,
    optionBReputation: 160,
    optionBCompanyExperience: 35,
    riskLabel: "品牌口碑",
    sortOrder: 3,
    isActive: true
  },
  {
    id: "random-cashflow-warning",
    category: "finance",
    title: "现金流预警复核",
    description: "财务顾问提示下月支出会明显提高，需要决定是否提前做预算调整。",
    source: "财务顾问",
    optionALabel: "亲自复核预算",
    optionAResult: "现金流风险下降，管理经验提升。",
    optionAActionPower: -15,
    optionACash: 60000,
    optionAReputation: 180,
    optionACompanyExperience: 65,
    optionBLabel: "暂缓处理",
    optionBResult: "保留行动力，但只获得少量经验。",
    optionBActionPower: 0,
    optionBCash: 0,
    optionBReputation: -80,
    optionBCompanyExperience: 25,
    riskLabel: "现金流",
    sortOrder: 4,
    isActive: true
  },
  {
    id: "random-market-counter",
    category: "market",
    title: "竞品突然降价",
    description: "同赛道竞品进行短期补贴，市场经理建议立刻选择应对策略。",
    source: "商业新闻",
    optionALabel: "用市场情报反击",
    optionAResult: "竞品声量被压制，公司声望和市场判断提升。",
    optionAActionPower: -25,
    optionACash: 40000,
    optionAReputation: 420,
    optionACompanyExperience: 90,
    optionBLabel: "观察一轮再行动",
    optionBResult: "节省资源，但市场主动权下降。",
    optionBActionPower: 0,
    optionBCash: 0,
    optionBReputation: -120,
    optionBCompanyExperience: 35,
    riskLabel: "市场竞争",
    sortOrder: 5,
    isActive: true
  },
  {
    id: "random-season-opportunity",
    category: "season",
    title: "赛季风口机会",
    description: "本周赛季主题带来一次曝光机会，适合补一段经营动作。",
    source: "赛季运营",
    optionALabel: "投入精力追风口",
    optionAResult: "赛季贡献和公司经验增长更快。",
    optionAActionPower: -20,
    optionACash: 50000,
    optionAReputation: 300,
    optionACompanyExperience: 100,
    optionBLabel: "只完成基础动作",
    optionBResult: "稳健推进，不影响日常经营。",
    optionBActionPower: 0,
    optionBCash: 20000,
    optionBReputation: 90,
    optionBCompanyExperience: 45,
    riskLabel: "赛季机会",
    sortOrder: 6,
    isActive: true
  }
];

const eventConfigs = [
  {
    id: "employee-contract-risk",
    title: "新员工入职资料缺口",
    source: "员工私信",
    channel: "chat",
    summary: "HR 提醒一名新员工还没有完成劳动合同签署。",
    context: "销售团队准备让新员工直接进入客户项目，但入职材料仍缺少合同签署和岗位确认。",
    optionA: "立即补齐合同和入职材料",
    optionAResult: "公司支出增加，但用工争议风险下降，团队对流程更有信心。",
    optionACash: -20000,
    optionAReputation: 300,
    optionACustomerSatisfaction: 0,
    optionARiskDelta: -1,
    optionB: "先进入项目，手续稍后补齐",
    optionBResult: "短期不影响交付，但用工和客户现场管理风险上升。",
    optionBCash: 0,
    optionBReputation: -800,
    optionBCustomerSatisfaction: 0,
    optionBRiskDelta: 1,
    followupEventId: "customer-contract-review",
    knowledgeTitle: "劳动合同签署风险",
    riskExplanation: "入职资料缺口会放大劳动争议和客户现场管理风险，越早补齐越能降低后续赔偿压力。",
    sortOrder: 1
  },
  {
    id: "customer-contract-review",
    title: "客户要求压缩验收周期",
    source: "客户邮件",
    channel: "contract",
    summary: "客户希望缩短验收时间，并保留延期扣款条款。",
    context: "客户提出快速签约，但验收节点、延期扣款和回款条件都需要在合同中确认。",
    optionA: "坚持分阶段验收和书面确认",
    optionAResult: "签约节奏变慢，但回款节点更清晰，项目风险下降。",
    optionACash: -10000,
    optionAReputation: 500,
    optionACustomerSatisfaction: 2,
    optionARiskDelta: -1,
    optionB: "接受压缩周期换取快速签约",
    optionBResult: "公司快速拿到现金，但后续验收和扣款风险增加。",
    optionBCash: 60000,
    optionBReputation: -500,
    optionBCustomerSatisfaction: -4,
    optionBRiskDelta: 1,
    followupEventId: null,
    knowledgeTitle: "项目验收条款",
    riskExplanation: "验收周期压缩会提高短期签约速度，但也会压缩纠错时间，回款条款不清时容易形成争议。",
    sortOrder: 2
  },
  {
    id: "finance-warning-cashflow",
    title: "现金流安全垫下降",
    source: "财报预警",
    channel: "finance",
    summary: "本月固定支出上升，现金安全垫低于财务建议线。",
    context: "财务建议暂缓非必要招聘和营销投放，优先处理短周期回款项目。",
    optionA: "收缩支出，优先短周期回款",
    optionAResult: "现金流压力缓解，但增长速度暂时放慢。",
    optionACash: 30000,
    optionAReputation: 0,
    optionACustomerSatisfaction: 1,
    optionARiskDelta: -1,
    optionB: "维持投放，争取下月增长",
    optionBResult: "增长投入保持，但短期资金压力继续上升。",
    optionBCash: -50000,
    optionBReputation: 300,
    optionBCustomerSatisfaction: 0,
    optionBRiskDelta: 1,
    followupEventId: null,
    knowledgeTitle: "现金流安全垫",
    riskExplanation: "固定支出持续上升时，现金安全垫不足会限制招聘、交付和应急谈判能力。",
    sortOrder: 3
  },
  {
    id: "public-opinion-response",
    title: "客户群出现交付质疑",
    source: "舆情热搜",
    channel: "hot",
    summary: "老客户群里有人质疑项目延期和售后响应速度。",
    context: "运营负责人建议当天给出交付说明，销售负责人则希望先私下安抚关键客户。",
    optionA: "公开说明交付排期",
    optionAResult: "透明沟通提升声誉，但需要投入额外客服和项目管理成本。",
    optionACash: -15000,
    optionAReputation: 700,
    optionACustomerSatisfaction: 2,
    optionARiskDelta: -1,
    optionB: "先私下安抚关键客户",
    optionBResult: "短期成本较低，但公开质疑没有完全消除。",
    optionBCash: 0,
    optionBReputation: -400,
    optionBCustomerSatisfaction: -1,
    optionBRiskDelta: 1,
    followupEventId: null,
    knowledgeTitle: "客户舆情响应",
    riskExplanation: "舆情事件拖延处理会扩大客户不确定感，透明说明通常能降低后续信任成本。",
    sortOrder: 4
  },
  {
    id: "funding-failed-bridge-plan",
    title: "融资未达成后的替代方案",
    source: "董事会纪要",
    channel: "finance",
    summary: "本轮融资没有完成，董事会要求提交现金流替代方案。",
    context: "投资人暂缓打款后，公司需要在贷款周转、降本和项目回款之间快速做出选择，避免现金安全垫继续下降。",
    optionA: "收缩支出并催收短周期项目",
    optionAResult: "公司进入保守经营，现金流压力缓解，董事会对执行节奏保持关注。",
    optionACash: 50000,
    optionAReputation: 200,
    optionACustomerSatisfaction: 0,
    optionARiskDelta: -1,
    optionB: "继续寻找更高估值投资人",
    optionBResult: "公司保持增长叙事，但现金流和董事会压力继续上升。",
    optionBCash: -30000,
    optionBReputation: 500,
    optionBCustomerSatisfaction: 0,
    optionBRiskDelta: 1,
    followupEventId: null,
    knowledgeTitle: "融资失败后的现金流替代路线",
    riskExplanation: "融资失败不会直接补充现金，越接近资金紧张区间，越需要用回款、降本或短期授信维持经营安全垫。",
    sortOrder: 5
  },
  {
    id: "product-tech-debt-incident",
    title: "产品技术债事故预警",
    source: "技术周报",
    channel: "product",
    summary: "产品增长后服务器报警和缺陷反馈同时上升。",
    context: "研发负责人提醒，继续推增长会让系统稳定性和客服压力同步恶化，需要决定是否暂停迭代补技术债。",
    optionA: "暂停增长实验，集中修复技术债",
    optionAResult: "短期增长放慢，但产品口碑和稳定性恢复。",
    optionACash: -40000,
    optionAReputation: 800,
    optionACustomerSatisfaction: 3,
    optionARiskDelta: -1,
    optionB: "继续增长，客服先顶住",
    optionBResult: "用户增长继续，但故障和投诉风险上升。",
    optionBCash: 30000,
    optionBReputation: -900,
    optionBCustomerSatisfaction: -5,
    optionBRiskDelta: 1,
    followupEventId: null,
    knowledgeTitle: "技术债和产品稳定性",
    riskExplanation: "产品用户增长会放大历史技术债，服务器成本、客服压力和口碑风险会一起出现。",
    sortOrder: 6
  }
];

const investorConfigs = [
  {
    id: "angel-local-commerce",
    roundName: "天使轮",
    name: "启明天使合伙人",
    focus: "本地商业 SaaS",
    ticketSize: 800000,
    valuationMultiplierBasisPoints: 10500,
    equityBasisPoints: 800,
    successRateBase: 78,
    debtToleranceBasisPoints: 4500,
    boardPressure: 12,
    term: "每月提交经营简报，重大支出需提前说明。",
    summary: "偏好现金流清晰的小团队，条款温和，适合早期补充安全垫。",
    sortOrder: 1
  },
  {
    id: "prea-growth-fund",
    roundName: "Pre-A",
    name: "源石成长基金",
    focus: "项目收入增长",
    ticketSize: 1500000,
    valuationMultiplierBasisPoints: 11600,
    equityBasisPoints: 1200,
    successRateBase: 62,
    debtToleranceBasisPoints: 3500,
    boardPressure: 22,
    term: "季度增长目标未达成时触发估值复核。",
    summary: "提供更高金额，但关注增长速度和后续估值兑现。",
    sortOrder: 2
  },
  {
    id: "strategic-enterprise-capital",
    roundName: "A轮",
    name: "华企战略资本",
    focus: "大客户渠道合作",
    ticketSize: 2600000,
    valuationMultiplierBasisPoints: 12800,
    equityBasisPoints: 1600,
    successRateBase: 32,
    debtToleranceBasisPoints: 3000,
    boardPressure: 34,
    term: "优先参与大客户渠道合作，保留董事会观察权。",
    summary: "金额最高，条款更强势，适合公司状态稳定后推进。",
    sortOrder: 3
  }
];

const loanConfigs = [
  {
    id: "short-cashflow-loan",
    name: "经营周转贷",
    lender: "城市商业银行",
    principal: 300000,
    annualRateBasisPoints: 720,
    termMonths: 6,
    monthlyPayment: 53200,
    creditRequired: "B",
    summary: "适合短期现金流缺口，放款快，但每月还款压力明显。",
    sortOrder: 1
  },
  {
    id: "equipment-growth-loan",
    name: "设备升级贷",
    lender: "科技园担保中心",
    principal: 600000,
    annualRateBasisPoints: 960,
    termMonths: 12,
    monthlyPayment: 54800,
    creditRequired: "A",
    summary: "额度更高，适合扩张办公和交付能力，信用评级不足时不可申请。",
    sortOrder: 2
  },
  {
    id: "emergency-bridge-loan",
    name: "应急过桥贷",
    lender: "供应链金融机构",
    principal: 180000,
    annualRateBasisPoints: 1800,
    termMonths: 3,
    monthlyPayment: 62700,
    creditRequired: "C",
    summary: "用于资金紧张时快速止血，利率高，逾期会迅速拖累信用。",
    sortOrder: 3
  },
  {
    id: "high-debt-expansion-loan",
    name: "高负债扩张贷",
    lender: "民间联合授信",
    principal: 4000000,
    annualRateBasisPoints: 1500,
    termMonths: 12,
    monthlyPayment: 700000,
    creditRequired: "B",
    summary: "额度很高，可迅速补充现金，但会把公司推入高负债压力区。",
    sortOrder: 4
  }
];

const employeeConfigs = [
  {
    id: "lin-zhiyuan",
    name: "林知远",
    role: "工程师",
    careerLevel: "合伙人",
    rarity: "传奇",
    baseSalary: 88000,
    basePressure: 34,
    loyalty: 92,
    growthPotential: 86,
    management: 86,
    negotiation: 74,
    execution: 92,
    specialty: "擅长架构优化，能降低技术债和服务器成本。",
    recruitWeight: 3,
    sortOrder: 1
  },
  {
    id: "xu-manqing",
    name: "许曼青",
    role: "产品经理",
    careerLevel: "总监",
    rarity: "顶尖",
    baseSalary: 72000,
    basePressure: 42,
    loyalty: 82,
    growthPotential: 88,
    management: 78,
    negotiation: 72,
    execution: 90,
    specialty: "擅长 MVP 和用户留存，适合产品线推进。",
    recruitWeight: 8,
    sortOrder: 2
  },
  {
    id: "zhou-qihang",
    name: "周启航",
    role: "销售",
    careerLevel: "高级",
    rarity: "稀缺",
    baseSalary: 62000,
    basePressure: 46,
    loyalty: 76,
    growthPotential: 80,
    management: 70,
    negotiation: 92,
    execution: 84,
    specialty: "擅长大客户谈判，提高项目收入和回款概率。",
    recruitWeight: 15,
    sortOrder: 3
  },
  {
    id: "shen-ruoning",
    name: "沈若宁",
    role: "财务",
    careerLevel: "中级",
    rarity: "优秀",
    baseSalary: 46000,
    basePressure: 28,
    loyalty: 86,
    growthPotential: 74,
    management: 76,
    negotiation: 68,
    execution: 82,
    specialty: "擅长现金流管控，降低经营波动。",
    recruitWeight: 24,
    sortOrder: 4
  },
  {
    id: "gu-mingchuan",
    name: "顾明川",
    role: "法务",
    careerLevel: "专家",
    rarity: "稀缺",
    baseSalary: 58000,
    basePressure: 32,
    loyalty: 88,
    growthPotential: 78,
    management: 72,
    negotiation: 84,
    execution: 76,
    specialty: "擅长合同和劳动争议，降低合规风险。",
    recruitWeight: 12,
    sortOrder: 5
  },
  {
    id: "ye-siqi",
    name: "叶思齐",
    role: "运营",
    careerLevel: "高级",
    rarity: "优秀",
    baseSalary: 42000,
    basePressure: 38,
    loyalty: 80,
    growthPotential: 82,
    management: 70,
    negotiation: 66,
    execution: 88,
    specialty: "擅长活动和用户增长，但容易提高营销成本。",
    recruitWeight: 28,
    sortOrder: 6
  },
  {
    id: "su-jian",
    name: "苏简",
    role: "HR",
    careerLevel: "中级",
    rarity: "优秀",
    baseSalary: 38000,
    basePressure: 24,
    loyalty: 90,
    growthPotential: 76,
    management: 80,
    negotiation: 64,
    execution: 72,
    specialty: "降低离职风险，提高招聘效率。",
    recruitWeight: 30,
    sortOrder: 7
  },
  {
    id: "han-luming",
    name: "韩鹿鸣",
    role: "市场",
    careerLevel: "高级",
    rarity: "稀缺",
    baseSalary: 56000,
    basePressure: 41,
    loyalty: 78,
    growthPotential: 82,
    management: 72,
    negotiation: 78,
    execution: 86,
    specialty: "擅长市场投放和活动节奏，提高产品获客效率。",
    recruitWeight: 14,
    sortOrder: 8
  },
  {
    id: "chen-xingbai",
    name: "陈星白",
    role: "客服",
    careerLevel: "中级",
    rarity: "优秀",
    baseSalary: 36000,
    basePressure: 30,
    loyalty: 84,
    growthPotential: 72,
    management: 66,
    negotiation: 74,
    execution: 78,
    specialty: "擅长客户安抚和续约支持，降低交付后的投诉风险。",
    recruitWeight: 34,
    sortOrder: 9
  },
  {
    id: "lu-yuanzhou",
    name: "陆远舟",
    role: "投资关系",
    careerLevel: "专家",
    rarity: "顶尖",
    baseSalary: 78000,
    basePressure: 44,
    loyalty: 80,
    growthPotential: 86,
    management: 84,
    negotiation: 92,
    execution: 78,
    specialty: "擅长路演材料和投资人维护，提高融资推进成功率。",
    recruitWeight: 6,
    sortOrder: 10
  },
  {
    id: "luo-yian",
    name: "罗以安",
    role: "工程师",
    careerLevel: "高级",
    rarity: "稀缺",
    baseSalary: 60000,
    basePressure: 40,
    loyalty: 76,
    growthPotential: 84,
    management: 70,
    negotiation: 60,
    execution: 90,
    specialty: "擅长快速交付和项目加速，但需要产品经理配合控制返工。",
    recruitWeight: 16,
    sortOrder: 11
  },
  {
    id: "bai-luyao",
    name: "白鹿遥",
    role: "产品经理",
    careerLevel: "高级",
    rarity: "稀缺",
    baseSalary: 59000,
    basePressure: 36,
    loyalty: 82,
    growthPotential: 84,
    management: 76,
    negotiation: 70,
    execution: 86,
    specialty: "擅长用户调研和留存指标，适合首周产品线成长。",
    recruitWeight: 16,
    sortOrder: 12
  },
  {
    id: "ji-nanfeng",
    name: "纪南风",
    role: "销售",
    careerLevel: "总监",
    rarity: "顶尖",
    baseSalary: 76000,
    basePressure: 50,
    loyalty: 74,
    growthPotential: 88,
    management: 82,
    negotiation: 96,
    execution: 88,
    specialty: "擅长大客户成交和续费谈判，适合高预算项目。",
    recruitWeight: 7,
    sortOrder: 13
  },
  {
    id: "tang-che",
    name: "唐澈",
    role: "运营",
    careerLevel: "总监",
    rarity: "顶尖",
    baseSalary: 74000,
    basePressure: 46,
    loyalty: 78,
    growthPotential: 90,
    management: 84,
    negotiation: 72,
    execution: 92,
    specialty: "擅长活动增长和赛季节奏，提升活动积分获取效率。",
    recruitWeight: 7,
    sortOrder: 14
  },
  {
    id: "jiang-wenxi",
    name: "姜闻溪",
    role: "法务",
    careerLevel: "合伙人",
    rarity: "传奇",
    baseSalary: 92000,
    basePressure: 30,
    loyalty: 90,
    growthPotential: 88,
    management: 88,
    negotiation: 90,
    execution: 82,
    specialty: "擅长重大合规和竞业风险，能显著降低危机损失。",
    recruitWeight: 2,
    sortOrder: 15
  },
  {
    id: "qin-yue",
    name: "秦越",
    role: "财务",
    careerLevel: "专家",
    rarity: "稀缺",
    baseSalary: 54000,
    basePressure: 31,
    loyalty: 86,
    growthPotential: 80,
    management: 82,
    negotiation: 72,
    execution: 80,
    specialty: "擅长预算拆解和现金流预警，提高融资贷款前置判断。",
    recruitWeight: 15,
    sortOrder: 16
  },
  {
    id: "wen-qiao",
    name: "温乔",
    role: "HR",
    careerLevel: "高级",
    rarity: "稀缺",
    baseSalary: 52000,
    basePressure: 26,
    loyalty: 88,
    growthPotential: 82,
    management: 86,
    negotiation: 70,
    execution: 78,
    specialty: "擅长团队稳定和绩效面谈，降低压力与离职风险。",
    recruitWeight: 16,
    sortOrder: 17
  },
  {
    id: "yu-shen",
    name: "余深",
    role: "工程师",
    careerLevel: "中级",
    rarity: "普通",
    baseSalary: 30000,
    basePressure: 34,
    loyalty: 78,
    growthPotential: 70,
    management: 58,
    negotiation: 52,
    execution: 76,
    specialty: "稳定执行基础交付，适合作为早期团队补位。",
    recruitWeight: 48,
    sortOrder: 18
  },
  {
    id: "song-lan",
    name: "宋岚",
    role: "产品经理",
    careerLevel: "中级",
    rarity: "普通",
    baseSalary: 32000,
    basePressure: 32,
    loyalty: 80,
    growthPotential: 72,
    management: 64,
    negotiation: 60,
    execution: 74,
    specialty: "能稳定推进需求整理，适合产品研发入门阶段。",
    recruitWeight: 46,
    sortOrder: 19
  },
  {
    id: "pei-ran",
    name: "裴然",
    role: "销售",
    careerLevel: "中级",
    rarity: "普通",
    baseSalary: 34000,
    basePressure: 38,
    loyalty: 72,
    growthPotential: 74,
    management: 60,
    negotiation: 76,
    execution: 72,
    specialty: "擅长中小客户跟进，适合首周项目回款节奏。",
    recruitWeight: 44,
    sortOrder: 20
  },
  {
    id: "xia-zhi",
    name: "夏至",
    role: "运营",
    careerLevel: "中级",
    rarity: "普通",
    baseSalary: 31000,
    basePressure: 33,
    loyalty: 78,
    growthPotential: 72,
    management: 62,
    negotiation: 58,
    execution: 78,
    specialty: "擅长基础活动执行，适合每日任务和赛季入门。",
    recruitWeight: 45,
    sortOrder: 21
  },
  {
    id: "miao-yu",
    name: "苗雨",
    role: "客服",
    careerLevel: "高级",
    rarity: "优秀",
    baseSalary: 43000,
    basePressure: 30,
    loyalty: 86,
    growthPotential: 76,
    management: 68,
    negotiation: 78,
    execution: 82,
    specialty: "擅长客户续约和舆情降温，适合客户支线。",
    recruitWeight: 30,
    sortOrder: 22
  },
  {
    id: "he-qing",
    name: "何青",
    role: "市场",
    careerLevel: "中级",
    rarity: "优秀",
    baseSalary: 41000,
    basePressure: 35,
    loyalty: 78,
    growthPotential: 78,
    management: 66,
    negotiation: 66,
    execution: 84,
    specialty: "擅长买量素材和渠道执行，补足早期增长能力。",
    recruitWeight: 31,
    sortOrder: 23
  },
  {
    id: "zhao-ming",
    name: "赵明",
    role: "投资关系",
    careerLevel: "中级",
    rarity: "优秀",
    baseSalary: 45000,
    basePressure: 36,
    loyalty: 76,
    growthPotential: 78,
    management: 72,
    negotiation: 80,
    execution: 74,
    specialty: "擅长整理融资材料和约见投资人，适合资本支线。",
    recruitWeight: 28,
    sortOrder: 24
  }
];

const projectConfigs = [
  {
    id: "outsourcing-crm",
    name: "客户 CRM 外包开发",
    category: "外包开发",
    cycleDays: 12,
    budget: 180000,
    risk: "低",
    successRateBase: 72,
    revenueReward: 320000,
    reputationReward: 1200,
    customerSatisfactionReward: 4,
    failurePenalty: 60000,
    summary: "为传统企业交付客户管理系统，回款稳定，适合建立第一条项目收入线。",
    sortOrder: 1
  },
  {
    id: "saas-custom",
    name: "连锁门店 SaaS 定制",
    category: "SaaS 定制",
    cycleDays: 18,
    budget: 260000,
    risk: "中",
    successRateBase: 64,
    revenueReward: 520000,
    reputationReward: 1800,
    customerSatisfactionReward: 5,
    failurePenalty: 110000,
    summary: "为连锁门店定制数据看板和会员运营工具，收益更高但交付压力更大。",
    sortOrder: 2
  },
  {
    id: "growth-campaign",
    name: "城市品牌增长投放",
    category: "营销增长",
    cycleDays: 10,
    budget: 150000,
    risk: "中",
    successRateBase: 68,
    revenueReward: 280000,
    reputationReward: 1600,
    customerSatisfactionReward: 3,
    failurePenalty: 80000,
    summary: "帮助客户完成城市级品牌投放，依赖运营节奏和客户沟通质量。",
    sortOrder: 3
  },
  {
    id: "ai-automation",
    name: "AI 自动化方案",
    category: "AI 自动化",
    cycleDays: 22,
    budget: 360000,
    risk: "高",
    successRateBase: 56,
    revenueReward: 760000,
    reputationReward: 2600,
    customerSatisfactionReward: 6,
    failurePenalty: 180000,
    summary: "为客户设计自动化客服和流程机器人，成功后能显著提升公司声誉。",
    sortOrder: 4
  }
];

const productConfigs = [
  {
    id: "crm-lite-saas",
    name: "轻量 CRM SaaS",
    category: "企业服务",
    summary: "把项目交付经验沉淀成订阅产品，适合早期建立长期收入。",
    launchCost: 280000,
    baseUsers: 120,
    retentionBasisPoints: 4200,
    payRateBasisPoints: 180,
    revenuePerPayingUser: 680,
    acquisitionCost: 90000,
    serverCost: 28000,
    techDebtGrowth: 9,
    reputationGrowth: 3,
    sortOrder: 1
  },
  {
    id: "ai-customer-copilot",
    name: "AI 客服 Copilot",
    category: "AI 工具",
    summary: "面向中小企业的客服自动化工具，增长快但技术债和服务器压力更高。",
    launchCost: 420000,
    baseUsers: 80,
    retentionBasisPoints: 3600,
    payRateBasisPoints: 220,
    revenuePerPayingUser: 980,
    acquisitionCost: 140000,
    serverCost: 52000,
    techDebtGrowth: 15,
    reputationGrowth: 5,
    sortOrder: 2
  }
];

const marketTrackConfigs = [
  {
    id: "enterprise-saas",
    name: "企业 SaaS",
    summary: "回款稳定、服务成本中等，容易被价格战和客户迁移影响。",
    costStructure: "获客成本中等，客服和续费运营占比高。",
    industryHeat: 66,
    policyRisk: 18,
    baseShareBasisPoints: 820,
    customerPool: 120000,
    sortOrder: 1
  },
  {
    id: "ai-tools",
    name: "AI 工具",
    summary: "行业热度高、增长快，但算力成本、政策变化和专利争议更频繁。",
    costStructure: "服务器和研发成本高，增长弹性强。",
    industryHeat: 84,
    policyRisk: 42,
    baseShareBasisPoints: 520,
    customerPool: 180000,
    sortOrder: 2
  }
];

const competitorActionConfigs = [
  {
    id: "saas-price-war",
    trackId: "enterprise-saas",
    competitorName: "蓝鲸企服",
    actionType: "price_war",
    title: "竞品发起价格战",
    summary: "蓝鲸企服下调年费并承诺免费迁移，短期压缩你的签约转化。",
    cashImpact: -50000,
    monthlyIncomeImpact: -60000,
    monthlyExpenseImpact: 20000,
    reputationImpact: -400,
    employeeSatisfactionImpact: 0,
    customerSatisfactionImpact: -3,
    marketShareDeltaBasisPoints: -90,
    competitorShareDeltaBasisPoints: 140,
    pricePressure: 18,
    talentPressure: 4,
    policyRiskDelta: 0,
    responseCost: 90000,
    responseShareDeltaBasisPoints: 150,
    responseReputationImpact: 500,
    sortOrder: 1
  },
  {
    id: "ai-patent-dispute",
    trackId: "ai-tools",
    competitorName: "星河智能",
    actionType: "patent",
    title: "竞品提出专利诉讼威胁",
    summary: "星河智能指控你的客服模型流程相似，要求停止部分宣传。",
    cashImpact: -90000,
    monthlyIncomeImpact: -30000,
    monthlyExpenseImpact: 50000,
    reputationImpact: -900,
    employeeSatisfactionImpact: -2,
    customerSatisfactionImpact: -5,
    marketShareDeltaBasisPoints: -120,
    competitorShareDeltaBasisPoints: 100,
    pricePressure: 6,
    talentPressure: 8,
    policyRiskDelta: 8,
    responseCost: 160000,
    responseShareDeltaBasisPoints: 190,
    responseReputationImpact: 900,
    sortOrder: 2
  },
  {
    id: "saas-poach-manager",
    trackId: "enterprise-saas",
    competitorName: "云帆科技",
    actionType: "poach",
    title: "竞品挖角客户成功负责人",
    summary: "云帆科技向你的客户成功团队开出高薪，续费服务稳定性承压。",
    cashImpact: -30000,
    monthlyIncomeImpact: -20000,
    monthlyExpenseImpact: 30000,
    reputationImpact: -500,
    employeeSatisfactionImpact: -5,
    customerSatisfactionImpact: -4,
    marketShareDeltaBasisPoints: -70,
    competitorShareDeltaBasisPoints: 90,
    pricePressure: 3,
    talentPressure: 20,
    policyRiskDelta: 0,
    responseCost: 110000,
    responseShareDeltaBasisPoints: 130,
    responseReputationImpact: 400,
    sortOrder: 3
  }
];

const shopProductConfigs = [
  {
    id: "first-charge-starter",
    name: "首充创业启动包",
    category: "first_charge",
    pricePlatformCoins: 680,
    rewardCash: 180000,
    rewardActionPower: 30,
    rewardReputation: 300,
    rewardItemId: "headhunter-ticket",
    rewardItemQuantity: 1,
    durationDays: 0,
    purchaseLimit: 1,
    summary: "首日启动资源，给现金、行动力和首次猎头机会，不强制弹窗打断主线。",
    isActive: true,
    sortOrder: 1
  },
  {
    id: "daily-founder-pack",
    name: "每日经营礼包",
    category: "daily_pack",
    pricePlatformCoins: 180,
    rewardCash: 60000,
    rewardActionPower: 30,
    rewardReputation: 120,
    rewardItemId: "action-drink",
    rewardItemQuantity: 1,
    durationDays: 0,
    purchaseLimit: 1,
    summary: "轻量补足当天项目推进和经营事件节奏，适合首日小额转化。",
    isActive: true,
    sortOrder: 2
  },
  {
    id: "weekly-operation-card",
    name: "经营周卡",
    category: "weekly_card",
    pricePlatformCoins: 680,
    rewardCash: 160000,
    rewardActionPower: 120,
    rewardReputation: 360,
    rewardItemId: "training-manual",
    rewardItemQuantity: 3,
    durationDays: 7,
    purchaseLimit: 1,
    summary: "绑定 7 日留存的轻权益，提供行动力和员工培养材料。",
    isActive: true,
    sortOrder: 3
  },
  {
    id: "monthly-card-basic",
    name: "基础月卡",
    category: "monthly_card",
    pricePlatformCoins: 1280,
    rewardCash: 260000,
    rewardActionPower: 80,
    rewardReputation: 500,
    rewardItemId: "action-drink",
    rewardItemQuantity: 5,
    durationDays: 30,
    purchaseLimit: 1,
    summary: "30 天经营补贴入口，展示每日领取预期并提供即时启动材料。",
    isActive: true,
    sortOrder: 10
  },
  {
    id: "growth-fund-weekly",
    name: "7日成长基金",
    category: "growth_fund",
    pricePlatformCoins: 980,
    rewardCash: 320000,
    rewardActionPower: 80,
    rewardReputation: 700,
    rewardItemId: "targeted-headhunt-letter",
    rewardItemQuantity: 1,
    durationDays: 7,
    purchaseLimit: 1,
    summary: "绑定 D1-D7 主线节点，承接首周留存转化和员工定向补位。",
    isActive: true,
    sortOrder: 11
  },
  {
    id: "growth-fund-seed",
    name: "种子期成长基金",
    category: "growth_fund",
    pricePlatformCoins: 1980,
    rewardCash: 520000,
    rewardActionPower: 120,
    rewardReputation: 900,
    rewardItemId: "finance-advisor-card",
    rewardItemQuantity: 2,
    durationDays: 0,
    purchaseLimit: 1,
    summary: "绑定公司等级、估值、产品和融资节点，缓解研发与资本压力。",
    isActive: true,
    sortOrder: 12
  },
  {
    id: "headhunter-ticket",
    name: "猎头招募券",
    category: "recruit_ticket",
    pricePlatformCoins: 360,
    rewardCash: 0,
    rewardActionPower: 20,
    rewardReputation: 120,
    rewardItemId: "headhunter-ticket",
    rewardItemQuantity: 1,
    durationDays: 0,
    purchaseLimit: 0,
    summary: "用于猎头招募池，提升稀缺及以上员工出现概率。",
    isActive: true,
    sortOrder: 20
  },
  {
    id: "employee-growth-pack",
    name: "员工成长礼包",
    category: "employee_pack",
    pricePlatformCoins: 880,
    rewardCash: 0,
    rewardActionPower: 40,
    rewardReputation: 280,
    rewardItemId: "training-manual",
    rewardItemQuantity: 8,
    durationDays: 0,
    purchaseLimit: 3,
    summary: "提供培养手册和行动力，解决员工成长早期材料不足。",
    isActive: true,
    sortOrder: 21
  },
  {
    id: "targeted-headhunt-pack",
    name: "定向猎头礼包",
    category: "employee_pack",
    pricePlatformCoins: 1680,
    rewardCash: 0,
    rewardActionPower: 60,
    rewardReputation: 500,
    rewardItemId: "targeted-headhunt-letter",
    rewardItemQuantity: 2,
    durationDays: 0,
    purchaseLimit: 2,
    summary: "提供岗位定向选择权，作为长期员工收集的核心深度商品。",
    isActive: true,
    sortOrder: 22
  },
  {
    id: "risk-insurance-trial",
    name: "风险保险体验",
    category: "risk_insurance",
    pricePlatformCoins: 520,
    rewardCash: 120000,
    rewardActionPower: 20,
    rewardReputation: 260,
    rewardItemId: "risk-insurance",
    rewardItemQuantity: 2,
    durationDays: 7,
    purchaseLimit: 1,
    summary: "降低早期经营波动的体验型保障，不直接清空负债或失败风险。",
    isActive: true,
    sortOrder: 30
  },
  {
    id: "market-sprint-pack",
    name: "市场冲刺礼包",
    category: "operation_pack",
    pricePlatformCoins: 1280,
    rewardCash: 180000,
    rewardActionPower: 80,
    rewardReputation: 420,
    rewardItemId: "market-intel",
    rewardItemQuantity: 3,
    durationDays: 0,
    purchaseLimit: 2,
    summary: "提供市场情报和行动力，服务 D6 市场竞争与长期排行准备。",
    isActive: true,
    sortOrder: 31
  },
  {
    id: "project-delivery-pack",
    name: "项目交付礼包",
    category: "operation_pack",
    pricePlatformCoins: 980,
    rewardCash: 120000,
    rewardActionPower: 70,
    rewardReputation: 260,
    rewardItemId: "project-accelerator",
    rewardItemQuantity: 3,
    durationDays: 0,
    purchaseLimit: 2,
    summary: "补足项目交付节奏，服务主线推进和赛季任务。",
    isActive: true,
    sortOrder: 32
  }
];

const vipLevelConfigs = [
  {
    level: 0,
    name: "VIP 0",
    requiredExperience: 0,
    dailyGiftPlatformCoins: 0,
    dailyGiftActionPower: 20,
    actionPowerLimitBonus: 0,
    quickSettleTimes: 0,
    trainingQueueBonus: 0,
    recruitRefreshTimes: 0,
    shopDiscountBasisPoints: 10000,
    title: "创业新星",
    avatarFrame: "basic",
    summary: "基础身份，保留每日行动力补给。",
    sortOrder: 0
  },
  {
    level: 1,
    name: "VIP 1",
    requiredExperience: 680,
    dailyGiftPlatformCoins: 30,
    dailyGiftActionPower: 30,
    actionPowerLimitBonus: 10,
    quickSettleTimes: 1,
    trainingQueueBonus: 0,
    recruitRefreshTimes: 1,
    shopDiscountBasisPoints: 9800,
    title: "创业先驱",
    avatarFrame: "gold-line",
    summary: "解锁轻量便利和基础身份展示。",
    sortOrder: 1
  },
  {
    level: 2,
    name: "VIP 2",
    requiredExperience: 1280,
    dailyGiftPlatformCoins: 60,
    dailyGiftActionPower: 50,
    actionPowerLimitBonus: 20,
    quickSettleTimes: 2,
    trainingQueueBonus: 1,
    recruitRefreshTimes: 2,
    shopDiscountBasisPoints: 9500,
    title: "增长合伙人",
    avatarFrame: "gold-ring",
    summary: "增强项目推进和员工培养便利。",
    sortOrder: 2
  },
  {
    level: 3,
    name: "VIP 3",
    requiredExperience: 3000,
    dailyGiftPlatformCoins: 80,
    dailyGiftActionPower: 60,
    actionPowerLimitBonus: 30,
    quickSettleTimes: 2,
    trainingQueueBonus: 1,
    recruitRefreshTimes: 2,
    shopDiscountBasisPoints: 9400,
    title: "资本新贵",
    avatarFrame: "platinum",
    summary: "提供更多容错和信息优势，不直接消除经营风险。",
    sortOrder: 3
  },
  {
    level: 4,
    name: "VIP 4",
    requiredExperience: 6000,
    dailyGiftPlatformCoins: 100,
    dailyGiftActionPower: 70,
    actionPowerLimitBonus: 40,
    quickSettleTimes: 3,
    trainingQueueBonus: 1,
    recruitRefreshTimes: 3,
    shopDiscountBasisPoints: 9300,
    title: "增长董事",
    avatarFrame: "platinum-plus",
    summary: "增强日常补给、招聘刷新和轻量折扣。",
    sortOrder: 4
  },
  {
    level: 5,
    name: "VIP 5",
    requiredExperience: 10000,
    dailyGiftPlatformCoins: 130,
    dailyGiftActionPower: 85,
    actionPowerLimitBonus: 50,
    quickSettleTimes: 3,
    trainingQueueBonus: 2,
    recruitRefreshTimes: 3,
    shopDiscountBasisPoints: 9200,
    title: "行业新贵",
    avatarFrame: "diamond",
    summary: "适合员工培养和七日成长基金玩家。",
    sortOrder: 5
  },
  {
    level: 6,
    name: "VIP 6",
    requiredExperience: 18000,
    dailyGiftPlatformCoins: 160,
    dailyGiftActionPower: 100,
    actionPowerLimitBonus: 60,
    quickSettleTimes: 4,
    trainingQueueBonus: 2,
    recruitRefreshTimes: 4,
    shopDiscountBasisPoints: 9100,
    title: "区域领航者",
    avatarFrame: "diamond-plus",
    summary: "提高经营容错和中期培养效率。",
    sortOrder: 6
  },
  {
    level: 7,
    name: "VIP 7",
    requiredExperience: 30000,
    dailyGiftPlatformCoins: 200,
    dailyGiftActionPower: 120,
    actionPowerLimitBonus: 75,
    quickSettleTimes: 4,
    trainingQueueBonus: 2,
    recruitRefreshTimes: 4,
    shopDiscountBasisPoints: 9000,
    title: "员工伯乐",
    avatarFrame: "star-gold",
    summary: "服务员工池、培养材料和定向招募深度。",
    sortOrder: 7
  },
  {
    level: 8,
    name: "VIP 8",
    requiredExperience: 50000,
    dailyGiftPlatformCoins: 250,
    dailyGiftActionPower: 140,
    actionPowerLimitBonus: 90,
    quickSettleTimes: 5,
    trainingQueueBonus: 3,
    recruitRefreshTimes: 5,
    shopDiscountBasisPoints: 8900,
    title: "赛季合伙人",
    avatarFrame: "star-platinum",
    summary: "承接赛季、员工养成和长期展示。",
    sortOrder: 8
  },
  {
    level: 9,
    name: "VIP 9",
    requiredExperience: 80000,
    dailyGiftPlatformCoins: 320,
    dailyGiftActionPower: 165,
    actionPowerLimitBonus: 110,
    quickSettleTimes: 5,
    trainingQueueBonus: 3,
    recruitRefreshTimes: 5,
    shopDiscountBasisPoints: 8800,
    title: "资本合伙人",
    avatarFrame: "star-diamond",
    summary: "强化中高付费玩家的便利和身份。",
    sortOrder: 9
  },
  {
    level: 10,
    name: "VIP 10",
    requiredExperience: 120000,
    dailyGiftPlatformCoins: 400,
    dailyGiftActionPower: 190,
    actionPowerLimitBonus: 130,
    quickSettleTimes: 6,
    trainingQueueBonus: 3,
    recruitRefreshTimes: 6,
    shopDiscountBasisPoints: 8700,
    title: "独角兽董事",
    avatarFrame: "unicorn-gold",
    summary: "进入长期身份和经营便利阶段。",
    sortOrder: 10
  },
  {
    level: 11,
    name: "VIP 11",
    requiredExperience: 180000,
    dailyGiftPlatformCoins: 500,
    dailyGiftActionPower: 220,
    actionPowerLimitBonus: 155,
    quickSettleTimes: 6,
    trainingQueueBonus: 4,
    recruitRefreshTimes: 6,
    shopDiscountBasisPoints: 8600,
    title: "跨服名董",
    avatarFrame: "unicorn-platinum",
    summary: "匹配跨服荣誉、商会和长期付费深度。",
    sortOrder: 11
  },
  {
    level: 12,
    name: "VIP 12",
    requiredExperience: 260000,
    dailyGiftPlatformCoins: 650,
    dailyGiftActionPower: 260,
    actionPowerLimitBonus: 180,
    quickSettleTimes: 7,
    trainingQueueBonus: 4,
    recruitRefreshTimes: 7,
    shopDiscountBasisPoints: 8500,
    title: "产业资本家",
    avatarFrame: "unicorn-diamond",
    summary: "提供高阶便利和稀缺身份展示。",
    sortOrder: 12
  },
  {
    level: 13,
    name: "VIP 13",
    requiredExperience: 380000,
    dailyGiftPlatformCoins: 850,
    dailyGiftActionPower: 310,
    actionPowerLimitBonus: 210,
    quickSettleTimes: 7,
    trainingQueueBonus: 5,
    recruitRefreshTimes: 7,
    shopDiscountBasisPoints: 8400,
    title: "行业领袖",
    avatarFrame: "legend-gold",
    summary: "强化长期荣誉、外观和便利上限。",
    sortOrder: 13
  },
  {
    level: 14,
    name: "VIP 14",
    requiredExperience: 550000,
    dailyGiftPlatformCoins: 1100,
    dailyGiftActionPower: 370,
    actionPowerLimitBonus: 245,
    quickSettleTimes: 8,
    trainingQueueBonus: 5,
    recruitRefreshTimes: 8,
    shopDiscountBasisPoints: 8300,
    title: "商业巨擘",
    avatarFrame: "legend-platinum",
    summary: "高付费身份阶段，仍不直接售卖胜利。",
    sortOrder: 14
  },
  {
    level: 15,
    name: "VIP 15",
    requiredExperience: 800000,
    dailyGiftPlatformCoins: 1500,
    dailyGiftActionPower: 450,
    actionPowerLimitBonus: 300,
    quickSettleTimes: 9,
    trainingQueueBonus: 6,
    recruitRefreshTimes: 10,
    shopDiscountBasisPoints: 8200,
    title: "传奇创始人",
    avatarFrame: "legend-diamond",
    summary: "最高身份与长期荣誉，只提供便利、展示和轻量效率。",
    sortOrder: 15
  }
];

const titleConfigs = [
  {
    id: "startup-founder",
    name: "初创老板",
    category: "growth",
    source: "achievement",
    bonusLabel: "身份展示",
    durationDays: 0,
    sortOrder: 1
  },
  {
    id: "cashflow-master",
    name: "现金流大师",
    category: "finance",
    source: "achievement",
    bonusLabel: "现金流榜展示",
    durationDays: 0,
    sortOrder: 2
  },
  {
    id: "server-richest",
    name: "本服首富",
    category: "rank",
    source: "leaderboard",
    bonusLabel: "排行榜展示",
    durationDays: 7,
    sortOrder: 3
  },
  {
    id: "cross-unicorn",
    name: "跨服独角兽",
    category: "rank",
    source: "cross_server",
    bonusLabel: "跨服榜展示",
    durationDays: 7,
    sortOrder: 4
  },
  {
    id: "strategic-investor",
    name: "战略投资人",
    category: "vip",
    source: "vip",
    bonusLabel: "VIP身份展示",
    durationDays: 0,
    sortOrder: 5
  },
  {
    id: "season-ai-pioneer",
    name: "AI风口先锋",
    category: "season",
    source: "season",
    bonusLabel: "赛季活动展示",
    durationDays: 30,
    sortOrder: 6
  }
];

const achievementConfigs = [
  {
    id: "profile-created",
    name: "创业开张",
    category: "growth",
    description: "完成创始人和公司档案。",
    conditionKind: "profile_created",
    conditionValue: 1,
    rewardCash: 50000,
    rewardPlatformCoins: 0,
    rewardActionPower: 20,
    rewardTitleId: "startup-founder",
    rewardKnowledgeId: "company-registration-basics",
    isHidden: false,
    sortOrder: 1
  },
  {
    id: "positive-cashflow",
    name: "现金流转正",
    category: "finance",
    description: "公司月收入高于月支出。",
    conditionKind: "positive_cashflow",
    conditionValue: 1,
    rewardCash: 80000,
    rewardPlatformCoins: 0,
    rewardActionPower: 20,
    rewardTitleId: "cashflow-master",
    rewardKnowledgeId: "cashflow-safety-line",
    isHidden: false,
    sortOrder: 2
  },
  {
    id: "valuation-ten-million",
    name: "千万估值",
    category: "growth",
    description: "公司估值达到 1000 万。",
    conditionKind: "valuation",
    conditionValue: 10000000,
    rewardCash: 0,
    rewardPlatformCoins: 120,
    rewardActionPower: 0,
    rewardTitleId: null,
    rewardKnowledgeId: "valuation-method-note",
    isHidden: true,
    sortOrder: 3
  },
  {
    id: "season-ai-agent-growth",
    name: "AI 风口上榜",
    category: "season",
    description: "完成 AI Agent 风口榜活动目标。",
    conditionKind: "manual_season",
    conditionValue: 1,
    rewardCash: 0,
    rewardPlatformCoins: 0,
    rewardActionPower: 0,
    rewardTitleId: "season-ai-pioneer",
    rewardKnowledgeId: "ai-agent-season-playbook",
    isHidden: false,
    sortOrder: 19
  }
];

const knowledgeCategories = [
  { id: "startup", name: "创业基础", sortOrder: 1 },
  { id: "finance", name: "财务合规", sortOrder: 2 },
  { id: "season", name: "赛季运营", sortOrder: 3 }
];

const knowledgeEntries = [
  {
    id: "company-registration-basics",
    categoryId: "startup",
    title: "公司档案与主体登记",
    summary: "游戏中公司档案对应真实创业里的主体信息、经营范围和团队责任边界。",
    sourceUrl: "https://www.samr.gov.cn/",
    collectedAt: "2026-05-01",
    contentVersion: "2026.05",
    disclaimer: "仅作游戏科普，不构成法律建议",
    sortOrder: 1
  },
  {
    id: "cashflow-safety-line",
    categoryId: "finance",
    title: "现金流安全线",
    summary: "持续正向现金流比单月利润更能反映早期公司的生存质量。",
    sourceUrl: "https://www.sba.gov/business-guide/manage-your-business",
    collectedAt: "2026-05-01",
    contentVersion: "2026.05",
    disclaimer: "仅作游戏科普，不构成法律建议",
    sortOrder: 2
  },
  {
    id: "valuation-method-note",
    categoryId: "finance",
    title: "估值只是谈判结果",
    summary: "估值会受到现金流、增长、债务和市场预期影响，不等同于可立即变现的现金。",
    sourceUrl: "https://www.sec.gov/education",
    collectedAt: "2026-05-01",
    contentVersion: "2026.05",
    disclaimer: "仅作游戏科普，不构成法律建议",
    sortOrder: 3
  },
  {
    id: "ai-agent-season-playbook",
    categoryId: "season",
    title: "AI Agent 风口活动复盘",
    summary: "赛季活动用于模拟新技术窗口期的产品增长、现金流约束和运营节奏管理。",
    sourceUrl: "https://www.sba.gov/business-guide/manage-your-business",
    collectedAt: "2026-05-01",
    contentVersion: "2026.05",
    disclaimer: "仅作游戏科普，不构成法律建议",
    sortOrder: 19
  }
];

const seasonConfigs = [
  {
    id: "season-ai-agent-2026",
    name: "AI Agent 元年",
    theme: "用产品增长和现金流穿越新风口。",
    startDate: "2026-05-01",
    endDate: "2026-05-30",
    passPricePlatformCoins: 880,
    sortOrder: 1
  }
];

const seasonTaskConfigs = [
  {
    id: "season-daily-project",
    seasonId: "season-ai-agent-2026",
    title: "推进一次风口项目",
    description: "完成一次项目或产品推进，为赛季积累增长积分。",
    target: 1,
    rewardPoints: 120,
    rewardItemId: "season-exp-ticket",
    rewardItemQuantity: 1,
    sortOrder: 1
  },
  {
    id: "season-train-team",
    seasonId: "season-ai-agent-2026",
    title: "培养一次增长团队",
    description: "完成员工培养，积累赛季团队成长积分。",
    target: 1,
    rewardPoints: 90,
    rewardItemId: "training-manual",
    rewardItemQuantity: 1,
    sortOrder: 2
  },
  {
    id: "season-handle-risk",
    seasonId: "season-ai-agent-2026",
    title: "处理一次经营风险",
    description: "处理经营事件或活动风险，理解保险和顾问道具的价值。",
    target: 1,
    rewardPoints: 100,
    rewardItemId: "risk-insurance",
    rewardItemQuantity: 1,
    sortOrder: 3
  },
  {
    id: "season-market-sprint",
    seasonId: "season-ai-agent-2026",
    title: "完成一次市场冲刺",
    description: "推进市场、活动或商会目标，为排行榜积累长期资源。",
    target: 1,
    rewardPoints: 140,
    rewardItemId: "market-intel",
    rewardItemQuantity: 1,
    sortOrder: 4
  }
];

const activityConfigs = [
  {
    id: "ai-agent-growth",
    seasonId: "season-ai-agent-2026",
    name: "AI Agent 风口榜",
    startDate: "2026-05-01",
    endDate: "2026-05-20",
    leaderboardKey: "activity-ai-agent-growth",
    targetScore: 200,
    rewardCash: 120000,
    rewardReputation: 600,
    rewardPoints: 260,
    rewardTitleId: "season-ai-pioneer",
    sortOrder: 1
  }
];

const activityShopItemConfigs = [
  {
    id: "activity-risk-insurance",
    seasonId: "season-ai-agent-2026",
    name: "风口风险保险",
    costPoints: 180,
    rewardActionPower: 30,
    rewardReputation: 120,
    rewardItemId: "risk-insurance",
    rewardItemQuantity: 1,
    purchaseLimit: 1,
    summary: "用于活动期降低一次经营波动，补充风险保险和行动力。",
    isActive: true,
    sortOrder: 1
  },
  {
    id: "activity-season-exp",
    seasonId: "season-ai-agent-2026",
    name: "赛季经验补给",
    costPoints: 120,
    rewardActionPower: 10,
    rewardReputation: 80,
    rewardItemId: "season-exp-ticket",
    rewardItemQuantity: 1,
    purchaseLimit: 3,
    summary: "用于补足赛季任务进度，帮助轻度玩家追赶奖励线。",
    isActive: true,
    sortOrder: 2
  },
  {
    id: "activity-founder-title-shard",
    seasonId: "season-ai-agent-2026",
    name: "先锋称号碎片",
    costPoints: 260,
    rewardActionPower: 0,
    rewardReputation: 180,
    rewardItemId: "founder-title-shard",
    rewardItemQuantity: 2,
    purchaseLimit: 2,
    summary: "用于兑换赛季展示荣誉，服务长期排行和跨服目标。",
    isActive: true,
    sortOrder: 3
  }
];

const scenarioConfigs = [
  {
    id: "cashflow-rescue",
    name: "现金流 15 天救援",
    summary: "固定危机场景：现金紧张、负债率高、核心员工波动和客户延期付款同时出现。",
    initialStateJson: JSON.stringify({
      cashDays: 15,
      debtRatioBasisPoints: 8000,
      coreEmployeeRisk: "核心员工准备离职",
      customerDelay: "大客户延期付款"
    }),
    rewardCash: 90000,
    rewardReputation: 500,
    rewardTitleId: "cashflow-master",
    sortOrder: 1
  }
];

const guildTaskConfigs = [
  {
    id: "guild-daily-help",
    title: "成员互助",
    description: "完成一次商会互助，提升商会活跃度。",
    target: 1,
    contributionReward: 20,
    sortOrder: 1
  }
];

const guildTechConfigs = [
  {
    id: "shared-office",
    name: "联合办公",
    description: "提升商会成员的协作效率展示。",
    maxLevel: 5,
    sortOrder: 1
  }
];

const adminPasswordText = process.env.ADMIN_PASSWORD ?? "admin123";

if (adminPasswordText.length < 6 || adminPasswordText.length > 72) {
  throw new Error("ADMIN_PASSWORD must be 6 to 72 characters.");
}

const seed = async (): Promise<void> => {
  for (const server of servers) {
    await prisma.gameServer.upsert({
      where: { id: server.id },
      update: server,
      create: server
    });
  }

  for (const avatar of avatars) {
    await prisma.avatarOption.upsert({
      where: { id: avatar.id },
      update: avatar,
      create: avatar
    });
  }

  for (const group of crossServerGroups) {
    const { serverIds, ...groupConfig } = group;
    await prisma.crossServerGroup.upsert({
      where: { id: group.id },
      update: groupConfig,
      create: groupConfig
    });
    for (const [index, serverId] of serverIds.entries()) {
      await prisma.crossServerGroupServer.upsert({
        where: { serverId },
        update: {
          groupId: group.id,
          sortOrder: index + 1
        },
        create: {
          groupId: group.id,
          serverId,
          sortOrder: index + 1
        }
      });
    }
  }

  for (const itemConfig of itemConfigs) {
    await prisma.itemConfig.upsert({
      where: { id: itemConfig.id },
      update: itemConfig,
      create: itemConfig
    });
  }

  for (const taskConfig of taskConfigs) {
    const configWithExperience = {
      ...taskConfig,
      rewardCompanyExperience: taskCompanyExperienceRewards[taskConfig.id] ?? 0
    };
    await prisma.taskConfig.upsert({
      where: { id: taskConfig.id },
      update: configWithExperience,
      create: configWithExperience
    });
  }

  for (const randomTaskConfig of randomTaskConfigs) {
    await prisma.randomTaskConfig.upsert({
      where: { id: randomTaskConfig.id },
      update: randomTaskConfig,
      create: randomTaskConfig
    });
  }

  for (const employeeConfig of employeeConfigs) {
    await prisma.employeeConfig.upsert({
      where: { id: employeeConfig.id },
      update: employeeConfig,
      create: employeeConfig
    });
  }

  for (const projectConfig of projectConfigs) {
    await prisma.projectConfig.upsert({
      where: { id: projectConfig.id },
      update: projectConfig,
      create: projectConfig
    });
  }

  for (const productConfig of productConfigs) {
    await prisma.productConfig.upsert({
      where: { id: productConfig.id },
      update: productConfig,
      create: productConfig
    });
  }

  for (const marketTrackConfig of marketTrackConfigs) {
    await prisma.marketTrackConfig.upsert({
      where: { id: marketTrackConfig.id },
      update: marketTrackConfig,
      create: marketTrackConfig
    });
  }

  for (const competitorActionConfig of competitorActionConfigs) {
    await prisma.competitorActionConfig.upsert({
      where: { id: competitorActionConfig.id },
      update: competitorActionConfig,
      create: competitorActionConfig
    });
  }

  for (const shopProductConfig of shopProductConfigs) {
    await prisma.shopProductConfig.upsert({
      where: { id: shopProductConfig.id },
      update: shopProductConfig,
      create: shopProductConfig
    });
  }

  for (const vipLevelConfig of vipLevelConfigs) {
    await prisma.vipLevelConfig.upsert({
      where: { level: vipLevelConfig.level },
      update: vipLevelConfig,
      create: vipLevelConfig
    });
  }

  for (const seasonConfig of seasonConfigs) {
    await prisma.seasonConfig.upsert({
      where: { id: seasonConfig.id },
      update: seasonConfig,
      create: seasonConfig
    });
  }

  for (const seasonTaskConfig of seasonTaskConfigs) {
    await prisma.seasonTaskConfig.upsert({
      where: { id: seasonTaskConfig.id },
      update: seasonTaskConfig,
      create: seasonTaskConfig
    });
  }

  for (const activityConfig of activityConfigs) {
    await prisma.activityConfig.upsert({
      where: { id: activityConfig.id },
      update: activityConfig,
      create: activityConfig
    });
  }

  for (const activityShopItemConfig of activityShopItemConfigs) {
    await prisma.activityShopItemConfig.upsert({
      where: { id: activityShopItemConfig.id },
      update: activityShopItemConfig,
      create: activityShopItemConfig
    });
  }

  for (const scenarioConfig of scenarioConfigs) {
    await prisma.scenarioConfig.upsert({
      where: { id: scenarioConfig.id },
      update: scenarioConfig,
      create: scenarioConfig
    });
  }

  for (const titleConfig of titleConfigs) {
    await prisma.titleConfig.upsert({
      where: { id: titleConfig.id },
      update: titleConfig,
      create: titleConfig
    });
  }

  for (const knowledgeCategory of knowledgeCategories) {
    await prisma.knowledgeCategory.upsert({
      where: { id: knowledgeCategory.id },
      update: knowledgeCategory,
      create: knowledgeCategory
    });
  }

  for (const knowledgeEntry of knowledgeEntries) {
    await prisma.knowledgeEntry.upsert({
      where: { id: knowledgeEntry.id },
      update: knowledgeEntry,
      create: knowledgeEntry
    });
  }

  for (const achievementConfig of achievementConfigs) {
    await prisma.achievementConfig.upsert({
      where: { id: achievementConfig.id },
      update: achievementConfig,
      create: achievementConfig
    });
  }

  for (const guildTaskConfig of guildTaskConfigs) {
    await prisma.guildTaskConfig.upsert({
      where: { id: guildTaskConfig.id },
      update: guildTaskConfig,
      create: guildTaskConfig
    });
  }

  for (const guildTechConfig of guildTechConfigs) {
    await prisma.guildTechConfig.upsert({
      where: { id: guildTechConfig.id },
      update: guildTechConfig,
      create: guildTechConfig
    });
  }

  for (const eventConfig of eventConfigs) {
    await prisma.eventConfig.upsert({
      where: { id: eventConfig.id },
      update: eventConfig,
      create: eventConfig
    });
  }

  for (const loanConfig of loanConfigs) {
    await prisma.loanConfig.upsert({
      where: { id: loanConfig.id },
      update: loanConfig,
      create: loanConfig
    });
  }

  for (const investorConfig of investorConfigs) {
    await prisma.investorConfig.upsert({
      where: { id: investorConfig.id },
      update: investorConfig,
      create: investorConfig
    });
  }

  const adminPassword = createPasswordRecord(adminPasswordText);
  await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: adminPassword,
    create: {
      username: "admin",
      ...adminPassword
    }
  });
};

seed()
  .finally(async () => {
    await prisma.$disconnect();
  });
