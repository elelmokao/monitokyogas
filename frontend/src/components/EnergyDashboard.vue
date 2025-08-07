<template>
  <div class="dashboard">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading energy data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">
        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
      </div>
      <h2 class="error-title">Unable to Load Data</h2>
      <p class="error-message">{{ error }}</p>
      <button @click="retryLoadData" class="retry-button">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Retry
      </button>
    </div>

    <!-- No Data State -->
    <div v-else-if="energyData.length === 0" class="no-data-container">
      <div class="no-data-icon">
        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <h2 class="no-data-title">No Data Available</h2>
      <p class="no-data-message">No energy usage records were found. Please check if the data source contains valid records.</p>
    </div>

    <!-- Main Dashboard Content -->
    <div v-else class="dashboard-content">
      <header class="dashboard-header">
        <div class="header-content">
          <h1 class="dashboard-title">Energy Usage Monitor</h1>
          <p class="dashboard-subtitle">Track and analyze your energy consumption patterns</p>
        </div>
        <div class="header-status">
          <div class="status-indicator">
            <div class="status-dot"></div>
            <span class="status-text">Live Data</span>
          </div>
        </div>
      </header>

      <div class="period-controls" style="margin-bottom: 16px;">
        <label for="period-select" class="period-label">Period:</label>
        <select
          id="period-select"
          v-model="selectedPeriod"
          class="period-selector"
        >
          <option :value="7">Last 7 days</option>
          <option :value="30">Last 30 days</option>
          <option :value="90">Last 90 days</option>
        </select>
      </div>
      <div class="metrics-and-charts">
        <div class="metrics-grid">
          <MetricsCard
            title="Total Usage"
            :value="filteredMetrics.totalUsage"
            :subtitle="`Over ${filteredMetrics.totalDays} days`"
          >
            <template #icon>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </template>
          </MetricsCard>

          <MetricsCard
            title="Average Daily"
            :value="filteredMetrics.averageUsage"
            subtitle="Per day consumption"
          >
            <template #icon>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </template>
          </MetricsCard>

          <MetricsCard
            title="Peak Usage"
            :value="filteredMetrics.peakUsage"
            subtitle="Highest recorded"
          >
            <template #icon>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </template>
          </MetricsCard>

          <MetricsCard
            title="Lowest Usage"
            :value="filteredMetrics.lowestUsage"
            subtitle="Most efficient day"
          >
            <template #icon>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
              </svg>
            </template>
          </MetricsCard>
        </div>

        <div class="chart-section">
          <EnergyChart :data="filteredData" />
        </div>
      </div>
      <div class="data-info">
        <p class="data-source">
          Data source: <a href="https://github.com/elelmokao/monitokyogas/blob/main/csv/electricity.csv" target="_blank" rel="noopener noreferrer">GitHub CSV</a>
          • Last updated: {{ lastUpdated }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import MetricsCard from './MetricsCard.vue';
import EnergyChart from './EnergyChart.vue';
import { fetchEnergyDataFromGitHub, calculateMetrics } from '../utils/energyData';
import type { EnergyUsageRecord, EnergyMetrics } from '../types/energy';

const energyData = ref<EnergyUsageRecord[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const lastUpdated = ref<string>('');

const selectedPeriod = ref(30);
const filteredData = computed(() => energyData.value.slice(-selectedPeriod.value));
const filteredMetrics = computed<EnergyMetrics>(() => calculateMetrics(filteredData.value));

const loadData = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    const data = await fetchEnergyDataFromGitHub();
    energyData.value = data;
    lastUpdated.value = new Date().toLocaleString();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load energy data';
    console.error('Failed to load energy data:', err);
  } finally {
    isLoading.value = false;
  }
};

const retryLoadData = () => {
  loadData();
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%);
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

/* Error State */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 32px;
}

.error-icon {
  color: #ef4444;
  margin-bottom: 16px;
}

.error-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.error-message {
  font-size: 16px;
  color: #64748b;
  margin: 0 0 24px 0;
  max-width: 500px;
  line-height: 1.6;
}

.retry-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: #059669;
  transform: translateY(-1px);
}

/* No Data State */
.no-data-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 32px;
}

.no-data-icon {
  color: #94a3b8;
  margin-bottom: 16px;
}

.no-data-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.no-data-message {
  font-size: 16px;
  color: #64748b;
  margin: 0;
  max-width: 500px;
  line-height: 1.6;
}

/* Dashboard Content */
.dashboard-content {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.header-content {
  flex: 1;
}

.dashboard-title {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px 0;
  line-height: 1.2;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.dashboard-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  font-weight: 500;
}

.header-status {
  display: flex;
  align-items: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.1);
  padding: 6px 12px;
  border-radius: 50px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 12px;
  font-weight: 600;
  color: #065f46;
}

.metrics-and-charts {
  display: flex;
  flex-direction: row;
  gap: 24px;
}

.metrics-grid {
  display: grid;
  flex-direction: column;
  display: flex;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.chart-section {
  margin-bottom: 24px;
}

.insights-section {
  margin-bottom: 24px;
}

.insights-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.insights-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.insights-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.insight-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: rgba(248, 250, 252, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
}

.insight-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}

.insight-icon.efficient {
  background: linear-gradient(135deg, #10b981 0%, #06d6a0 100%);
}

.insight-icon.info {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.insight-icon.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.insight-text {
  font-size: 13px;
  color: #475569;
  margin: 0;
  line-height: 1.5;
  font-weight: 500;
}

.data-info {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
}

.data-source {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

.data-source a {
  color: #10b981;
  text-decoration: none;
}

.data-source a:hover {
  text-decoration: underline;
}

/* Mobile Responsive Design */
@media (max-width: 768px) {
  .dashboard {
    padding: 12px;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 20px;
  }
  
  .dashboard-title {
    font-size: 22px;
  }
  
  .dashboard-subtitle {
    font-size: 13px;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }
  
  .insights-card {
    padding: 16px;
  }
  
  .insights-title {
    font-size: 16px;
  }
  
  .insight-item {
    padding: 10px;
  }
  
  .insight-text {
    font-size: 12px;
  }
  
  .error-container,
  .no-data-container,
  .loading-container {
    padding: 20px;
    min-height: 50vh;
  }
  
  .error-title,
  .no-data-title {
    font-size: 20px;
  }
  
  .error-message,
  .no-data-message {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .dashboard {
    padding: 8px;
  }
  
  .dashboard-title {
    font-size: 20px;
  }
  
  .dashboard-subtitle {
    font-size: 12px;
  }
  
  .metrics-grid {
    gap: 10px;
  }
  
  .insights-card {
    padding: 12px;
  }
  
  .insight-item {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  
  .insight-icon {
    align-self: center;
  }
}

/* Large Desktop */
@media (min-width: 1200px) {
  .dashboard {
    padding: 24px;
  }
  
  .dashboard-title {
    font-size: 32px;
  }
  
  .dashboard-subtitle {
    font-size: 16px;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 32px;
  }
  
  .chart-section {
    margin-bottom: 32px;
  }
  
  .insights-section {
    margin-bottom: 32px;
  }
  
  .insights-card {
    padding: 24px;
  }
}
</style>