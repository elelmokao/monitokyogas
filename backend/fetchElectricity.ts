import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { createObjectCsvWriter } from "csv-writer";
import dayjs from "dayjs";
import { BackendConfig, loadConfig, requireTokyoGasConfig } from "./config";
import { getCsvFilePathForUsageDate } from "./energyRules";
import { loginAndGetCookie } from "./loginAndGetCookie";

interface UsageData {
  date: string;
  usage: number;
  contract_number?: string;
}

async function fetchElectricityUsage(
  cookie: string,
  config: BackendConfig,
): Promise<UsageData[]> {
  const fromDate = dayjs().subtract(14, "day").format("YYYY-MM-DD");
  const response = await axios.post(
    "https://members.tokyo-gas.co.jp/graphql",
    {
      operationName: "DailyElectricityUsage",
      variables: {
        contractIndexNumber: 1,
        electricityContractNumber: config.contractNumber,
        fromDate: fromDate,
        toDate: null,
      },
      query: `
        query DailyElectricityUsage(
          $contractIndexNumber: Int!
          $electricityContractNumber: String!
          $fromDate: String!
          $toDate: String
        ) {
          dailyElectricityUsage(
            contractIndexNumber: $contractIndexNumber
            electricityContractNumber: $electricityContractNumber
            fromDate: $fromDate
            toDate: $toDate
          ) {
            averageUsageForSameContract
            date
            usage
            __typename
          }
        }
      `,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Origin: "https://members.tokyo-gas.co.jp",
        Referer: "https://members.tokyo-gas.co.jp/usage?tab=electricity",
        Cookie: cookie,
        "User-Agent": "Mozilla/5.0",
      },
    }
  );
  console.log("Response status:", response.status);
  return response.data.data.dailyElectricityUsage.map((entry: any) => ({
    date: entry.date.slice(0, 10),
    usage: entry.usage,
    contract_number: config.contractNumber,
  }));
}

async function appendToCSV(data: UsageData[], config: BackendConfig) {
  // 依照分組分檔案
  // 先將資料依區間分組
  const groups: { [filePath: string]: UsageData[] } = {};
  for (const d of data) {
    const dateStr = dayjs(d.date).add(1, "day").format("YYYY-MM-DD");
    const filePath = getCsvFilePathForUsageDate(
      dateStr,
      config.csvStoreDir,
      config.billingCycleStartDay,
    );
    console.log(`Date ${dateStr} goes to file ${filePath}`);
    if (!groups[filePath]) groups[filePath] = [];
    groups[filePath].push({ ...d, date: dateStr });
  }

  for (const [filePath, groupData] of Object.entries(groups)) {
    // 檢查已存在的日期
    const existingDates = (() => {
      if (!fs.existsSync(filePath)) return new Set();
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.trim().split("\n");
      return new Set(lines.slice(1).map((line) => line.split(",")[0]));
    })();
    const newData = groupData.filter((d) => !existingDates.has(d.date) && d.usage != null).reverse();
    if (newData.length === 0) {
      console.log(`No new data to append for ${filePath}`);
      continue;
    }
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, 'Date,Usage (kWh)\n', 'utf-8');
    }
    const writer = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "date", title: "Date" },
        { id: "usage", title: "Usage (kWh)" },
      ],
      append: true,
    });
    await writer.writeRecords(newData);
    console.log(`Appended ${newData.length} records to ${filePath}`);
  }
}

async function main() {
  try {
    const config = requireTokyoGasConfig(loadConfig());
    let cookie: string | undefined;
    // 1. Try to read cookie from cookie_store/cookie.txt
    if (fs.existsSync(config.cookieFilePath)) {
      cookie = fs.readFileSync(config.cookieFilePath, "utf-8");
      try {
        // Try to fetch data with existing cookie
        const usageData = await fetchElectricityUsage(cookie, config);
        await appendToCSV(usageData, config);
        console.log("Completed using existing cookie");
        return;
      } catch (err) {
        console.warn("Existing cookie is invalid, re-logging in...");
      }
    }
    // 2. If no cookie or invalid, re-login
    cookie = await loginAndGetCookie(config);
    fs.mkdirSync(path.dirname(config.cookieFilePath), { recursive: true });
    fs.writeFileSync(config.cookieFilePath, cookie, "utf-8");
    const usageData = await fetchElectricityUsage(cookie, config);
    await appendToCSV(usageData, config);
  } catch (err) {
    console.error("Failed:", err);
    process.exitCode = 1;
  }
}

main();
