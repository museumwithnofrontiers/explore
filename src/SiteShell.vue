<script setup>
// The page structure is entirely @museumwnf/viewer-layout's SiteShell, which
// composes PageShell from what `dataset.config.js` puts under `navigation`
// and `links`: the menu, the header/footer link lists, the search submit and
// the banner. Nothing here builds a menu or reads `useSection()` — that
// belongs to the shared component, once, and a website that duplicates it
// drifts from the platform the next time SiteShell gains a feature.
//
// What is this website's own is legacy's chrome (explore-client App.vue):
// MWNF's logo, linking to its portal, before Explore's (the config's
// `brand`, linking home); the language switcher beside the header's links;
// and the footer with the language policy.
import { computed } from 'vue'
import { useI18n, useSiteConfig } from '@museumwnf/viewer-core'
import { chromeAsset } from '@museumwnf/viewer-layout'
import { SiteShell } from '@museumwnf/viewer-layout/components'
import ExploreFooter from './components/ExploreFooter.vue'
import { chrome } from './composables/chrome.js'

const { t } = useI18n()
const { links } = useSiteConfig()

const logos = computed(() => [
  { image: chromeAsset(chrome, 'logo.jpg'), alt: t('explore.identity.organisation'), href: links.portal },
])
</script>

<template>
  <SiteShell
    v-bind="$attrs"
    header-home="#/"
    :header-logos="logos"
    language-placement="header"
    language-style="select"
  >
    <slot />
    <template #footer>
      <ExploreFooter />
    </template>
  </SiteShell>
</template>
