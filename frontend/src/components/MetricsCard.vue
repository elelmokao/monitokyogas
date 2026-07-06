<template>
  <div class="metrics-card" :class="tone">
    <div class="metric-header">
      <span class="metric-title">{{ title }}</span>
      <span v-if="badge" class="metric-badge">{{ badge }}</span>
    </div>
    <div class="metric-content">
      <p class="metric-value">{{ formattedValue }}</p>
      <p v-if="subtitle" class="metric-subtitle">{{ subtitle }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  value: number | string;
  unit?: string;
  subtitle?: string;
  badge?: string;
  tone?: 'neutral' | 'good' | 'warning' | 'danger';
}

const props = withDefaults(defineProps<Props>(), {
  unit: 'kWh',
  subtitle: '',
  badge: '',
  tone: 'neutral',
});

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value;
  if (!props.unit) return props.value.toFixed(2);
  return `${props.value.toFixed(2)} ${props.unit}`;
});
</script>

<style scoped>
.metrics-card {
  background: #ffffff;
  border: 1px solid #d8dee8;
  border-radius: 8px;
  padding: 16px;
  min-height: 128px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.metrics-card.good {
  border-top: 3px solid #16a34a;
}

.metrics-card.warning {
  border-top: 3px solid #d97706;
}

.metrics-card.danger {
  border-top: 3px solid #dc2626;
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.metric-content {
  display: grid;
  gap: 4px;
}

.metric-title {
  color: #5b6472;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  text-transform: uppercase;
}

.metric-badge {
  border-radius: 999px;
  background: #edf2f7;
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  padding: 5px 8px;
  white-space: nowrap;
}

.metric-value {
  color: #101827;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  margin: 0;
}

.metric-subtitle {
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
  margin: 0;
}

@media (max-width: 768px) {
  .metrics-card {
    min-height: 112px;
    padding: 14px;
  }

  .metric-value {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .metric-value {
    font-size: 22px;
  }
}
</style>
