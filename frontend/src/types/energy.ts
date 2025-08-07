export interface EnergyUsageRecord {
  date: string;
  usage: number;
}

export interface EnergyMetrics {
  totalUsage: number;
  averageUsage: number;
  peakUsage: number;
  lowestUsage: number;
  totalDays: number;
}