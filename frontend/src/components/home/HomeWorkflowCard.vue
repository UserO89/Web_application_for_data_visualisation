<template>
  <article class="workflow-card" data-reveal :style="revealStyle">
    <div class="step-index">{{ indexLabel }}</div>
    <h3>{{ step.title }}</h3>
    <p>{{ step.text }}</p>
  </article>
</template>

<script>
import { revealDelayStyle } from '../../utils/home'

export default {
  name: 'HomeWorkflowCard',
  props: {
    step: { type: Object, required: true },
    index: { type: Number, required: true },
  },
  computed: {
    revealStyle() {
      return revealDelayStyle(this.index, 100, 80)
    },
    indexLabel() {
      return String(this.index + 1).padStart(2, '0')
    },
  },
}
</script>

<style scoped>
.workflow-card {
  position: relative;
  z-index: 1;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(140deg, rgba(37, 37, 37, 0.85), rgba(19, 19, 19, 0.9));
  padding: 13px;
  box-shadow: 0 9px 20px rgba(0, 0, 0, 0.24);
  transition:
    transform 0.24s ease,
    border-color 0.24s ease,
    box-shadow 0.24s ease;
  will-change: transform;
}

.workflow-card:hover {
  transform: translateY(-5px) scale(1.014);
  border-color: rgba(29, 185, 84, 0.35);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.3);
}

.step-index {
  width: fit-content;
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(29, 185, 84, 0.2);
  border: 1px solid rgba(29, 185, 84, 0.4);
  color: #94f3b5;
  font-size: 11px;
  letter-spacing: 0.07em;
  font-weight: 700;
  margin-bottom: 10px;
}

.workflow-card h3 {
  margin: 0;
  font-size: 16px;
  line-height: 1.33;
}

.workflow-card p {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.56;
}

@media (prefers-reduced-motion: reduce) {
  .workflow-card {
    transition: none !important;
  }
}
</style>
