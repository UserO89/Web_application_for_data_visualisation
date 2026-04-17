import { nextTick, onBeforeUnmount, onMounted, ref, unref } from 'vue'

const EASE_OUT_CUBIC = (t) => 1 - Math.pow(1 - t, 3)
const EASE_IN_OUT_CUBIC = (t) => (t < 0.5
  ? 4 * t * t * t
  : 1 - Math.pow(-2 * t + 2, 3) / 2)
const mediaQueryMatches = (query) => window.matchMedia?.(query)?.matches ?? false

export const useHomeMotion = ({
  pageRef,
  heroSectionRef,
  chartDemoRef,
  statsSectionRef,
  statsItems,
  displayedStats,
  showDemoChart,
} = {}) => {
  let revealObserver = null
  let statsObserver = null
  let scrollFrameId = null
  const pointerFrames = {}
  const pointerCleanups = []
  const counterFrames = {}
  const statsStarted = ref(false)
  const resolveHostElement = (value) => {
    const exposedRoot = value?.rootEl?.value || value?.rootEl || null
    return exposedRoot || value?.$el || value || null
  }

  const startStatsAnimation = () => {
    if (statsStarted.value) return
    statsStarted.value = true

    const resolvedStatsItems = unref(statsItems) || []

    resolvedStatsItems.forEach((item, index) => {
      const duration = 950 + index * 160
      const startTime = performance.now()

      const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1)
        displayedStats[item.key] = Math.round(item.target * EASE_OUT_CUBIC(progress))

        if (progress < 1) {
          counterFrames[item.key] = requestAnimationFrame(tick)
        } else {
          displayedStats[item.key] = item.target
        }
      }

      counterFrames[item.key] = requestAnimationFrame(tick)
    })
  }

  const fastScrollTo = (id, duration = 420) => {
    const target = document.getElementById(id)
    if (!target) return

    const reduceMotion = mediaQueryMatches('(prefers-reduced-motion: reduce)')
    const startY = window.scrollY || window.pageYOffset
    const targetY = Math.max(0, startY + target.getBoundingClientRect().top - 14)
    const distance = targetY - startY

    if (Math.abs(distance) < 2) return

    if (reduceMotion) {
      window.scrollTo(0, targetY)
      return
    }

    if (scrollFrameId) {
      cancelAnimationFrame(scrollFrameId)
      scrollFrameId = null
    }

    const startTime = performance.now()

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      window.scrollTo(0, startY + distance * EASE_IN_OUT_CUBIC(progress))

      if (progress < 1) {
        scrollFrameId = requestAnimationFrame(step)
      } else {
        scrollFrameId = null
      }
    }

    scrollFrameId = requestAnimationFrame(step)
  }

  const handleExploreCapabilities = () => {
    fastScrollTo('capabilities')
  }

  const attachCursorGlow = (target, cursorId) => {
    if (!target || !mediaQueryMatches('(pointer: fine)')) return
    if (mediaQueryMatches('(prefers-reduced-motion: reduce)')) return

    let queuedX = 50
    let queuedY = 50

    target.dataset.cursorId = cursorId
    target.style.setProperty('--cursor-x', '50%')
    target.style.setProperty('--cursor-y', '50%')

    const updatePosition = () => {
      target.style.setProperty('--cursor-x', `${queuedX}%`)
      target.style.setProperty('--cursor-y', `${queuedY}%`)
      pointerFrames[cursorId] = null
    }

    const handleMove = (event) => {
      const rect = target.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      const x = ((event.clientX - rect.left) / rect.width) * 100
      const y = ((event.clientY - rect.top) / rect.height) * 100
      queuedX = Math.min(100, Math.max(0, x))
      queuedY = Math.min(100, Math.max(0, y))
      target.classList.add('is-pointer-active')

      if (!pointerFrames[cursorId]) {
        pointerFrames[cursorId] = requestAnimationFrame(updatePosition)
      }
    }

    const handleLeave = () => {
      target.classList.remove('is-pointer-active')
    }

    target.addEventListener('pointermove', handleMove)
    target.addEventListener('pointerleave', handleLeave)

    pointerCleanups.push(() => {
      target.removeEventListener('pointermove', handleMove)
      target.removeEventListener('pointerleave', handleLeave)
    })
  }

  onMounted(() => {
    nextTick(() => {
      const root = pageRef.value
      if (!root) return

      const revealTargets = root.querySelectorAll('[data-reveal]')

      if ('IntersectionObserver' in window) {
        revealObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return
              entry.target.classList.add('is-visible')

              const chartDemoEl = resolveHostElement(chartDemoRef.value)
              if (chartDemoEl && entry.target === chartDemoEl) {
                showDemoChart.value = true
              }

              revealObserver.unobserve(entry.target)
            })
          },
          {
            threshold: 0.16,
            rootMargin: '0px 0px -8% 0px',
          }
        )

        revealTargets.forEach((target) => revealObserver.observe(target))
      } else {
        revealTargets.forEach((target) => target.classList.add('is-visible'))
        showDemoChart.value = true
      }

      const statsEl = resolveHostElement(statsSectionRef.value)
      if ('IntersectionObserver' in window && statsEl) {
        statsObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return
              startStatsAnimation()
              if (statsObserver) {
                statsObserver.disconnect()
                statsObserver = null
              }
            })
          },
          { threshold: 0.3 }
        )

        statsObserver.observe(statsEl)
      } else {
        startStatsAnimation()
      }

      if (!('IntersectionObserver' in window)) {
        showDemoChart.value = true
      }

      attachCursorGlow(resolveHostElement(heroSectionRef.value), 'hero')
      attachCursorGlow(resolveHostElement(chartDemoRef.value), 'demo')
      attachCursorGlow(resolveHostElement(statsSectionRef.value), 'stats')
    })
  })

  onBeforeUnmount(() => {
    if (revealObserver) {
      revealObserver.disconnect()
      revealObserver = null
    }

    if (statsObserver) {
      statsObserver.disconnect()
      statsObserver = null
    }

    if (scrollFrameId) {
      cancelAnimationFrame(scrollFrameId)
      scrollFrameId = null
    }

    pointerCleanups.forEach((cleanup) => cleanup())
    Object.values(pointerFrames).forEach((frameId) => {
      if (frameId) cancelAnimationFrame(frameId)
    })

    Object.values(counterFrames).forEach((frameId) => cancelAnimationFrame(frameId))
  })

  return {
    handleExploreCapabilities,
  }
}
