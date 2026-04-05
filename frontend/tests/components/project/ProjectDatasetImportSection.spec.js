import { mount } from '@vue/test-utils'
import ProjectDatasetImportSection from '../../../src/components/project/ProjectDatasetImportSection.vue'

const buildProps = (overrides = {}) => ({
  importMode: 'file',
  importOptions: { has_header: true, delimiter: ',' },
  selectedFile: null,
  importing: false,
  manualHeaders: ['Name', 'Value'],
  manualRowsInput: [['North', '100'], ['South', '200']],
  manualError: '',
  ...overrides,
})

describe('ProjectDatasetImportSection', () => {
  it('renders file import mode, reflects selected file name, and emits file import actions', async () => {
    const wrapper = mount(ProjectDatasetImportSection, {
      props: buildProps({
        selectedFile: { name: 'dataset.csv' },
      }),
    })

    expect(wrapper.text()).toContain('Add Data')
    expect(wrapper.text()).toContain('dataset.csv')

    const fileModeButtons = wrapper.findAll('button')
    await fileModeButtons[0].trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)

    await fileModeButtons[2].trigger('click')
    expect(wrapper.emitted('change-import-mode')).toEqual([['manual']])

    await fileModeButtons[3].trigger('click')
    expect(wrapper.emitted('open-demo')).toHaveLength(1)

    const form = wrapper.find('form')
    await form.trigger('submit.prevent')
    expect(wrapper.emitted('import')).toHaveLength(1)

    const importButton = wrapper.find('button.btn.primary')
    expect(importButton.attributes('disabled')).toBeUndefined()
  })

  it('emits file selection and import option updates in file mode', async () => {
    const wrapper = mount(ProjectDatasetImportSection, {
      props: buildProps(),
    })

    const fileInput = wrapper.find('input[type="file"]')
    const mockFile = new File(['a,b\n1,2'], 'data.csv', { type: 'text/csv' })
    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [mockFile],
    })
    await fileInput.trigger('change')
    expect(wrapper.emitted('file-select')).toHaveLength(1)

    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(false)
    expect(wrapper.emitted('change-import-options')[0][0]).toEqual({
      has_header: false,
      delimiter: ',',
    })

    const delimiterInput = wrapper.find('input[name="delimiter"]')
    await delimiterInput.setValue(';')
    expect(wrapper.emitted('change-import-options')[1][0]).toEqual({
      has_header: true,
      delimiter: ';',
    })
  })

  it('renders manual mode controls and emits manual table structure actions', async () => {
    const wrapper = mount(ProjectDatasetImportSection, {
      props: buildProps({
        importMode: 'manual',
        manualHeaders: ['Region'],
        manualRowsInput: [['North']],
      }),
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.some((button) => button.text() === '+ Column')).toBe(true)
    expect(buttons.some((button) => button.text() === '+ Row')).toBe(true)

    const removeColumnButton = buttons.find((button) => button.text() === '- Column')
    const removeRowButton = buttons.find((button) => button.text() === '- Row')
    expect(removeColumnButton.attributes('disabled')).toBeDefined()
    expect(removeRowButton.attributes('disabled')).toBeDefined()

    await buttons.find((button) => button.text() === '+ Column').trigger('click')
    await buttons.find((button) => button.text() === '+ Row').trigger('click')
    await buttons.find((button) => button.text() === 'Create Table').trigger('click')

    expect(wrapper.emitted('add-manual-column')).toHaveLength(1)
    expect(wrapper.emitted('add-manual-row')).toHaveLength(1)
    expect(wrapper.emitted('manual-import')).toHaveLength(1)
  })

  it('emits updated manual headers and rows when cell inputs change', async () => {
    const wrapper = mount(ProjectDatasetImportSection, {
      props: buildProps({
        importMode: 'manual',
      }),
    })

    const headerInput = wrapper.find('input[name="manual_header_0"]')
    await headerInput.setValue('Area')
    expect(wrapper.emitted('change-manual-headers')[0][0]).toEqual(['Area', 'Value'])

    const cellInput = wrapper.find('input[name="manual_cell_1_1"]')
    await cellInput.setValue('250')
    expect(wrapper.emitted('change-manual-rows')[0][0]).toEqual([
      ['North', '100'],
      ['South', '250'],
    ])
  })

  it('shows manual error and disables the primary action while importing', () => {
    const wrapper = mount(ProjectDatasetImportSection, {
      props: buildProps({
        importMode: 'manual',
        importing: true,
        manualError: 'Headers are required.',
      }),
    })

    expect(wrapper.text()).toContain('Headers are required.')
    const primaryButton = wrapper.findAll('button').find((button) => button.text() === 'Creating...')
    expect(primaryButton.text()).toBe('Creating...')
    expect(primaryButton.attributes('disabled')).toBeDefined()
  })
})
