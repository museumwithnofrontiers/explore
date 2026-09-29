<script setup>
import { computed } from 'vue'
import { mediaUrl, useI18n } from '@museumwnf/viewer-core'
import { recordTexts } from '../composables/explore.js'

// The featured partnerships (the sponsors), each its logo over its name,
// linked to its site: in the column beside a page, or in a row on the home
// page. Which ones a page shows is `partnershipsFor()`'s rule.
const props = defineProps({
  partnerships: { type: Array, default: () => [] },
  variant: { type: String, default: 'column' },
})
const { t, locale } = useI18n()

const entries = computed(() =>
  props.partnerships.map((partnership) => {
    const texts = recordTexts(partnership, locale.value)
    return {
      id: partnership.id,
      logo: mediaUrl(partnership.logo),
      title: texts.title ?? '',
      name: texts.name ?? texts.title ?? '',
      url: texts.url ?? null,
    }
  }),
)
</script>

<template>
  <section v-if="entries.length" class="explore-partnerships" :class="`explore-partnerships--${variant}`" :aria-label="t('explore.home.partnerships')">
    <component
      :is="entry.url ? 'a' : 'div'"
      v-for="entry in entries"
      :key="entry.id"
      class="explore-partnerships__entry"
      :href="entry.url || undefined"
      :target="entry.url ? '_blank' : undefined"
      :rel="entry.url ? 'noopener' : undefined"
    >
      <img v-if="entry.logo" class="explore-partnerships__logo" :src="entry.logo" :alt="entry.name" loading="lazy" />
      <span class="explore-partnerships__title">{{ entry.title }}</span>
    </component>
  </section>
</template>
