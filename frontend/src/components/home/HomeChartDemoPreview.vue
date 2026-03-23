<template>
  <div class="demo-preview panel" data-reveal style="--reveal-delay: 120ms;">
    <div class="demo-preview-header">
      <div class="demo-preview-title">{{ currentDemoScenario.title }}</div>
      <div class="demo-preview-meta">
        <span>{{ currentDemoScenario.subtitle }}</span>
        <span>{{ activeDemoChartTypeLabel }}</span>
      </div>
    </div>

    <div class="demo-chart-wrap">
      <BaseEChart v-if="showDemoChart" :option="demoChartOption" />
      <div v-else class="demo-chart-placeholder">
        Loading interactive chart demo...
      </div>
    </div>
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue'

const BaseEChart = defineAsyncComponent(() => import('../charts/BaseEChart.vue'))

export default {
  name: 'HomeChartDemoPreview',
  components: { BaseEChart },
  props: {
    currentDemoScenario: {
      type: Object,
      default: () => ({ title: '', subtitle: '' }),
    },
    activeDemoChartTypeLabel: { type: String, default: '' },
    demoChartOption: { type: Object, default: () => ({}) },
    showDemoChart: { type: Boolean, default: false },
  },
}
</script>

<style scoped>
.demo-preview {
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  background:
    linear-gradient(160deg, rgba(32, 32, 32, 0.92), rgba(15, 15, 15, 0.94)),
    radial-gradient(circle at 85% 5%, rgba(84, 156, 255, 0.16), transparent 44%);
  padding: 14px;
  box-shadow: 0 18px 30px rgba(0, 0, 0, 0.28);
}

.demo-preview-header {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}

.demo-preview-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.34;
}

.demo-preview-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 12px;
}

.demo-preview-meta span:last-child {
  color: #afddff;
}

.demo-chart-wrap {
  height: 300px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(9, 9, 9, 0.55);
  padding: 8px;
}

.demo-chart-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #8f8f8f;
  font-size: 13px;
  border-radius: 10px;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  background-size: 180% 100%;
  animation: placeholderShimmer 1.9s linear infinite;
}

@keyframes placeholderShimmer {
  0% {
    background-position: 140% 0;
  }
  100% {
    background-position: -20% 0;
  }
}

@media (max-width: 760px) {
  .demo-chart-wrap {
    height: 250px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .demo-chart-placeholder {
    animation: none !important;
  }
}
</style>
