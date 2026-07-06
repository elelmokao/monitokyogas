export interface EnergyUsageRecord {
  date: string;
  usage: number;
  sourceFile?: string;
}

export interface EnergyMetrics {
  totalUsage: number;
  averageUsage: number;
  peakUsage: number;
  lowestUsage: number;
  totalDays: number;
}

export interface EnergyDataResponse {
  records: EnergyUsageRecord[];
  expectedDates: string[];
  attemptedFiles: string[];
  loadedFiles: string[];
  missingDates: string[];
}

export interface BillingPeriodData extends EnergyDataResponse {
  label: string;
  start: string;
  end: string;
}
