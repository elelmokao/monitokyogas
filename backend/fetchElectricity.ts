import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { createObjectCsvWriter } from "csv-writer";
import dayjs from "dayjs";
import dotenv from 'dotenv';
import { loginAndGetCookie } from "./loginAndGetCookie";
const cookieFilePath = path.join(__dirname, "cookie_store", "cookie.txt");


dotenv.config();

// Output CSV path
const csvFilePath = path.join("./csv_store/", "electricity.csv");

interface UsageData {
  date: string;
  usage: number;
  contract_number?: string;
}

async function fetchElectricityUsage(cookie: string): Promise<UsageData[]> {
  const fromDate = dayjs().subtract(14, "day").format("YYYY-MM-DD");
  const response = await axios.post(
    "https://members.tokyo-gas.co.jp/graphql",
    {
      operationName: "DailyElectricityUsage",
      variables: {
        contractIndexNumber: 1,
        electricityContractNumber: process.env.CONTRACT_NUMBER,
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
  console.log(cookie);
  console.log("Response status:", response.status);
  console.log("Fetched electricity usage data:", response.data);
  console.log("Data length:", response.data.data.dailyElectricityUsage);
  return response.data.data.dailyElectricityUsage.map((entry: any) => ({
    date: entry.date.slice(0, 10),
    usage: entry.usage,
    contract_number: process.env.CONTRACT_NUMBER,
  }));
}


// Check if the CSV already contains the specified date
function readExistingDates(): Set<string> {
  if (!fs.existsSync(csvFilePath)) return new Set();
  const content = fs.readFileSync(csvFilePath, "utf-8");
  const lines = content.trim().split("\n");
  return new Set(lines.slice(1).map((line) => line.split(",")[0]));
}

async function appendToCSV(data: UsageData[]) {
  const existingDates = readExistingDates();

  // Ensure CSV file has header if it doesn't exist
  if (!fs.existsSync(csvFilePath)) {
    fs.writeFileSync(csvFilePath, 'Date,Usage (kWh)\n', 'utf-8');
  }

  // Add one day to each date
  const newData = data
    .slice()
    .reverse()
    .map((d) => ({
      ...d,
      date: dayjs(d.date).add(1, "day").format("YYYY-MM-DD"),
    }))
    .filter((d) => !existingDates.has(d.date) && d.usage != null);

  if (newData.length === 0) {
    console.log("No new data to append");
    return;
  }

  // If the file does not exist, create it with the header
  if (!fs.existsSync(csvFilePath)) {
    fs.writeFileSync(csvFilePath, 'Date,Usage (kWh)\n', 'utf-8');
  }

  const writer = createObjectCsvWriter({
    path: csvFilePath,
    header: [
      { id: "date", title: "Date" },
      { id: "usage", title: "Usage (kWh)" },
    ],
    append: true,
  });

  await writer.writeRecords(newData);
  console.log(`Appended ${newData.length} records to CSV`);
}

async function main() {
  try {
    let cookie: string | undefined;
    // 1. Try to read cookie from cookie_store/cookie.txt
    if (fs.existsSync(cookieFilePath)) {
      cookie = fs.readFileSync(cookieFilePath, "utf-8");
      try {
        // Try to fetch data with existing cookie
        const usageData = await fetchElectricityUsage(cookie);
        await appendToCSV(usageData);
        console.log("Completed using existing cookie");
        return;
      } catch (err) {
        console.warn("Existing cookie is invalid, re-logging in...");
      }
    }
    // 2. If no cookie or invalid, re-login
    cookie = await loginAndGetCookie();
    fs.writeFileSync(cookieFilePath, cookie, "utf-8");
    const usageData = await fetchElectricityUsage(cookie);
    await appendToCSV(usageData);
  } catch (err) {
    console.error("Failed:", err);
  }
}

main();

