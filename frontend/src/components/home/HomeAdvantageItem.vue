<template>
  <article class="advantage-item" data-reveal :style="revealStyle">
    <div class="advantage-marker">{{ index + 1 }}</div>
    <div>
      <h3>{{ item.title }}</h3>
      <p>{{ item.text }}</p>
    </div>
  </article>
</template>

<script>
import { revealDelayStyle } from '../../utils/home'

export default {
  name: 'HomeAdvantageItem',
  props: {
    item: { type: Object, required: true },
    index: { type: Number, required: true },
  },
  computed: {
    revealStyle() {
      return revealDelayStyle(this.index, 120, 60)
    },
  },
}
</script>

<style scoped>
.advantage-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  background: rgba(17, 17, 17, 0.75);
  padding: 12px 13px;
  transition:
    opacity 0.52s cubic-bezier(0.2, 0.9, 0.3, 1),
    transform 0.52s cubic-bezier(0.2, 0.9, 0.3, 1),
    border-color 0.24s ease,
    box-shadow 0.24s ease;
  will-change: transform;
}

.advantage-item[data-reveal] {
  transform: translateX(-38px) scale(0.99);
}

.advantage-item[data-reveal].is-visible {
  transform: translateX(0) scale(1);
}

.advantage-item:hover {
  transform: translateX(4px) translateY(-2px) scale(1.01);
  border-color: rgba(29, 185, 84, 0.35);
  box-shadow: 0 14px 26px rgba(0, 0, 0, 0.24);
}

.advantage-marker {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(29, 185, 84, 0.2);
  border: 1px solid rgba(29, 185, 84, 0.4);
  color: #9ff6bd;
  font-size: 12px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.advantage-item h3 {
  margin: 0;
  font-size: 16px;
  line-height: 1.35;
}

.advantage-item p {
  margin-top: 5px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.56;
}

@media (prefers-reduced-motion: reduce) {
  .advantage-item {
    transition: none !important;
  }
}
</style>
