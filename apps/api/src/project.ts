export type ProjectSuccessInput = {
  baseRate: number;
  employeeManagement?: number;
  employeeNegotiation?: number;
  employeeExecution?: number;
};

export const calculateProjectSuccessRate = (input: ProjectSuccessInput): number => {
  const employeeAverage =
    input.employeeManagement === undefined ||
    input.employeeNegotiation === undefined ||
    input.employeeExecution === undefined
      ? 0
      : Math.floor((input.employeeManagement + input.employeeNegotiation + input.employeeExecution) / 30);

  return Math.max(5, Math.min(95, input.baseRate + employeeAverage));
};

export const calculateProjectProgressGain = (employeeExecution?: number): number => {
  if (employeeExecution === undefined) {
    return 24;
  }

  return Math.max(24, Math.min(42, 20 + Math.floor(employeeExecution / 4)));
};
