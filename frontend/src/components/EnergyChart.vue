<template>
  <div class="chart-container">
    <div class="chart-header">
      <div>
        <h2 class="chart-title">{{ title }}</h2>
        <p class="chart-subtitle">{{ subtitle }}</p>
      </div>
      <div class="chart-legend">
        <span><i class="legend-dot normal"></i>Normal</span>
        <span><i class="legend-dot high"></i>High</span>
        <span><i class="legend-dot missing"></i>Missing</span>
      </div>
    </div>
    <div class="chart-wrapper">
      <Bar
        v-if="chartRows.length > 0"
        :data="chartData"
        :options="chartOptions"
        class="energy-chart"
      />
      <div v-else class="empty-chart">No expected days in this range.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'vue-chartjs';
import { EnergyUsageRecord } from '../types/energy';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  data: EnergyUsageRecord[];
  expectedDates?: string[];
  threshold?: number;
  title?: string;
  subtitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 4,
  title: 'Daily Consumption',
  subtitle: 'kWh recorded by backend CSV update',
});

const chartRows = computed(() => {
  const dates = props.expectedDates && props.expectedDates.length > 0
    ? props.expectedDates
    : props.data.map(record => record.date);
  const recordsByDate = new Map(props.data.map(record => [record.date, record]));

  return dates.map(date => {
    const record = recordsByDate.get(date);

    return {
      date,
      usage: record?.usage ?? null,
      missing: !record,
    };
  });
});

const chartData = computed(() => {
  const rows = chartRows.value;
  const maxUsage = Math.max(...rows.map(row => row.usage ?? 0), props.threshold, 1);
  const missingMarkerValue = Math.round(Math.max(0.12, maxUsage * 0.06) * 100) / 100;
  
  const backgroundColors = rows.map(row =>
    row.usage !== null && row.usage > props.threshold ? 'rgba(220, 38, 38, 0.8)' : 'rgba(37, 99, 235, 0.75)'
  );
  const borderColors = rows.map(row =>
    row.usage !== null && row.usage > props.threshold ? '#b91c1c' : '#1d4ed8'
  );
  const hoverBackgroundColors = rows.map(row =>
    row.usage !== null && row.usage > props.threshold ? '#991b1b' : '#1d4ed8'
  );
  const hoverBorderColors = rows.map(row =>
    row.usage !== null && row.usage > props.threshold ? '#7f1d1d' : '#1e40af'
  );

  return {
    labels: rows.map(row => format(new Date(`${row.date}T00:00:00`), 'MMM dd')),
    datasets: [
      {
        label: 'Energy Usage (kWh)',
        data: rows.map(row => row.usage),
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2,
        borderRadius: 6,
        hoverBackgroundColor: hoverBackgroundColors,
        hoverBorderColor: hoverBorderColors,
        grouped: false,
        order: 1,
      },
      {
        label: 'Missing data',
        data: rows.map(row => row.missing ? missingMarkerValue : null),
        backgroundColor: 'rgba(217, 119, 6, 0.35)',
        borderColor: '#d97706',
        borderWidth: 2,
        borderRadius: 6,
        grouped: false,
        order: 2,
      }
    ]
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#111827',
      titleColor: '#f9fafb',
      bodyColor: '#e5e7eb',
      borderColor: '#374151',
      borderWidth: 1,
      cornerRadius: 6,
      displayColors: false,
      filter: function(context: any) {
        return context.raw !== null && context.raw !== undefined;
      },
      callbacks: {
        title: function(tooltipItems: any) {
          return tooltipItems[0].label;
        },
        label: function(context: any) {
          if (context.dataset.label === 'Missing data') {
            return 'Missing data: no CSV row';
          }
          if (context.parsed.y == null) {
            return '';
          }
          return `${context.parsed.y.toFixed(2)} kWh`;
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: '#eef2f7',
        drawBorder: false,
      },
      ticks: {
        color: '#64748b',
        font: {
          size: 12,
          weight: 500
        }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: '#eef2f7',
        drawBorder: false,
      },
      ticks: {
        color: '#64748b',
        font: {
          size: 12,
          weight: 500
        },
        callback: function(value: any) {
          return `${value} kWh`;
        }
      }
    }
  }
}));

</script>

<style scoped>
.chart-container {
  background: #ffffff;
  border: 1px solid #d8dee8;
  border-radius: 8px;
  padding: 18px;
  height: 100%;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.chart-title {
  color: #101827;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.chart-subtitle {
  color: #64748b;
  font-size: 12px;
  margin: 4px 0 0;
}

.chart-legend {
  color: #64748b;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
}

.chart-legend span {
  align-items: center;
  display: inline-flex;
  gap: 5px;
}

.legend-dot {
  border-radius: 999px;
  display: inline-block;
  height: 8px;
  width: 8px;
}

.legend-dot.normal {
  background: #2563eb;
}

.legend-dot.high {
  background: #dc2626;
}

.legend-dot.missing {
  background: #d97706;
}

.chart-wrapper {
  height: 350px;
  position: relative;
}

.empty-chart {
  align-items: center;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #64748b;
  display: flex;
  height: 100%;
  justify-content: center;
  text-align: center;
}

@media (max-width: 768px) {
  .chart-container {
    padding: 14px;
  }
  
  .chart-header {
    margin-bottom: 16px;
  }
  
  .chart-title {
    font-size: 16px;
  }
  
  .chart-wrapper {
    height: 280px;
  }
}

@media (max-width: 480px) {
  .chart-container {
    padding: 10px;
  }
  
  .chart-title {
    font-size: 15px;
  }
  
  .chart-wrapper {
    height: 250px;
  }
}

@media (min-width: 1200px) {
  .chart-title {
    font-size: 20px;
  }

  .chart-wrapper {
    height: 400px;
  }
}
</style>
