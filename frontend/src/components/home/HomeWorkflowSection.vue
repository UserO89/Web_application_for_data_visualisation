<template>
  <section id="workflow" class="section-block workflow" data-reveal>
    <HomeSectionHeader
      kicker="How It Works"
      title="A clear workflow from first upload to final decision."
      description="Each stage is intentionally simple, making the platform suitable for thesis demos, classroom exercises, and quick exploratory analysis sessions."
    />

    <div class="workflow-grid">
      <HomeWorkflowCard
        v-for="(step, index) in workflowSteps"
        :key="step.title"
        :step="step"
        :index="index"
      />
    </div>
  </section>
</template>

<script>
import HomeSectionHeader from './HomeSectionHeader.vue'
import HomeWorkflowCard from './HomeWorkflowCard.vue'

export default {
  name: 'HomeWorkflowSection',
  components: {
    HomeSectionHeader,
    HomeWorkflowCard,
  },
  props: {
    workflowSteps: { type: Array, default: () => [] },
  },
}
</script>

<style scoped>
.section-block {
  border-radius: 24px;
  background:
    linear-gradient(155deg, #1a1a1a 0%, #171717 40%, #161616 100%),
    radial-gradient(circle at 95% 0%, rgba(29, 185, 84, 0.12), transparent 42%);
  border: 1px solid var(--border);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
  padding: 30px;
}

.workflow {
  background:
    linear-gradient(155deg, #1a1a1a 0%, #161616 100%),
    radial-gradient(circle at 10% 100%, rgba(29, 185, 84, 0.14), transparent 45%);
}

.workflow-grid {
  position: relative;
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.workflow-grid::before {
  content: '';
  position: absolute;
  top: 34px;
  left: 5%;
  right: 5%;
  height: 1px;
  border-top: 1px dashed rgba(255, 255, 255, 0.19);
  z-index: 0;
}

@media (max-width: 1120px) {
  .workflow-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workflow-grid::before {
    display: none;
  }
}

@media (max-width: 760px) {
  .section-block {
    padding: 22px;
  }

  .workflow-grid {
    grid-template-columns: 1fr;
  }
}
</style>
