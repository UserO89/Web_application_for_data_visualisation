<template>
  <article class="stat-card" data-reveal :style="revealStyle">
    <div class="stat-value">
      {{ formatStat(value) }}<span>{{ stat.suffix }}</span>
    </div>
    <h3>{{ stat.label }}</h3>
    <p>{{ stat.text }}</p>
  </article>
</template>

<script>
import { revealDelayStyle } from '../../utils/home'

export default {
  name: 'HomeStatCard',
  props: {
    stat: { type: Object, required: true },
    index: { type: Number, required: true },
    value: { type: Number, default: 0 },
    formatStat: {
      type: Function,
      default: (input) => String(input ?? ''),
    },
  },
  computed: {
    revealStyle() {
      return revealDelayStyle(this.index, 120, 85)
    },
  },
}
</script>

<style scoped>
.stat-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(16, 16, 16, 0.75);
  padding: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
  transition:
    transform 0.24s ease,
    border-color 0.24s ease,
    box-shadow 0.24s ease;
  will-change: transform;
}

.stat-card:hover {
  transform: translateY(-5px) scale(1.015);
  border-color: rgba(29, 185, 84, 0.36);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 14px 28px rgba(0, 0, 0, 0.27);
}

.stat-value {
  font-size: clamp(32px, 4.2vw, 42px);
  font-weight: 800;
  color: #96f6b7;
  line-height: 1;
  letter-spacing: -0.02em;
}

.stat-value span {
  margin-left: 3px;
  font-size: 0.45em;
  color: #c9f8d7;
}

.stat-card h3 {
  margin-top: 10px;
  font-size: 16px;
  line-height: 1.32;
}

.stat-card p {
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.56;
}

@media (prefers-reduced-motion: reduce) {
  .stat-card {
    transition: none !important;
  }
}
</style>
