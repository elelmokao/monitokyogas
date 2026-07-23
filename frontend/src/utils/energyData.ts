import { EnergyUsageRecord, EnergyMetrics, EnergyDataResponse } from '../types/energy';
import dayjs from 'dayjs';
import { getAppConfig } from './appConfig';

export const calculateMetrics = (data: EnergyUsageRecord[]): EnergyMetrics => {
  if (data.length === 0) {
    return {
      totalUsage: 0,
      averageUsage: 0,
      peakUsage: 0,
      lowestUsage: 0,
      totalDays: 0
    };
  }

  const usageValues = data.map(record => record.usage);
  const totalUsage = usageValues.reduce((sum, usage) => sum + usage, 0);
  
  return {
    totalUsage: Math.round(totalUsage * 100) / 100,
    averageUsage: Math.round((totalUsage / data.length) * 100) / 100,
    peakUsage: Math.max(...usageValues),
    lowestUsage: Math.min(...usageValues),
    totalDays: data.length
  };
};

function sortRecordsByDate(records: EnergyUsageRecord[]): EnergyUsageRecord[] {
  return records.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export const parseCSV = (csvContent: string, sourceFile?: string): EnergyUsageRecord[] => {
  try {
    const lines = csvContent.trim().split(/\r?\n/);
    if (lines.length <= 1) {
      throw new Error('CSV file is empty or contains only headers');
    }
    
    const header = lines[0].toLowerCase();
    
    // Validate headers
    if (!header.includes('date') || !header.includes('usage')) {
      throw new Error('CSV must contain "Date" and "Usage (kWh)" columns');
    }
    
    const records: EnergyUsageRecord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = parseCsvLine(line);
      if (values.length < 2) continue; // Skip incomplete rows
      
      const dateStr = values[0];
      const usageStr = values[1];
      
      // Parse date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date format: ${dateStr}`);
        continue;
      }
      
      // Parse usage
      const usage = parseFloat(usageStr);
      if (isNaN(usage) || usage < 0) {
        console.warn(`Invalid usage value: ${usageStr}`);
        continue;
      }
      
      records.push({
        date: date.toISOString().split('T')[0],
        usage: Math.round(usage * 100) / 100,
        sourceFile,
      });
    }
    
    const sortedRecords = sortRecordsByDate(records);
    return sortedRecords;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw error;
  }
};

function getRawCsvBaseUrl(): string {
  const config = getAppConfig();
  if (!config.githubOwner || !config.githubRepo) {
    throw new Error('Missing VITE_GITHUB_OWNER or VITE_GITHUB_REPO');
  }

  return `https://raw.githubusercontent.com/${config.githubOwner}/${config.githubRepo}/${config.dataBranch}/backend/csv_store`;
}

export function getCsvFileNameForDate(dateStr: string): string {
  const config = getAppConfig();
  const date = dayjs(dateStr);
  const fileMonth = date.date() >= config.billingCycleStartDay ? date.add(1, 'month') : date;
  return `electricity_${fileMonth.format('YYYY-MM')}.csv`;
}

export function buildRawCsvUrl(fileName: string): string {
  return `${getRawCsvBaseUrl()}/${fileName}`;
}

function getExpectedDates(startDate: dayjs.Dayjs, endDate: dayjs.Dayjs): string[] {
  const dates: string[] = [];

  for (
    let currentDate = startDate.startOf('day');
    currentDate.isSame(endDate, 'day') || currentDate.isBefore(endDate, 'day');
    currentDate = currentDate.add(1, 'day')
  ) {
    dates.push(currentDate.format('YYYY-MM-DD'));
  }

  return dates;
}

export const fetchEnergyDataFromGitHub = async (
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs
): Promise<EnergyDataResponse> => {
  const allData: EnergyUsageRecord[] = [];
  const expectedDates = getExpectedDates(startDate, endDate);
  const csvFiles = new Set(expectedDates.map(getCsvFileNameForDate));
  const attemptedFiles = Array.from(csvFiles).sort();
  const loadedFiles: string[] = [];

  for (const fileName of attemptedFiles) {
    const url = buildRawCsvUrl(fileName);
    console.log(`Fetching energy data from ${url}`);
    try {
      const response: Response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
      }
      
      const csvContent: string = await response.text();
      if (!csvContent.trim()) {
        console.warn(`CSV file from ${url} is empty`);
        continue;
      }
      
      let data: EnergyUsageRecord[] = parseCSV(csvContent, fileName);
      allData.push(...data);
      loadedFiles.push(fileName);
    } catch (error) {
      console.log(`Error fetching energy data from ${url}:`, error);
    }
  }

  const dedupedByDate = new Map<string, EnergyUsageRecord>();
  for (const record of allData) {
    if (
      dayjs(record.date).isBefore(startDate, 'day') ||
      dayjs(record.date).isAfter(endDate, 'day')
    ) {
      continue;
    }

    dedupedByDate.set(record.date, record);
  }

  const records = sortRecordsByDate(Array.from(dedupedByDate.values()));
  const loadedDates = new Set(records.map(record => record.date));
  const missingDates = expectedDates.filter(date => !loadedDates.has(date));

  return {
    records,
    expectedDates,
    attemptedFiles,
    loadedFiles,
    missingDates,
  };
}
