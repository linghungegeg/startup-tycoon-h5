export type RecruitCandidate = {
  recruitWeight: number;
};

export const pickRecruitCandidate = <T extends RecruitCandidate>(pool: T[], roll: number): T | undefined => {
  if (pool.length === 0) {
    return undefined;
  }

  const totalWeight = pool.reduce((total, candidate) => total + Math.max(candidate.recruitWeight, 0), 0);
  if (totalWeight <= 0) {
    return pool[0];
  }

  let cursor = Math.max(0, Math.min(roll, totalWeight - Number.EPSILON));
  for (const candidate of pool) {
    cursor -= Math.max(candidate.recruitWeight, 0);
    if (cursor < 0) {
      return candidate;
    }
  }

  return pool[pool.length - 1];
};
