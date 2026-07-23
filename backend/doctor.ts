import dayjs from "dayjs";
import { BackendConfig, loadConfig, parseGithubRepository } from "./config";
import {
  buildRawCsvUrl,
  getCsvFileNameForUsageDate,
  getUsageDateForReportDate,
} from "./energyRules";

function present(value: string | undefined): string {
  return value ? "present" : "missing";
}

function mask(value: string | undefined): string {
  if (!value) return "missing";
  if (value.length <= 4) return "present";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function checkConfig(config: BackendConfig): string[] {
  const issues: string[] = [];

  if (!config.tokyoGasEmail) issues.push("TOKYOGAS_EMAIL is missing");
  if (!config.tokyoGasPassword) issues.push("TOKYOGAS_PASSWORD is missing");
  if (!config.contractNumber) issues.push("CONTRACT_NUMBER is missing");
  if (!config.discordChannelId) issues.push("DC_CHANNEL_ID is missing");
  if (!config.discordToken) issues.push("DC_TOKEN is missing");
  if (!config.githubRepository) issues.push("GITHUB_REPOSITORY is missing");

  if (config.githubRepository) {
    try {
      parseGithubRepository(config.githubRepository);
    } catch (err) {
      issues.push(err instanceof Error ? err.message : String(err));
    }
  }

  return issues;
}

function printSummary(config: BackendConfig): void {
  const reportDate = dayjs().format("YYYY-MM-DD");
  const usageDate = getUsageDateForReportDate(reportDate);
  const fileName = getCsvFileNameForUsageDate(
    usageDate,
    config.billingCycleStartDay,
  );
  let rawCsvUrl = "unavailable until GITHUB_REPOSITORY is set";
  if (config.githubRepository) {
    try {
      rawCsvUrl = buildRawCsvUrl({
        githubRepository: config.githubRepository,
        dataBranch: config.dataBranch,
        fileName,
      });
    } catch (err) {
      rawCsvUrl = err instanceof Error ? err.message : String(err);
    }
  }

  console.log("MONITOKYOGAS doctor");
  console.log("");
  console.log("Required secrets");
  console.log(`- TOKYOGAS_EMAIL: ${mask(config.tokyoGasEmail)}`);
  console.log(`- TOKYOGAS_PASSWORD: ${present(config.tokyoGasPassword)}`);
  console.log(`- CONTRACT_NUMBER: ${mask(config.contractNumber)}`);
  console.log(`- DC_CHANNEL_ID: ${mask(config.discordChannelId)}`);
  console.log(`- DC_TOKEN: ${present(config.discordToken)}`);
  console.log("");
  console.log("Portable settings");
  console.log(`- GITHUB_REPOSITORY: ${config.githubRepository ?? "missing"}`);
  console.log(`- DATA_BRANCH: ${config.dataBranch}`);
  console.log(`- MONTHLY_USAGE_LIMIT_KWH: ${config.monthlyUsageLimitKwh}`);
  console.log(`- DAILY_BUDGET_KWH: ${config.dailyBudgetKwh}`);
  console.log(`- BILLING_CYCLE_START_DAY: ${config.billingCycleStartDay}`);
  console.log(`- CSV store: ${config.csvStoreDir}`);
  console.log(`- Cookie file: ${config.cookieFilePath}`);
  console.log("");
  console.log("Derived paths");
  console.log(`- Report date: ${reportDate}`);
  console.log(`- Usage date: ${usageDate}`);
  console.log(`- CSV file: ${fileName}`);
  console.log(`- Raw CSV URL: ${rawCsvUrl}`);
}

function main(): void {
  const config = loadConfig();
  const issues = checkConfig(config);

  printSummary(config);

  if (issues.length > 0) {
    console.log("");
    console.log("Issues");
    for (const issue of issues) {
      console.log(`- ${issue}`);
    }
    process.exitCode = 1;
  }
}

main();
