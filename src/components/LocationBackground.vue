<script setup>
import { computed } from 'vue'
import { md, useI18n } from '@museumwnf/viewer-core'
import { locationBackground, title } from '../composables/explore.js'

// A location's historical background, on its own page and on a
// sub-itinerary's: `locationBackground()`'s texts under legacy's heading, the
// location's name and the dictionary's word.
const props = defineProps({
  location: { type: Object, default: null },
  /** The language it is read in. */
  language: { type: String, required: true },
  dir: { type: String, default: '' },
})
const { t } = useI18n()

const texts = computed(() =>
  locationBackground(props.location, props.language).map((entry) => ({ ...entry, html: md(entry.text) })),
)
</script>

<template>
  <section v-if="texts.length" class="explore-background">
    <h2 class="explore-background__heading">{{ title(location, language) }} | {{ t('explore.location.background') }}</h2>
    <div v-for="entry in texts" :key="entry.key" class="explore-background__text">
      <div class="explore-prose" :dir="dir || undefined" v-html="entry.html"></div>
      <p v-if="entry.by" class="explore-page__credit">{{ t('sheet.field.preparedBy') }}: {{ entry.by }}</p>
    </div>
  </section>
</template>
