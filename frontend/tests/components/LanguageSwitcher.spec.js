import { mount } from '@vue/test-utils'
import i18n, { setLocale } from '../../src/i18n'
import LanguageSwitcher from '../../src/components/LanguageSwitcher.vue'
import { withI18n } from '../support/i18n'

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('opens the language menu from the icon trigger and switches locale', async () => {
    const wrapper = mount(LanguageSwitcher, withI18n({
      props: {
        compact: true,
        showLabel: false,
      },
    }))

    const trigger = wrapper.get('.language-trigger')
    expect(trigger.attributes('aria-expanded')).toBe('false')

    await trigger.trigger('click')
    expect(trigger.attributes('aria-expanded')).toBe('true')

    await wrapper.get('[data-locale="ru"]').trigger('click')

    expect(i18n.global.locale.value).toBe('ru')
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })
})
