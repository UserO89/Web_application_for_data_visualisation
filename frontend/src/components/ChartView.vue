<template>
  <div class="chart-view-placeholder panel">
    <div class="title">ChartView Placeholder</div>
    <div class="hint">
      Reserved for advanced visualization engines (ECharts, etc.).
    </div>
    <pre class="preview">{{ option }}</pre>
  </div>
</template>

<script>
export default {
  name: 'ChartView',
  props: {
    option: {
      type: Object,
      default: () => ({}),
    },
  },
}
</script>

<style scoped>
.chart-view-placeholder {
  min-height: 220px;
}

.title {
  font-weight: 700;
  margin-bottom: 8px;
}

.hint {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 12px;
}

.preview {
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  background: var(--glass);
  overflow: auto;
  font-size: 12px;
}
</style>
