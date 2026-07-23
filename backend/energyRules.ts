import dayjs from "dayjs";
import path from "path";
import { parseGithubRepository } from "./config";

export interface BudgetSummary {
  monthlyRemainingKwh: number;
  budgetRemainingKwh: number;
}

export function getUsageDateForReportDate(reportDate: string | dayjs.Dayjs): string {
  return dayjs(reportDate).subtract(1, "day").format("YYYY-MM-DD");
}

export function getCsvFileNameForUsageDate(
  usageDate: string | dayjs.Dayjs,
  billingCycleStartDay: number,
): string {
  const date = dayjs(usageDate);
  const fileMonth =
    date.date() >= billingCycleStartDay ? date.add(1, "month") : date;

  return `electricity_${fileMonth.format("YYYY-MM")}.csv`;
}

export function getCsvFilePathForUsageDate(
  usageDate: string | dayjs.Dayjs,
  csvStoreDir: string,
  billingCycleStartDay: number,
): string {
  return path.join(
    csvStoreDir,
    getCsvFileNameForUsageDate(usageDate, billingCycleStartDay),
  );
}

export function buildRawCsvUrl(params: {
  githubRepository: string;
  dataBranch: string;
  fileName: string;
}): string {
  const repository = parseGithubRepository(params.githubRepository);
  if (!repository) {
    throw new Error("GITHUB_REPOSITORY is required to build a raw CSV URL");
  }

  return `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/${params.dataBranch}/backend/csv_store/${params.fileName}`;
}

export function calculateBudgetSummary(params: {
  recordedDays: number;
  totalUsageKwh: number;
  monthlyUsageLimitKwh: number;
  dailyBudgetKwh: number;
}): BudgetSummary {
  const monthlyRemainingKwh =
    params.monthlyUsageLimitKwh - params.totalUsageKwh;
  const budgetLimitForRecordedDays = Math.min(
    params.dailyBudgetKwh * params.recordedDays,
    params.monthlyUsageLimitKwh,
  );

  return {
    monthlyRemainingKwh,
    budgetRemainingKwh: budgetLimitForRecordedDays - params.totalUsageKwh,
  };
}
