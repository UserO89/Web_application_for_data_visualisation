<template>
  <section id="capabilities" class="section-block" data-reveal>
    <HomeSectionHeader
      :kicker="$t('home.capabilitiesSection.kicker')"
      :title="$t('home.capabilitiesSection.title')"
      :description="$t('home.capabilitiesSection.description')"
    />

    <div class="capability-grid">
      <HomeCapabilityCard
        v-for="(feature, index) in capabilities"
        :key="feature.title"
        :feature="feature"
        :index="index"
      />
    </div>
  </section>
</template>

<script>
import HomeCapabilityCard from './HomeCapabilityCard.vue'
import HomeSectionHeader from './HomeSectionHeader.vue'

export default {
  name: 'HomeCapabilitiesSection',
  components: {
    HomeSectionHeader,
    HomeCapabilityCard,
  },
  props: {
    capabilities: { type: Array, default: () => [] },
  },
}
</script>

<style scoped>
.section-block {
  background:
    linear-gradient(155deg, #1a1a1a 0%, #171717 40%, #161616 100%),
    radial-gradient(circle at 95% 0%, rgba(29, 185, 84, 0.12), transparent 42%);
  border: 1px solid var(--border);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
  border-radius: 24px;
  padding: 30px;
}

.capability-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 1120px) {
  .capability-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .section-block {
    padding: 22px;
  }

  .capability-grid {
    grid-template-columns: 1fr;
  }
}
</style>
