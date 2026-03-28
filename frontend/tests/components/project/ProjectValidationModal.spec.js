import { mount } from '@vue/test-utils'
import ProjectValidationModal from '../../../src/components/project/ProjectValidationModal.vue'

const buildProps = (overrides = {}) => ({
  isOpen: true,
  summaryLine: '7 imported, 1 skipped, 2 problematic columns, 1 normalized, 4 may become null.',
  summary: {
    rows_imported: 7,
    rows_skipped: 1,
    problematic_columns: 2,
    normalized_cells: 1,
    nullified_cells: 4,
  },
  problemColumns: [
    {
      column_index: 2,
      column_name: 'Revenue',
      problematic_value_count: 3,
      normalized_count: 1,
      nullified_count: 2,
      review_samples: [
        {
          row: 4,
          original_value: '12,5',
          action: 'normalized',
          new_value: 12.5,
          reason: 'Numeric format normalized',
        },
        {
          row: 6,
          original_value: 'abc',
          action: 'nullified',
          new_value: null,
          reason: 'Invalid numeric value',
        },
      ],
    },
    {
      column_index: 3,
      column_name: 'EventDate',
      problematic_value_count: 2,
      normalized_count: 0,
      nullified_count: 2,
      review_samples: [
        {
          row: 5,
          original_value: '2024/13/44',
          action: 'nullified',
          new_value: null,
          reason: 'Invalid date or datetime value',
        },
      ],
    },
  ],
  blockingError: null,
  ...overrides,
})

const mountModal = (props = {}) =>
  mount(ProjectValidationModal, {
    props,
    global: {
      stubs: {
        teleport: true,
      },
    },
  })

describe('ProjectValidationModal', () => {
  it('renders compact validation summary', () => {
    const wrapper = mountModal(buildProps())

    expect(wrapper.text()).toContain('Import Review')
    expect(wrapper.text()).toContain('Rows imported')
    expect(wrapper.text()).toContain('Rows skipped')
    expect(wrapper.text()).toContain('Problematic columns')
    expect(wrapper.text()).toContain('Normalized values')
    expect(wrapper.text()).toContain('May become null')
    expect(wrapper.text()).toContain('7 imported, 1 skipped, 2 problematic columns')
  })

  it('shows dataset lock note at the top only when enabled', () => {
    const hiddenNoteWrapper = mountModal(buildProps({
      showDatasetBindingNote: false,
    }))
    expect(hiddenNoteWrapper.text()).not.toContain('This project already contains a dataset.')

    const visibleNoteWrapper = mountModal(buildProps({
      showDatasetBindingNote: true,
    }))
    expect(visibleNoteWrapper.text()).toContain('This project already contains a dataset.')
    expect(visibleNoteWrapper.text()).toContain('To work with another dataset, create a new project.')
  })

  it('renders problematic columns with normalized/nullified counters', () => {
    const wrapper = mountModal(buildProps())

    expect(wrapper.text()).toContain('Revenue')
    expect(wrapper.text()).toContain('3 problematic values')
    expect(wrapper.text()).toContain('Problematic values')
    expect(wrapper.text()).toContain('Normalized: 1')
    expect(wrapper.text()).toContain('Nullified: 2')
    expect(wrapper.text()).toContain('EventDate')
    expect(wrapper.text()).toContain('2 problematic values')
  })

  it('renders review samples with row, original value, action, result and reason', () => {
    const wrapper = mountModal(buildProps())

    expect(wrapper.text()).toContain('Row')
    expect(wrapper.text()).toContain('Original value')
    expect(wrapper.text()).toContain('Action')
    expect(wrapper.text()).toContain('Result')
    expect(wrapper.text()).toContain('Reason')
    expect(wrapper.text()).toContain('12,5')
    expect(wrapper.text()).toContain('normalized')
    expect(wrapper.text()).toContain('12.5')
    expect(wrapper.text()).toContain('abc')
    expect(wrapper.text()).toContain('nullified')
    expect(wrapper.text()).toContain('null')
    expect(wrapper.text()).toContain('Invalid numeric value')
  })

  it('does not flood visible review samples with empty-marker entries', () => {
    const wrapper = mountModal(buildProps({
        problemColumns: [
          {
            column_index: 2,
            column_name: 'Revenue',
            problematic_value_count: 3,
            normalized_count: 0,
            nullified_count: 3,
            review_samples: [
              {
                row: 4,
                original_value: null,
                action: 'nullified',
                new_value: null,
                reason: 'Empty marker converted to null',
              },
              {
                row: 5,
                original_value: 'abc',
                action: 'nullified',
                new_value: null,
                reason: 'Invalid numeric value',
              },
            ],
          },
        ],
      }))

    expect(wrapper.text()).toContain('abc')
    expect(wrapper.text()).not.toContain('Empty marker converted to null')
  })

  it('does not render old severity-dump contract as main UI', () => {
    const wrapper = mountModal(buildProps({
        problemColumns: [
          {
            column_index: 2,
            column_name: 'Revenue',
            issue_count: 3,
            normalized_count: 1,
            nullified_count: 2,
            review_samples: [
              {
                row: 4,
                original_value: '12,5',
                action: 'normalized',
                new_value: 12.5,
                reason: 'Numeric format normalized',
              },
            ],
          },
        ],
      }))

    expect(wrapper.text()).not.toContain('ERRORS')
    expect(wrapper.text()).not.toContain('warnings:')
    expect(wrapper.text()).not.toContain('Column Quality Overview')
    expect(wrapper.text()).not.toContain('legacy_warning')
  })
})
