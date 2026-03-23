<template>
  <div ref="pageRef" class="home-page">
    <AppHeader />

    <main class="landing">
      <HomeHeroSection
        ref="heroSectionRef"
        :primary-action="primaryAction"
        :hero-stages="heroStages"
        :hero-highlights="heroHighlights"
        @explore-capabilities="handleExploreCapabilities"
      />

      <HomeChartDemoSection
        ref="chartDemoRef"
        :primary-action="primaryAction"
        :demo-scenarios="demoScenarios"
        :demo-chart-types="demoChartTypes"
        :active-demo-scenario-key="activeDemoScenarioKey"
        :active-demo-chart-type="activeDemoChartType"
        :current-demo-scenario="currentDemoScenario"
        :active-demo-chart-type-label="activeDemoChartTypeLabel"
        :demo-chart-option="demoChartOption"
        :show-demo-chart="showDemoChart"
        @update:active-demo-scenario-key="activeDemoScenarioKey = $event"
        @update:active-demo-chart-type="activeDemoChartType = $event"
      />

      <HomeCapabilitiesSection :capabilities="capabilities" />

      <HomeAdvantagesSection :advantages="advantages" />

      <HomeStatsSection
        ref="statsSectionRef"
        :stats-items="statsItems"
        :displayed-stats="displayedStats"
        :format-stat="formatStat"
      />

      <HomeWorkflowSection :workflow-steps="workflowSteps" />

      <HomeFinalCtaSection :primary-action="primaryAction" />
    </main>
  </div>
</template>

<script>
import AppHeader from '../components/AppHeader.vue'
import {
  HomeAdvantagesSection,
  HomeCapabilitiesSection,
  HomeChartDemoSection,
  HomeFinalCtaSection,
  HomeHeroSection,
  HomeStatsSection,
  HomeWorkflowSection,
} from '../components/home'
import { useHomeLanding } from '../composables/home'

export default {
  name: 'HomePage',
  components: {
    AppHeader,
    HomeHeroSection,
    HomeChartDemoSection,
    HomeCapabilitiesSection,
    HomeAdvantagesSection,
    HomeStatsSection,
    HomeWorkflowSection,
    HomeFinalCtaSection,
  },
  setup() {
    return useHomeLanding()
  },
}
</script>

<style scoped>
.home-page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.landing {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-bottom: 8px;
}

.landing > * {
  position: relative;
  isolation: isolate;
}

.landing > *:not(:first-child)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 12%;
  right: 12%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.13),
    transparent
  );
  pointer-events: none;
}

:deep([data-reveal]) {
  opacity: 0;
  transform: translateY(24px) scale(0.986);
  transition:
    opacity 0.64s cubic-bezier(0.2, 0.9, 0.3, 1),
    transform 0.64s cubic-bezier(0.2, 0.9, 0.3, 1);
  transition-delay: var(--reveal-delay, 0ms);
}

:deep([data-reveal].is-visible) {
  opacity: 1;
  transform: translateY(0) scale(1);
}

@media (max-width: 760px) {
  .home-page {
    padding: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  :deep([data-reveal]) {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
</style>
