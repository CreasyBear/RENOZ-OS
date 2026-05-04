interface CalculateWarrantyCoverageProgressInput {
  registrationDate: string;
  expiryDate: string;
  now: number;
}

export function calculateWarrantyCoverageProgress({
  registrationDate,
  expiryDate,
  now,
}: CalculateWarrantyCoverageProgressInput): number {
  const start = new Date(registrationDate).getTime();
  const end = new Date(expiryDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  const progress = ((now - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
}
