<template>
  <main class="monitor-page">
    <header class="monitor-header">
      <div>
        <p class="eyebrow">Tokyo Gas CSV Monitor</p>
        <h1>Energy Consumption</h1>
        <p class="subtitle">Daily electricity usage loaded from the backend CSV store.</p>
      </div>

      <div class="status-pill" :class="monitorStatus.tone">
        <span class="status-dot"></span>
        <span>{{ monitorStatus.label }}</span>
      </div>
    </header>

    <section class="control-bar" aria-label="Monitor controls">
      <label class="field">
        <span>Range</span>
        <select v-model="selectedRange" class="select-input">
          <option value="current">Current billing period</option>
          <option value="previous">Previous billing period</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 180 days</option>
        </select>
      </label>

      <label class="field compact">
        <span>High usage</span>
        <input v-model.number="highUsageThreshold" class="number-input" type="number" min="0" step="0.1" />
      </label>

      <label class="field compact">
        <span>Budget</span>
        <input v-model.number="budgetInput" class="number-input" type="number" min="0" step="1" />
      </label>

      <button class="refresh-button" type="button" @click="loadData">Refresh</button>
    </section>

    <section v-if="error" class="notice danger">
      <strong>Load failed</strong>
      <span>{{ error }}</span>
    </section>

    <section v-else-if="isLoading" class="notice">
      <strong>Loading CSV data</strong>
      <span>Fetching monthly files from GitHub raw content.</span>
    </section>

    <template v-else>
      <section class="metrics-grid" aria-label="Energy metrics">
        <MetricsCard
          title="Used So Far"
          :value="metrics.totalUsage"
          :subtitle="`${metrics.totalDays} recorded days in ${rangeLabel}`"
          :badge="`${completeness}% complete`"
          :tone="usageTone"
        />
        <MetricsCard
          title="Latest Reading"
          :value="latestRecord ? latestRecord.usage : 'No data'"
          :unit="latestRecord ? 'kWh' : ''"
          :subtitle="latestRecord ? latestRecord.date : 'CSV has no records in this range'"
          :tone="latestTone"
        />
        <MetricsCard
          title="Estimated Total"
          :value="projectedUsage"
          :subtitle="`${remainingBudgetLabel} against ${periodBudget.toFixed(0)} kWh budget`"
          badge="Forecast"
          :tone="projectionTone"
        />
      </section>

      <section class="primary-grid">
        <EnergyChart
          class="chart-panel"
          :data="records"
          :expected-dates="expectedDates"
          :threshold="highUsageThreshold"
          :subtitle="`${periodWindow.start} to ${periodWindow.end}`"
        />

        <aside class="health-panel">
          <div class="panel-header">
            <h2>Current Range</h2>
            <span>{{ loadedFiles.length }}/{{ attemptedFiles.length }} files</span>
          </div>

          <dl class="health-list">
            <div>
              <dt>CSV files</dt>
              <dd>{{ attemptedFilesLabel }}</dd>
            </div>
            <div>
              <dt>Missing days</dt>
              <dd>
                {{ missingDates.length }}
                <span v-if="missingDates.length > 0" class="missing-preview">{{ missingDatesLabel }}</span>
              </dd>
            </div>
            <div>
              <dt>High days</dt>
              <dd>{{ highUsageDays.length }}</dd>
            </div>
            <div>
              <dt>Average daily</dt>
              <dd>{{ metrics.averageUsage.toFixed(2) }} kWh</dd>
            </div>
          </dl>

          <div class="alert-list">
            <div v-for="alert in alerts" :key="alert.title" class="alert-item" :class="alert.tone">
              <strong>{{ alert.title }}</strong>
              <span>{{ alert.body }}</span>
            </div>
          </div>
        </aside>
      </section>

      <section class="table-section">
        <div class="panel-header">
          <h2>Recent Expected Days</h2>
          <a v-if="latestCsvUrl" :href="latestCsvUrl" target="_blank" rel="noopener noreferrer">Open latest CSV</a>
        </div>

        <div v-if="timelineRows.length === 0" class="empty-table">
          No expected days were found for this range.
        </div>

        <table v-else class="records-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Usage</th>
              <th>Status</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in recentRows" :key="row.date" :class="{ missing: row.missing }">
              <td>{{ row.date }}</td>
              <td>{{ row.usage === null ? '-' : `${row.usage.toFixed(2)} kWh` }}</td>
              <td>
                <span class="row-status" :class="rowStatusClass(row)">
                  {{ rowStatusLabel(row) }}
                </span>
              </td>
              <td>{{ row.sourceFile || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="data-health-row">
        <BillingCompletenessChart :periods="historyPeriods" />
      </section>
    </template>

    <footer class="monitor-footer">
      Last checked: {{ lastChecked || '-' }}
    </footer>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import dayjs from 'dayjs';
import BillingCompletenessChart from './BillingCompletenessChart.vue';
import EnergyChart from './EnergyChart.vue';
import MetricsCard from './MetricsCard.vue';
import { buildRawCsvUrl, calculateMetrics, fetchEnergyDataFromGitHub } from '../utils/energyData';
import type { BillingPeriodData, EnergyUsageRecord } from '../types/energy';

type RangeOption = 'current' | 'previous' | '14' | '30' | '90' | '180';
type Tone = 'neutral' | 'good' | 'warning' | 'danger';

interface AlertItem {
  title: string;
  body: string;
  tone: Tone;
}

interface TimelineRow {
  date: string;
  usage: number | null;
  sourceFile?: string;
  missing: boolean;
}

const selectedRange = ref<RangeOption>('current');
const highUsageThreshold = ref(Number(import.meta.env.VITE_HIGH_USAGE_KWH || 4));
const budgetOverride = ref<number | null>(null);
const records = ref<EnergyUsageRecord[]>([]);
const expectedDates = ref<string[]>([]);
const attemptedFiles = ref<string[]>([]);
const loadedFiles = ref<string[]>([]);
const missingDates = ref<string[]>([]);
const historyPeriods = ref<BillingPeriodData[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const lastChecked = ref('');

function billingStart(date: dayjs.Dayjs): dayjs.Dayjs {
  return date.date() >= 24 ? date.date(24) : date.subtract(1, 'month').date(24);
}

function getRangeWindow(range: RangeOption): { start: dayjs.Dayjs; end: dayjs.Dayjs } {
  const today = dayjs().startOf('day');
  const latestExpectedDate = today.subtract(1, 'day');
  const currentStart = billingStart(latestExpectedDate);

  if (range === 'current') {
    return { start: currentStart, end: latestExpectedDate };
  }

  if (range === 'previous') {
    const end = currentStart.subtract(1, 'day');
    return { start: billingStart(end), end };
  }

  return {
    start: latestExpectedDate.subtract(Number(range) - 1, 'day'),
    end: latestExpectedDate,
  };
}

function formatPeriodLabel(start: dayjs.Dayjs, end: dayjs.Dayjs): string {
  return `${start.format('MMM D')}-${end.format('MMM D')}`;
}

function getCompletedBillingPeriodWindows(count: number): Array<{ label: string; start: dayjs.Dayjs; end: dayjs.Dayjs }> {
  const latestExpectedDate = dayjs().startOf('day').subtract(1, 'day');
  const currentStart = billingStart(latestExpectedDate);
  const windows: Array<{ label: string; start: dayjs.Dayjs; end: dayjs.Dayjs }> = [];
  let end = currentStart.subtract(1, 'day');

  for (let index = 0; index < count; index++) {
    const start = billingStart(end);
    windows.push({
      label: formatPeriodLabel(start, end),
      start,
      end,
    });
    end = start.subtract(1, 'day');
  }

  return windows;
}

async function loadBillingPeriod(
  window: { label: string; start: dayjs.Dayjs; end: dayjs.Dayjs }
): Promise<BillingPeriodData> {
  const response = await fetchEnergyDataFromGitHub(window.start, window.end);

  return {
    ...response,
    label: window.label,
    start: window.start.format('YYYY-MM-DD'),
    end: window.end.format('YYYY-MM-DD'),
  };
}

const periodWindow = computed(() => {
  const { start, end } = getRangeWindow(selectedRange.value);
  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD'),
    totalDays: end.diff(start, 'day') + 1,
  };
});

const rangeLabel = computed(() => {
  if (selectedRange.value === 'current') return 'current period';
  if (selectedRange.value === 'previous') return 'previous period';
  return `${selectedRange.value} days`;
});

const metrics = computed(() => calculateMetrics(records.value));
const latestRecord = computed(() => records.value[records.value.length - 1]);
const highUsageDays = computed(() => records.value.filter(record => record.usage > highUsageThreshold.value));
const defaultBudget = computed(() => {
  return Math.round(periodWindow.value.totalDays * highUsageThreshold.value * 100) / 100;
});
const periodBudget = computed(() => budgetOverride.value ?? defaultBudget.value);
const budgetInput = computed({
  get: () => periodBudget.value,
  set: (value: number) => {
    budgetOverride.value = Number.isFinite(value) ? value : null;
  },
});
const timelineRows = computed<TimelineRow[]>(() => {
  const recordsByDate = new Map(records.value.map(record => [record.date, record]));

  return expectedDates.value.map(date => {
    const record = recordsByDate.get(date);

    return {
      date,
      usage: record?.usage ?? null,
      sourceFile: record?.sourceFile,
      missing: !record,
    };
  });
});
const recentRows = computed(() => timelineRows.value.slice(-12).reverse());

const dataLagDays = computed(() => {
  if (!latestRecord.value) return periodWindow.value.totalDays;
  return Math.max(0, dayjs(periodWindow.value.end).diff(dayjs(latestRecord.value.date), 'day'));
});

const completeness = computed(() => {
  const expected = expectedDates.value.length || periodWindow.value.totalDays;
  if (expected <= 0) return 0;
  return Math.round((records.value.length / expected) * 100);
});

const projectedUsage = computed(() => {
  if (metrics.value.totalDays === 0) return 0;
  return Math.round(metrics.value.averageUsage * periodWindow.value.totalDays * 100) / 100;
});

const remainingBudgetLabel = computed(() => {
  const remaining = periodBudget.value - projectedUsage.value;
  if (remaining >= 0) return `${remaining.toFixed(1)} kWh remaining`;
  return `${Math.abs(remaining).toFixed(1)} kWh over`;
});

const usageTone = computed<Tone>(() => {
  if (metrics.value.totalUsage > periodBudget.value) return 'danger';
  if (metrics.value.totalUsage > periodBudget.value * 0.8) return 'warning';
  return 'good';
});

const projectionTone = computed<Tone>(() => {
  if (projectedUsage.value > periodBudget.value) return 'danger';
  if (projectedUsage.value > periodBudget.value * 0.85) return 'warning';
  return 'good';
});

const latestTone = computed<Tone>(() => {
  if (!latestRecord.value) return 'warning';
  return latestRecord.value.usage > highUsageThreshold.value ? 'danger' : 'good';
});

const monitorStatus = computed<{ label: string; reason: string; tone: Tone }>(() => {
  if (records.value.length === 0) {
    return {
      label: 'No Data',
      reason: 'No CSV rows loaded for the selected range.',
      tone: 'danger',
    };
  }

  if (dataLagDays.value > 3) {
    return {
      label: 'Stale',
      reason: `Latest row is ${dataLagDays.value} days old.`,
      tone: 'danger',
    };
  }

  if (projectedUsage.value > periodBudget.value) {
    return {
      label: 'Over Budget',
      reason: 'Projection is above the configured period budget.',
      tone: 'danger',
    };
  }

  if (highUsageDays.value.length > 0 || missingDates.value.length > 0) {
    return {
      label: 'Watch',
      reason: 'There are high-usage readings or missing dates to inspect.',
      tone: 'warning',
    };
  }

  return {
    label: 'Healthy',
    reason: 'Data is current and usage is within configured limits.',
    tone: 'good',
  };
});

const alerts = computed<AlertItem[]>(() => {
  const items: AlertItem[] = [];

  if (dataLagDays.value > 1) {
    items.push({
      title: 'Freshness',
      body: `Latest reading is ${dataLagDays.value} days behind today.`,
      tone: dataLagDays.value > 3 ? 'danger' : 'warning',
    });
  }

  if (missingDates.value.length > 0) {
    items.push({
      title: 'Completeness',
      body: `${missingDates.value.length} expected day(s) are missing in this range.`,
      tone: 'warning',
    });
  }

  if (highUsageDays.value.length > 0) {
    items.push({
      title: 'Threshold',
      body: `${highUsageDays.value.length} day(s) exceeded ${highUsageThreshold.value.toFixed(1)} kWh.`,
      tone: 'danger',
    });
  }

  if (projectedUsage.value > periodBudget.value) {
    items.push({
      title: 'Budget',
      body: `Projected usage is ${remainingBudgetLabel.value}.`,
      tone: 'danger',
    });
  }

  if (items.length === 0) {
    items.push({
      title: 'Nominal',
      body: 'No active monitor alerts for this range.',
      tone: 'good',
    });
  }

  return items;
});

const attemptedFilesLabel = computed(() => {
  if (attemptedFiles.value.length === 0) return '-';
  if (attemptedFiles.value.length <= 2) return attemptedFiles.value.join(', ');
  return `${attemptedFiles.value[0]} + ${attemptedFiles.value.length - 1} more`;
});

const missingDatesLabel = computed(() => {
  if (missingDates.value.length === 0) return '';
  const preview = missingDates.value.slice(0, 4).join(', ');
  const remaining = missingDates.value.length - 4;
  return remaining > 0 ? `${preview} + ${remaining} more` : preview;
});

const latestCsvUrl = computed(() => {
  const fileName =
    latestRecord.value?.sourceFile || loadedFiles.value[loadedFiles.value.length - 1];
  return fileName ? buildRawCsvUrl(fileName) : '';
});

function rowStatusClass(row: TimelineRow): Tone {
  if (row.missing) return 'warning';
  if (row.usage !== null && row.usage > highUsageThreshold.value) return 'danger';
  return 'good';
}

function rowStatusLabel(row: TimelineRow): string {
  if (row.missing) return 'Missing';
  if (row.usage !== null && row.usage > highUsageThreshold.value) return 'High';
  return 'Normal';
}

const loadData = async () => {
  isLoading.value = true;
  error.value = null;

  const { start, end } = getRangeWindow(selectedRange.value);
  const completedWindows = getCompletedBillingPeriodWindows(6);

  try {
    const [response, completedPeriodData] = await Promise.all([
      fetchEnergyDataFromGitHub(start, end),
      Promise.all(completedWindows.map(loadBillingPeriod)),
    ]);

    records.value = response.records;
    expectedDates.value = response.expectedDates;
    attemptedFiles.value = response.attemptedFiles;
    loadedFiles.value = response.loadedFiles;
    missingDates.value = response.missingDates;
    historyPeriods.value = completedPeriodData;
    lastChecked.value = new Date().toLocaleString();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load energy data';
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);
watch(selectedRange, loadData);
</script>

<style scoped>
.monitor-page {
  background: #f4f6f8;
  color: #172033;
  min-height: 100vh;
  padding: 24px;
}

.monitor-header {
  align-items: flex-start;
  display: flex;
  gap: 24px;
  justify-content: space-between;
  margin: 0 auto 18px;
  max-width: 1320px;
}

.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  margin: 0 0 6px;
  text-transform: uppercase;
}

h1 {
  color: #111827;
  font-size: 34px;
  line-height: 1.1;
  margin: 0;
}

.subtitle {
  color: #64748b;
  margin: 8px 0 0;
}

.status-pill {
  align-items: center;
  background: #ffffff;
  border: 1px solid #d8dee8;
  border-radius: 999px;
  display: inline-flex;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 800;
  gap: 8px;
  padding: 8px 12px;
}

.status-pill.good {
  color: #166534;
}

.status-pill.warning {
  color: #92400e;
}

.status-pill.danger {
  color: #991b1b;
}

.status-dot {
  background: currentColor;
  border-radius: 999px;
  height: 8px;
  width: 8px;
}

.control-bar,
.metrics-grid,
.primary-grid,
.data-health-row,
.table-section,
.notice,
.monitor-footer {
  margin-left: auto;
  margin-right: auto;
  max-width: 1320px;
}

.control-bar {
  align-items: end;
  background: #ffffff;
  border: 1px solid #d8dee8;
  border-radius: 8px;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(240px, 1fr) repeat(2, minmax(130px, 160px)) auto;
  margin-bottom: 16px;
  padding: 14px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  color: #5b6472;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.select-input,
.number-input {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #172033;
  font: inherit;
  height: 40px;
  padding: 0 10px;
  width: 100%;
}

.refresh-button {
  background: #1f2937;
  border: 1px solid #1f2937;
  border-radius: 6px;
  color: #ffffff;
  font: inherit;
  font-weight: 800;
  height: 40px;
  padding: 0 16px;
}

.notice {
  background: #ffffff;
  border: 1px solid #d8dee8;
  border-left: 4px solid #2563eb;
  border-radius: 8px;
  display: grid;
  gap: 4px;
  margin-bottom: 16px;
  padding: 16px;
}

.notice.danger {
  border-left-color: #dc2626;
}

.metrics-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 16px;
}

.primary-grid {
  align-items: stretch;
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 2fr) minmax(300px, 0.8fr);
  margin-bottom: 16px;
}

.data-health-row {
  margin-bottom: 16px;
}

.chart-panel {
  min-width: 0;
}

.health-panel,
.table-section {
  background: #ffffff;
  border: 1px solid #d8dee8;
  border-radius: 8px;
  padding: 18px;
}

.panel-header {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-header h2 {
  color: #111827;
  font-size: 18px;
  margin: 0;
}

.panel-header span,
.panel-header a {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.panel-header a {
  color: #1d4ed8;
  text-decoration: none;
}

.health-list {
  display: grid;
  gap: 10px;
  margin: 0 0 16px;
}

.health-list div {
  border-bottom: 1px solid #edf1f5;
  display: grid;
  gap: 4px;
  padding-bottom: 10px;
}

.health-list dt {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.health-list dd {
  color: #111827;
  font-size: 14px;
  font-weight: 700;
  margin: 0;
  overflow-wrap: anywhere;
}

.missing-preview {
  color: #64748b;
  display: block;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  margin-top: 2px;
}

.alert-list {
  display: grid;
  gap: 8px;
}

.alert-item {
  border: 1px solid #d8dee8;
  border-left: 4px solid #64748b;
  border-radius: 8px;
  display: grid;
  gap: 3px;
  padding: 10px;
}

.alert-item strong {
  font-size: 13px;
}

.alert-item span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.alert-item.good {
  border-left-color: #16a34a;
}

.alert-item.warning {
  border-left-color: #d97706;
}

.alert-item.danger {
  border-left-color: #dc2626;
}

.records-table {
  border-collapse: collapse;
  width: 100%;
}

.records-table th,
.records-table td {
  border-top: 1px solid #edf1f5;
  color: #334155;
  font-size: 13px;
  padding: 10px 8px;
  text-align: left;
}

.records-table th {
  color: #64748b;
  font-size: 12px;
  text-transform: uppercase;
}

.records-table tr.missing td {
  color: #64748b;
}

.row-status {
  border-radius: 999px;
  display: inline-flex;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 8px;
}

.row-status.good {
  background: #dcfce7;
  color: #166534;
}

.row-status.danger {
  background: #fee2e2;
  color: #991b1b;
}

.row-status.warning {
  background: #fef3c7;
  color: #92400e;
}

.empty-table {
  align-items: center;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #64748b;
  display: flex;
  min-height: 120px;
  justify-content: center;
}

.monitor-footer {
  color: #64748b;
  font-size: 12px;
  padding: 4px 0 0;
}

@media (max-width: 980px) {
  .control-bar,
  .metrics-grid,
  .primary-grid {
    grid-template-columns: 1fr 1fr;
  }

  .primary-grid {
    align-items: start;
  }
}

@media (max-width: 720px) {
  .monitor-page {
    padding: 16px;
  }

  .monitor-header {
    display: grid;
  }

  .control-bar,
  .metrics-grid,
  .primary-grid {
    grid-template-columns: 1fr;
  }

  h1 {
    font-size: 28px;
  }

  .records-table {
    min-width: 640px;
  }

  .table-section {
    overflow-x: auto;
  }
}
</style>
