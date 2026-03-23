<template>
  <section ref="rootEl" class="panel hero" data-reveal>
    <span class="hero-glow hero-glow-left" aria-hidden="true"></span>
    <span class="hero-glow hero-glow-right" aria-hidden="true"></span>

    <div class="hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">Integrated Data Analysis Workspace</p>
        <h1>Move from raw tables to clear insights in one focused flow.</h1>
        <p class="hero-lead">
          DataViz helps you import, validate, edit, summarize, and visualize tabular data in one place.
          It is built for practical student projects, academic demonstrations, and fast analytics iteration.
        </p>

        <div class="hero-actions">
          <router-link :to="primaryAction.to" class="btn primary hero-btn">
            {{ primaryAction.label }}
          </router-link>
          <a
            href="#capabilities"
            class="btn hero-btn hero-btn-secondary"
            @click.prevent="$emit('explore-capabilities')"
          >
            Explore Capabilities
          </a>
        </div>

        <div class="hero-points">
          <span>CSV/TXT import</span>
          <span>Validation before charts</span>
          <span>Table-first editing</span>
          <span>Summary statistics</span>
        </div>
      </div>

      <HomeHeroVisualCard :hero-stages="heroStages" :hero-highlights="heroHighlights" />
    </div>
  </section>
</template>

<script>
import { ref } from 'vue'
import HomeHeroVisualCard from './HomeHeroVisualCard.vue'

export default {
  name: 'HomeHeroSection',
  components: {
    HomeHeroVisualCard,
  },
  props: {
    primaryAction: { type: Object, required: true },
    heroStages: { type: Array, default: () => [] },
    heroHighlights: { type: Array, default: () => [] },
  },
  emits: ['explore-capabilities'],
  setup(_, { expose }) {
    const rootEl = ref(null)
    expose({ rootEl })
    return { rootEl }
  },
}
</script>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  --cursor-x: 50%;
  --cursor-y: 50%;
  border-radius: 24px;
  padding: 34px;
  background:
    radial-gradient(circle at 6% 12%, rgba(29, 185, 84, 0.16), transparent 52%),
    radial-gradient(circle at 92% 10%, rgba(83, 160, 255, 0.18), transparent 48%),
    linear-gradient(145deg, #1a1a1a 0%, #151515 48%, #171717 100%);
  background-size: 130% 130%, 130% 130%, 100% 100%;
  animation: homeHeroSurfaceShift 11s ease-in-out infinite alternate;
}

.hero::before,
.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.hero::before {
  background: radial-gradient(circle at 35% 85%, rgba(29, 185, 84, 0.12), transparent 48%);
  opacity: 0.7;
  animation: homeHeroPulseDrift 9s ease-in-out infinite;
}

.hero::after {
  background: radial-gradient(
    210px circle at var(--cursor-x) var(--cursor-y),
    rgba(134, 244, 170, 0.09),
    transparent 64%
  );
  opacity: 0;
  transition: opacity 240ms ease;
}

.hero.is-pointer-active::after {
  opacity: 0.68;
}

.hero-glow {
  position: absolute;
  width: 240px;
  height: 240px;
  border-radius: 999px;
  filter: blur(50px);
  z-index: 0;
  pointer-events: none;
}

.hero-glow-left {
  background: rgba(29, 185, 84, 0.24);
  top: -130px;
  left: -90px;
  animation: homeHeroFloatingGlow 9.5s ease-in-out infinite alternate;
}

.hero-glow-right {
  background: rgba(85, 130, 220, 0.24);
  right: -110px;
  bottom: -140px;
  animation: homeHeroFloatingGlow 11.5s ease-in-out infinite alternate-reverse;
}

.hero-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 26px;
  align-items: center;
}

.eyebrow {
  color: #92f7b4;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

h1 {
  margin: 0;
  font-size: clamp(34px, 5vw, 58px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  max-width: 18ch;
}

.hero-lead {
  margin-top: 14px;
  color: #c8c8c8;
  line-height: 1.68;
  max-width: 64ch;
}

.hero-actions {
  margin-top: 24px;
  display: flex;
  gap: 11px;
  flex-wrap: wrap;
}

.hero-actions .btn {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.hero-btn {
  padding: 12px 16px;
  border-radius: 14px;
  min-height: 44px;
  font-size: 14px;
  transition:
    transform 240ms cubic-bezier(0.2, 0.9, 0.3, 1),
    box-shadow 240ms ease,
    filter 240ms ease,
    background-color 240ms ease,
    border-color 240ms ease;
  will-change: transform;
}

.hero-actions .btn.primary {
  background: linear-gradient(135deg, #21cc66 0%, #1db954 58%, #17a84a 100%);
  border-color: #1db954;
  box-shadow: 0 12px 24px rgba(29, 185, 84, 0.2);
}

.hero-actions .btn:hover {
  transform: translateY(-2px) scale(1.018);
}

.hero-actions .btn.primary:hover {
  filter: brightness(1.04) saturate(1.06);
  box-shadow: 0 14px 30px rgba(29, 185, 84, 0.3);
}

.hero-actions .btn:active {
  transform: translateY(0) scale(0.985);
}

.hero-btn-secondary {
  color: #d9d9d9;
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.13);
}

.hero-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.09);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.24);
}

.hero-points {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-points span {
  font-size: 12px;
  color: #d6d6d6;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@keyframes homeHeroFloatingGlow {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  100% {
    transform: translate3d(12px, -14px, 0) scale(1.06);
  }
}

@keyframes homeHeroSurfaceShift {
  0% {
    background-position: 0% 0%, 100% 0%, 50% 50%;
  }
  100% {
    background-position: 8% 12%, 88% 6%, 50% 50%;
  }
}

@keyframes homeHeroPulseDrift {
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
  .hero-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .hero {
    padding: 22px;
  }

  h1 {
    font-size: clamp(32px, 8.7vw, 46px);
  }

  .hero-actions {
    width: 100%;
  }

  .hero-actions .btn {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero,
  .hero-glow-left,
  .hero-glow-right,
  .hero::before,
  .hero::after {
    animation: none !important;
    transition: none !important;
  }

  .hero-btn,
  .btn {
    transition: none !important;
  }
}
</style>
