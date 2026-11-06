<script setup>
// The page structure is entirely @museumwnf/viewer-layout's SiteShell, which
// composes PageShell from what `dataset.config.js` puts under `navigation`
// and `links`: the menu, the footer link lists and the banner. Nothing here
// builds a menu or reads `useSection()` — that belongs to the shared
// component, once, and a website that duplicates it drifts from the platform
// the next time SiteShell gains a feature.
//
// What is this website's own is legacy's chrome (explore-client App.vue): the
// header, with MWNF's logo, Explore's, the links and the search button with
// its overlay (components/ExploreHeader.vue), and the footer with the
// language policy. Legacy's interface was English only, its texts offering
// their languages through "Read in" (inventory-app#2424): no language list.
import { SiteShell } from '@museumwnf/viewer-layout/components'
import ExploreFooter from './components/ExploreFooter.vue'
import ExploreHeader from './components/ExploreHeader.vue'
</script>

<template>
  <SiteShell v-bind="$attrs">
    <template #header>
      <ExploreHeader />
    </template>
    <slot />
    <template #footer>
      <ExploreFooter />
    </template>
  </SiteShell>
</template>
