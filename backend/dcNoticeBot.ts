import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import dotenv from "dotenv";
import dayjs from "dayjs";

// ⚡ 環境變數
dotenv.config();
const DISCORD_TOKEN = process.env.DC_TOKEN!;
const DISCORD_CHANNEL_ID = process.env.DC_CHANNEL_ID!; // 你要發送的頻道
const LIMIT = 120; // 每月電量限制 kWh
const GITHUB_USERNAME = process.env.GITHUB_ACTOR || "unknown";

function getCsvUrl(dateStr: string): string {
  // Determine the correct CSV file based on the date
  // If the day is <= 23, use the previous month's file
  // Otherwise, use the current month's file
  const date = dayjs(dateStr);
  if (date.date() <= 24) {
    return `https://raw.githubusercontent.com/${GITHUB_USERNAME}/monitokyogas/data/backend/csv_store/electricity_${date.subtract(1, 'month').format('YYYY-MM')}.csv`;
  }
  return `https://raw.githubusercontent.com/${GITHUB_USERNAME}/monitokyogas/data/backend/csv_store/electricity_${date.format('YYYY-MM')}.csv`;
}

// 計算本月累積用電量
async function calculateUsage(): Promise<{ yesterdayUsage: number; total: number, count: number }> {
    const csvUrl = getCsvUrl(dayjs().format('YYYY-MM-DD'));
    const response = await fetch(csvUrl);
    const csvContent = await response.text();
    console.log(`Fetching energy data from ${csvUrl}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }

    if (!csvContent.trim()) {
        console.warn(`CSV file from ${csvUrl} is empty`);
        return { yesterdayUsage: -999, total: -999, count: 0 };
    }

    // Parse CSV content and sum usage
    let total = 0;
    let yesterdayUsage = 0;
    let count = 0;
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        // No data rows
        return { yesterdayUsage: 0, total: 0, count: 0 };
    }
    // Assume first line is header
    const header = lines[0].split(',');
    const usageIdx = header.findIndex(h => h.toLowerCase().includes('usage'));
    if (usageIdx === -1) {
        throw new Error('No usage column found in CSV header');
    }
    for (let i = 1; i < lines.length; i++) {
        count++;
        const row = lines[i].split(',');
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
  if (!DISCORD_TOKEN || !DISCORD_CHANNEL_ID || GITHUB_USERNAME === "unknown") {
    console.error("Missing DISCORD_TOKEN or DISCORD_CHANNEL_ID in environment variables.");
    return;
  }
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}`);

    try {
      const usageResult = await calculateUsage();
      const { yesterdayUsage, total: totalUsage, count } = usageResult;
      const remaining = LIMIT - totalUsage;
      const budget = Math.min(4 * count, 120) - totalUsage;

      const message = `⚡️**Tokyo Gas Report @ ${dayjs().format('YYYY-MM-DD')}**\n* 昨日用電量：**${yesterdayUsage.toFixed(1)} kWh**\n* 本月已用電量：**${totalUsage.toFixed(1)} kWh**\n* 剩餘可用電量：**${remaining.toFixed(1)} kWh** / (${LIMIT} kWh)\n* 預算用電量：**${budget.toFixed(1)} kWh**\n`;
      const channel = (await client.channels.fetch(
        DISCORD_CHANNEL_ID
      )) as TextChannel;
      await channel.send(message);

      console.log("Report sent to Discord.");
    } catch (err) {
      const channel = (await client.channels.fetch(
        DISCORD_CHANNEL_ID
      )) as TextChannel;
      await channel.send(`⚡️**Tokyo Gas Report @ ${dayjs().format('YYYY-MM-DD')}**\nFailed to calculate usage. Please check the logs.`);
      console.error("Failed to calculate usage:", err);
    } finally {
      client.destroy();
    }
  });

  client.login(DISCORD_TOKEN);
}

main();