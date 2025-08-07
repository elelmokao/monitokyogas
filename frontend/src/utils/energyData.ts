import { EnergyUsageRecord, EnergyMetrics } from '../types/energy';

// Fake data that matches the CSV format: "Date" and "Usage (kWh)"
const generateMockData = (): EnergyUsageRecord[] => {
  const data: EnergyUsageRecord[] = [];
  const startDate = new Date('2024-01-01');
  
  for (let i = 0; i < 90; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Generate realistic energy usage patterns
    const baseUsage = 25;
    const seasonalVariation = 5 * Math.sin((i / 365) * 2 * Math.PI);
    const dailyVariation = Math.random() * 10 - 5;
    const weekendBoost = date.getDay() === 0 || date.getDay() === 6 ? 3 : 0;
    
    const usage = Math.max(10, baseUsage + seasonalVariation + dailyVariation + weekendBoost);
    
    data.push({
      date: date.toISOString().split('T')[0],
      usage: Math.round(usage * 100) / 100
    });
  }
  
  return data;
};

export const mockEnergyData = generateMockData();

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
    
    // Sort by date
    records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // Remove today's date if it exists
    const today = new Date().toISOString().split('T')[0];
    const filteredRecords = records.filter(record => record.date !== today);

    // Ensure at least 90 days of data
    if (filteredRecords.length < 90) {
      // Find the earliest date in the records, or use today if empty
      const earliestDate = filteredRecords.length > 0
        ? new Date(filteredRecords[0].date)
        : new Date();
      // Add missing days before the earliest date
      for (let i = filteredRecords.length; i < 90; i++) {
        const missingDate = new Date(earliestDate);
        missingDate.setDate(earliestDate.getDate() - (90 - i));
        filteredRecords.unshift({
          date: missingDate.toISOString().split('T')[0],
          usage: 0
        });
      }
    }

    return filteredRecords;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw error;
  }
};

// Fetch CSV from GitHub raw URL
export const fetchEnergyDataFromGitHub = async (): Promise<EnergyUsageRecord[]> => {
  const githubRawUrl = 'https://raw.githubusercontent.com/elelmokao/monitokyogas/main/backend/csv_store/electricity.csv';
  
  try {
    console.log('Fetching energy data from GitHub...');
    const response = await fetch(githubRawUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }
    
    const csvContent = await response.text();
    if (!csvContent.trim()) {
      throw new Error('CSV file is empty');
    }
    
    const data = parseCSV(csvContent);
    
    if (data.length === 0) {
      throw new Error('No valid data records found in CSV');
    }
    
    console.log(`Successfully loaded ${data.length} energy usage records`);
    return data;
  } catch (error) {
    console.error('Error fetching energy data from GitHub:', error);
    throw error;
  }
};