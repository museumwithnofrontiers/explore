<script setup>
import { computed } from 'vue'
import { NotFoundView, languageLabels, md, useI18n, useRecordLanguage } from '@museumwnf/viewer-core'
import { RecordLanguages } from '@museumwnf/viewer-layout/content'
import AdditionalInformation from '../components/AdditionalInformation.vue'
import ExploreFrame from '../components/ExploreFrame.vue'
import ExploreTiles from '../components/ExploreTiles.vue'
import TravelRecords from '../components/TravelRecords.vue'
import {
  byTitle, collectionById, countryPicture, legacyId, partnershipsFor, placeLink, text, themeCountries, title,
  travelFor, useCollectionLanguages, useTexts,
} from '../composables/explore.js'

// A theme's page: its introduction, in any language it is written in, then
// its countries on their pictures, and the travel records scoped to the theme.
const props = defineProps({
  id: { type: String, required: true },
})
const { t, locale } = useI18n()
const ready = useTexts(['collections', 'countries'])

const theme = computed(() => {
  const collection = collectionById(props.id)
  return collection?.type === 'theme' ? collection : null
})
const languages = useCollectionLanguages(() => theme.value)
const { language, select, dir } = useRecordLanguage(theme, { languages: () => languages.value })

const name = computed(() => title(theme.value, language.value))
const description = computed(() => md(text('collections', theme.value?.id, language.value).description))

const countryTiles = computed(() =>
  [...themeCountries(theme.value)].sort(byTitle(locale.value)).map((country) => ({
    id: country.id,
    label: title(country, locale.value),
    image: countryPicture(country),
    to: placeLink(country, { theme: theme.value }),
  })),
)
const travel = computed(() => travelFor('theme', legacyId(theme.value)))
const crumbs = computed(() => [{ label: t('core.nav.home'), to: { name: 'home' } }, { label: title(theme.value, locale.value) }])
</script>

<template>
  <NotFoundView v-if="!theme" />
  <p v-else-if="!ready" class="explore-loading">{{ t('core.status.loading') }}</p>
  <ExploreFrame
    v-else
    :crumbs="crumbs"
    :selection="{ mode: 'theme', theme }"
    :partnerships="partnershipsFor({ theme })"
  >
    <article class="explore-page">
      <h1 class="explore-page__title" :dir="dir || undefined">{{ name }}</h1>
      <RecordLanguages :languages="languageLabels(languages)" :language="language" @select="select" />
      <div class="explore-page__text explore-prose" :dir="dir || undefined" v-html="description"></div>
      <ExploreTiles :heading="t('explore.next.country')" :tiles="countryTiles" />
      <AdditionalInformation :travel="travel" />
      <TravelRecords :books="travel.books" :tours="travel.tours" />
    </article>
  </ExploreFrame>
</template>
