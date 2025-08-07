<template>
  <div class="chart-container">
    <div class="chart-header">
      <h2 class="chart-title">Energy Usage Trends</h2>
      <div class="chart-controls">
        <select 
          v-model="selectedPeriod" 
          @change="updateChart"
          class="period-selector"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>
    </div>
    <div class="chart-wrapper">
      <Line
        v-if="chartData"
        :data="chartData"
        :options="chartOptions"
        class="energy-chart"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';
import { EnergyUsageRecord } from '../types/energy';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  data: EnergyUsageRecord[];
}

const props = defineProps<Props>();
const selectedPeriod = ref(30);

const filteredData = computed(() => {
  return props.data.slice(-selectedPeriod.value);
});

const chartData = computed(() => {
  const data = filteredData.value;
  
  return {
    labels: data.map(record => format(new Date(record.date), 'MMM dd')),
    datasets: [
      {
        label: 'Energy Usage (kWh)',
        data: data.map(record => record.usage),
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: '#10b981',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#065f46',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
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
      backgroundColor: '#1e293b',
      titleColor: '#f1f5f9',
      bodyColor: '#e2e8f0',
      borderColor: '#334155',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        title: function(tooltipItems: any) {
          return tooltipItems[0].label;
        },
        label: function(context: any) {
          return `${context.parsed.y.toFixed(2)} kWh`;
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: '#f1f5f9',
        drawBorder: false,
      },
      ticks: {
        color: '#64748b',
        font: {
          size: 12,
          weight: '500'
        }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: '#f1f5f9',
        drawBorder: false,
      },
      ticks: {
        color: '#64748b',
        font: {
          size: 12,
          weight: '500'
        },
        callback: function(value: any) {
          return `${value} kWh`;
        }
      }
    }
  }
}));

const updateChart = () => {
  // Chart will automatically update due to reactive computed properties
};
</script>

<style scoped>
.chart-container {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.period-selector {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.period-selector:hover {
  border-color: #10b981;
  background: #f0fdf4;
}

.period-selector:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.chart-wrapper {
  height: 350px;
  position: relative;
}

@media (max-width: 768px) {
  .chart-container {
    padding: 12px;
  }
  
  .chart-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 16px;
  }
  
  .chart-title {
    font-size: 16px;
  }
  
  .chart-wrapper {
    height: 280px;
  }
  
  .period-selector {
    font-size: 13px;
    padding: 6px 10px;
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
  .chart-container {
    padding: 24px;
  }
  
  .chart-title {
    font-size: 20px;
  }
  
  .chart-header {
    margin-bottom: 24px;
  }
  
  .chart-wrapper {
    height: 400px;
  }
}
</style>