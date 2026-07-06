<template>
  <section class="status-page-panel">
    <div class="status-panel-head">
      <div>
        <h2>Data Health</h2>
        <p>CSV completeness over the last 6 billing periods.</p>
      </div>
      <strong>{{ availabilityLabel }}</strong>
    </div>

    <div v-if="periodStats.length > 0" class="uptime-section">
      <div class="period-bars" aria-label="Billing period data health">
        <span
          v-for="period in displayPeriods"
          :key="period.label"
          class="period-bar"
          :class="period.tone"
          :aria-label="period.label"
        ></span>
      </div>

      <div class="period-scale">
        <span>{{ firstPeriodLabel }}</span>
        <span>{{ lastPeriodLabel }}</span>
      </div>

      <div class="component-footer">
        <span class="component-name">Electricity CSV</span>
        <span class="component-status" :class="overallTone">
          <i></i>
          {{ componentStatus }}
        </span>
      </div>
    </div>

    <div v-else class="empty-chart">No history loaded.</div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BillingPeriodData } from '../types/energy';

interface Props {
  periods: BillingPeriodData[];
}

const props = defineProps<Props>();

const periodStats = computed(() => {
  return props.periods.map(period => {
    const total = period.expectedDates.length;
    const missing = period.missingDates.length;
    const missingRate = total > 0 ? Math.round((missing / total) * 1000) / 10 : 0;
    const tone = missingRate >= 50 ? 'danger' : missingRate >= 10 ? 'warning' : 'good';

    return {
      label: period.label,
      missing,
      total,
      tone,
    };
  });
});

const displayPeriods = computed(() => [...periodStats.value].reverse());

const overallTone = computed(() => {
  if (periodStats.value.some(period => period.tone === 'danger')) {
    return 'danger';
  }

  if (periodStats.value.some(period => period.tone === 'warning')) {
    return 'warning';
  }

  return 'good';
});

const componentStatus = computed(() => {
  if (overallTone.value === 'danger') {
    return 'Major outage';
  }

  if (overallTone.value === 'warning') {
    return 'Degraded performance';
  }

  return 'Operational';
});

const availabilityLabel = computed(() => {
  const total = periodStats.value.reduce((sum, period) => sum + period.total, 0);
  const missing = periodStats.value.reduce((sum, period) => sum + period.missing, 0);

  if (total === 0) {
    return 'No data';
  }

  const available = Math.max(0, 100 - (missing / total) * 100);
  return `${available.toFixed(1)}% complete`;
});

const firstPeriodLabel = computed(() => displayPeriods.value[0]?.label ?? '');
const lastPeriodLabel = computed(() => displayPeriods.value[displayPeriods.value.length - 1]?.label ?? '');
</script>

<style scoped>
.status-page-panel {
  background: #ffffff;
  border: 1px solid #d8dee8;
  border-radius: 6px;
  overflow: hidden;
}

.status-panel-head {
  align-items: flex-start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 18px 18px 0;
}

.status-panel-head h2 {
  color: #111827;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.status-panel-head p {
  color: #64748b;
  font-size: 13px;
  line-height: 1.4;
  margin: 4px 0 0;
}

.status-panel-head strong {
  color: #334155;
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 800;
  padding-top: 2px;
}

.uptime-section {
  display: grid;
  gap: 10px;
  padding: 18px;
}

.period-bars {
  display: grid;
  gap: 4px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  height: 22px;
}

.period-bar {
  background: #16a34a;
  border-radius: 2px;
  min-width: 0;
}

.period-bar.warning {
  background: #d97706;
}

.period-bar.danger {
  background: #dc2626;
}

.period-scale {
  align-items: center;
  color: #64748b;
  display: flex;
  font-size: 12px;
  justify-content: space-between;
}

.component-footer {
  align-items: center;
  border-top: 1px solid #edf1f5;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-top: 6px;
  padding-top: 12px;
}

.component-name {
  color: #111827;
  font-size: 13px;
  font-weight: 700;
}

.component-status {
  align-items: center;
  color: #166534;
  display: inline-flex;
  font-size: 13px;
  font-weight: 800;
  gap: 7px;
}

.component-status.warning {
  color: #92400e;
}

.component-status.danger {
  color: #991b1b;
}

.component-status i {
  background: currentColor;
  border-radius: 999px;
  display: inline-block;
  height: 8px;
  width: 8px;
}

.empty-chart {
  align-items: center;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #64748b;
  display: flex;
  min-height: 240px;
  justify-content: center;
}
</style>
