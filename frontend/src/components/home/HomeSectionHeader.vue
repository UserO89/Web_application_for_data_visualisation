<template>
  <div class="section-head" :class="headClasses" :style="headStyle">
    <p class="section-kicker">{{ kicker }}</p>
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
  </div>
</template>

<script>
export default {
  name: 'HomeSectionHeader',
  props: {
    kicker: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    compact: { type: Boolean, default: false },
    maxWidth: { type: String, default: '740px' },
    descriptionMaxWidth: { type: String, default: 'none' },
    variant: {
      type: String,
      default: 'default',
      validator: (value) => ['default', 'large'].includes(value),
    },
  },
  computed: {
    headClasses() {
      return {
        compact: this.compact,
        'is-large': this.variant === 'large',
      }
    },
    headStyle() {
      return {
        '--section-max-width': this.maxWidth,
        '--section-description-max-width': this.descriptionMaxWidth,
      }
    },
  },
}
</script>

<style scoped>
.section-head {
  max-width: var(--section-max-width);
  margin-bottom: 18px;
}

.section-head.compact {
  margin-bottom: 14px;
}

.section-kicker {
  color: #90efb0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  margin-bottom: 8px;
}

h2 {
  margin: 0;
  font-size: clamp(30px, 3.5vw, 40px);
  line-height: 1.15;
  letter-spacing: -0.02em;
  max-width: 22ch;
}

.section-head.is-large h2 {
  font-size: clamp(30px, 3.6vw, 42px);
}

.section-head p:last-child {
  margin-top: 11px;
  max-width: var(--section-description-max-width);
  color: var(--muted);
  line-height: 1.66;
}

@media (max-width: 760px) {
  h2,
  .section-head.is-large h2 {
    font-size: clamp(28px, 7.5vw, 36px);
  }
}
</style>
