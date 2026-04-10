<template>
  <section ref="rootEl" class="panel chart-demo" data-reveal>
    <HomeSectionHeader
      :kicker="$t('home.demo.section.kicker')"
      :title="$t('home.demo.section.title')"
      :description="$t('home.demo.section.description')"
      class="demo-head"
    />

    <div class="demo-grid">
      <HomeChartDemoControls
        :primary-action="primaryAction"
        :demo-scenarios="demoScenarios"
        :demo-chart-types="demoChartTypes"
        :active-demo-scenario-key="activeDemoScenarioKey"
        :active-demo-chart-type="activeDemoChartType"
        @select-scenario="$emit('update:activeDemoScenarioKey', $event)"
        @select-chart-type="$emit('update:activeDemoChartType', $event)"
      />

      <HomeChartDemoPreview
        :current-demo-scenario="currentDemoScenario"
        :active-demo-chart-type-label="activeDemoChartTypeLabel"
        :demo-chart-option="demoChartOption"
        :show-demo-chart="showDemoChart"
      />
    </div>
  </section>
</template>

<script>
import { ref } from 'vue'
import HomeChartDemoControls from './HomeChartDemoControls.vue'
import HomeChartDemoPreview from './HomeChartDemoPreview.vue'
import HomeSectionHeader from './HomeSectionHeader.vue'

export default {
  name: 'HomeChartDemoSection',
  components: {
    HomeSectionHeader,
    HomeChartDemoControls,
    HomeChartDemoPreview,
  },
  props: {
    primaryAction: { type: Object, required: true },
    demoScenarios: { type: Array, default: () => [] },
    demoChartTypes: { type: Array, default: () => [] },
    activeDemoScenarioKey: { type: String, default: '' },
    activeDemoChartType: { type: String, default: '' },
    currentDemoScenario: {
      type: Object,
      default: () => ({ title: '', subtitle: '' }),
    },
    activeDemoChartTypeLabel: { type: String, default: '' },
    demoChartOption: { type: Object, default: () => ({}) },
    showDemoChart: { type: Boolean, default: false },
  },
  emits: ['update:activeDemoScenarioKey', 'update:activeDemoChartType'],
  setup(_, { expose }) {
    const rootEl = ref(null)
    expose({ rootEl })
    return { rootEl }
  },
}
</script>

<style scoped>
.chart-demo {
  position: relative;
  overflow: hidden;
  --cursor-x: 50%;
  --cursor-y: 50%;
  border-radius: 24px;
  padding: 30px;
  background:
    radial-gradient(circle at 8% 10%, rgba(29, 185, 84, 0.12), transparent 48%),
    linear-gradient(155deg, #1a1a1a 0%, #151515 100%);
}

.chart-demo::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(
    210px circle at var(--cursor-x) var(--cursor-y),
    rgba(140, 220, 255, 0.05),
    transparent 66%
  );
  opacity: 0;
  transition: opacity 220ms ease;
}

.chart-demo.is-pointer-active::after {
  opacity: 0.58;
}

.chart-demo > * {
  position: relative;
  z-index: 1;
}

.demo-head {
  margin-bottom: 20px;
}

.demo-grid {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 14px;
  align-items: stretch;
}

@media (max-width: 1120px) {
  .demo-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .chart-demo {
    padding: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chart-demo,
  .chart-demo::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
