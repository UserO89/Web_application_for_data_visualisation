<template>
  <section class="panel final-cta" data-reveal>
    <span class="final-cta-glow" aria-hidden="true"></span>

    <HomeSectionHeader
      :kicker="$t('home.finalCta.kicker')"
      :title="$t('home.finalCta.title')"
      :description="$t('home.finalCta.description')"
      variant="large"
      description-max-width="64ch"
      class="final-cta-head"
    />

    <div class="final-actions">
      <router-link :to="primaryAction.to" class="btn primary final-btn">
        {{ primaryAction.label }}
      </router-link>
      <a href="#workflow" class="btn final-btn final-btn-secondary">{{ $t('home.finalCta.viewWorkflow') }}</a>
    </div>
  </section>
</template>

<script>
import HomeSectionHeader from './HomeSectionHeader.vue'

export default {
  name: 'HomeFinalCtaSection',
  components: {
    HomeSectionHeader,
  },
  props: {
    primaryAction: { type: Object, required: true },
  },
}
</script>

<style scoped>
.final-cta {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  padding: 28px 30px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  align-items: center;
  background:
    radial-gradient(circle at 89% 12%, rgba(29, 185, 84, 0.22), transparent 54%),
    linear-gradient(130deg, #1a1a1a 0%, #171717 100%);
}

.final-cta-glow {
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 999px;
  right: -110px;
  bottom: -170px;
  background: rgba(29, 185, 84, 0.24);
  filter: blur(58px);
  pointer-events: none;
}

.final-cta-head {
  margin-bottom: 0;
}

.final-actions {
  margin-top: 24px;
  display: flex;
  gap: 11px;
  flex-wrap: wrap;
}

.final-actions .btn {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.final-actions .btn.primary {
  background: linear-gradient(135deg, #21cc66 0%, #1db954 58%, #17a84a 100%);
  border-color: #1db954;
  box-shadow: 0 12px 24px rgba(29, 185, 84, 0.2);
}

.final-actions .btn:hover {
  transform: translateY(-2px) scale(1.018);
}

.final-actions .btn.primary:hover {
  filter: brightness(1.04) saturate(1.06);
  box-shadow: 0 14px 30px rgba(29, 185, 84, 0.3);
}

.final-actions .btn:active {
  transform: translateY(0) scale(0.985);
}

.final-btn {
  min-height: 44px;
  padding: 12px 16px;
  border-radius: 14px;
  transition:
    transform 240ms cubic-bezier(0.2, 0.9, 0.3, 1),
    box-shadow 240ms ease,
    filter 240ms ease,
    background-color 240ms ease,
    border-color 240ms ease;
  will-change: transform;
}

.final-btn-secondary {
  color: #dbdbdb;
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.13);
}

.final-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.09);
}

@media (max-width: 1120px) {
  .final-cta {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .final-cta {
    padding: 22px;
  }

  .final-actions {
    width: 100%;
  }

  .final-actions .btn {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .final-btn,
  .btn {
    transition: none !important;
  }
}
</style>
