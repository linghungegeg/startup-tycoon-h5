export type FinanceInput = {
  cash: number;
  monthlyIncome: number;
  monthlyExpense: number;
  totalDebt: number;
  valuation: number;
};

export type FinanceReport = {
  netCashFlow: number;
  cashAfterSettlement: number;
  debtRatioBasisPoints: number;
  riskStatus: "稳健" | "预警" | "资金紧张";
  riskTips: string[];
};

const clampMoney = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.trunc(value);
};

export const calculateFinanceReport = (input: FinanceInput): FinanceReport => {
  const cash = clampMoney(input.cash);
  const monthlyIncome = clampMoney(input.monthlyIncome);
  const monthlyExpense = clampMoney(input.monthlyExpense);
  const totalDebt = Math.max(0, clampMoney(input.totalDebt));
  const valuation = Math.max(0, clampMoney(input.valuation));
  const netCashFlow = monthlyIncome - monthlyExpense;
  const cashAfterSettlement = cash + netCashFlow;
  const debtRatioBasisPoints = valuation === 0 ? (totalDebt > 0 ? 10000 : 0) : Math.min(Math.round((totalDebt / valuation) * 10000), 10000);
  const riskTips: string[] = [];

  if (netCashFlow < 0) {
    riskTips.push("本月净现金流为负，需要压缩支出或提高回款。");
  }

  if (cashAfterSettlement < 0) {
    riskTips.push("结算后现金为负，进入资金紧张状态。");
  }

  if (debtRatioBasisPoints >= 6000) {
    riskTips.push("负债率偏高，后续贷款和融资条件会变差。");
  }

  if (riskTips.length === 0) {
    riskTips.push("现金流稳定，可以继续推进公司经营。");
  }

  const riskStatus = cashAfterSettlement < 0 ? "资金紧张" : netCashFlow < 0 || debtRatioBasisPoints >= 6000 ? "预警" : "稳健";

  return {
    netCashFlow,
    cashAfterSettlement,
    debtRatioBasisPoints,
    riskStatus,
    riskTips
  };
};
