import { mount } from '@vue/test-utils'
import { vi } from 'vitest'

const tabulatorState = vi.hoisted(() => ({
  instance: null,
  config: null,
  constructorSpy: vi.fn(),
}))

vi.mock('tabulator-tables', () => ({
  TabulatorFull: function TabulatorFull(element, config) {
    const instance = {
      redraw: vi.fn(),
      replaceData: vi.fn(),
      setColumns: vi.fn(),
      destroy: vi.fn(),
    }
    tabulatorState.instance = instance
    tabulatorState.config = config
    tabulatorState.constructorSpy(element, config)
    return instance
  },
}))

vi.mock('tabulator-tables/dist/css/tabulator.min.css', () => ({}))

import DataTable from '../../../src/components/project/DataTable.vue'

const createResizeObserverMock = () => {
  const observe = vi.fn()
  const disconnect = vi.fn()
  const ResizeObserver = vi.fn(function ResizeObserver(callback) {
    this.callback = callback
    this.observe = observe
    this.disconnect = disconnect
  })

  return {
    ResizeObserver,
    observe,
    disconnect,
  }
}

const buildProps = (overrides = {}) => ({
  columns: [
    { title: 'Revenue', field: 'revenue', editor: 'input', metaType: 'metric' },
  ],
  rows: [
    { id: 1, revenue: 100 },
  ],
  active: true,
  editable: true,
  ...overrides,
})

describe('DataTable', () => {
  let resizeObserverMock

  beforeEach(() => {
    tabulatorState.instance = null
    tabulatorState.config = null
    tabulatorState.constructorSpy.mockReset()

    resizeObserverMock = createResizeObserverMock()
    vi.stubGlobal('ResizeObserver', resizeObserverMock.ResizeObserver)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb()
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('initializes Tabulator with mapped columns and emits cell-edited in editable mode', async () => {
    const wrapper = mount(DataTable, {
      props: buildProps(),
      attachTo: document.body,
    })

    expect(tabulatorState.constructorSpy).toHaveBeenCalledTimes(1)
    expect(tabulatorState.config.data).toEqual([{ id: 1, revenue: 100 }])
    expect(tabulatorState.config.columns).toEqual([
      { title: 'Revenue', field: 'revenue', editor: 'input' },
    ])
    expect(resizeObserverMock.observe).toHaveBeenCalled()

    tabulatorState.config.tableBuilt()

    const editSpy = vi.fn()
    tabulatorState.config.cellClick(null, { edit: editSpy })
    expect(editSpy).toHaveBeenCalledWith(true)

    tabulatorState.config.cellEdited({
      getRow: () => ({ getData: () => ({ id: 1, revenue: 250 }) }),
      getField: () => 'revenue',
      getValue: () => 250,
    })

    expect(wrapper.emitted('cell-edited')).toEqual([
      [{ row: { id: 1, revenue: 250 }, field: 'revenue', value: 250 }],
    ])
  })

  it('disables editing when editable is false', () => {
    mount(DataTable, {
      props: buildProps({
        editable: false,
      }),
      attachTo: document.body,
    })

    expect(tabulatorState.config.columns).toEqual([
      { title: 'Revenue', field: 'revenue', editor: false, editable: false },
    ])

    const editSpy = vi.fn()
    tabulatorState.config.cellClick(null, { edit: editSpy })
    expect(editSpy).not.toHaveBeenCalled()
  })

  it('updates rows, columns, and redraws when the table is ready', async () => {
    const wrapper = mount(DataTable, {
      props: buildProps(),
      attachTo: document.body,
    })

    tabulatorState.config.tableBuilt()
    tabulatorState.instance.redraw.mockClear()

    await wrapper.setProps({
      rows: [{ id: 2, revenue: 300 }],
    })
    expect(tabulatorState.instance.replaceData).toHaveBeenCalledWith([{ id: 2, revenue: 300 }])

    await wrapper.setProps({
      columns: [{ title: 'Cost', field: 'cost', metaType: 'metric' }],
    })
    expect(tabulatorState.instance.setColumns).toHaveBeenCalledWith([
      { title: 'Cost', field: 'cost' },
    ])

    await wrapper.setProps({
      editable: false,
    })
    expect(tabulatorState.instance.setColumns).toHaveBeenLastCalledWith([
      { title: 'Cost', field: 'cost', editor: false, editable: false },
    ])
  })

  it('flushes pending rows and columns after tableBuilt and cleans up on unmount', async () => {
    const wrapper = mount(DataTable, {
      props: buildProps(),
      attachTo: document.body,
    })

    await wrapper.setProps({
      rows: [{ id: 3, revenue: 400 }],
      columns: [{ title: 'Amount', field: 'amount', metaType: 'metric' }],
    })

    expect(tabulatorState.instance.replaceData).not.toHaveBeenCalled()
    expect(tabulatorState.instance.setColumns).not.toHaveBeenCalled()

    tabulatorState.config.tableBuilt()

    expect(tabulatorState.instance.setColumns).toHaveBeenCalledWith([
      { title: 'Amount', field: 'amount' },
    ])
    expect(tabulatorState.instance.replaceData).toHaveBeenCalledWith([{ id: 3, revenue: 400 }])

    wrapper.unmount()

    expect(resizeObserverMock.disconnect).toHaveBeenCalled()
    expect(tabulatorState.instance.destroy).toHaveBeenCalled()
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1)
  })
})
