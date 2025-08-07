<template>
  <div class="metrics-card">
    <div class="metric-icon">
      <slot name="icon"></slot>
    </div>
    <div class="metric-content">
      <h3 class="metric-title">{{ title }}</h3>
      <p class="metric-value">{{ formattedValue }}</p>
      <p class="metric-subtitle">{{ subtitle }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  value: number;
  unit?: string;
  subtitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  unit: 'kWh',
  subtitle: ''
});

const formattedValue = computed(() => {
  return `${props.value.toFixed(2)} ${props.unit}`;
});
</script>

<style scoped>
.metrics-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.metrics-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #10b981, #06d6a0);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.metrics-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.metrics-card:hover::before {
  opacity: 1;
}

.metric-icon {
  background: linear-gradient(135deg, #10b981 0%, #06d6a0 100%);
  border-radius: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-content {
  flex: 1;
}

.metric-title {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  margin: 0 0 4px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
  line-height: 1.2;
}

.metric-subtitle {
  font-size: 11px;
  color: #94a3b8;
  margin: 0;
}

@media (max-width: 768px) {
  .metrics-card {
    padding: 14px;
    gap: 10px;
  }
  
  .metric-icon {
    width: 36px;
    height: 36px;
  }
  
  .metric-title {
    font-size: 12px;
  }
  
  .metric-value {
    font-size: 18px;
  }
  
  .metric-subtitle {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .metrics-card {
    padding: 12px;
    gap: 8px;
  }
  
  .metric-icon {
    width: 32px;
    height: 32px;
  }
  
  .metric-value {
    font-size: 16px;
  }
}

@media (min-width: 1200px) {
  .metrics-card {
    padding: 24px;
    gap: 16px;
  }
  
  .metric-icon {
    width: 48px;
    height: 48px;
  }
  
  .metric-title {
    font-size: 14px;
  }
  
  .metric-value {
    font-size: 24px;
  }
  
  .metric-subtitle {
    font-size: 12px;
  }
}
</style>