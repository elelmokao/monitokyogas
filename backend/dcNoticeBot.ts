import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import dayjs from "dayjs";
import { BackendConfig, loadConfig, requireDiscordConfig } from "./config";
import {
  buildRawCsvUrl,
  calculateBudgetSummary,
  getCsvFileNameForUsageDate,
  getUsageDateForReportDate,
} from "./energyRules";

function getCsvUrl(reportDate: string, config: BackendConfig): string {
  const usageDate = getUsageDateForReportDate(reportDate);
  const fileName = getCsvFileNameForUsageDate(
    usageDate,
    config.billingCycleStartDay,
  );

  return buildRawCsvUrl({
    githubRepository: config.githubRepository!,
    dataBranch: config.dataBranch,
    fileName,
  });
}

// 計算本月累積用電量
async function calculateUsage(
  config: BackendConfig,
  reportDate = dayjs().format("YYYY-MM-DD"),
): Promise<{ yesterdayUsage: number; total: number, count: number }> {
  const csvUrl = getCsvUrl(reportDate, config);
  const response = await fetch(csvUrl);
  const csvContent = await response.text();
  console.log(`Fetching energy data from ${csvUrl}`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch CSV: ${response.status} ${response.statusText}`,
    );
  }

  if (!csvContent.trim()) {
    console.warn(`CSV file from ${csvUrl} is empty`);
    return { yesterdayUsage: -999, total: -999, count: 0 };
  }

  // Parse CSV content and sum usage
  let total = 0;
  let yesterdayUsage = 0;
  let count = 0;
  const lines = csvContent.split("\n").filter(line => line.trim());
  if (lines.length < 2) {
    // No data rows
    return { yesterdayUsage: 0, total: 0, count: 0 };
  }
  // Assume first line is header
  const header = lines[0].split(",");
  const usageIdx = header.findIndex(h => h.toLowerCase().includes("usage"));
  if (usageIdx === -1) {
    throw new Error("No usage column found in CSV header");
  }
  for (let i = 1; i < lines.length; i++) {
    count++;
    const row = lines[i].split(",");
    const usage = parseFloat(row[usageIdx]);
    if (!isNaN(usage)) {
      total += usage;
      if (i === lines.length - 1) {
        yesterdayUsage = usage;
      }
    }
  }
  return { yesterdayUsage, total, count };
}

async function main() {
  const config = requireDiscordConfig(loadConfig());
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}`);

    try {
      const reportDate = dayjs().format("YYYY-MM-DD");
      const usageResult = await calculateUsage(config, reportDate);
      const { yesterdayUsage, total: totalUsage, count } = usageResult;
      const budgetSummary = calculateBudgetSummary({
        recordedDays: count,
        totalUsageKwh: totalUsage,
        monthlyUsageLimitKwh: config.monthlyUsageLimitKwh,
        dailyBudgetKwh: config.dailyBudgetKwh,
      });

      const message = `⚡️**Tokyo Gas Report @ ${reportDate}**\n* 昨日用電量：**${yesterdayUsage.toFixed(1)} kWh**\n* 本月已用電量：**${totalUsage.toFixed(1)} kWh**\n* 剩餘可用電量：**${budgetSummary.monthlyRemainingKwh.toFixed(1)} kWh** / (${config.monthlyUsageLimitKwh} kWh)\n* 預算用電量：**${budgetSummary.budgetRemainingKwh.toFixed(1)} kWh**\n`;
      const channel = (await client.channels.fetch(
        config.discordChannelId!,
      )) as TextChannel;
      await channel.send(message);

      console.log("Report sent to Discord.");
    } catch (err) {
      const channel = (await client.channels.fetch(
        config.discordChannelId!,
      )) as TextChannel;
      await channel.send(
        `⚡️**Tokyo Gas Report @ ${dayjs().format("YYYY-MM-DD")}**\nFailed to calculate usage. Please check the logs.`,
      );
      console.error("Failed to calculate usage:", err);
      process.exitCode = 1;
    } finally {
      client.destroy();
    }
  });

  await client.login(config.discordToken!);
}

main().catch(err => {
  console.error("Failed to start Discord notifier:", err);
  process.exitCode = 1;
});
