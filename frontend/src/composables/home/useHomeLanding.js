import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useHomeContent } from './useHomeContent'
import { useHomeMotion } from './useHomeMotion'

export const useHomeLanding = () => {
  const authStore = useAuthStore()

  const pageRef = ref(null)
  const heroSectionRef = ref(null)
  const chartDemoRef = ref(null)
  const statsSectionRef = ref(null)
  const showDemoChart = ref(false)

  const content = useHomeContent({ authStore })
  const motion = useHomeMotion({
    pageRef,
    heroSectionRef,
    chartDemoRef,
    statsSectionRef,
    statsItems: content.statsItems,
    displayedStats: content.displayedStats,
    showDemoChart,
  })

  return {
    pageRef,
    heroSectionRef,
    chartDemoRef,
    statsSectionRef,
    showDemoChart,
    ...content,
    ...motion,
  }
}
