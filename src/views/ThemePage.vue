<script setup>
import { computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { NotFoundView, md, useI18n, useRecordLanguage } from '@museumwnf/viewer-core'
import ExploreFrame from '../components/ExploreFrame.vue'
import ExploreMap from '../components/ExploreMap.vue'
import ExploreTiles from '../components/ExploreTiles.vue'
import PlaceMenu from '../components/PlaceMenu.vue'
import ReadIn from '../components/ReadIn.vue'
import TravelRecords from '../components/TravelRecords.vue'
import {
  byTitle, collectionById, countryPicture, legacyId, placeLink, placePosition,
  themeCountries, ownText, title, travelFor, useCollectionLanguages, useTexts,
} from '../composables/explore.js'

// A theme's page, as legacy's ExplorePage: its name in English; its
// introduction in full, "Read in" the languages it is written in; then its
// countries on their pictures, and the travel records scoped to the theme.
const props = defineProps({
  id: { type: String, required: true },
})
const { t, locale } = useI18n()
const ready = useTexts(['collections', 'countries'])

const theme = computed(() => {
  const collection = collectionById(props.id)
  return collection?.type === 'theme' ? collection : null
})
// Legacy offered every language the theme has a row in, its introduction
// empty in some.
const languages = useCollectionLanguages(() => theme.value)
const { language, select, dir } = useRecordLanguage(theme, { languages: () => languages.value })

const name = computed(() => title(theme.value, 'en'))
// Each language's own row: legacy showed an empty introduction empty.
const description = computed(() => md(ownText('collections', theme.value?.id, language.value).description))

const countryTiles = computed(() =>
  [...themeCountries(theme.value)].sort(byTitle(locale.value)).map((country) => ({
    id: country.id,
    label: title(country, locale.value),
    image: countryPicture(country),
    to: placeLink(country, { theme: theme.value }),
  })),
)
// Legacy's map: the theme's countries, no closer than the theme's own zoom.
const pins = computed(() =>
  themeCountries(theme.value).flatMap((country) => {
    const at = placePosition(country)
    return at ? [{ ...at, label: title(country, locale.value), to: placeLink(country, { theme: theme.value }) }] : []
  }),
)
const travel = computed(() => travelFor('theme', legacyId(theme.value)))
const crumbs = computed(() => [{ label: t('core.nav.home'), to: { name: 'home' } }, { label: title(theme.value, locale.value) }])

// Legacy skipped the theme's own page when the theme covers a single
// country: its router opened that country, explored by the theme
// (explore-client router.js, "Skip Theme level if there is only one Country").
const router = useRouter()
const onlyCountry = computed(() => {
  const list = themeCountries(theme.value)
  return list.length === 1 ? list[0] : null
})
watchEffect(() => {
  if (onlyCountry.value) router.replace(placeLink(onlyCountry.value, { theme: theme.value }))
})
</script>

<template>
  <NotFoundView v-if="!theme" />
  <p v-else-if="!ready || onlyCountry" class="explore-loading">{{ t('core.status.loading') }}</p>
  <ExploreFrame
    v-else
    :crumbs="crumbs"
    :selection="{ mode: 'theme', theme }"
  >
    <article class="explore-page">
      <h1 class="explore-page__title">{{ name }}</h1>
      <div class="explore-description">
        <ReadIn :languages="languages" :language="language" @select="select" />
        <div class="explore-page__text explore-prose" :dir="dir || undefined" v-html="description"></div>
      </div>
      <PlaceMenu :travel="travel" />
      <ExploreMap v-if="pins.length" :pins="pins" :zoom="placePosition(theme)?.zoom ?? null" />
      <ExploreTiles :heading="t('explore.next.country')" :tiles="countryTiles" kind="country" />
      <TravelRecords :books="travel.books" :tours="travel.tours" />
    </article>
  </ExploreFrame>
</template>
