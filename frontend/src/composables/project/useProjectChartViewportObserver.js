export function useProjectChartViewportObserver(syncViewportHeightFromResize) {
  const parseCssPx = (value) => {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const readViewportContentHeight = (element) => {
    if (!element) return 0

    const clientHeight = Number(element.clientHeight || 0)
    if (
      clientHeight > 0
      && typeof window !== 'undefined'
      && typeof window.getComputedStyle === 'function'
    ) {
      const style = window.getComputedStyle(element)
      const verticalPadding = parseCssPx(style?.paddingTop) + parseCssPx(style?.paddingBottom)
      const contentHeight = clientHeight - verticalPadding
      if (contentHeight > 0) return contentHeight
    }

    return Number(element.getBoundingClientRect?.().height || clientHeight || 0)
  }

  let chartViewportResizeObserver = null
  let observedChartViewportElement = null
  let chartViewportSyncFrameId = null
  let pendingChartViewportHeight = null

  const syncChartViewportHeight = (height) => {
    pendingChartViewportHeight = height
    if (chartViewportSyncFrameId !== null) return

    chartViewportSyncFrameId = requestAnimationFrame(() => {
      chartViewportSyncFrameId = null
      const nextHeight = pendingChartViewportHeight
      pendingChartViewportHeight = null
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) return
      syncViewportHeightFromResize(nextHeight)
    })
  }

  const disconnectChartViewportObserver = () => {
    if (chartViewportResizeObserver) {
      chartViewportResizeObserver.disconnect()
    }

    chartViewportResizeObserver = null
    observedChartViewportElement = null

    if (chartViewportSyncFrameId !== null) {
      cancelAnimationFrame(chartViewportSyncFrameId)
      chartViewportSyncFrameId = null
    }

    pendingChartViewportHeight = null
  }

  const observeChartViewport = (element) => {
    if (typeof ResizeObserver === 'undefined') return

    if (!element) {
      disconnectChartViewportObserver()
      return
    }

    if (observedChartViewportElement === element && chartViewportResizeObserver) return

    if (!chartViewportResizeObserver) {
      chartViewportResizeObserver = new ResizeObserver((entries) => {
        const height = entries?.[0]?.contentRect?.height
        syncChartViewportHeight(height)
      })
    } else if (observedChartViewportElement) {
      chartViewportResizeObserver.unobserve(observedChartViewportElement)
    }

    chartViewportResizeObserver.observe(element)
    observedChartViewportElement = element
    syncChartViewportHeight(readViewportContentHeight(element))
  }

  return {
    observeChartViewport,
    disconnectChartViewportObserver,
  }
}
