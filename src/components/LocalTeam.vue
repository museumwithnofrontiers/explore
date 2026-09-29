<script setup>
import { computed, ref } from 'vue'
import { md, useI18n } from '@museumwnf/viewer-core'

// Legacy's local team of an itinerary or a sub-itinerary, shown on request
// under its toggle.
const props = defineProps({
  /** The team, as the itinerary's text carries it (Markdown). */
  team: { type: String, default: '' },
  dir: { type: String, default: '' },
})
const { t } = useI18n()
const open = ref(false)
const html = computed(() => md(props.team))
</script>

<template>
  <section v-if="team" class="explore-team">
    <button type="button" class="explore-team__toggle" :aria-expanded="open ? 'true' : 'false'" @click="open = !open">
      {{ open ? t('explore.itinerary.hideLocalTeam') : t('explore.itinerary.showLocalTeam') }}
    </button>
    <div v-if="open" class="explore-team__text explore-prose" :dir="dir || undefined" v-html="html"></div>
  </section>
</template>
