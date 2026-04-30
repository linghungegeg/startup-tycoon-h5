import { type FormEvent, useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001";
const SESSION_KEY = "wenziyouxi.client.session";
const REMEMBER_AUTH_KEY = "wenziyouxi.client.rememberAuth";
const SESSION_VERSION = 1;

type OnboardingStep = "auth" | "server" | "avatar" | "profile" | "game";
type AuthMode = "login" | "register";
type NativeHomePage = "leaderboard" | "shop" | "bag" | "negotiation";

type ApiSuccess<T> = {
  success: true;
  data: T;
  traceId: string;
};

type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
  traceId: string;
};

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

type AccountSession = {
  accountId: string;
  username: string;
  token: string;
};

type ServerOption = {
  id: string;
  name: string;
  status?: string;
  label: string;
  isRecommended: boolean;
};

type AvatarOption = {
  id: string;
  name: string;
  glyph: string;
  specialty: string;
};

type PlayerProfile = {
  id: string;
  accountId: string;
  serverId: string;
  avatarId: string;
  founderName: string;
  companyName: string;
  companyLevel: number;
  cash: number;
  platformCoins: number;
  premiumCurrency: number;
  reputation: number;
  actionPower: number;
  actionPowerLimit: number;
  monthlyIncome: number;
  monthlyExpense: number;
  valuation: number;
  founderEquityBasisPoints: number;
  totalDebt: number;
  creditRating: string;
  employeeSatisfaction: number;
  customerSatisfaction: number;
  financeMonth: number;
  operatingDay: number;
  riskStatus: string;
  pendingEventCount: number;
  unreadMailCount: number;
  debtWarning: string;
  createdAt: string;
};

type StoredSession = {
  version: typeof SESSION_VERSION;
  account: AccountSession;
  server: ServerOption;
  avatar: AvatarOption;
  profile: PlayerProfile;
};

type RememberedAuth = {
  version: typeof SESSION_VERSION;
  username: string;
  password: string;
};

type Employee = {
  id: string;
  configId: string;
  name: string;
  role: string;
  careerLevel: string;
  rarity: string;
  level: number;
  salary: number;
  pressure: number;
  loyalty: number;
  growthPotential: number;
  management: number;
  negotiation: number;
  execution: number;
  specialty: string;
  equityBasisPoints: number;
  assignedTo: string | null;
  isActive: boolean;
};

type BusinessProject = {
  id: string;
  configId: string;
  name: string;
  category: string;
  stage: number;
  progress: number;
  cycleDays: number;
  budget: number;
  risk: string;
  successRate: number;
  revenueReward: number;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  status: "active" | "ready" | "settled" | "failed";
  result: "success" | "failure" | null;
  summary: string;
  settledAt: string | null;
};

type TaskItem = {
  id: string;
  type: "main" | "daily" | "side";
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardLabel: string;
  rewardCash: number;
  rewardPlatformCoins: number;
  rewardReputation: number;
  rewardActionPower: number;
  guideAction: string;
  unlockKind: "none" | "knowledge" | "compliance";
  isClaimed: boolean;
  isClaimable: boolean;
};

type CompanyFinance = {
  profileId: string;
  companyName: string;
  companyLevel: number;
  cash: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netCashFlow: number;
  valuation: number;
  founderEquityBasisPoints: number;
  totalDebt: number;
  debtRatioBasisPoints: number;
  creditRating: string;
  brandReputation: number;
  employeeSatisfaction: number;
  customerSatisfaction: number;
  financeMonth: number;
  operatingDay: number;
  riskStatus: "稳健" | "预警" | "资金紧张";
  riskTips: string[];
  reportMonth?: number;
  income?: number;
  expense?: number;
  endingCash?: number;
  createdAt?: string;
};

type EventOption = {
  key: "A" | "B";
  label: string;
  impactPreview: string;
};

type BusinessEvent = {
  id: string;
  configId: string;
  title: string;
  source: string;
  channel: string;
  summary: string;
  context: string;
  options: EventOption[];
  status: "pending" | "resolved";
  selectedOption: "A" | "B" | null;
  resultSummary: string | null;
  knowledgeTitle: string | null;
  knowledgeUnlocked: boolean;
  riskExplanation: string;
  createdAt: string;
  resolvedAt: string | null;
};

type EventChoiceResult = {
  event: BusinessEvent;
  finance: CompanyFinance;
  followupEvent: BusinessEvent | null;
  result: {
    summary: string;
    riskExplanation: string;
    knowledgeUnlocked: boolean;
    followupEventId: string | null;
  };
};

type LoanOffer = {
  id: string;
  name: string;
  lender: string;
  principal: number;
  annualRateBasisPoints: number;
  termMonths: number;
  monthlyPayment: number;
  creditRequired: string;
  summary: string;
  isAvailable: boolean;
  lockedReason: string | null;
};

type PlayerLoan = {
  id: string;
  configId: string;
  name: string;
  lender: string;
  principal: number;
  remainingPrincipal: number;
  annualRateBasisPoints: number;
  termMonths: number;
  remainingMonths: number;
  monthlyPayment: number;
  overduePeriods: number;
  penaltyAccrued: number;
  status: "active" | "overdue" | "settled";
  createdAt: string;
  settledAt: string | null;
};

type LoanCenter = {
  offers: LoanOffer[];
  loans: PlayerLoan[];
  finance: CompanyFinance;
  crisis: {
    isActive: boolean;
    level: "none" | "cashflow" | "debt" | "bankruptcy";
    summary: string;
    routes: Array<{
      id: "financing" | "cost_cut" | "restructure";
      title: string;
      impact: string;
    }>;
  };
};

type LoanActionResult = {
  loan: PlayerLoan | null;
  loanCenter: LoanCenter;
  result: string;
};

type FundingOffer = {
  id: string;
  roundName: string;
  investorName: string;
  focus: string;
  amount: number;
  preMoneyValuation: number;
  postMoneyValuation: number;
  equityBasisPoints: number;
  successRate: number;
  debtToleranceBasisPoints: number;
  boardPressure: number;
  term: string;
  summary: string;
  isAvailable: boolean;
  lockedReason: string | null;
};

type PlayerFunding = {
  id: string;
  investorId: string;
  roundName: string;
  investorName: string;
  amount: number;
  preMoneyValuation: number;
  postMoneyValuation: number;
  equityBasisPoints: number;
  successRate: number;
  boardPressure: number;
  term: string;
  status: "pending" | "funded" | "failed";
  resultSummary: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

type FundingCenter = {
  offers: FundingOffer[];
  fundings: PlayerFunding[];
  finance: CompanyFinance;
};

type FundingActionResult = {
  funding: PlayerFunding;
  fundingCenter: FundingCenter;
  result: string;
};

const sideActions = ["财务", "融资", "贷款", "风险", "合同"];
const rightActions = ["首充", "月卡", "礼包", "活动", "排行", "邮件", "VIP"];
const navItems = ["公司", "员工", "项目", "产品", "市场", "商会"];
const homeActionIcons: Record<string, string> = {
  "财务": "pie-chart",
  "融资": "handshake",
  "贷款": "circle-dollar-sign",
  "风险": "shield-check",
  "合同": "file-text",
  "首充": "gift",
  "首充豪礼": "gift",
  "月卡": "calendar",
  "礼包": "package-open",
  "活动": "calendar",
  "排行": "trophy",
  "VIP": "award",
  "福利中心": "gift",
  "七日目标": "calendar",
  "创业基金": "landmark",
  "专属经理": "contact",
  "排行榜": "trophy",
  "财务中心": "pie-chart",
  "特惠商城": "shopping-cart",
  "邮件": "mail",
  "限时活动": "package-open",
  "投资合作": "handshake",
  "商战竞争": "trending-up",
  "市场营销": "megaphone",
  "产品研发": "box",
  "企业并购": "building-2",
  "扩建": "building"
};
const homeActionIconClasses: Record<string, string> = {
  "财务": "text-blue-400",
  "融资": "text-emerald-400",
  "贷款": "text-amber-400",
  "风险": "text-red-400",
  "合同": "text-business-gold",
  "首充": "text-red-400",
  "首充豪礼": "text-red-400",
  "月卡": "text-business-gold",
  "礼包": "text-pink-400",
  "活动": "text-blue-400",
  "排行": "text-amber-400",
  "VIP": "text-business-gold",
  "福利中心": "text-business-gold",
  "七日目标": "text-business-gold",
  "创业基金": "text-emerald-400",
  "专属经理": "text-pink-400",
  "排行榜": "text-amber-400",
  "邮件": "text-business-gold",
  "限时活动": "text-pink-400",
  "投资合作": "text-amber-400",
  "商战竞争": "text-blue-400",
  "市场营销": "text-blue-400",
  "产品研发": "text-cyan-400",
  "企业并购": "text-business-gold",
  "扩建": "text-emerald-400"
};
const navIcons: Record<string, string> = {
  "公司": "home",
  "员工": "users",
  "项目": "layout-dashboard",
  "产品": "box",
  "市场": "megaphone",
  "商会": "building-2"
};
const iconPaths: Record<string, string[]> = {
  "award": ["M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z", "m8 14-2 7 6-3 6 3-2-7"],
  "box": ["M21 8 12 3 3 8l9 5 9-5Z", "M3 8v8l9 5 9-5V8", "M12 13v8"],
  "briefcase": ["M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1", "M4 7h16v12H4Z", "M9 12h6"],
  "building": ["M6 22V4h12v18", "M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"],
  "building-2": ["M6 22V4h8v18", "M14 9h4v13", "M9 8h2M9 12h2M9 16h2"],
  "calendar": ["M7 3v4M17 3v4", "M4 7h16v14H4Z", "M4 11h16"],
  "circle-dollar-sign": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 6v12", "M16 9c-1-1-3-1-4-1s-3 .5-3 2 1 2 3 2 3 .5 3 2-1 2-3 2-3 0-4-1"],
  "clipboard-check": ["M9 5h6l1 2h2v14H6V7h2Z", "m9 14 2 2 4-5"],
  "contact": ["M7 7a5 5 0 0 1 10 0", "M5 21a7 7 0 0 1 14 0", "M4 4h16v18H4Z"],
  "crown": ["m3 7 5 5 4-8 4 8 5-5-2 12H5Z"],
  "file-search": ["M6 2h8l4 4v16H6Z", "M14 2v6h6", "M10 15a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z", "m15 18 3 3"],
  "file-text": ["M6 2h8l4 4v16H6Z", "M14 2v6h6", "M9 13h6M9 17h6"],
  "gem": ["M6 3h12l4 6-10 12L2 9Z", "M2 9h20", "m8 9 4 12 4-12"],
  "gift": ["M3 9h18v4H3Z", "M5 13h14v8H5Z", "M12 9v12", "M12 9C9 9 7 7 7 5.5S9 3 12 9Zm0 0c3 0 5-2 5-3.5S15 3 12 9Z"],
  "handshake": ["M8 12 5 15a3 3 0 0 1-3-3l5-5 4 4", "m16 12 3 3a3 3 0 0 0 3-3l-5-5-4 4", "M8 12l4 4 4-4", "m12 16 2 2a2 2 0 0 0 3-3"],
  "home": ["M3 11 12 3l9 8", "M5 10v11h14V10", "M10 21v-6h4v6"],
  "landmark": ["M3 21h18", "M5 10h14", "M12 3 4 8h16Z", "M6 10v8M10 10v8M14 10v8M18 10v8"],
  "layout-dashboard": ["M4 4h7v7H4Z", "M13 4h7v4h-7Z", "M13 10h7v10h-7Z", "M4 13h7v7H4Z"],
  "mail": ["M4 6h16v12H4Z", "m4 7 8 6 8-6"],
  "megaphone": ["M3 11v4h4l10 4V7L7 11Z", "M7 15l2 5"],
  "package": ["M21 8 12 3 3 8l9 5 9-5Z", "M3 8v8l9 5 9-5V8", "M12 13v8"],
  "package-open": ["M3 9 12 4l9 5-9 5Z", "M3 9v8l9 5 9-5V9", "M12 14v8"],
  "plus": ["M12 5v14", "M5 12h14"],
  "shield-check": ["M12 3 5 6v6c0 5 3 8 7 10 4-2 7-5 7-10V6Z", "m9 12 2 2 4-5"],
  "shopping-bag": ["M6 8h12l1 13H5Z", "M9 8a3 3 0 0 1 6 0"],
  "shopping-cart": ["M3 4h2l2 12h11l3-8H7", "M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"],
  "star": ["m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"],
  "swords": ["M14 4 20 10", "M20 4 4 20", "M4 14l6 6", "M14 20l6-6"],
  "trending-up": ["M3 17 9 11l4 4 7-8", "M14 7h6v6"],
  "trophy": ["M8 4h8v5a4 4 0 0 1-8 0Z", "M6 6H3v2a4 4 0 0 0 4 4", "M18 6h3v2a4 4 0 0 1-4 4", "M12 13v5", "M8 21h8"],
  "users": ["M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2", "M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M22 21v-2a4 4 0 0 0-3-3.8", "M17 3.2a4 4 0 0 1 0 7.6"],
  "x": ["M6 6l12 12", "M18 6 6 18"],
  "zap": ["M13 2 4 14h7l-1 8 9-12h-7Z"]
};
const Icon = ({ name, className }: { name: string; className: string }) => {
  const paths = iconPaths[name] ?? iconPaths["box"] ?? [];

  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
};
const eventEntryNames = new Set(["风险", "合同", "邮件"]);
const initialEmployees: Employee[] = [];
const initialProjects: BusinessProject[] = [];
const defaultServers: ServerOption[] = [
  { id: "s1", name: "长宁一服", status: "recommended", label: "推荐", isRecommended: true },
  { id: "s2", name: "滨江新区", status: "new", label: "新服", isRecommended: false },
  { id: "s3", name: "中关村路演场", status: "busy", label: "繁忙", isRecommended: false }
];
const homePanelContent: Record<string, { title: string; lines: string[]; action: string }> = {
  "财务": {
    title: "财务",
    lines: ["查看现金、月收入、月支出和现金流状态。", "财务数据以后端档案为准，刷新后仍保持一致。"],
    action: "查看财务"
  },
  "融资": {
    title: "融资",
    lines: ["融资入口用于查看投资合作和公司估值进展。", "融资判断会受到现金流、团队能力和市场环境影响。"],
    action: "查看融资"
  },
  "贷款": {
    title: "贷款",
    lines: ["贷款入口用于查看授信、还款和负债预警。", "负债状态会在主页顶部同步提示。"],
    action: "查看贷款"
  },
  "风险": {
    title: "风险",
    lines: ["风险入口汇总合同、现金流、用工和舆情提醒。", "待处理事件会在主页状态区展示。"],
    action: "查看风险"
  },
  "合同": {
    title: "合同",
    lines: ["合同入口用于处理客户回款、交付条款和合规复核。", "合同状态会影响后续项目和经营事件。"],
    action: "查看合同"
  },
  "首充": {
    title: "首充",
    lines: ["首充入口提供创业启动礼包。", "平台币相关消费以后端记录为准。"],
    action: "查看首充"
  },
  "首充豪礼": {
    title: "首充豪礼",
    lines: ["首充任意金额可领取创业启动礼包。", "礼包含钻石、资金和橙色员工招募券。"],
    action: "前往充值"
  },
  "月卡": {
    title: "月卡",
    lines: ["月卡提供每日平台币、行动力和经营补贴。", "每日领取记录由后端系统记录。"],
    action: "查看月卡"
  },
  "礼包": {
    title: "礼包",
    lines: ["礼包入口按公司阶段、活动和经营压力展示。", "礼包不直接替代现金流经营。"],
    action: "查看礼包"
  },
  "活动": {
    title: "活动",
    lines: ["活动入口展示开服目标、限时挑战和赛季任务。", "活动榜只在活动开启时展示。"],
    action: "查看活动"
  },
  "排行": {
    title: "排行",
    lines: ["查看本服公司估值、项目收益和商会贡献排名。", "排行榜每日按服务器时间刷新。"],
    action: "查看排行"
  },
  "VIP": {
    title: "VIP",
    lines: ["VIP 入口展示身份、每日礼包和便利权益。", "游戏内平台币消费会计入 VIP 经验。"],
    action: "查看 VIP"
  },
  "福利中心": {
    title: "福利中心",
    lines: ["每日登录、在线时长和成长节点奖励集中领取。", "未领取奖励会在入口显示红点。"],
    action: "领取福利"
  },
  "商城": {
    title: "特惠商城",
    lines: ["月卡、成长基金、猎头契约和经营保险集中展示。", "平台币消费会计入 VIP 经验，后台发放平台币不直接计入。"],
    action: "进入商城"
  },
  "七日目标": {
    title: "七日目标",
    lines: ["完成七日创业目标，解锁高级员工和稀有项目。", "当前目标：完成 3 次项目洽谈。"],
    action: "查看目标"
  },
  "创业基金": {
    title: "创业基金",
    lines: ["达成公司等级后返还钻石。", "基金权益与平台币消费记录分开结算。"],
    action: "查看基金"
  },
  "专属经理": {
    title: "专属经理",
    lines: ["专属经理提供经营提醒、礼包推荐和成长规划。", "提升 VIP 等级可解锁更多服务。"],
    action: "联系经理"
  },
  "排行榜": {
    title: "排行榜",
    lines: ["查看本服公司估值、项目收益和商战积分排名。", "排行榜每日 0 点刷新。"],
    action: "查看排名"
  },
  "邮件": {
    title: "邮件",
    lines: ["系统奖励、补偿和活动结算会通过邮件发放。", "含附件邮件请及时领取。"],
    action: "打开邮箱"
  },
  "限时活动": {
    title: "限时活动",
    lines: ["当前开放：开服冲榜、项目翻倍、员工培养返利。", "活动奖励以页面规则为准。"],
    action: "参加活动"
  },
  "投资合作": {
    title: "投资合作",
    lines: ["选择合作方提升项目融资效率。", "高价值合作需要声望和公司等级。"],
    action: "洽谈合作"
  },
  "商战竞争": {
    title: "商战竞争",
    lines: ["挑战竞争对手，争夺市场份额和排名积分。", "布阵员工会影响谈判胜率。"],
    action: "进入商战"
  },
  "市场营销": {
    title: "市场营销",
    lines: ["投放营销资源，提高项目曝光和订单转化。", "营销等级越高，收益加成越稳定。"],
    action: "升级营销"
  },
  "产品研发": {
    title: "产品研发",
    lines: ["研发新产品线，提升公司长期估值。", "研发进度受员工能力和资金投入影响。"],
    action: "开始研发"
  },
  "企业并购": {
    title: "企业并购",
    lines: ["收购潜力公司，获取团队、专利和现金流。", "并购目标会随主线进度开放。"],
    action: "查看目标"
  },
  "扩建": {
    title: "扩建",
    lines: ["扩建办公楼层，解锁更多岗位和部门容量。", "扩建需要资金、声望和对应章节进度。"],
    action: "扩建公司"
  },
  "任务": {
    title: "主线任务",
    lines: ["主线、每日、支线任务会在任务系统中统一追踪。", "任务奖励由服务器记录，已领取奖励不能重复领取。"],
    action: "打开任务"
  },
  "创业知识": {
    title: "创业知识",
    lines: ["知识卡用于解释劳动合同、税务、回款、融资等经营常识。", "阅读后可推进对应知识任务。"],
    action: "已阅读"
  },
  "合规支线": {
    title: "合规支线",
    lines: ["合同复核、用工规范和客户回款会影响公司长期风险。", "完成合规支线可降低后续经营事件损失。"],
    action: "完成复核"
  },
  "出门谈判": {
    title: "出门谈判",
    lines: ["当前章节：第15章。", "推进谈判可解锁新客户、新项目和商战对手。"],
    action: "开始谈判"
  },
  "设置": {
    title: "设置",
    lines: ["账号切换会回到登录界面。", "公告、客服和声音设置统一从这里进入。"],
    action: "切换账号"
  },
  "员工": {
    title: "员工管理",
    lines: ["管理员工岗位、等级、薪资、忠诚度和能力值。", "招募、培养、解雇和股权激励都从员工系统进入。"],
    action: "进入员工"
  },
  "项目": {
    title: "项目中心",
    lines: ["查看项目阶段、投入成本、预计收益和负责人。", "完成主线任务会解锁更高收益项目。"],
    action: "进入项目"
  },
  "商战": {
    title: "商战大厅",
    lines: ["配置谈判阵容，挑战竞品公司。", "商战积分可兑换员工培养资源。"],
    action: "进入商战"
  },
  "产品": {
    title: "产品中心",
    lines: ["产品线会承接项目经验和研发投入。", "产品中心用于跟踪研发方向、用户增长和商业化表现。"],
    action: "查看产品"
  },
  "市场": {
    title: "市场中心",
    lines: ["市场入口用于查看品牌声誉、获客和竞争态势。", "市场变化会影响客户订单、活动传播和竞争压力。"],
    action: "查看市场"
  },
  "商会": {
    title: "商会",
    lines: ["加入商会可参与集体投资、商会任务和成员互助。", "商会入口按公司等级和服务器规则进入。"],
    action: "查看商会"
  },
  "背包": {
    title: "背包",
    lines: ["管理道具、礼包、招募券和活动材料。", "部分奖励领取后会自动进入背包。"],
    action: "打开背包"
  }
};
const avatarClassById: Record<string, string> = {
  strategist: "strategy",
  builder: "product",
  operator: "operation"
};

const compactNumber = (value: number): string => {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(value % 100000000 === 0 ? 0 : 2)}亿`;
  }

  if (value >= 10000) {
    return `${(value / 10000).toFixed(value % 10000 === 0 ? 0 : 1)}万`;
  }

  return value.toLocaleString("zh-CN");
};

const formatWan = (value: number): string => `${(value / 10000).toFixed(1)}万`;

const serverStatusClass = (server: ServerOption): string => {
  if (server.status === "busy" || server.label === "繁忙") {
    return "busy";
  }

  if (server.status === "new" || server.label === "新服") {
    return "new";
  }

  return "smooth";
};

const serverStatusText = (server: ServerOption): string => {
  if (server.isRecommended) {
    return "流畅";
  }

  return server.label;
};

const rarityClass = (rarity: string): string => {
  if (rarity === "传奇") {
    return "ssr";
  }

  if (rarity === "顶尖" || rarity === "稀缺") {
    return "sr";
  }

  return "r";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStoredSession = (value: unknown): value is StoredSession => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === SESSION_VERSION &&
    isRecord(value.account) &&
    typeof value.account.token === "string" &&
    isRecord(value.server) &&
    isRecord(value.avatar) &&
    isRecord(value.profile) &&
    typeof value.profile.companyName === "string"
  );
};

const isRememberedAuth = (value: unknown): value is RememberedAuth => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === SESSION_VERSION &&
    typeof value.username === "string" &&
    typeof value.password === "string"
  );
};

const loadSession = (): StoredSession | null => {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const loadRememberedAuth = (): RememberedAuth | null => {
  const raw = window.localStorage.getItem(REMEMBER_AUTH_KEY);
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isRememberedAuth(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const saveSession = (session: StoredSession): void => {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const saveRememberedAuth = (username: string, password: string): void => {
  window.localStorage.setItem(
    REMEMBER_AUTH_KEY,
    JSON.stringify({
      version: SESSION_VERSION,
      username,
      password
    })
  );
};

const clearSession = (): void => {
  window.localStorage.removeItem(SESSION_KEY);
};

const clearRememberedAuth = (): void => {
  window.localStorage.removeItem(REMEMBER_AUTH_KEY);
};

const readApiFailure = async (response: Response): Promise<ApiFailure> => {
  const traceId = response.headers.get("x-trace-id") ?? "";

  try {
    const body = (await response.json()) as ApiFailure;
    if (
      body.success === false &&
      typeof body.error?.code === "string" &&
      typeof body.error.message === "string"
    ) {
      return {
        ...body,
        traceId: body.traceId || traceId
      };
    }
  } catch {
    // Fall back to a generic client-side failure below when the response is not JSON.
  }

  return {
    success: false,
    error: {
      code: String(response.status),
      message: "请求失败，请稍后再试。"
    },
    traceId
  };
};

const apiRequest = async <T,>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<ApiResponse<T>> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    return readApiFailure(response);
  }

  return (await response.json()) as ApiResponse<T>;
};

function App() {
  const initialSession = loadSession();
  const rememberedAuth = loadRememberedAuth();
  const [step, setStep] = useState<OnboardingStep>("auth");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState(initialSession?.account.username ?? rememberedAuth?.username ?? "");
  const [password, setPassword] = useState(rememberedAuth?.password ?? "");
  const [rememberPassword, setRememberPassword] = useState(rememberedAuth !== null);
  const [account, setAccount] = useState<AccountSession | null>(initialSession?.account ?? null);
  const [servers, setServers] = useState<ServerOption[]>(initialSession ? [initialSession.server] : defaultServers);
  const [avatars, setAvatars] = useState<AvatarOption[]>(initialSession ? [initialSession.avatar] : []);
  const [serverId, setServerId] = useState(initialSession?.server.id ?? defaultServers[0]?.id ?? "");
  const [avatarId, setAvatarId] = useState(initialSession?.avatar.id ?? "");
  const [founderName, setFounderName] = useState(initialSession?.profile.founderName ?? "");
  const [companyName, setCompanyName] = useState(initialSession?.profile.companyName ?? "");
  const [profile, setProfile] = useState<PlayerProfile | null>(initialSession?.profile ?? null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isRestoring, setIsRestoring] = useState(initialSession !== null);
  const [isServerPickerOpen, setIsServerPickerOpen] = useState(false);
  const [activeServerCategory, setActiveServerCategory] = useState<"recent" | "all">("all");
  const [activeNav, setActiveNav] = useState("公司");
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [nativeHomePage, setNativeHomePage] = useState<NativeHomePage | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployees[0]?.id ?? "");
  const [projects, setProjects] = useState<BusinessProject[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0]?.id ?? "");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activeTaskType, setActiveTaskType] = useState<TaskItem["type"]>("main");
  const [taskError, setTaskError] = useState("");
  const [taskNotice, setTaskNotice] = useState("");
  const [claimingTaskId, setClaimingTaskId] = useState("");
  const [activeKnowledgeTask, setActiveKnowledgeTask] = useState<TaskItem | null>(null);
  const [companyFinance, setCompanyFinance] = useState<CompanyFinance | null>(null);
  const [financeError, setFinanceError] = useState("");
  const [employeeError, setEmployeeError] = useState("");
  const [projectError, setProjectError] = useState("");
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventError, setEventError] = useState("");
  const [eventNotice, setEventNotice] = useState("");
  const [loanCenter, setLoanCenter] = useState<LoanCenter | null>(null);
  const [selectedLoanOfferId, setSelectedLoanOfferId] = useState("");
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [loanError, setLoanError] = useState("");
  const [loanNotice, setLoanNotice] = useState("");
  const [fundingCenter, setFundingCenter] = useState<FundingCenter | null>(null);
  const [selectedFundingOfferId, setSelectedFundingOfferId] = useState("");
  const [selectedFundingId, setSelectedFundingId] = useState("");
  const [fundingError, setFundingError] = useState("");
  const [fundingNotice, setFundingNotice] = useState("");

  const selectedServer = useMemo(
    () => servers.find((server) => server.id === serverId) ?? servers[0],
    [serverId, servers]
  );
  const serverPickerServers = useMemo(() => {
    if (activeServerCategory === "all") {
      return servers;
    }

    const recentServers = [
      ...(selectedServer ? [selectedServer] : []),
      ...servers.filter((server) => server.isRecommended && server.id !== selectedServer?.id)
    ];

    return recentServers.length > 0 ? recentServers : servers;
  }, [activeServerCategory, selectedServer, servers]);
  const selectedAvatar = useMemo(
    () => avatars.find((avatar) => avatar.id === avatarId) ?? avatars[0],
    [avatarId, avatars]
  );
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0],
    [employees, selectedEmployeeId]
  );
  const activeEmployees = useMemo(() => employees.filter((employee) => employee.isActive), [employees]);
  const employeePower = useMemo(
    () =>
      activeEmployees.reduce(
        (total, employee) => total + employee.management + employee.negotiation + employee.execution + employee.level * 3,
        0
      ),
    [activeEmployees]
  );
  const averageEmployeeLoyalty = useMemo(
    () =>
      activeEmployees.length === 0
        ? 0
        : Math.round(activeEmployees.reduce((total, employee) => total + employee.loyalty, 0) / activeEmployees.length),
    [activeEmployees]
  );
  const totalEmployeeSalary = useMemo(
    () => activeEmployees.reduce((total, employee) => total + employee.salary, 0),
    [activeEmployees]
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0],
    [projects, selectedProjectId]
  );
  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "active" || project.status === "ready"),
    [projects]
  );
  const totalProjectRevenue = useMemo(
    () => activeProjects.reduce((total, project) => total + project.revenueReward, 0),
    [activeProjects]
  );
  const highestProjectStage = useMemo(
    () => projects.reduce((highest, project) => Math.max(highest, project.stage), 0),
    [projects]
  );
  const currentMainTask = useMemo(
    () => tasks.find((task) => task.type === "main" && !task.isClaimed) ?? tasks.find((task) => task.type === "main"),
    [tasks]
  );
  const highlightedTask = useMemo(
    () => tasks.find((task) => task.isClaimable && !task.isClaimed) ?? currentMainTask,
    [currentMainTask, tasks]
  );
  const selectedEvent = useMemo(
    () => events.find((item) => item.id === selectedEventId) ?? events[0],
    [events, selectedEventId]
  );
  const pendingEvents = useMemo(() => events.filter((item) => item.status === "pending"), [events]);
  const selectedLoanOffer = useMemo(
    () => loanCenter?.offers.find((item) => item.id === selectedLoanOfferId) ?? loanCenter?.offers[0],
    [loanCenter?.offers, selectedLoanOfferId]
  );
  const activeLoans = useMemo(
    () => loanCenter?.loans.filter((item) => item.status !== "settled") ?? [],
    [loanCenter?.loans]
  );
  const selectedLoan = useMemo(
    () => activeLoans.find((item) => item.id === selectedLoanId) ?? activeLoans[0],
    [activeLoans, selectedLoanId]
  );
  const selectedFundingOffer = useMemo(
    () => fundingCenter?.offers.find((item) => item.id === selectedFundingOfferId) ?? fundingCenter?.offers[0],
    [fundingCenter?.offers, selectedFundingOfferId]
  );
  const pendingFundings = useMemo(
    () => fundingCenter?.fundings.filter((item) => item.status === "pending") ?? [],
    [fundingCenter?.fundings]
  );
  const selectedFunding = useMemo(
    () => pendingFundings.find((item) => item.id === selectedFundingId) ?? pendingFundings[0],
    [pendingFundings, selectedFundingId]
  );
  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.type === activeTaskType),
    [activeTaskType, tasks]
  );
  const activeTaskTip =
    activeTaskType === "daily"
      ? "每日任务按服务器日刷新，已领取奖励不会在同一天重复发放。"
      : activeTaskType === "side"
        ? "支线任务由知识阅读、合规复核和经营动作触发。"
        : "主线任务用于推进前 7 日公司成长路线。";

  const replaceTask = (nextTask: TaskItem): void => {
    setTasks((currentTasks) => currentTasks.map((task) => (task.id === nextTask.id ? nextTask : task)));
  };

  const loadTasks = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<TaskItem[]>(
      `/tasks?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setTasks(response.data);
      setTaskError("");
      return;
    }

    setTaskError(response.error.message);
  };

  const loadEvents = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<BusinessEvent[]>(
      `/events?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setEvents(response.data);
      setSelectedEventId((currentId) => response.data.find((item) => item.id === currentId)?.id ?? response.data[0]?.id ?? "");
      setEventError("");
      setProfile((currentProfile) =>
        currentProfile === null
          ? currentProfile
          : {
              ...currentProfile,
              pendingEventCount: response.data.filter((item) => item.status === "pending").length
            }
      );
      return;
    }

    setEventError(response.error.message);
  };

  const applyCompanyFinance = (finance: CompanyFinance): void => {
    setCompanyFinance(finance);
    setProfile((currentProfile) =>
      currentProfile === null
        ? currentProfile
        : {
            ...currentProfile,
            cash: finance.cash,
            monthlyIncome: finance.monthlyIncome,
            monthlyExpense: finance.monthlyExpense,
            valuation: finance.valuation,
            founderEquityBasisPoints: finance.founderEquityBasisPoints,
            totalDebt: finance.totalDebt,
            creditRating: finance.creditRating,
            reputation: finance.brandReputation,
            employeeSatisfaction: finance.employeeSatisfaction,
            customerSatisfaction: finance.customerSatisfaction,
            financeMonth: finance.financeMonth,
            operatingDay: finance.operatingDay,
            riskStatus: finance.riskStatus,
            debtWarning: finance.debtRatioBasisPoints >= 6000 ? "高" : finance.totalDebt > 0 ? "中" : "低"
          }
    );
  };

  const loadCompanyFinance = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<CompanyFinance>(
      `/company/status?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      applyCompanyFinance(response.data);
      setFinanceError("");
      return;
    }

    setFinanceError(response.error.message);
  };

  const applyLoanCenter = (nextLoanCenter: LoanCenter): void => {
    setLoanCenter(nextLoanCenter);
    setSelectedLoanOfferId((currentId) => nextLoanCenter.offers.find((item) => item.id === currentId)?.id ?? nextLoanCenter.offers[0]?.id ?? "");
    const active = nextLoanCenter.loans.filter((item) => item.status !== "settled");
    setSelectedLoanId((currentId) => active.find((item) => item.id === currentId)?.id ?? active[0]?.id ?? "");
    setCompanyFinance(nextLoanCenter.finance);
    setProfile((currentProfile) =>
      currentProfile === null
        ? currentProfile
        : {
            ...currentProfile,
            cash: nextLoanCenter.finance.cash,
            monthlyIncome: nextLoanCenter.finance.monthlyIncome,
            monthlyExpense: nextLoanCenter.finance.monthlyExpense,
            valuation: nextLoanCenter.finance.valuation,
            totalDebt: nextLoanCenter.finance.totalDebt,
            creditRating: nextLoanCenter.finance.creditRating,
            reputation: nextLoanCenter.finance.brandReputation,
            employeeSatisfaction: nextLoanCenter.finance.employeeSatisfaction,
            customerSatisfaction: nextLoanCenter.finance.customerSatisfaction,
            financeMonth: nextLoanCenter.finance.financeMonth,
            operatingDay: nextLoanCenter.finance.operatingDay,
            riskStatus: nextLoanCenter.finance.riskStatus,
            debtWarning: nextLoanCenter.finance.debtRatioBasisPoints >= 6000 ? "高" : nextLoanCenter.finance.totalDebt > 0 ? "中" : "低"
          }
    );
  };

  const applyFundingCenter = (nextFundingCenter: FundingCenter): void => {
    setFundingCenter(nextFundingCenter);
    setSelectedFundingOfferId((currentId) => nextFundingCenter.offers.find((item) => item.id === currentId)?.id ?? nextFundingCenter.offers[0]?.id ?? "");
    const pending = nextFundingCenter.fundings.filter((item) => item.status === "pending");
    setSelectedFundingId((currentId) => pending.find((item) => item.id === currentId)?.id ?? pending[0]?.id ?? "");
    setCompanyFinance(nextFundingCenter.finance);
    setProfile((currentProfile) =>
      currentProfile === null
        ? currentProfile
        : {
            ...currentProfile,
            cash: nextFundingCenter.finance.cash,
            monthlyIncome: nextFundingCenter.finance.monthlyIncome,
            monthlyExpense: nextFundingCenter.finance.monthlyExpense,
            valuation: nextFundingCenter.finance.valuation,
            founderEquityBasisPoints: nextFundingCenter.finance.founderEquityBasisPoints,
            totalDebt: nextFundingCenter.finance.totalDebt,
            creditRating: nextFundingCenter.finance.creditRating,
            reputation: nextFundingCenter.finance.brandReputation,
            employeeSatisfaction: nextFundingCenter.finance.employeeSatisfaction,
            customerSatisfaction: nextFundingCenter.finance.customerSatisfaction,
            financeMonth: nextFundingCenter.finance.financeMonth,
            operatingDay: nextFundingCenter.finance.operatingDay,
            riskStatus: nextFundingCenter.finance.riskStatus,
            debtWarning: nextFundingCenter.finance.debtRatioBasisPoints >= 6000 ? "高" : nextFundingCenter.finance.totalDebt > 0 ? "中" : "低"
          }
    );
  };

  const loadLoanCenter = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<LoanCenter>(
      `/finance/loans?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      applyLoanCenter(response.data);
      setLoanError("");
      return;
    }

    setLoanError(response.error.message);
  };

  const loadFundingCenter = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<FundingCenter>(
      `/finance/fundings?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      applyFundingCenter(response.data);
      setFundingError("");
      return;
    }

    setFundingError(response.error.message);
  };

  const loadEmployees = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<Employee[]>(
      `/employees?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setEmployees(response.data);
      setSelectedEmployeeId((currentId) => response.data.find((employee) => employee.id === currentId)?.id ?? response.data[0]?.id ?? "");
      setEmployeeError("");
      return;
    }

    setEmployeeError(response.error.message);
  };

  const loadProjects = async (token: string, nextServerId: string): Promise<void> => {
    const response = await apiRequest<BusinessProject[]>(
      `/projects?serverId=${encodeURIComponent(nextServerId)}`,
      {},
      token
    );

    if (response.success) {
      setProjects(response.data);
      setSelectedProjectId((currentId) => response.data.find((project) => project.id === currentId)?.id ?? response.data[0]?.id ?? "");
      setProjectError("");
      return;
    }

    setProjectError(response.error.message);
  };

  const enterGame = (
    nextAccount: AccountSession,
    nextServer: ServerOption,
    nextAvatar: AvatarOption,
    nextProfile: PlayerProfile
  ): void => {
    const stored: StoredSession = {
      version: SESSION_VERSION,
      account: nextAccount,
      server: nextServer,
      avatar: nextAvatar,
      profile: nextProfile
    };

    saveSession(stored);
    setAccount(nextAccount);
    setServerId(nextServer.id);
    setAvatarId(nextAvatar.id);
    setFounderName(nextProfile.founderName);
    setCompanyName(nextProfile.companyName);
    setProfile(nextProfile);
    setStep("game");
  };

  useEffect(() => {
    if (initialSession === null) {
      return;
    }

    let isMounted = true;

    const restoreSession = async (): Promise<void> => {
      try {
        const [sessionResponse, serverResponse, avatarResponse, profileResponse] = await Promise.all([
          apiRequest<{ accountId: string; username: string }>("/auth/session", {}, initialSession.account.token),
          apiRequest<ServerOption[]>("/servers", {}, initialSession.account.token),
          apiRequest<AvatarOption[]>("/avatars", {}, initialSession.account.token),
          apiRequest<PlayerProfile>(
            `/players?serverId=${encodeURIComponent(initialSession.server.id)}`,
            {},
            initialSession.account.token
          )
        ]);

        if (!isMounted) {
          return;
        }

        if (!sessionResponse.success || !serverResponse.success || !avatarResponse.success || !profileResponse.success) {
          clearSession();
          setStep("auth");
          setError("登录状态已过期，请重新登录。");
          return;
        }

        setServers(serverResponse.data);
        setAvatars(avatarResponse.data);
        enterGame(
          initialSession.account,
          serverResponse.data.find((server) => server.id === profileResponse.data.serverId) ?? initialSession.server,
          avatarResponse.data.find((avatar) => avatar.id === profileResponse.data.avatarId) ?? initialSession.avatar,
          profileResponse.data
        );
      } catch {
        if (isMounted) {
          clearSession();
          setAccount(null);
          setProfile(null);
          setStep("auth");
          setError("无法恢复登录状态，请确认 API 服务和数据库已启动。");
        }
      } finally {
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (step !== "game" || !account || !selectedServer) {
      return;
    }

    void loadTasks(account.token, selectedServer.id);
    void loadEvents(account.token, selectedServer.id);
    void loadCompanyFinance(account.token, selectedServer.id);
    void loadLoanCenter(account.token, selectedServer.id);
    void loadFundingCenter(account.token, selectedServer.id);
    void loadEmployees(account.token, selectedServer.id);
    void loadProjects(account.token, selectedServer.id);
  }, [step, account?.token, selectedServer?.id]);

  const runAuth = async (mode: AuthMode): Promise<void> => {
    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3 || password.length < 6) {
      setError("账号至少 3 个字符，密码至少 6 个字符。");
      return;
    }

    setIsBusy(true);
    setError("");
    setAuthMode(mode);

    try {
      let auth = await apiRequest<AccountSession>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: trimmedUsername, password })
      });

      if (!auth.success && mode === "login" && auth.error.code === "INVALID_CREDENTIALS") {
        auth = await apiRequest<AccountSession>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ username: trimmedUsername, password })
        });
      }

      if (!auth.success) {
        setError(auth.error.code === "ACCOUNT_EXISTS" ? "账号已存在，请确认密码后重试。" : auth.error.message);
        return;
      }

      const [serverResponse, avatarResponse] = await Promise.all([
        apiRequest<ServerOption[]>("/servers", {}, auth.data.token),
        apiRequest<AvatarOption[]>("/avatars", {}, auth.data.token)
      ]);

      if (!serverResponse.success) {
        setError(serverResponse.error.message);
        return;
      }

      if (!avatarResponse.success) {
        setError(avatarResponse.error.message);
        return;
      }

      const preferredServer = serverResponse.data.find((server) => server.id === serverId);
      const recommendedServer =
        preferredServer ?? serverResponse.data.find((server) => server.isRecommended) ?? serverResponse.data[0];
      const firstAvatar = avatarResponse.data[0];

      if (recommendedServer === undefined || firstAvatar === undefined) {
        setError("服务器或头像配置为空，暂时无法进入游戏。");
        return;
      }

      clearSession();
      if (rememberPassword) {
        saveRememberedAuth(trimmedUsername, password);
      } else {
        clearRememberedAuth();
      }
      setAccount(auth.data);
      setUsername(trimmedUsername);
      setFounderName("");
      setCompanyName("");
      setServers(serverResponse.data);
      setAvatars(avatarResponse.data);
      setServerId(recommendedServer.id);
      setAvatarId(firstAvatar.id);

      const existing = await apiRequest<PlayerProfile>(
        `/players?serverId=${encodeURIComponent(recommendedServer.id)}`,
        {},
        auth.data.token
      );

      if (existing.success) {
        const avatar = avatarResponse.data.find((item) => item.id === existing.data.avatarId) ?? firstAvatar;
        enterGame(auth.data, recommendedServer, avatar, existing.data);
        return;
      }

      if (existing.error.code !== "PLAYER_NOT_FOUND") {
        setError(existing.error.message);
        return;
      }

      setStep("profile");
    } catch {
      setError("无法连接游戏服务器，请确认 API 服务已启动。");
    } finally {
      setIsBusy(false);
    }
  };

  const submitAuth = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void runAuth("login");
  };

  const continueFromServer = async (): Promise<void> => {
    if (!account || !selectedServer) {
      setError("账号或服务器状态缺失，请重新登录。");
      return;
    }

    setIsBusy(true);
    setError("");

    try {
      const existing = await apiRequest<PlayerProfile>(
        `/players?serverId=${encodeURIComponent(selectedServer.id)}`,
        {},
        account.token
      );

      if (existing.success) {
        const avatar = avatars.find((item) => item.id === existing.data.avatarId) ?? avatars[0];
        if (avatar === undefined) {
          setError("头像配置为空，暂时无法进入游戏。");
          return;
        }

        enterGame(account, selectedServer, avatar, existing.data);
        return;
      }

      if (existing.error.code !== "PLAYER_NOT_FOUND") {
        setError(existing.error.message);
        return;
      }

      setStep("avatar");
    } catch {
      setError("无法读取角色档案，请稍后重试。");
    } finally {
      setIsBusy(false);
    }
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmedFounder = founderName.trim();
    const trimmedCompany = companyName.trim();

    if (!account || !selectedServer || !selectedAvatar) {
      setError("账号、服务器或头像状态缺失，请重新登录。");
      return;
    }

    if (trimmedFounder.length < 2 || trimmedCompany.length < 2) {
      setError("创始人和公司名都需要至少 2 个字符。");
      return;
    }

    setIsBusy(true);
    setError("");

    try {
      const created = await apiRequest<PlayerProfile>(
        "/players",
        {
          method: "POST",
          body: JSON.stringify({
            serverId: selectedServer.id,
            avatarId: selectedAvatar.id,
            founderName: trimmedFounder,
            companyName: trimmedCompany
          })
        },
        account.token
      );

      if (!created.success) {
        setError(created.error.message);
        return;
      }

      enterGame(account, selectedServer, selectedAvatar, created.data);
    } catch {
      setError("创建角色失败，请确认 API 服务已启动。");
    } finally {
      setIsBusy(false);
    }
  };

  const leaveGame = (): void => {
    clearSession();
    setProfile(null);
    setAccount(null);
    if (!rememberPassword) {
      setUsername("");
      setPassword("");
    }
    setFounderName("");
    setCompanyName("");
    setStep("auth");
  };

  const openHomePanel = (panelName: string): void => {
    if (panelName === "排行榜" || panelName === "排行") {
      setActivePanel(null);
      setNativeHomePage("leaderboard");
      return;
    }

    if (panelName === "商城" || panelName === "特惠商城") {
      setActivePanel(null);
      setNativeHomePage("shop");
      return;
    }

    if (panelName === "背包") {
      setActivePanel(null);
      setActiveNav("背包");
      setNativeHomePage("bag");
      return;
    }

    if (panelName === "出门谈判") {
      setActivePanel(null);
      setNativeHomePage("negotiation");
      return;
    }

    if (eventEntryNames.has(panelName)) {
      setActivePanel(null);
      setNativeHomePage(null);
      setActiveNav("事件");
      return;
    }

    if (panelName === "贷款" || panelName === "融资") {
      setActivePanel(null);
      setNativeHomePage(null);
      setActiveNav(panelName);
      return;
    }

    setNativeHomePage(null);
    setActivePanel(panelName);
  };

  const openTaskScreen = (): void => {
    setActivePanel(null);
    setNativeHomePage(null);
    setActiveNav("任务");
  };

  const openEventScreen = (): void => {
    setActivePanel(null);
    setNativeHomePage(null);
    setActiveNav("事件");
  };

  const closeNativeHomePage = (): void => {
    setNativeHomePage(null);
    setActiveNav("公司");
  };

  const progressTask = async (taskId: string): Promise<void> => {
    if (!account || !selectedServer) {
      setTaskError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<TaskItem>(
      `/tasks/${encodeURIComponent(taskId)}/progress`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      replaceTask(response.data);
      setTaskError("");
      return;
    }

    setTaskError(response.error.message);
  };

  const claimTask = async (taskId: string): Promise<void> => {
    if (!account || !selectedServer) {
      setTaskError("账号或区服状态缺失，请重新登录。");
      return;
    }

    setClaimingTaskId(taskId);
    const response = await apiRequest<TaskItem>(
      `/tasks/${encodeURIComponent(taskId)}/claim`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      replaceTask(response.data);
      setProfile((currentProfile) =>
        currentProfile === null
          ? currentProfile
          : {
              ...currentProfile,
              cash: currentProfile.cash + response.data.rewardCash,
              platformCoins: currentProfile.platformCoins + response.data.rewardPlatformCoins,
              reputation: currentProfile.reputation + response.data.rewardReputation,
              actionPower: currentProfile.actionPower + response.data.rewardActionPower
            }
      );
      setTaskNotice(`奖励已发放：${response.data.rewardLabel}`);
      setTaskError("");
      setClaimingTaskId("");
      return;
    }

    setTaskError(response.error.message);
    setClaimingTaskId("");
  };

  const settleFinanceMonth = async (): Promise<void> => {
    if (!account || !selectedServer || !companyFinance) {
      return;
    }

    const response = await apiRequest<CompanyFinance>(
      "/finance/settle-month",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, reportMonth: companyFinance.financeMonth })
      },
      account.token
    );

    if (response.success) {
      applyCompanyFinance(response.data);
      setFinanceError("");
      return;
    }

    setFinanceError(response.error.message);
  };

  const refreshCompanyAndEmployees = (): void => {
    if (!account || !selectedServer) {
      return;
    }

    void loadCompanyFinance(account.token, selectedServer.id);
    void loadEmployees(account.token, selectedServer.id);
  };

  const refreshCompanyAndProjects = (): void => {
    if (!account || !selectedServer) {
      return;
    }

    void loadCompanyFinance(account.token, selectedServer.id);
    void loadProjects(account.token, selectedServer.id);
  };

  const runEmployeeAction = async (path: string): Promise<boolean> => {
    if (!account || !selectedServer) {
      setEmployeeError("账号或服务器状态缺失，请重新登录。");
      return false;
    }

    const response = await apiRequest<Employee>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setSelectedEmployeeId(response.data.id);
      setEmployeeError("");
      refreshCompanyAndEmployees();
      return true;
    }

    setEmployeeError(response.error.message);
    return false;
  };

  const recruitEmployee = (): void => {
    void runEmployeeAction("/employees/recruit");
  };

  const cultivateEmployee = async (): Promise<void> => {
    if (!selectedEmployee || !selectedEmployee.isActive) {
      return;
    }

    const isSuccess = await runEmployeeAction(`/employees/${encodeURIComponent(selectedEmployee.id)}/train`);
    if (isSuccess && account && selectedServer) {
      void loadTasks(account.token, selectedServer.id);
    }
  };

  const grantEmployeeEquity = (): void => {
    if (!selectedEmployee || !selectedEmployee.isActive) {
      return;
    }

    if (!window.confirm("股权激励会降低创始人持股，并提升员工忠诚。确认执行？")) {
      return;
    }

    void runEmployeeAction(`/employees/${encodeURIComponent(selectedEmployee.id)}/equity`);
  };

  const dismissEmployee = async (): Promise<void> => {
    if (!account || !selectedServer || !selectedEmployee || !selectedEmployee.isActive) {
      return;
    }

    if (!window.confirm("裁员会降低月支出，但会影响士气和声誉。确认裁员？")) {
      return;
    }

    const response = await apiRequest<CompanyFinance>(
      `/employees/${encodeURIComponent(selectedEmployee.id)}/fire`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id })
      },
      account.token
    );

    if (response.success) {
      setCompanyFinance(response.data);
      setSelectedEmployeeId("");
      setEmployeeError("");
      refreshCompanyAndEmployees();
      return;
    }

    setEmployeeError(response.error.message);
  };

  const runProjectAction = async <T,>(path: string, body: Record<string, string> = {}): Promise<ApiResponse<T> | undefined> => {
    if (!account || !selectedServer) {
      setProjectError("账号或服务器状态缺失，请重新登录。");
      return undefined;
    }

    return apiRequest<T>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, ...body })
      },
      account.token
    );
  };

  const startProject = async (): Promise<void> => {
    const response = await runProjectAction<BusinessProject>("/projects/start");
    if (response === undefined) {
      return;
    }

    if (response.success) {
      setSelectedProjectId(response.data.id);
      setProjectError("");
      refreshCompanyAndProjects();
      return;
    }

    setProjectError(response.error.message);
  };

  const assignProjectEmployee = async (employeeId: string): Promise<void> => {
    if (!selectedProject || employeeId === "") {
      return;
    }

    const response = await runProjectAction<BusinessProject>(
      `/projects/${encodeURIComponent(selectedProject.id)}/assign`,
      { employeeId }
    );
    if (response === undefined) {
      return;
    }

    if (response.success) {
      setSelectedProjectId(response.data.id);
      setProjectError("");
      refreshCompanyAndProjects();
      return;
    }

    setProjectError(response.error.message);
  };

  const advanceProject = async (): Promise<void> => {
    if (!selectedProject) {
      return;
    }

    const response = await runProjectAction<BusinessProject>(`/projects/${encodeURIComponent(selectedProject.id)}/advance`);
    if (response === undefined) {
      return;
    }

    if (response.success) {
      setSelectedProjectId(response.data.id);
      setProjectError("");
      refreshCompanyAndProjects();
      if (account && selectedServer) {
        void loadTasks(account.token, selectedServer.id);
      }
      return;
    }

    setProjectError(response.error.message);
  };

  const settleProject = async (): Promise<void> => {
    if (!selectedProject) {
      return;
    }

    const response = await runProjectAction<{ project: BusinessProject; finance: CompanyFinance }>(
      `/projects/${encodeURIComponent(selectedProject.id)}/settle`
    );
    if (response === undefined) {
      return;
    }

    if (response.success) {
      setCompanyFinance(response.data.finance);
      setSelectedProjectId(response.data.project.id);
      setProjectError("");
      refreshCompanyAndProjects();
      return;
    }

    setProjectError(response.error.message);
  };

  const chooseEvent = async (eventId: string, option: "A" | "B"): Promise<void> => {
    if (!account || !selectedServer) {
      setEventError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<EventChoiceResult>(
      `/events/${encodeURIComponent(eventId)}/choose`,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, option })
      },
      account.token
    );

    if (response.success) {
      setCompanyFinance(response.data.finance);
      setEventNotice(response.data.result.summary);
      setEventError("");
      await loadEvents(account.token, selectedServer.id);
      await loadTasks(account.token, selectedServer.id);
      setProfile((currentProfile) =>
        currentProfile === null
          ? currentProfile
          : {
              ...currentProfile,
              cash: response.data.finance.cash,
              monthlyIncome: response.data.finance.monthlyIncome,
              monthlyExpense: response.data.finance.monthlyExpense,
              valuation: response.data.finance.valuation,
              totalDebt: response.data.finance.totalDebt,
              creditRating: response.data.finance.creditRating,
              reputation: response.data.finance.brandReputation,
              employeeSatisfaction: response.data.finance.employeeSatisfaction,
              customerSatisfaction: response.data.finance.customerSatisfaction,
              financeMonth: response.data.finance.financeMonth,
              operatingDay: response.data.finance.operatingDay,
              riskStatus: response.data.finance.riskStatus
            }
      );
      return;
    }

    setEventError(response.error.message);
  };

  const runLoanAction = async (path: string, body: Record<string, string> = {}): Promise<void> => {
    if (!account || !selectedServer) {
      setLoanError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<LoanActionResult>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, ...body })
      },
      account.token
    );

    if (response.success) {
      applyLoanCenter(response.data.loanCenter);
      setLoanNotice(response.data.result);
      setLoanError("");
      return;
    }

    setLoanError(response.error.message);
  };

  const runFundingAction = async (path: string, body: Record<string, string> = {}): Promise<void> => {
    if (!account || !selectedServer) {
      setFundingError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<FundingActionResult>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, ...body })
      },
      account.token
    );

    if (response.success) {
      applyFundingCenter(response.data.fundingCenter);
      setFundingNotice(response.data.result);
      setFundingError("");
      return;
    }

    setFundingError(response.error.message);
  };

  const resolveCrisis = async (route: "financing" | "cost_cut" | "restructure"): Promise<void> => {
    if (!account || !selectedServer) {
      setLoanError("账号或区服状态缺失，请重新登录。");
      return;
    }

    const response = await apiRequest<LoanCenter>(
      "/finance/crisis/resolve",
      {
        method: "POST",
        body: JSON.stringify({ serverId: selectedServer.id, route })
      },
      account.token
    );

    if (response.success) {
      applyLoanCenter(response.data);
      setLoanNotice("危机处理方案已执行，公司状态已更新。");
      setLoanError("");
      return;
    }

    setLoanError(response.error.message);
  };

  const guideTask = (task: TaskItem): void => {
    if (task.isClaimable) {
      void claimTask(task.id);
      return;
    }

    if (task.guideAction.includes("员工")) {
      setActiveNav("员工");
      return;
    }

    if (task.guideAction.includes("项目")) {
      setActiveNav("项目");
      return;
    }

    if (task.unlockKind === "knowledge") {
      setActiveKnowledgeTask(task);
      setActivePanel(null);
      return;
    }

    if (task.unlockKind === "compliance") {
      openEventScreen();
    }
  };

  const selectedPanel = activePanel ? homePanelContent[activePanel] : undefined;

  if (isRestoring) {
    return (
      <main className="login-shell" aria-label="恢复登录状态">
        <section className="login-stage" aria-label="登录状态检查">
          <div className="login-brand">
            <span>创</span>
            <div>
              <h1>写字楼创业记</h1>
              <p>正在进入游戏</p>
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
        </section>
      </main>
    );
  }

  if (step === "game" && profile && selectedServer && selectedAvatar) {
    return (
      <main className="game-shell" aria-label="游戏主界面">
        <section className="app-viewport shadow-2xl" aria-label="公司经营主页">
          <header className="absolute top-0 left-0 right-0 z-[60] p-4 space-y-3 pointer-events-none">
            <div className="flex items-center justify-between pointer-events-auto">
              <button className="flex items-center gap-2 text-left" type="button" onClick={leaveGame}>
                <span className="relative group">
                  <span className="block w-12 h-12 rounded-full border-2 border-business-gold p-0.5 overflow-hidden shadow-lg shadow-business-gold/10">
                    <img src="/game-ui/html-design/founder.jpg" alt="" className="w-full h-full object-cover rounded-full" />
                  </span>
                  <span className="absolute -bottom-1 -right-1 bg-business-gold text-business-dark text-[9px] font-black px-1.5 rounded-sm border border-business-dark">VIP 8</span>
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="flex items-center gap-1.5">
                    <strong className="font-black text-sm text-white drop-shadow-md truncate max-w-[120px]">{profile.founderName || account?.username || "创业新星"}</strong>
                    <span className="bg-blue-500/20 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-bold border border-blue-500/30">创业先驱</span>
                  </span>
                  <span className="flex items-center gap-2 mt-1">
                    <span className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                      <span className="block w-3/4 h-full bg-business-gold shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">LV.{profile.companyLevel}</span>
                  </span>
                </span>
              </button>
              <button className="flex flex-col items-end" type="button" onClick={() => openHomePanel("财务")}>
                <span className="text-[10px] text-slate-400 font-medium">公司估值</span>
                <strong className="text-xs text-business-gold font-black">{compactNumber(profile.valuation)}</strong>
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto scroll-hide pb-1 pointer-events-auto" aria-label="资源">
              {[
                { icon: "circle-dollar-sign", iconClass: "text-emerald-400", label: compactNumber(profile.cash), panel: "财务", add: true },
                { icon: "gem", iconClass: "text-business-gold", label: profile.platformCoins.toLocaleString("zh-CN"), panel: "商城", add: true },
                { icon: "award", iconClass: "text-blue-400", label: compactNumber(profile.reputation), panel: "排行榜", add: false },
                { icon: "zap", iconClass: "text-amber-500", label: `${profile.actionPower}/${profile.actionPowerLimit}`, panel: "出门谈判", add: false }
              ].map((resource) => (
                <button className="resource-tag min-w-[86px]" type="button" key={resource.panel} onClick={() => openHomePanel(resource.panel)}>
                  <Icon name={resource.icon} className={`w-3 h-3 ${resource.iconClass}`} />
                  <span className="text-[10px] font-bold truncate">{resource.label}</span>
                  {resource.add && (
                    <span className="ml-auto w-3.5 h-3.5 bg-white/10 rounded flex items-center justify-center">
                      <Icon name="plus" className="w-2.5 h-2.5 text-slate-400" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </header>

          <main id="home-scene" className="flex-1 main-bg relative flex flex-col items-center justify-center">
            <div className="animate-float text-center pointer-events-none">
              <div>
                <h2 className="text-2xl font-black tracking-widest text-white drop-shadow-2xl">{profile.companyName}</h2>
              </div>
            </div>

            <div className="absolute left-4 top-36 space-y-4">
              {sideActions.map((item, index) => (
                <button className="flex flex-col items-center gap-1 group relative" type="button" key={item} onClick={() => openHomePanel(item)}>
                  {[3, 4].includes(index) && <span className="red-dot" />}
                  <span className="w-12 h-12 glass-panel rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name={homeActionIcons[item] ?? "box"} className={`w-6 h-6 ${homeActionIconClasses[item] ?? ""}`} />
                  </span>
                  <span className="text-[10px] text-white/90 font-bold drop-shadow-md">{item}</span>
                </button>
              ))}
            </div>

            <div className="absolute right-4 top-32 space-y-1.5">
              {rightActions.map((item, index) => (
                <button className="flex flex-col items-center gap-1 group relative" type="button" key={item} onClick={() => openHomePanel(item)}>
                  {[0, 3, 5, 6].includes(index) && <span className="red-dot" />}
                  <span className="w-11 h-11 glass-panel rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name={homeActionIcons[item] ?? "box"} className={`w-5 h-5 ${homeActionIconClasses[item] ?? ""}`} />
                  </span>
                  <span className="text-[9px] text-white/90 font-bold drop-shadow-md">{item}</span>
                </button>
              ))}
            </div>

            <button className="absolute bottom-24 left-4 right-24 glass-panel p-2.5 rounded-2xl flex items-center gap-3 active:scale-95 transition-transform cursor-pointer text-left" type="button" onClick={openTaskScreen}>
              <span className="w-12 h-12 bg-business-gold/15 rounded-xl flex items-center justify-center relative border border-business-gold/20">
                <span className="red-dot" />
                <Icon name="clipboard-check" className="w-7 h-7 text-business-gold" />
              </span>
              <span className="flex-1 overflow-hidden">
                <span className="flex justify-between items-center mb-0.5">
                  <span className="text-business-gold text-[10px] font-black uppercase tracking-wider">{highlightedTask?.isClaimable ? "可领取" : "主线任务"}</span>
                  <span className="text-slate-500 text-[10px] font-bold">{highlightedTask ? `${highlightedTask.progress}/${highlightedTask.target}` : "0/0"}</span>
                </span>
                <strong className="block text-xs font-black truncate text-white">{highlightedTask ? highlightedTask.title : "任务配置读取中"}</strong>
                <span className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold truncate">
                    <Icon name="gem" className="w-2.5 h-2.5" /> {highlightedTask ? highlightedTask.rewardLabel : "请确认 API 服务已启动"}
                  </span>
                </span>
              </span>
              <span className="btn-gold px-3 py-2 rounded-xl text-xs font-black text-business-dark">{highlightedTask?.isClaimable ? "领取" : "前往"}</span>
            </button>

          </main>

          <nav className="h-24 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 px-2 flex items-center justify-between z-[100] pb-6" aria-label="底部导航">
            {navItems.map((item, index) => (
              <button
                className={`flex flex-col items-center gap-1.5 flex-1 transition-colors ${activeNav === item ? "text-business-gold" : "text-slate-500"}`}
                type="button"
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  if (item === "公司") {
                    setActivePanel(null);
                    setNativeHomePage(null);
                  } else if (item === "员工" || item === "项目") {
                    setActivePanel(null);
                    setNativeHomePage(null);
                  } else {
                    openHomePanel(item);
                  }
                }}
              >
                <span className="relative">
                  {[1, 2, 5].includes(index) && <span className="red-dot" />}
                  <Icon name={navIcons[item] ?? "box"} className="w-6 h-6" />
                </span>
                <span className="text-[10px] font-bold">{item}</span>
              </button>
            ))}
          </nav>

          {nativeHomePage === "leaderboard" && (
            <section className="page-container page-active" aria-label="排行榜" data-testid="native-leaderboard">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="award" className="w-7 h-7 text-business-gold" />
                  <h2 className="text-xl font-black text-white italic uppercase">Rank 排行榜</h2>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭排行榜" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="px-6 flex gap-8 border-b border-white/5 mb-4">
                <button className="pb-3 border-b-2 border-business-gold text-business-gold font-bold text-sm" type="button">全服估值榜</button>
                <button className="pb-3 text-slate-500 font-bold text-sm" type="button">月度盈利榜</button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-10 scroll-hide">
                {[
                  { rank: "NO.1", name: "马氪 · 万向集团", value: "估值: ¥145.2 亿", crown: true, initial: "马" },
                  { rank: "2", name: "许天 · 天空资本", value: "估值: ¥98.7 亿", initial: "许" },
                  { rank: "3", name: "张强 · 巅峰科技", value: "估值: ¥82.1 亿", initial: "张" }
                ].map((row) => (
                  <article
                    className={`glass-panel p-4 rounded-2xl flex items-center gap-4 ${row.crown ? "bg-gradient-to-r from-business-gold/10 to-transparent border-business-gold/30" : ""}`}
                    key={row.name}
                  >
                    <div className={row.crown ? "w-8 h-8 flex items-center justify-center" : "w-8 text-center text-slate-500 font-black text-lg italic"}>
                      {row.crown ? <Icon name="crown" className="w-6 h-6 text-business-gold" /> : row.rank}
                    </div>
                    <div className={`w-10 h-10 rounded-full border-2 ${row.crown ? "border-business-gold" : "border-slate-700"} p-0.5`}>
                      <span className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-white">{row.initial}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-black text-white">{row.name}</div>
                      <div className="text-[9px] text-slate-500">{row.value}</div>
                    </div>
                    {row.crown && <div className="text-[10px] font-black text-business-gold italic">{row.rank}</div>}
                  </article>
                ))}
              </div>
              <footer className="p-4 bg-slate-900 border-t border-business-gold/30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-4 px-2">
                  <div className="w-8 text-center text-business-gold font-black italic">45</div>
                  <div className="w-10 h-10 rounded-full border-2 border-business-gold p-0.5">
                    <img src="/game-ui/html-design/founder.jpg" alt="" className="w-full h-full rounded-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-black text-white">{profile.founderName || account?.username || "创业新星"} · {profile.companyName}</div>
                    <div className="text-[9px] text-slate-400 italic">击败了 85% 的玩家</div>
                  </div>
                  <div className="text-xs font-black text-business-gold">{compactNumber(profile.valuation)}</div>
                </div>
              </footer>
            </section>
          )}

          {nativeHomePage === "shop" && (
            <section className="page-container page-active" aria-label="特惠商城" data-testid="native-shop">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="shopping-bag" className="w-7 h-7 text-pink-400" />
                  <h2 className="text-xl font-black text-white italic uppercase">Shop 商业特权</h2>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭特惠商城" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="px-6 flex gap-6 overflow-x-auto scroll-hide mb-4">
                <button className="pb-2 border-b-2 border-business-gold text-business-gold font-bold text-sm whitespace-nowrap" type="button">限时礼包</button>
                <button className="pb-2 text-slate-500 font-bold text-sm whitespace-nowrap" type="button">钻石充值</button>
                <button className="pb-2 text-slate-500 font-bold text-sm whitespace-nowrap" type="button">月卡/基金</button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-10 scroll-hide">
                <section className="w-full h-28 rounded-3xl overflow-hidden relative" aria-label="限时活动广告">
                  <img src="/game-ui/html-design/main-bg.jpg" alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-business-dark to-transparent flex flex-col justify-center p-6">
                    <h3 className="text-lg font-black italic text-white">C轮融资专项礼包</h3>
                    <p className="text-[10px] text-business-gold font-bold">限时 2.5 折 | 仅剩 14:23:45</p>
                  </div>
                </section>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { title: "高级猎头契约 x10", icon: "file-search", iconClass: "text-business-gold", price: "1280", discount: "-60%" },
                    { title: "经营保险 (7天)", icon: "shield-check", iconClass: "text-emerald-400", price: "680" }
                  ].map((product) => (
                    <article className="glass-panel p-4 rounded-3xl flex flex-col items-center gap-2 relative" key={product.title}>
                      {product.discount && <div className="absolute -top-1 -right-1 bg-red-500 text-[8px] font-black px-1.5 rounded-sm">{product.discount}</div>}
                      <div className="w-16 h-16 flex items-center justify-center">
                        <Icon name={product.icon} className={`w-10 h-10 ${product.iconClass}`} />
                      </div>
                      <div className="text-xs font-black text-white text-center">{product.title}</div>
                      <div className="flex items-center gap-1">
                        <Icon name="gem" className="w-3 h-3 text-business-gold" />
                        <span className="text-sm font-black">{product.price}</span>
                      </div>
                      <button className="w-full btn-gold py-1.5 rounded-xl text-[10px] font-black text-business-dark" type="button">购买</button>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {nativeHomePage === "bag" && (
            <section className="page-container page-active" aria-label="背包" data-testid="native-bag">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="package" className="w-7 h-7 text-business-gold" />
                  <h2 className="text-xl font-black text-white italic uppercase">Inventory 背包</h2>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭背包" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 pb-10 scroll-hide">
                <div className="grid grid-cols-4 gap-3">
                  <div className="aspect-square glass-panel rounded-2xl flex items-center justify-center border-white/5 active:border-business-gold transition-colors relative">
                    <Icon name="file-text" className="w-8 h-8 text-slate-500" />
                    <span className="absolute bottom-1 right-2 text-[10px] font-black text-white">12</span>
                  </div>
                  <div className="aspect-square glass-panel rounded-2xl flex items-center justify-center border-business-gold/40 bg-business-gold/5 relative">
                    <Icon name="star" className="w-8 h-8 text-business-gold" />
                    <span className="absolute bottom-1 right-2 text-[10px] font-black text-white">1</span>
                  </div>
                  {Array.from({ length: 18 }, (_, index) => (
                    <div className="aspect-square glass-panel rounded-2xl flex items-center justify-center border-white/5 opacity-40" key={index} />
                  ))}
                </div>
              </div>
              <footer className="p-6 bg-slate-900 border-t border-white/5 h-48 flex gap-6">
                <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center border border-business-gold/30 shrink-0">
                  <Icon name="star" className="w-10 h-10 text-business-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-white">精英员工直聘券 (SSR)</h3>
                  <p className="text-xs text-slate-400 mt-2 font-medium">使用后可从当前卡池中自选一名 SSR 级员工入职。</p>
                  <button className="mt-4 btn-gold px-8 py-2 rounded-xl text-xs font-black text-business-dark" type="button">使用</button>
                </div>
              </footer>
            </section>
          )}

          {nativeHomePage === "negotiation" && (
            <section className="page-container page-active" aria-label="出门谈判" data-testid="native-negotiation">
              <header className="p-6 pt-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Icon name="handshake" className="w-7 h-7 text-business-gold" />
                  <h2 className="text-xl font-black text-white italic uppercase">Chapter 谈判</h2>
                </div>
                <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center" type="button" aria-label="关闭出门谈判" onClick={closeNativeHomePage}>
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-4 scroll-hide">
                <section className="glass-panel rounded-3xl p-5 border-business-gold/30 bg-gradient-to-br from-business-gold/10 to-slate-950">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-business-gold font-black uppercase tracking-wider">当前章节</span>
                    <span className="text-[10px] text-slate-400 font-bold">行动力 {profile.actionPower}/{profile.actionPowerLimit}</span>
                  </div>
                  <h3 className="text-2xl font-black text-white">第15章 · 扩张谈判</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-400 font-medium">
                    推进谈判可解锁新客户、新项目和商战对手，承接主线任务与后续经营事件。
                  </p>
                </section>

                <section className="glass-panel rounded-3xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-12 h-12 bg-business-gold/15 rounded-2xl flex items-center justify-center border border-business-gold/20 shrink-0">
                      <Icon name="clipboard-check" className="w-7 h-7 text-business-gold" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-business-gold text-[10px] font-black uppercase">主线任务</span>
                        <span className="text-slate-500 text-[10px] font-bold">{highlightedTask ? `${highlightedTask.progress}/${highlightedTask.target}` : "0/0"}</span>
                      </div>
                      <strong className="block text-sm font-black text-white truncate">{highlightedTask ? highlightedTask.title : "任务配置读取中"}</strong>
                      <p className="mt-2 text-[10px] text-slate-400 font-medium">
                        {highlightedTask ? highlightedTask.rewardLabel : "请确认 API 服务已启动"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-3 gap-3">
                  {[
                    ["客户", "新合同"],
                    ["项目", "高收益"],
                    ["商战", "新对手"]
                  ].map(([label, value]) => (
                    <div className="glass-panel rounded-2xl p-3 text-center" key={label}>
                      <div className="text-[10px] text-slate-500 font-bold">{label}</div>
                      <div className="mt-1 text-xs text-white font-black">{value}</div>
                    </div>
                  ))}
                </section>
              </div>
              <footer className="p-6 bg-slate-900 border-t border-white/5">
                <button className="w-full btn-gold py-3 rounded-2xl text-sm font-black text-business-dark" type="button" onClick={openEventScreen}>
                  开始谈判
                </button>
              </footer>
            </section>
          )}

          {activeNav === "员工" && (
            <section className="employee-screen" aria-label="员工系统">
              <header className="employee-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>员工</strong>
                  <span>团队战力 {employeePower.toLocaleString("zh-CN")}</span>
                </div>
                <button type="button" onClick={() => openHomePanel("员工")}>规则</button>
              </header>

              <section className="employee-summary" aria-label="员工概览">
                <span>在岗 {activeEmployees.length}</span>
                <span>平均忠诚 {averageEmployeeLoyalty}</span>
                <span>月薪合计 {formatWan(totalEmployeeSalary)}</span>
              </section>
              {employeeError && <p className="employee-error">{employeeError}</p>}

              <section className="employee-layout">
                <div className="employee-list" aria-label="员工列表">
                  {employees.map((employee) => (
                    <button
                      className={employee.id === selectedEmployee?.id ? "selected" : undefined}
                      key={employee.id}
                      type="button"
                      onClick={() => setSelectedEmployeeId(employee.id)}
                    >
                      <span className={`quality ${rarityClass(employee.rarity)}`}>{employee.rarity}</span>
                      <strong>{employee.name}</strong>
                      <em>{employee.role} · {employee.careerLevel}</em>
                      <small>{employee.isActive ? `Lv.${employee.level}` : "离岗"}</small>
                    </button>
                  ))}
                </div>

                <article className="employee-detail" aria-label="员工详情">
                  {selectedEmployee ? (
                    <>
                      <div className="employee-portrait">
                        <span>{selectedEmployee.name.slice(0, 1)}</span>
                        <strong>{selectedEmployee.name}</strong>
                        <em>{selectedEmployee.rarity} · {selectedEmployee.role} · {selectedEmployee.careerLevel}</em>
                      </div>

                      <dl className="employee-stats">
                        <div>
                          <dt>等级</dt>
                          <dd>Lv.{selectedEmployee.level}</dd>
                        </div>
                        <div>
                          <dt>薪资</dt>
                          <dd>{formatWan(selectedEmployee.salary)}/月</dd>
                        </div>
                        <div>
                          <dt>忠诚</dt>
                          <dd>{selectedEmployee.loyalty}</dd>
                        </div>
                        <div>
                          <dt>压力</dt>
                          <dd>{selectedEmployee.pressure}</dd>
                        </div>
                        <div>
                          <dt>管理</dt>
                          <dd>{selectedEmployee.management}</dd>
                        </div>
                        <div>
                          <dt>谈判</dt>
                          <dd>{selectedEmployee.negotiation}</dd>
                        </div>
                        <div>
                          <dt>执行</dt>
                          <dd>{selectedEmployee.execution}</dd>
                        </div>
                        <div>
                          <dt>股权</dt>
                          <dd>{(selectedEmployee.equityBasisPoints / 100).toFixed(0)}%</dd>
                        </div>
                      </dl>

                      <p>{selectedEmployee.specialty} 成长潜力 {selectedEmployee.growthPotential}。</p>

                      <div className="employee-actions">
                        <button type="button" onClick={() => void cultivateEmployee()} disabled={!selectedEmployee.isActive}>培养</button>
                        <button type="button" onClick={recruitEmployee}>招募</button>
                        <button type="button" onClick={grantEmployeeEquity} disabled={!selectedEmployee.isActive}>股权</button>
                        <button type="button" onClick={() => void dismissEmployee()} disabled={!selectedEmployee.isActive}>裁员</button>
                      </div>
                    </>
                  ) : (
                    <div className="employee-empty">
                      <strong>暂无员工</strong>
                      <p>通过招募建立第一支核心团队，员工薪资会计入公司月支出。</p>
                      <button type="button" onClick={recruitEmployee}>招募员工</button>
                    </div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeNav === "项目" && (
            <section className="project-screen" aria-label="项目系统">
              <header className="project-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>项目</strong>
                  <span>预计回款 {compactNumber(totalProjectRevenue)}</span>
                </div>
                <button type="button" onClick={() => openHomePanel("项目")}>规则</button>
              </header>

              <section className="project-summary" aria-label="项目概览">
                <span>在研 {activeProjects.length}</span>
                <span>最高阶段 {highestProjectStage}</span>
                <span>可结算 {projects.filter((project) => project.status === "ready").length}</span>
              </section>
              {projectError && <p className="project-error">{projectError}</p>}

              <section className="project-layout">
                <div className="project-list" aria-label="项目列表">
                  {projects.map((project) => (
                    <button
                      className={project.id === selectedProject?.id ? "selected" : undefined}
                      key={project.id}
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <strong>{project.name}</strong>
                      <em>{project.category} · 阶段 {project.stage}</em>
                      <span>
                        <i style={{ width: `${project.progress}%` }} />
                      </span>
                      <small>{project.status === "ready" ? "待结算" : `预计 ${compactNumber(project.revenueReward)}`}</small>
                    </button>
                  ))}
                </div>

                <article className="project-detail" aria-label="项目详情">
                  {selectedProject ? (
                    <>
                      <div className="project-title">
                        <span>{selectedProject.category.slice(0, 2)}</span>
                        <strong>{selectedProject.name}</strong>
                        <em>阶段 {selectedProject.stage} · 风险 {selectedProject.risk} · 成功率 {selectedProject.successRate}%</em>
                      </div>

                      <dl className="project-stats">
                        <div>
                          <dt>进度</dt>
                          <dd>{selectedProject.progress}%</dd>
                        </div>
                        <div>
                          <dt>周期</dt>
                          <dd>{selectedProject.cycleDays}天</dd>
                        </div>
                        <div>
                          <dt>预算</dt>
                          <dd>{compactNumber(selectedProject.budget)}</dd>
                        </div>
                        <div>
                          <dt>回款</dt>
                          <dd>{compactNumber(selectedProject.revenueReward)}</dd>
                        </div>
                        <div>
                          <dt>负责人</dt>
                          <dd>{selectedProject.assignedEmployeeName ?? "待分配"}</dd>
                        </div>
                        <div>
                          <dt>状态</dt>
                          <dd>{selectedProject.status === "ready" ? "待结算" : selectedProject.status === "settled" ? "已成功" : selectedProject.status === "failed" ? "已失败" : "推进中"}</dd>
                        </div>
                      </dl>

                      <label className="project-assignee">
                        <span>派员工</span>
                        <select
                          value={selectedProject.assignedEmployeeId ?? ""}
                          onChange={(event) => void assignProjectEmployee(event.target.value)}
                          disabled={selectedProject.status === "settled" || selectedProject.status === "failed"}
                        >
                          <option value="">待分配</option>
                          {activeEmployees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name} · {employee.role}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="project-progress" aria-label="项目进度">
                        <span>
                          <i style={{ width: `${selectedProject.progress}%` }} />
                        </span>
                        <strong>{selectedProject.progress}%</strong>
                      </div>

                      <p>{selectedProject.summary}</p>

                      <div className="project-actions">
                        <button type="button" onClick={() => void advanceProject()} disabled={selectedProject.status !== "active"}>推进</button>
                        <button type="button" onClick={() => void startProject()}>接项目</button>
                        <button type="button" onClick={() => void settleProject()} disabled={selectedProject.status !== "ready"}>结算</button>
                        <button type="button" onClick={() => activeEmployees[0] && void assignProjectEmployee(activeEmployees[0].id)} disabled={activeEmployees.length === 0 || selectedProject.status === "settled" || selectedProject.status === "failed"}>派遣</button>
                      </div>
                    </>
                  ) : (
                    <div className="project-empty">
                      <strong>暂无项目</strong>
                      <p>接下第一单项目，分配员工后推进交付，结算结果会影响现金、声誉和客户满意度。</p>
                      <button type="button" onClick={() => void startProject()}>接项目</button>
                    </div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeNav === "融资" && (
            <section className="funding-screen" aria-label="融资路演">
              <header className="funding-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>融资</strong>
                  <span>估值 {compactNumber(fundingCenter?.finance.valuation ?? profile.valuation)} · 股权 {((fundingCenter?.finance.founderEquityBasisPoints ?? profile.founderEquityBasisPoints) / 100).toFixed(1)}%</span>
                </div>
                <button type="button" onClick={() => account && selectedServer && void loadFundingCenter(account.token, selectedServer.id)}>刷新</button>
              </header>

              <section className="funding-summary" aria-label="融资概览">
                <span>现金 {compactNumber(fundingCenter?.finance.cash ?? profile.cash)}</span>
                <span>负债 {(fundingCenter ? fundingCenter.finance.debtRatioBasisPoints / 100 : 0).toFixed(1)}%</span>
                <span>待谈 {pendingFundings.length}</span>
              </section>
              {fundingNotice && <p className="funding-notice">{fundingNotice}</p>}
              {fundingError && <p className="funding-error">{fundingError}</p>}

              <section className="funding-layout">
                <div className="funding-list" aria-label="投资人列表">
                  {(fundingCenter?.offers ?? []).map((offer) => (
                    <button
                      className={offer.id === selectedFundingOffer?.id ? "selected" : undefined}
                      key={offer.id}
                      type="button"
                      onClick={() => setSelectedFundingOfferId(offer.id)}
                    >
                      <strong>{offer.investorName}</strong>
                      <em>{offer.roundName} · {offer.focus}</em>
                      <span>{formatWan(offer.amount)} / 稀释{(offer.equityBasisPoints / 100).toFixed(1)}% / 成功{offer.successRate}%</span>
                      <small>{offer.lockedReason ?? "可路演"}</small>
                    </button>
                  ))}
                </div>

                <article className="funding-detail" aria-label="融资详情">
                  {selectedFundingOffer ? (
                    <>
                      <div className="funding-title">
                        <span>融</span>
                        <strong>{selectedFundingOffer.investorName}</strong>
                        <em>{selectedFundingOffer.summary}</em>
                      </div>

                      <dl className="funding-stats">
                        <div>
                          <dt>到账</dt>
                          <dd>{compactNumber(selectedFundingOffer.amount)}</dd>
                        </div>
                        <div>
                          <dt>投前</dt>
                          <dd>{compactNumber(selectedFundingOffer.preMoneyValuation)}</dd>
                        </div>
                        <div>
                          <dt>投后</dt>
                          <dd>{compactNumber(selectedFundingOffer.postMoneyValuation)}</dd>
                        </div>
                        <div>
                          <dt>稀释</dt>
                          <dd>{(selectedFundingOffer.equityBasisPoints / 100).toFixed(1)}%</dd>
                        </div>
                        <div>
                          <dt>成功率</dt>
                          <dd>{selectedFundingOffer.successRate}%</dd>
                        </div>
                        <div>
                          <dt>董事会</dt>
                          <dd>{selectedFundingOffer.boardPressure}</dd>
                        </div>
                      </dl>

                      <section className="funding-active">
                        <strong>投资条款</strong>
                        <span>{selectedFundingOffer.term}</span>
                        <small>接受后创始人股权降至 {((fundingCenter?.finance.founderEquityBasisPoints ?? profile.founderEquityBasisPoints) - selectedFundingOffer.equityBasisPoints) / 100}%</small>
                      </section>

                      {selectedFunding && (
                        <section className="funding-active">
                          <strong>{selectedFunding.investorName}</strong>
                          <span>{selectedFunding.roundName} 正在谈判，成功率 {selectedFunding.successRate}%。</span>
                          <small>{selectedFunding.term}</small>
                        </section>
                      )}

                      <div className="funding-actions">
                        <button
                          type="button"
                          disabled={!selectedFundingOffer.isAvailable}
                          onClick={() => void runFundingAction("/finance/fundings/start", { investorId: selectedFundingOffer.id })}
                        >
                          发起路演
                        </button>
                        <button
                          type="button"
                          disabled={!selectedFunding}
                          onClick={() => selectedFunding && void runFundingAction(`/finance/fundings/${encodeURIComponent(selectedFunding.id)}/settle`)}
                        >
                          确认结果
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="funding-empty">投资人配置读取中，请确认 API 服务已启动。</div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeNav === "贷款" && (
            <section className="loan-screen" aria-label="贷款与危机">
              <header className="loan-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>贷款</strong>
                  <span>信用 {loanCenter?.finance.creditRating ?? profile.creditRating} · 负债 {loanCenter ? `${(loanCenter.finance.debtRatioBasisPoints / 100).toFixed(1)}%` : "读取中"}</span>
                </div>
                <button type="button" onClick={() => account && selectedServer && void loadLoanCenter(account.token, selectedServer.id)}>刷新</button>
              </header>

              <section className="loan-summary" aria-label="负债概览">
                <span>总负债 {compactNumber(loanCenter?.finance.totalDebt ?? profile.totalDebt)}</span>
                <span>本期应还 {compactNumber(activeLoans.reduce((total, item) => total + item.monthlyPayment + item.penaltyAccrued, 0))}</span>
                <span>{loanCenter?.crisis.isActive ? "危机中" : "可控"}</span>
              </section>
              {loanNotice && <p className="loan-notice">{loanNotice}</p>}
              {loanError && <p className="loan-error">{loanError}</p>}

              <section className="loan-layout">
                <div className="loan-list" aria-label="贷款产品">
                  {(loanCenter?.offers ?? []).map((offer) => (
                    <button
                      className={offer.id === selectedLoanOffer?.id ? "selected" : undefined}
                      key={offer.id}
                      type="button"
                      onClick={() => setSelectedLoanOfferId(offer.id)}
                    >
                      <strong>{offer.name}</strong>
                      <em>{offer.lender} · 年化 {(offer.annualRateBasisPoints / 100).toFixed(1)}%</em>
                      <span>{formatWan(offer.principal)} / {offer.termMonths}期 / 月供{formatWan(offer.monthlyPayment)}</span>
                      <small>{offer.lockedReason ?? "可申请"}</small>
                    </button>
                  ))}
                </div>

                <article className="loan-detail" aria-label="贷款详情">
                  {selectedLoanOffer ? (
                    <>
                      <div className="loan-title">
                        <span>贷</span>
                        <strong>{selectedLoanOffer.name}</strong>
                        <em>{selectedLoanOffer.summary}</em>
                      </div>

                      <dl className="loan-stats">
                        <div>
                          <dt>到账</dt>
                          <dd>{compactNumber(selectedLoanOffer.principal)}</dd>
                        </div>
                        <div>
                          <dt>月供</dt>
                          <dd>{compactNumber(selectedLoanOffer.monthlyPayment)}</dd>
                        </div>
                        <div>
                          <dt>期限</dt>
                          <dd>{selectedLoanOffer.termMonths}期</dd>
                        </div>
                        <div>
                          <dt>信用</dt>
                          <dd>{selectedLoanOffer.creditRequired}级</dd>
                        </div>
                      </dl>

                      {selectedLoan && (
                        <section className="loan-active">
                          <strong>{selectedLoan.name}</strong>
                          <span>剩余 {compactNumber(selectedLoan.remainingPrincipal)} · {selectedLoan.remainingMonths}期 · {selectedLoan.status === "overdue" ? `逾期${selectedLoan.overduePeriods}期` : "正常"}</span>
                          <small>罚息 {compactNumber(selectedLoan.penaltyAccrued)}</small>
                        </section>
                      )}

                      {loanCenter?.crisis.isActive && (
                        <section className="loan-crisis">
                          <strong>{loanCenter.crisis.summary}</strong>
                          {loanCenter.crisis.routes.map((route) => (
                            <button key={route.id} type="button" onClick={() => void resolveCrisis(route.id)}>
                              <span>{route.title}</span>
                              <small>{route.impact}</small>
                            </button>
                          ))}
                        </section>
                      )}

                      <div className="loan-actions">
                        <button
                          type="button"
                          disabled={!selectedLoanOffer.isAvailable}
                          onClick={() => void runLoanAction("/finance/loans/apply", { loanConfigId: selectedLoanOffer.id })}
                        >
                          申请
                        </button>
                        <button
                          type="button"
                          disabled={!selectedLoan}
                          onClick={() => selectedLoan && void runLoanAction(`/finance/loans/${encodeURIComponent(selectedLoan.id)}/repay`, { mode: "scheduled" })}
                        >
                          还本期
                        </button>
                        <button
                          type="button"
                          disabled={!selectedLoan}
                          onClick={() => selectedLoan && void runLoanAction(`/finance/loans/${encodeURIComponent(selectedLoan.id)}/repay`, { mode: "full" })}
                        >
                          结清
                        </button>
                        <button type="button" onClick={() => void runLoanAction("/finance/loans/settle-period")}>到期</button>
                      </div>
                    </>
                  ) : (
                    <div className="loan-empty">贷款配置读取中，请确认 API 服务已启动。</div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeNav === "任务" && (
            <section className="task-screen" aria-label="任务系统">
              <header className="task-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>任务</strong>
                  <span>主线 / 每日 / 支线</span>
                </div>
                <button type="button" onClick={() => selectedServer && account && void loadTasks(account.token, selectedServer.id)}>刷新</button>
              </header>

              <nav className="task-tabs" aria-label="任务分类">
                {[
                  ["main", "主线"],
                  ["daily", "每日"],
                  ["side", "支线"]
                ].map(([type, label]) => (
                  <button
                    className={activeTaskType === type ? "active" : undefined}
                    key={type}
                    type="button"
                    onClick={() => setActiveTaskType(type as TaskItem["type"])}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <p className="task-tip">{activeTaskTip}</p>
              {taskNotice && <p className="task-notice">{taskNotice}</p>}
              {taskError && <p className="task-error">{taskError}</p>}

              <section className="task-list" aria-label="任务列表">
                {visibleTasks.length === 0 ? (
                  <div className="task-empty">当前分类暂无任务，继续经营后会出现新的目标。</div>
                ) : visibleTasks.map((task) => (
                  <article className={task.isClaimed ? "claimed" : undefined} key={task.id}>
                    <header>
                      <strong>{task.title}</strong>
                      <span>{task.progress}/{task.target}</span>
                    </header>
                    <p>{task.description}</p>
                    <div className="task-progress-line">
                      <span>
                        <i style={{ width: `${Math.min((task.progress / task.target) * 100, 100)}%` }} />
                      </span>
                    </div>
                    <footer>
                      <small>奖励：{task.rewardLabel}</small>
                      <button disabled={task.isClaimed || claimingTaskId === task.id} type="button" onClick={() => guideTask(task)}>
                        {claimingTaskId === task.id ? "领取中" : task.isClaimed ? "已领取" : task.isClaimable ? "领取" : task.guideAction}
                      </button>
                    </footer>
                  </article>
                ))}
              </section>
            </section>
          )}

          {activeNav === "事件" && (
            <section className="event-screen" aria-label="事件中心">
              <header className="event-header">
                <button type="button" onClick={() => setActiveNav("公司")}>返回</button>
                <div>
                  <strong>事件</strong>
                  <span>消息 / 邮件 / 合同 / 财报</span>
                </div>
                <button type="button" onClick={() => account && selectedServer && void loadEvents(account.token, selectedServer.id)}>刷新</button>
              </header>

              <section className="event-summary" aria-label="事件概览">
                <span>待处理 {pendingEvents.length}</span>
                <span>已处理 {events.length - pendingEvents.length}</span>
                <span>知识 {events.filter((item) => item.knowledgeUnlocked).length}</span>
              </section>
              {eventNotice && <p className="event-notice">{eventNotice}</p>}
              {eventError && <p className="event-error">{eventError}</p>}

              <section className="event-layout">
                <div className="event-list" aria-label="事件列表">
                  {events.length === 0 ? (
                    <div className="event-empty">暂无经营事件，继续推进公司后会出现新的待办。</div>
                  ) : events.map((item) => (
                    <button
                      className={item.id === selectedEvent?.id ? "selected" : undefined}
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedEventId(item.id)}
                    >
                      <span>{item.source}</span>
                      <strong>{item.title}</strong>
                      <em>{item.summary}</em>
                      <small>{item.status === "pending" ? "待决策" : "已处理"}</small>
                    </button>
                  ))}
                </div>

                <article className="event-detail" aria-label="事件详情">
                  {selectedEvent ? (
                    <>
                      <div className="event-title">
                        <span>{selectedEvent.source.slice(0, 2)}</span>
                        <strong>{selectedEvent.title}</strong>
                        <em>{selectedEvent.channel} · {selectedEvent.status === "pending" ? "待处理" : "已结算"}</em>
                      </div>

                      <p>{selectedEvent.context}</p>

                      <dl className="event-risk">
                        <div>
                          <dt>摘要</dt>
                          <dd>{selectedEvent.summary}</dd>
                        </div>
                        <div>
                          <dt>风险解释</dt>
                          <dd>{selectedEvent.riskExplanation}</dd>
                        </div>
                        <div>
                          <dt>知识点</dt>
                          <dd>{selectedEvent.knowledgeUnlocked ? selectedEvent.knowledgeTitle : selectedEvent.knowledgeTitle ?? "待解锁"}</dd>
                        </div>
                      </dl>

                      {selectedEvent.status === "pending" ? (
                        <div className="event-options">
                          {selectedEvent.options.map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => void chooseEvent(selectedEvent.id, option.key)}
                            >
                              <strong>{option.label}</strong>
                              <span>{option.impactPreview}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <section className="event-result">
                          <strong>处理结果</strong>
                          <p>{selectedEvent.resultSummary}</p>
                          <span>选择：{selectedEvent.selectedOption}</span>
                        </section>
                      )}
                    </>
                  ) : (
                    <div className="event-empty">事件配置读取中，请稍候。</div>
                  )}
                </article>
              </section>
            </section>
          )}

          {activeKnowledgeTask && (
            <section className="home-modal" aria-label={activeKnowledgeTask.unlockKind === "compliance" ? "合规支线" : "创业知识"}>
              <button className="modal-backdrop" type="button" aria-label="关闭面板" onClick={() => setActiveKnowledgeTask(null)} />
              <div className="modal-sheet knowledge-sheet">
                <header>
                  <strong>{activeKnowledgeTask.unlockKind === "compliance" ? "合同复核支线" : "创业知识卡"}</strong>
                  <button type="button" aria-label="关闭" onClick={() => setActiveKnowledgeTask(null)}>×</button>
                </header>
                <article>
                  <h3>{activeKnowledgeTask.title}</h3>
                  <p>{activeKnowledgeTask.description}</p>
                  <dl>
                    <div>
                      <dt>经营场景</dt>
                      <dd>{activeKnowledgeTask.unlockKind === "compliance" ? "客户合同进入交付前复核，确认回款、验收和违约条款。" : "员工入职后需要规范签署劳动合同，避免用工争议扩大。"}</dd>
                    </div>
                    <div>
                      <dt>风险提示</dt>
                      <dd>{activeKnowledgeTask.unlockKind === "compliance" ? "合同条款不清会影响项目结算、客户满意度和现金回收。" : "用工资料不完整会增加劳动争议、赔偿和声誉风险。"}</dd>
                    </div>
                    <div>
                      <dt>游戏影响</dt>
                      <dd>阅读并确认后推进支线进度，奖励领取仍以后端任务状态为准。</dd>
                    </div>
                  </dl>
                  <small>本内容用于游戏内经营知识提示，不构成法律、财务或投资建议。</small>
                </article>
                <button
                  type="button"
                  onClick={() => {
                    void progressTask(activeKnowledgeTask.id);
                    setActiveKnowledgeTask(null);
                    openTaskScreen();
                  }}
                >
                  我已理解
                </button>
              </div>
            </section>
          )}

          {activePanel === "财务" && (
            <section className="home-modal" aria-label="财务">
              <button className="modal-backdrop" type="button" aria-label="关闭面板" onClick={() => setActivePanel(null)} />
              <div className="modal-sheet finance-sheet">
                <header>
                  <strong>财务</strong>
                  <button type="button" aria-label="关闭" onClick={() => setActivePanel(null)}>×</button>
                </header>
                {companyFinance ? (
                  <>
                    <dl className="finance-grid">
                      <div>
                        <dt>现金</dt>
                        <dd>{compactNumber(companyFinance.cash)}</dd>
                      </div>
                      <div>
                        <dt>月收入</dt>
                        <dd>{compactNumber(companyFinance.monthlyIncome)}</dd>
                      </div>
                      <div>
                        <dt>月支出</dt>
                        <dd>{compactNumber(companyFinance.monthlyExpense)}</dd>
                      </div>
                      <div>
                        <dt>净现金流</dt>
                        <dd>{compactNumber(companyFinance.netCashFlow)}</dd>
                      </div>
                      <div>
                        <dt>估值</dt>
                        <dd>{compactNumber(companyFinance.valuation)}</dd>
                      </div>
                      <div>
                        <dt>股权</dt>
                        <dd>{(companyFinance.founderEquityBasisPoints / 100).toFixed(1)}%</dd>
                      </div>
                      <div>
                        <dt>负债率</dt>
                        <dd>{(companyFinance.debtRatioBasisPoints / 100).toFixed(1)}%</dd>
                      </div>
                      <div>
                        <dt>信用</dt>
                        <dd>{companyFinance.creditRating}</dd>
                      </div>
                    </dl>
                    <section className={`finance-risk ${companyFinance.riskStatus === "稳健" ? "stable" : "warning"}`}>
                      <strong>{companyFinance.riskStatus}</strong>
                      {companyFinance.riskTips.map((tip) => (
                        <p key={tip}>{tip}</p>
                      ))}
                    </section>
                    {companyFinance.reportMonth !== undefined && (
                      <section className="finance-report" aria-label="月度经营报告">
                        <strong>第 {companyFinance.reportMonth} 月经营报告</strong>
                        <dl>
                          <div>
                            <dt>收入</dt>
                            <dd>{compactNumber(companyFinance.income ?? companyFinance.monthlyIncome)}</dd>
                          </div>
                          <div>
                            <dt>支出</dt>
                            <dd>{compactNumber(companyFinance.expense ?? companyFinance.monthlyExpense)}</dd>
                          </div>
                          <div>
                            <dt>净现金流</dt>
                            <dd>{compactNumber(companyFinance.netCashFlow)}</dd>
                          </div>
                          <div>
                            <dt>期末现金</dt>
                            <dd>{compactNumber(companyFinance.endingCash ?? companyFinance.cash)}</dd>
                          </div>
                        </dl>
                      </section>
                    )}
                    {financeError && <p className="task-error">{financeError}</p>}
                    <button className="modal-action" type="button" onClick={() => void settleFinanceMonth()}>
                      生成第 {companyFinance.financeMonth} 月经营报告
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <p>{financeError || "财务数据读取中，请稍候。"}</p>
                    </div>
                    <button
                      className="modal-action"
                      type="button"
                      onClick={() => account && selectedServer && void loadCompanyFinance(account.token, selectedServer.id)}
                    >
                      刷新财务
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          {selectedPanel && activePanel !== "财务" && (
            <section className="home-modal" aria-label={selectedPanel.title}>
              <button className="modal-backdrop" type="button" aria-label="关闭面板" onClick={() => setActivePanel(null)} />
              <div className="modal-sheet">
                <header>
                  <strong>{selectedPanel.title}</strong>
                  <button type="button" aria-label="关闭" onClick={() => setActivePanel(null)}>×</button>
                </header>
                <div>
                  {selectedPanel.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <button
                  className="modal-action"
                  type="button"
                  onClick={activePanel === "设置" ? leaveGame : () => setActivePanel(null)}
                >
                  {selectedPanel.action}
                </button>
              </div>
            </section>
          )}
        </section>
      </main>
    );
  }

  if (step === "auth") {
    return (
      <main className="auth-screen" aria-label="玩家登录">
        <section className="auth-canvas" aria-label="游戏入口">
          <img alt="" className="design-image" src="/game-ui/zhucegai2.png" />
          <div className="auth-title" aria-hidden="true">
            <span>写字楼</span>
            <strong>创业记</strong>
            <em>从一间办公室到商业帝国</em>
          </div>

          <div className="server-ribbon" aria-label="当前区服">
            <span className="server-label">{selectedServer?.name ?? "S1 创业中心"}</span>
            <button
              aria-expanded={isServerPickerOpen}
              aria-label="换服"
              onClick={() => setIsServerPickerOpen(true)}
              type="button"
            />
          </div>

          <form className="auth-panel" onSubmit={submitAuth}>
            <label className="game-input-row">
              <span className="sr-only">账号</span>
              <input
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder=""
                value={username}
              />
            </label>
            <label className="game-input-row">
              <span className="sr-only">密码</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder=""
                type="text"
                value={password}
              />
            </label>
            <label className="auth-remember">
              <input
                checked={rememberPassword}
                onChange={(event) => setRememberPassword(event.target.checked)}
                type="checkbox"
              />
              <span>记住密码</span>
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="auth-actions">
              <button aria-label={isBusy && authMode === "login" ? "正在登录" : "登录进入游戏"} className="gold-button" disabled={isBusy} type="submit" />
            </div>
          </form>
          {isServerPickerOpen && (
            <section className="server-picker" aria-label="选择区服">
              <button
                className="server-picker-backdrop"
                type="button"
                aria-label="关闭区服列表"
                onClick={() => setIsServerPickerOpen(false)}
              />
              <div className="server-list-card">
                <div className="server-list-header">
                  <div>
                    <span className="server-list-icon layers" aria-hidden="true" />
                    <h2>选择区服</h2>
                  </div>
                  <button
                    className="server-list-close"
                    type="button"
                    aria-label="关闭区服列表"
                    onClick={() => setIsServerPickerOpen(false)}
                  >
                    <span aria-hidden="true" />
                  </button>
                </div>

                <div className="server-list-body">
                  <div className="server-category-nav" aria-label="区服分类">
                    <button
                      className={activeServerCategory === "recent" ? "cat-tab active" : "cat-tab"}
                      type="button"
                      onClick={() => setActiveServerCategory("recent")}
                    >
                      <span className="server-list-icon clock" aria-hidden="true" />
                      <span>最近登录</span>
                    </button>
                    <button
                      className={activeServerCategory === "all" ? "cat-tab active" : "cat-tab"}
                      type="button"
                      onClick={() => setActiveServerCategory("all")}
                    >
                      <span className="server-list-icon server" aria-hidden="true" />
                      <span>全部区服</span>
                    </button>
                  </div>

                  <div className="server-list-scroll">
                    {serverPickerServers.map((server, index) => {
                      const statusClass = serverStatusClass(server);
                      return (
                        <button
                          className={server.id === serverId ? "server-item selected" : "server-item"}
                          key={server.id}
                          style={{ animationDelay: `${0.04 + index * 0.06}s` }}
                          type="button"
                          onClick={() => {
                            setServerId(server.id);
                          }}
                        >
                          <span className="server-item-main">
                            <span className="server-list-id">{server.id.toUpperCase()}</span>
                            <span className="server-list-name">{server.name}</span>
                            {server.isRecommended && <span className="server-recommend-tag">推荐</span>}
                          </span>
                          <span className={`server-list-status ${statusClass}`}>
                            <i className="status-dot" />
                            {serverStatusText(server)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="server-list-footer">
                  <div>
                    <i aria-hidden="true" />
                    <span>
                      <em>当前选择</em>
                      <strong>{selectedServer ? `${selectedServer.id.toUpperCase()}区 · ${selectedServer.name}` : "未选择"}</strong>
                    </span>
                  </div>
                  <span>v1.0.42</span>
                </div>
              </div>
            </section>
          )}
        </section>
      </main>
    );
  }

  if (step === "profile") {
    return (
      <main className="founder-screen" aria-label="选择角色与命名">
        <section className="founder-canvas" aria-label="创建创始人档案">
          <img alt="" className="design-image" src="/game-ui/xuanjiao.png" />
          <div className="founder-title" aria-hidden="true">
            <span>写字楼</span>
            <strong>创业记</strong>
            <em>从一间办公室到商业帝国</em>
          </div>

          <section className="founder-cards" aria-label="选择创业者类型">
            {avatars.map((avatar) => (
              <button
                aria-pressed={avatar.id === avatarId}
                className={`founder-card ${avatarClassById[avatar.id] ?? "strategy"} ${
                  avatar.id === avatarId ? "selected" : ""
                }`}
                key={avatar.id}
                onClick={() => setAvatarId(avatar.id)}
                type="button"
              >
                <span className="founder-medal">{avatar.glyph}</span>
                <strong>{avatar.name.replace("创始人", "")}</strong>
                <small>{avatar.specialty}</small>
              </button>
            ))}
          </section>

          <form className="founder-panel" onSubmit={(event) => void submitProfile(event)}>
            <label className="game-input-row">
              <span className="sr-only">创始人姓名</span>
              <input
                autoComplete="name"
                onChange={(event) => setFounderName(event.target.value)}
                placeholder=""
                value={founderName}
              />
            </label>
            <label className="game-input-row">
              <span className="sr-only">公司名称</span>
              <input
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder=""
                value={companyName}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button aria-label={isBusy ? "创建中" : "创建档案"} className="gold-button" disabled={isBusy} type="submit" />
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-panel" aria-label="进入游戏">
        <div className="panel-heading">
          <h1>写字楼创业记</h1>
          <p>选择区服，创建你的创始人和公司档案。</p>
        </div>

        <ol className="step-list" aria-label="引导步骤">
          {["账号", "服务器", "头像", "档案"].map((label, index) => (
            <li className={index <= ["auth", "server", "avatar", "profile"].indexOf(step) ? "active" : ""} key={label}>
              {label}
            </li>
          ))}
        </ol>

        {error && <p className="form-error">{error}</p>}

        {step === "server" && (
          <section className="choice-list" aria-label="选择服务器">
            {servers.map((server) => (
              <button
                className={server.id === serverId ? "choice selected" : "choice"}
                key={server.id}
                onClick={() => setServerId(server.id)}
                type="button"
              >
                <span>{server.name}</span>
                <small>{server.label}</small>
              </button>
            ))}
            <div className="flow-actions">
              <button type="button" onClick={() => setStep("auth")}>
                返回
              </button>
              <button className="primary-button" disabled={isBusy} type="button" onClick={() => void continueFromServer()}>
                {isBusy ? "读取中" : "进入区服"}
              </button>
            </div>
          </section>
        )}

        {step === "avatar" && (
          <section className="avatar-grid" aria-label="选择头像">
            {avatars.map((avatar) => (
              <button
                className={avatar.id === avatarId ? "avatar-choice selected" : "avatar-choice"}
                key={avatar.id}
                onClick={() => setAvatarId(avatar.id)}
                type="button"
              >
                <span>{avatar.glyph}</span>
                <strong>{avatar.name}</strong>
                <small>{avatar.specialty}</small>
              </button>
            ))}
            <div className="flow-actions wide">
              <button type="button" onClick={() => setStep("server")}>
                返回
              </button>
              <button className="primary-button" type="button" onClick={() => setStep("profile")}>
                填写档案
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
