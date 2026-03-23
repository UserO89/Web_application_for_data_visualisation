<template>
  <section class="panel advantages" data-reveal>
    <HomeSectionHeader
      kicker="Why This Platform"
      title="Built for practical analysis, not fragmented workflows."
      description="Typical workflows split data cleaning, validation, and charting across separate tools. DataViz keeps these steps connected, so each decision remains traceable and faster to verify."
    />

    <div class="advantage-list">
      <HomeAdvantageItem
        v-for="(item, index) in advantages"
        :key="item.title"
        :item="item"
        :index="index"
      />
    </div>
  </section>
</template>

<script>
import HomeAdvantageItem from './HomeAdvantageItem.vue'
import HomeSectionHeader from './HomeSectionHeader.vue'

export default {
  name: 'HomeAdvantagesSection',
  components: {
    HomeSectionHeader,
    HomeAdvantageItem,
  },
  props: {
    advantages: { type: Array, default: () => [] },
  },
}
</script>

<style scoped>
.advantages {
  border-radius: 24px;
  padding: 30px;
  background:
    radial-gradient(circle at 3% 92%, rgba(29, 185, 84, 0.16), transparent 44%),
    linear-gradient(145deg, #1a1a1a 0%, #151515 100%);
  display: grid;
  grid-template-columns: 1fr 1.12fr;
  gap: 18px;
}

.advantage-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 1120px) {
  .advantages {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .advantages {
    padding: 22px;
  }
}
</style>
