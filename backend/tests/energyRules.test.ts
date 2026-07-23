import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRawCsvUrl,
  calculateBudgetSummary,
  getCsvFileNameForUsageDate,
  getUsageDateForReportDate,
} from "../energyRules";

test("CSV file name stays in current billing file before the start day", () => {
  assert.equal(
    getCsvFileNameForUsageDate("2026-07-23", 24),
    "electricity_2026-07.csv",
  );
});

test("CSV file name advances after the billing start day", () => {
  assert.equal(
    getCsvFileNameForUsageDate("2026-07-24", 24),
    "electricity_2026-08.csv",
  );
});

test("CSV file name advances across year boundary", () => {
  assert.equal(
    getCsvFileNameForUsageDate("2026-12-24", 24),
    "electricity_2027-01.csv",
  );
});

test("report date maps to yesterday usage date", () => {
  assert.equal(getUsageDateForReportDate("2026-07-06"), "2026-07-05");
});

test("budget summary uses monthly limit and daily budget", () => {
  assert.deepEqual(
    calculateBudgetSummary({
      recordedDays: 20,
      totalUsageKwh: 72.5,
      monthlyUsageLimitKwh: 120,
      dailyBudgetKwh: 4,
    }),
    {
      monthlyRemainingKwh: 47.5,
      budgetRemainingKwh: 7.5,
    },
  );
});

test("raw CSV URL uses owner repo branch and file name", () => {
  assert.equal(
    buildRawCsvUrl({
      githubRepository: "owner/energy-monitor",
      dataBranch: "data",
      fileName: "electricity_2026-08.csv",
    }),
    "https://raw.githubusercontent.com/owner/energy-monitor/data/backend/csv_store/electricity_2026-08.csv",
  );
});
