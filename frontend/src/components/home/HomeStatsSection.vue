<template>
  <section ref="rootEl" class="panel stats-panel" data-reveal>
    <HomeSectionHeader
      kicker="Progress Metrics"
      title="From input to insight with fewer moving parts."
      description="These numbers summarize the core workflow scope and show how the platform keeps the analysis path concise and understandable."
      compact
    />

    <div class="stats-grid">
      <HomeStatCard
        v-for="(stat, index) in statsItems"
        :key="stat.key"
        :stat="stat"
        :index="index"
        :value="displayedStats[stat.key]"
        :format-stat="formatStat"
      />
    </div>
  </section>
</template>

<script>
import { ref } from 'vue'
import HomeSectionHeader from './HomeSectionHeader.vue'
import HomeStatCard from './HomeStatCard.vue'

export default {
  name: 'HomeStatsSection',
  components: {
    HomeSectionHeader,
    HomeStatCard,
  },
  props: {
    statsItems: { type: Array, default: () => [] },
    displayedStats: { type: Object, default: () => ({}) },
    formatStat: {
      type: Function,
      default: (value) => String(value ?? ''),
    },
  },
  setup(_, { expose }) {
    const rootEl = ref(null)
    expose({ rootEl })
    return { rootEl }
  },
}
</script>

<style scoped>
.stats-panel {
  position: relative;
  overflow: hidden;
  --cursor-x: 50%;
  --cursor-y: 50%;
  border-radius: 24px;
  padding: 30px;
  background:
    radial-gradient(circle at 94% 7%, rgba(29, 185, 84, 0.17), transparent 50%),
    linear-gradient(150deg, #1a1a1a 0%, #151515 100%);
  background-size: 125% 125%, 100% 100%;
  animation: homeStatsSurfaceShift 12s ease-in-out infinite alternate-reverse;
}

.stats-panel::before,
.stats-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.stats-panel::before {
  z-index: 0;
  background: radial-gradient(circle at 16% 28%, rgba(80, 136, 230, 0.12), transparent 46%);
  opacity: 0.75;
  animation: homeStatsPulseDrift 10.5s ease-in-out infinite alternate-reverse;
}

.stats-panel::after {
  z-index: 0;
  background: radial-gradient(
    210px circle at var(--cursor-x) var(--cursor-y),
    rgba(140, 220, 255, 0.06),
    transparent 66%
  );
  opacity: 0;
  transition: opacity 220ms ease;
}

.stats-panel.is-pointer-active::after {
  opacity: 0.62;
}

.stats-panel > * {
  position: relative;
  z-index: 1;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

@keyframes homeStatsSurfaceShift {
  0% {
    background-position: 0% 0%, 100% 0%, 50% 50%;
  }
  100% {
    background-position: 8% 12%, 88% 6%, 50% 50%;
  }
}

@keyframes homeStatsPulseDrift {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.62;
  }
  100% {
    transform: translate3d(8px, -8px, 0) scale(1.04);
    opacity: 0.9;
  }
}

@media (max-width: 1120px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .stats-panel {
    padding: 22px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stats-panel,
  .stats-panel::before,
  .stats-panel::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
