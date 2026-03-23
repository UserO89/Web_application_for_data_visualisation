<template>
  <article class="capability-card" data-reveal :style="revealStyle">
    <div class="capability-icon" :class="`icon-${feature.icon}`" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          :d="feature.iconPath"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
    <h3>{{ feature.title }}</h3>
    <p>{{ feature.text }}</p>
  </article>
</template>

<script>
import { revealDelayStyle } from '../../utils/home'

export default {
  name: 'HomeCapabilityCard',
  props: {
    feature: { type: Object, required: true },
    index: { type: Number, required: true },
  },
  computed: {
    revealStyle() {
      return revealDelayStyle(this.index, 80, 70)
    },
  },
}
</script>

<style scoped>
.capability-card {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  background:
    linear-gradient(150deg, rgba(35, 35, 35, 0.84), rgba(18, 18, 18, 0.9)),
    radial-gradient(circle at 95% 0%, rgba(255, 255, 255, 0.07), transparent 48%);
  padding: 16px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
  transition:
    transform 0.24s ease,
    border-color 0.24s ease,
    box-shadow 0.24s ease;
  will-change: transform;
}

.capability-card:hover {
  transform: translateY(-6px) scale(1.017);
  border-color: rgba(29, 185, 84, 0.42);
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.32);
}

.capability-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.capability-icon svg {
  width: 20px;
  height: 20px;
}

.icon-import {
  color: #95f7b7;
  background: rgba(29, 185, 84, 0.2);
}

.icon-validate {
  color: #9dd7ff;
  background: rgba(77, 164, 255, 0.2);
}

.icon-edit {
  color: #ffd598;
  background: rgba(255, 166, 0, 0.18);
}

.icon-stats {
  color: #d6b3ff;
  background: rgba(170, 113, 255, 0.2);
}

.icon-chart {
  color: #89f0d4;
  background: rgba(31, 195, 159, 0.2);
}

.icon-workspace {
  color: #f8c4a0;
  background: rgba(255, 129, 74, 0.2);
}

.capability-card h3 {
  margin: 0;
  font-size: 17px;
  line-height: 1.35;
}

.capability-card p {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.58;
}

@media (prefers-reduced-motion: reduce) {
  .capability-card {
    transition: none !important;
  }
}
</style>
