import { EnergyUsageRecord, EnergyMetrics } from '../types/energy';
import dayjs from 'dayjs';


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

// Utility function to sort records by date
function sortRecordsByDate(records: EnergyUsageRecord[]): EnergyUsageRecord[] {
  return records.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Parse CSV content from GitHub
export const parseCSV = (csvContent: string): EnergyUsageRecord[] => {
  try {
    const lines = csvContent.trim().split('\n');
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
      
      const values = line.split(',').map(v => v.trim());
      if (values.length < 2) continue; // Skip incomplete rows
      
      const dateStr = values[0].replace(/"/g, ''); // Remove quotes if present
      const usageStr = values[1].replace(/"/g, '');
      
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
        usage: Math.round(usage * 100) / 100
      });
    }
    
    // Sort by date using utility
    const sortedRecords = sortRecordsByDate(records);
    return sortedRecords;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw error;
  }
};

export const fetchEnergyDataFromGitHub = async (
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs
): Promise<EnergyUsageRecord[]> => {
  const allData: EnergyUsageRecord[] = [];
  const csvUrls: Set<string> = new Set();
  for (let date = endDate; date.isAfter(startDate) || date.isSame(startDate); date = date.subtract(1, 'month')) {
    const url = getCsvUrl(date.format('YYYY-MM-DD'));
      csvUrls.add(url);
  }
  csvUrls.add(getCsvUrl(startDate.format('YYYY-MM-DD')));
    

  for (const url of csvUrls) {
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
      
      let data: EnergyUsageRecord[] = parseCSV(csvContent);
      allData.push(...data);
    } catch (error) {
      console.log(`Error fetching energy data from ${url}:`, error);
    }
  }
  for (
    let currentDate = startDate;
    currentDate.isSame(endDate) || currentDate.isBefore(endDate);
    currentDate = currentDate.add(1, 'day')
  ) {
    const dateStr = currentDate.format('YYYY-MM-DD');
    if (!allData.find(d => d.date === dateStr)) {
      allData.push({ date: dateStr, usage: 0 });
      console.log(`Added missing date ${dateStr} with 0 usage`);
    }
  }
  allData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return allData;
}

function getCsvUrl(dateStr: string): string {
  // Determine the correct CSV file based on the date
  // If the day is <= 23, use the previous month's file
  // Otherwise, use the current month's file
  const date = dayjs(dateStr);
  if (date.date() <= 23) {
    return `https://raw.githubusercontent.com/elelmokao/monitokyogas/data/backend/csv_store/electricity_${date.subtract(1, 'month').format('YYYY-MM')}.csv`;
  } 
  return `https://raw.githubusercontent.com/elelmokao/monitokyogas/data/backend/csv_store/electricity_${date.format('YYYY-MM')}.csv`;
}