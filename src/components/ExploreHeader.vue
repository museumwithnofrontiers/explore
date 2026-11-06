<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n, useSiteConfig } from '@museumwnf/viewer-core'
import { chromeAsset } from '@museumwnf/viewer-layout'
import { chrome } from '../composables/chrome.js'

// Legacy's header (explore-client App.vue, inventory-app#2424): MWNF's logo,
// linking to its portal, then Explore's, linking home; the four links; the
// search button, which lays legacy's overlay over the header and the banner:
// "MWNF Database Search" or "Google-powered Search", the term, the submit,
// and "Important Information". Below 950px the links fold into the menu
// button's overlay, with the three ways to explore. Legacy wrote all of it in
// English on every page.
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { links } = useSiteConfig()

const mwnfLogo = computed(() => chromeAsset(chrome, 'logo.jpg'))
const exploreLogo = computed(() => chromeAsset(chrome, 'explorelogo_wide.png'))

const searchOpen = ref(false)
const menuOpen = ref(false)
const type = ref(route.name === 'search' && route.params.type === 'google' ? 'google' : 'mwnf')
const term = ref('')
const placeholder = computed(() => (type.value === 'google' ? t('explore.search.placeholderGoogle') : t('explore.search.placeholderMwnf')))
const message = ref('')

watch(() => route.fullPath, () => {
  searchOpen.value = false
  menuOpen.value = false
})
watch(searchOpen, (open) => {
  if (!open) {
    term.value = ''
    message.value = ''
  }
})

function submit() {
  const q = term.value.trim()
  if (!q) {
    message.value = t('explore.search.enterTerm')
    return
  }
  if (route.name === 'search' && route.params.type === type.value && route.query.q === q) {
    message.value = t('explore.search.alreadyShown')
    return
  }
  router.push({ name: 'search', params: { type: type.value }, query: { q } })
}

const homeSection = (hash) => ({ name: 'home', hash })
</script>

<template>
  <header class="explore-header">
    <div class="explore-header__logos">
      <a class="explore-header__mwnf" :href="links.portal" target="_blank" rel="noopener">
        <img :src="mwnfLogo" :alt="t('explore.identity.organisation')" />
      </a>
      <RouterLink class="explore-header__explore" :to="{ name: 'home' }">
        <img :src="exploreLogo" :alt="t('explore.identity.title')" />
      </RouterLink>
    </div>
    <div class="explore-header__tools">
      <nav class="explore-header__links">
        <RouterLink :to="{ name: 'new' }">{{ t('explore.nav.whatsNew') }}</RouterLink>
        <RouterLink :to="{ name: 'about' }">{{ t('core.nav.about') }}</RouterLink>
        <RouterLink :to="{ name: 'credits' }">{{ t('core.nav.credits') }}</RouterLink>
        <RouterLink :to="{ name: 'get-involved' }">{{ t('explore.nav.getInvolved') }}</RouterLink>
      </nav>
      <button class="explore-header__button" type="button" :aria-label="t('explore.search.open')" @click="searchOpen = true">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" fill="none" stroke="currentColor" stroke-width="2" /><path d="M10.2 10.2 15 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
      </button>
      <button class="explore-header__button explore-header__menu-button" type="button" :aria-label="t('explore.search.menu')" @click="menuOpen = true">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M1 3h14M1 8h14M1 13h14" stroke="currentColor" stroke-width="2" /></svg>
      </button>
    </div>

    <Transition name="explore-fade">
      <div v-if="searchOpen" class="explore-search-overlay" role="dialog" :aria-label="t('explore.search.open')">
        <button class="explore-overlay-close" type="button" :aria-label="t('explore.search.close')" @click="searchOpen = false"><svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" stroke-width="2" /></svg></button>
        <div class="explore-search-types">
          <button class="explore-search-type" :class="{ 'explore-search-type--selected': type === 'mwnf' }" type="button" @click="type = 'mwnf'">{{ t('explore.search.mwnf') }}</button>
          <button class="explore-search-type" :class="{ 'explore-search-type--selected': type === 'google' }" type="button" @click="type = 'google'">{{ t('explore.search.google') }}</button>
        </div>
        <form class="explore-search-form" role="search" @submit.prevent="submit">
          <input v-model="term" class="explore-search-input" type="search" :placeholder="placeholder" :aria-label="placeholder" />
          <button class="explore-search-submit" type="submit" :aria-label="t('explore.search.submit')">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" fill="none" stroke="currentColor" stroke-width="2" /><path d="M10.2 10.2 15 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
          </button>
        </form>
        <p v-if="message" class="explore-search-message" role="alert">{{ message }}</p>
        <RouterLink :to="{ name: 'important-information' }">{{ t('explore.nav.importantInformation') }}</RouterLink>
      </div>
    </Transition>

    <div v-if="menuOpen" class="explore-menu-overlay">
      <button class="explore-overlay-close" type="button" :aria-label="t('explore.search.close')" @click="menuOpen = false"><svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" stroke-width="2" /></svg></button>
      <nav class="explore-menu-links">
        <RouterLink :to="{ name: 'new' }">{{ t('explore.nav.whatsNew') }}</RouterLink>
        <RouterLink :to="{ name: 'about' }">{{ t('core.nav.about') }}</RouterLink>
        <RouterLink :to="homeSection('#explore-by-theme')">{{ t('explore.nav.byTheme') }}</RouterLink>
        <RouterLink :to="homeSection('#explore-by-country')">{{ t('explore.nav.byCountry') }}</RouterLink>
        <RouterLink :to="homeSection('#explore-by-itinerary')">{{ t('explore.nav.byItinerary') }}</RouterLink>
        <RouterLink :to="{ name: 'credits' }">{{ t('core.nav.credits') }}</RouterLink>
        <RouterLink :to="{ name: 'get-involved' }">{{ t('explore.nav.getInvolved') }}</RouterLink>
      </nav>
    </div>
  </header>
</template>
