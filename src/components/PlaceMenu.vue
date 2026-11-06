<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from '@museumwnf/viewer-core'
import LocationBackground from './LocationBackground.vue'
import { backgroundSources, byLanguage, describedLanguages, recordTexts, useContentLanguages } from '../composables/explore.js'

// Legacy's tab menu on a theme's, a country's, a territory's and a location's
// page (explore-client ExplorePage): "HISTORICAL BACKGROUND" where the
// location has one, "GET DIRECTIONS" where the page has how to reach it or a
// contact, "ADDITIONAL INFORMATION" where it has information, accommodations,
// guided visits or useful websites. The background is the tab open first;
// a page without one opens on nothing until a tab is chosen. Legacy read
// these texts in English and wrote every word in English.
const props = defineProps({
  /** The location whose historical background the first tab shows. */
  location: { type: Object, default: null },
  /** The page's own texts in English: `how_to_reach`, `contact`, `info`, as Markdown rendered to HTML. */
  fields: { type: Object, default: () => ({}) },
  /** `travelFor()`'s answer. */
  travel: { type: Object, default: () => ({}) },
})
const { t } = useI18n()
const codes = useContentLanguages()

const hasBackground = computed(() =>
  backgroundSources(props.location).some((id) => describedLanguages(codes, id).length > 0),
)
const directions = computed(() =>
  [
    { key: 'howToReach', label: t('explore.info.howToReach'), html: props.fields.how_to_reach },
    { key: 'contact', label: t('explore.info.contact'), html: props.fields.contact },
  ].filter((field) => field.html),
)

const contact = (record) => {
  const texts = recordTexts(record, 'en')
  return {
    id: record.id,
    lines: [texts.name ?? texts.title, texts.street, texts.city, texts.zip, texts.phone, texts.fax, texts.email].filter(Boolean),
    url: texts.url ?? texts.link ?? '',
    person: texts.contact_person ?? '',
    note: texts.note ?? '',
  }
}
const categoryName = (code) => {
  const category = (props.travel.categories ?? []).find((c) => c.code === code)
  return category ? (byLanguage(category.names, 'en') ?? code) : ''
}
const accommodations = computed(() =>
  (props.travel.accommodations ?? []).map((record) => ({ ...contact(record), category: categoryName(record.category) })),
)
const guidedVisits = computed(() => (props.travel.guidedVisits ?? []).map(contact))
const websites = computed(() =>
  (props.travel.usefulWebsites ?? []).map((site) => {
    const texts = recordTexts(site, 'en')
    return { id: site.id, title: texts.title ?? '', url: texts.link ?? '' }
  }),
)
const hasAdditional = computed(
  () => Boolean(props.fields.info) || accommodations.value.length + guidedVisits.value.length + websites.value.length > 0,
)

const tabs = computed(() =>
  [
    { key: 'background', label: t('explore.location.backgroundTab'), shown: hasBackground.value },
    { key: 'directions', label: t('explore.monument.directions'), shown: directions.value.length > 0 },
    { key: 'additional', label: t('explore.info.heading'), shown: hasAdditional.value },
  ].filter((tab) => tab.shown),
)
const view = ref('background')
watch(() => props.location?.id, () => { view.value = 'background' })
</script>

<template>
  <div v-if="tabs.length" class="explore-place-menu">
    <div class="explore-menu" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        class="explore-menu__item"
        :class="{ 'explore-menu__item--selected': view === tab.key }"
        :aria-selected="view === tab.key ? 'true' : 'false'"
        @click="view = tab.key"
      >{{ tab.label }}</button>
    </div>

    <LocationBackground v-if="view === 'background' && hasBackground" :location="location" />

    <div v-if="view === 'directions'" class="explore-directions">
      <div v-for="field in directions" :key="field.key" class="explore-field">
        <span class="explore-field__label">{{ field.label }}</span>
        <span class="explore-field__value" v-html="field.html"></span>
      </div>
    </div>

    <div v-if="view === 'additional'" class="explore-additional-container">
      <div v-if="fields.info" class="explore-field">
        <span class="explore-field__label">{{ t('explore.info.information') }}</span>
        <span class="explore-field__value" v-html="fields.info"></span>
      </div>
      <div v-if="accommodations.length" class="explore-additional">
        <div class="explore-additional__label">{{ t('explore.info.accommodations') }}</div>
        <div v-for="entry in accommodations" :key="entry.id" class="explore-additional__entry">
          <div v-for="(line, index) in entry.lines.slice(0, 1)" :key="`n${index}`">{{ line }}</div>
          <div v-if="entry.category" class="explore-additional__category">{{ entry.category }}</div>
          <div v-for="(line, index) in entry.lines.slice(1)" :key="index">{{ line }}</div>
          <div v-if="entry.url"><a :href="entry.url" target="_blank" rel="noopener">{{ entry.url }}</a></div>
          <div v-if="entry.note">{{ entry.note }}</div>
        </div>
      </div>
      <div v-if="guidedVisits.length" class="explore-additional">
        <div class="explore-additional__label">{{ t('explore.info.guidedVisits') }}</div>
        <div v-for="entry in guidedVisits" :key="entry.id" class="explore-additional__entry">
          <div v-for="(line, index) in entry.lines" :key="index">{{ line }}</div>
          <div v-if="entry.url"><a :href="entry.url" target="_blank" rel="noopener">{{ entry.url }}</a></div>
          <div v-if="entry.person">{{ entry.person }}</div>
          <div v-if="entry.note">{{ entry.note }}</div>
        </div>
      </div>
      <div v-if="websites.length" class="explore-additional">
        <div class="explore-additional__label">{{ t('explore.info.usefulWebsites') }}</div>
        <div v-for="site in websites" :key="site.id" class="explore-additional__entry">
          <div>{{ site.title }}</div>
          <div v-if="site.url"><a :href="site.url" target="_blank" rel="noopener">{{ site.url }}</a></div>
        </div>
      </div>
    </div>
  </div>
</template>
