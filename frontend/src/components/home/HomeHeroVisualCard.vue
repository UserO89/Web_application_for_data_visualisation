<template>
  <div class="hero-visual" data-reveal style="--reveal-delay: 120ms;">
    <div class="surface-card">
      <p class="surface-kicker">Workflow Snapshot</p>
      <h3>Import -> Validate -> Edit -> Analyze -> Visualize</h3>

      <div class="stage-rail">
        <div v-for="stage in heroStages" :key="stage" class="stage-node">
          <span class="stage-dot" aria-hidden="true"></span>
          <span>{{ stage }}</span>
        </div>
      </div>

      <div class="surface-metrics">
        <div v-for="item in heroHighlights" :key="item.label" class="surface-metric">
          <div class="surface-value">{{ item.value }}</div>
          <div class="surface-label">{{ item.label }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomeHeroVisualCard',
  props: {
    heroStages: { type: Array, default: () => [] },
    heroHighlights: { type: Array, default: () => [] },
  },
}
</script>

<style scoped>
.hero-visual {
  position: relative;
}

.surface-card {
  background:
    linear-gradient(165deg, rgba(39, 39, 39, 0.88), rgba(21, 21, 21, 0.95)),
    radial-gradient(circle at 88% 10%, rgba(29, 185, 84, 0.14), transparent 56%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 22px;
  padding: 20px;
  box-shadow: 0 24px 34px rgba(0, 0, 0, 0.36);
}

.surface-kicker {
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.surface-card h3 {
  margin-top: 8px;
  font-size: 20px;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.stage-rail {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.stage-node {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #d4d4d4;
  font-size: 13px;
}

.stage-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #86f4aa;
  box-shadow: 0 0 0 5px rgba(29, 185, 84, 0.17);
}

.surface-metrics {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.surface-metric {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(13, 13, 13, 0.54);
  padding: 10px;
}

.surface-value {
  font-size: 18px;
  font-weight: 700;
}

.surface-label {
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 760px) {
  .surface-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
