<template>
  <div class="demo-controls-panel">
    <div class="demo-control-block" data-reveal style="--reveal-delay: 80ms;">
      <div class="demo-control-label">{{ $t('home.demo.controls.dataset') }}</div>
      <div class="demo-chip-row">
        <button
          v-for="scenario in demoScenarios"
          :key="scenario.key"
          class="demo-chip-btn"
          :class="{ active: scenario.key === activeDemoScenarioKey }"
          type="button"
          @click="$emit('select-scenario', scenario.key)"
        >
          {{ scenario.label }}
        </button>
      </div>
    </div>

    <div class="demo-control-block" data-reveal style="--reveal-delay: 140ms;">
      <div class="demo-control-label">{{ $t('home.demo.controls.chartType') }}</div>
      <div class="demo-chip-row">
        <button
          v-for="typeItem in demoChartTypes"
          :key="typeItem.key"
          class="demo-chip-btn type"
          :class="{ active: typeItem.key === activeDemoChartType }"
          type="button"
          @click="$emit('select-chart-type', typeItem.key)"
        >
          {{ typeItem.label }}
        </button>
      </div>
    </div>

    <ul class="demo-benefits" data-reveal style="--reveal-delay: 200ms;">
      <li>{{ $t('home.demo.benefits.refresh') }}</li>
      <li>{{ $t('home.demo.benefits.visuals') }}</li>
      <li>{{ $t('home.demo.benefits.workflow') }}</li>
    </ul>

    <router-link :to="primaryAction.to" class="btn primary demo-cta">
      {{ $t('home.demo.controls.openWorkspace') }}
    </router-link>
  </div>
</template>

<script>
export default {
  name: 'HomeChartDemoControls',
  props: {
    primaryAction: { type: Object, required: true },
    demoScenarios: { type: Array, default: () => [] },
    demoChartTypes: { type: Array, default: () => [] },
    activeDemoScenarioKey: { type: String, default: '' },
    activeDemoChartType: { type: String, default: '' },
  },
  emits: ['select-scenario', 'select-chart-type'],
}
</script>

<style scoped>
.demo-controls-panel {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  background: rgba(16, 16, 16, 0.78);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.demo-control-block {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(23, 23, 23, 0.86);
  padding: 10px;
}

.demo-control-label {
  color: #9ff0bc;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 8px;
}

.demo-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.demo-chip-btn {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: #d8d8d8;
  border-radius: 999px;
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 220ms ease,
    border-color 220ms ease,
    box-shadow 220ms ease,
    background-color 220ms ease,
    color 220ms ease;
}

.demo-chip-btn:hover {
  transform: translateY(-1px) scale(1.02);
  border-color: rgba(29, 185, 84, 0.45);
  color: #ecfff2;
}

.demo-chip-btn.active {
  border-color: rgba(29, 185, 84, 0.5);
  background: rgba(29, 185, 84, 0.2);
  color: #b8f8ce;
  box-shadow: 0 10px 18px rgba(29, 185, 84, 0.14);
}

.demo-chip-btn.type.active {
  background: rgba(84, 156, 255, 0.22);
  border-color: rgba(84, 156, 255, 0.45);
  color: #cee6ff;
  box-shadow: 0 10px 18px rgba(84, 156, 255, 0.14);
}

.demo-benefits {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #bfc6bf;
  font-size: 13px;
  line-height: 1.52;
}

.demo-benefits li {
  border-left: 2px solid rgba(29, 185, 84, 0.4);
  padding-left: 10px;
}

.demo-cta {
  width: fit-content;
  text-decoration: none;
  min-height: 42px;
  padding: 10px 14px;
  border-radius: 12px;
  transition:
    transform 230ms ease,
    box-shadow 230ms ease,
    filter 230ms ease;
}

.demo-cta:hover {
  transform: translateY(-2px) scale(1.015);
  box-shadow: 0 14px 26px rgba(29, 185, 84, 0.24);
}

.demo-cta:active {
  transform: scale(0.985);
}

@media (max-width: 760px) {
  .demo-cta {
    width: 100%;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .demo-chip-btn,
  .demo-cta,
  .btn {
    transition: none !important;
  }
}
</style>
