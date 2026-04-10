<template>
  <div ref="root" :class="['language-switcher', { compact }]">
    <span v-if="showLabel" class="language-label">{{ languageLabel }}</span>
    <span v-else class="sr-only">{{ languageLabel }}</span>

    <button
      type="button"
      class="language-trigger"
      :aria-label="languageLabel"
      :aria-expanded="menuOpen.toString()"
      aria-haspopup="menu"
      :title="languageLabel"
      @click="toggleMenu"
    >
      <svg class="language-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 5h8M8 5c0 6-2.2 10.7-6 14M12 5h8M16 5c0 5.4 1.8 10.2 5 14M7 12h10M12 12c1.2 2.7 3 5.1 5.3 7M12 12c-1.1-2.5-2.8-4.8-5-7M10 19h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <transition name="fade-pop">
      <div v-if="menuOpen" class="language-menu" role="menu">
        <button
          v-for="locale in supportedLocales"
          :key="locale.code"
          type="button"
          class="language-option"
          :class="{ active: locale.code === currentLocale }"
          :data-locale="locale.code"
          role="menuitemradio"
          :aria-checked="(locale.code === currentLocale).toString()"
          @click="selectLocale(locale.code)"
        >
          <span class="language-option-name">{{ locale.nativeLabel }}</span>
          <span v-if="locale.code === currentLocale" class="language-option-check" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M3.5 8.2 6.6 11l5.9-6.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
      </div>
    </transition>
  </div>
</template>

<script>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useLocale } from '../composables/useLocale'

export default {
  name: 'LanguageSwitcher',
  props: {
    compact: {
      type: Boolean,
      default: false,
    },
    showLabel: {
      type: Boolean,
      default: true,
    },
  },
  setup() {
    const {
      currentLocale,
      languageLabel,
      supportedLocales,
      setLocale,
    } = useLocale()
    const menuOpen = ref(false)
    const root = ref(null)

    const closeMenu = () => {
      menuOpen.value = false
    }

    const toggleMenu = () => {
      menuOpen.value = !menuOpen.value
    }

    const selectLocale = (localeCode) => {
      setLocale(localeCode)
      closeMenu()
    }

    const isInside = (event, element) => {
      if (!element) return false
      if (typeof event.composedPath === 'function') {
        return event.composedPath().includes(element)
      }

      return element.contains(event.target)
    }

    const handleOutsideClick = (event) => {
      if (!isInside(event, root.value)) {
        closeMenu()
      }
    }

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleOutsideClick)
      document.addEventListener('keydown', handleKeydown)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('click', handleOutsideClick)
      document.removeEventListener('keydown', handleKeydown)
    })

    return {
      currentLocale,
      languageLabel,
      supportedLocales,
      menuOpen,
      root,
      toggleMenu,
      selectLocale,
    }
  },
}
</script>

<style scoped>
.language-switcher {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.language-switcher.compact .language-label {
  display: none;
}

.language-label {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}

.language-trigger {
  border: 1px solid var(--border);
  background: #1f1f1f;
  color: var(--muted);
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.16s ease;
}

.language-trigger:hover,
.language-trigger[aria-expanded="true"] {
  color: #b9f0c9;
  border-color: rgba(29, 185, 84, 0.45);
  background: rgba(29, 185, 84, 0.16);
}

.language-trigger:focus-visible,
.language-option:focus-visible {
  outline: none;
  border-color: rgba(29, 185, 84, 0.45);
  box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.14);
}

.language-icon {
  width: 19px;
  height: 19px;
  display: block;
}

.language-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 180px;
  padding: 7px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #1d1d1d;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
  z-index: 45;
}

.language-option {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  padding: 10px 11px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.14s ease;
}

.language-option:hover {
  background: #2a2a2a;
  transform: translateX(2px);
}

.language-option.active {
  color: #b9f0c9;
  background: rgba(29, 185, 84, 0.16);
  border-color: rgba(29, 185, 84, 0.25);
}

.language-option-name {
  white-space: nowrap;
}

.language-option-check {
  width: 16px;
  height: 16px;
  color: currentColor;
  flex: 0 0 auto;
}

.language-option-check svg {
  width: 16px;
  height: 16px;
  display: block;
}

.fade-pop-enter-active,
.fade-pop-leave-active {
  transition: all 0.16s ease;
}

.fade-pop-enter-from,
.fade-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
