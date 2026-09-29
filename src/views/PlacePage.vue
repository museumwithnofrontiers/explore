<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { NotFoundView, languageLabels, md, useI18n, useRecordLanguage } from '@museumwnf/viewer-core'
import { RecordLanguages } from '@museumwnf/viewer-layout/content'
import AdditionalInformation from '../components/AdditionalInformation.vue'
import ExploreFrame from '../components/ExploreFrame.vue'
import ExploreMap from '../components/ExploreMap.vue'
import ExploreTiles from '../components/ExploreTiles.vue'
import LocationBackground from '../components/LocationBackground.vue'
import SuggestedRoutes from '../components/SuggestedRoutes.vue'
import TravelRecords from '../components/TravelRecords.vue'
import {
  byTitle, collectionById, countryOf, legacyId, levelOf, monumentLink, monumentName, partnershipsFor, placeLink,
  placePosition, positionOf, shownLocations, shownMonuments, shownTerritories, territoryOf, text, themeCountryText,
  themeLink, title, travelFor, useCollectionLanguages, useTexts,
} from '../composables/explore.js'

// A country's, a territory's or a location's page. Reached by theme
// (`?theme=`), it shows what the theme covers there and the theme's own text
// about the country; reached by country, everything, or what carries the
// filter chosen (`?filter=`). A country or a territory leads to its
// locations, a location to its monuments; a location also shows its
// historical background, Explore's own text first, then the Travels
// locations' introductions it names.
const props = defineProps({
  id: { type: String, required: true },
})
const { t, locale } = useI18n()
const route = useRoute()
const ready = useTexts(['collections', 'countries', 'items'])

const place = computed(() => {
  const collection = collectionById(props.id)
  return levelOf(collection) ? collection : null
})
const level = computed(() => levelOf(place.value))
const theme = computed(() => {
  const collection = collectionById(route.query.theme)
  return collection?.type === 'theme' ? collection : null
})
const filter = computed(() => (!theme.value && typeof route.query.filter === 'string' ? route.query.filter : ''))
const context = computed(() => ({ theme: theme.value, filter: filter.value || null }))
const country = computed(() => countryOf(place.value))
const territory = computed(() =>
  level.value === 'territory' ? place.value : level.value === 'location' ? territoryOf(place.value) : null,
)
const location = computed(() => (level.value === 'location' ? place.value : null))

const languages = useCollectionLanguages(() => place.value)
const { language, select, dir } = useRecordLanguage(place, { languages: () => languages.value })
const own = computed(() => text('collections', place.value?.id, language.value))
const name = computed(() => title(place.value, language.value))

const territoriesLine = computed(() =>
  level.value === 'country'
    ? [...shownTerritories(place.value, context.value)].sort(byTitle(locale.value)).map((c) => title(c, locale.value)).join(', ')
    : '',
)
const themeText = computed(() =>
  theme.value && level.value === 'country' ? md(themeCountryText(theme.value, place.value, language.value)) : '',
)
const description = computed(() => (level.value === 'location' ? '' : md(own.value.description)))

const ownInformation = computed(() =>
  [
    { key: 'howToReach', label: t('explore.info.howToReach'), value: own.value.extra?.how_to_reach },
    { key: 'information', label: t('explore.info.information'), value: own.value.extra?.info },
    { key: 'contact', label: t('explore.info.contact'), value: own.value.extra?.contact },
  ]
    .filter((entry) => entry.value)
    .map((entry) => ({ key: entry.key, label: entry.label, html: md(entry.value) })),
)

const locationTiles = computed(() =>
  level.value === 'location'
    ? []
    : [...shownLocations(place.value, context.value)].sort(byTitle(locale.value)).map((l) => ({
        id: l.id,
        label: title(l, locale.value),
        to: placeLink(l, context.value),
      })),
)
const monumentTiles = computed(() =>
  level.value !== 'location'
    ? []
    : shownMonuments(place.value, context.value)
        .map((m) => ({
          id: `${m.exploreId}`,
          label: monumentName(m, locale.value),
          image: m.main.images?.[0]?.url ?? null,
          to: monumentLink(m, { theme: theme.value }),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, locale.value)),
)

// Legacy's map: the places or the monuments the page leads to, no closer
// than the page's own zoom.
const pins = computed(() =>
  level.value === 'location'
    ? shownMonuments(place.value, context.value).flatMap((m) => {
        const at = positionOf(m)
        return at ? [{ ...at, label: monumentName(m, locale.value), to: monumentLink(m, { theme: theme.value }) }] : []
      })
    : shownLocations(place.value, context.value).flatMap((l) => {
        const at = placePosition(l)
        return at ? [{ ...at, label: title(l, locale.value), to: placeLink(l, context.value) }] : []
      }),
)
const mapZoom = computed(() => placePosition(place.value)?.zoom ?? null)

const travel = computed(() => travelFor(level.value, legacyId(place.value)))
const crumbs = computed(() => {
  const trail = [{ label: t('core.nav.home'), to: { name: 'home' } }]
  if (theme.value) trail.push({ label: title(theme.value, locale.value), to: themeLink(theme.value) })
  if (country.value) trail.push({ label: title(country.value, locale.value), to: placeLink(country.value, context.value) })
  if (level.value === 'territory') trail.push({ label: title(place.value, locale.value) })
  if (level.value === 'location') trail.push({ label: title(place.value, locale.value) })
  return trail
})
const selection = computed(() => ({
  mode: theme.value ? 'theme' : 'country',
  theme: theme.value,
  country: country.value,
  filter: filter.value,
  territory: territory.value,
  location: location.value,
}))
const partnerships = computed(() =>
  partnershipsFor({ theme: theme.value, level: level.value, id: legacyId(place.value) }),
)
</script>

<template>
  <NotFoundView v-if="!place" />
  <p v-else-if="!ready" class="explore-loading">{{ t('core.status.loading') }}</p>
  <ExploreFrame v-else :crumbs="crumbs" :selection="selection" :partnerships="partnerships">
    <article class="explore-page" :class="`explore-page--${level}`">
      <h1 class="explore-page__title" :dir="dir || undefined">{{ name }}</h1>
      <p v-if="territoriesLine" class="explore-page__subtitle">{{ territoriesLine }}</p>
      <RecordLanguages :languages="languageLabels(languages)" :language="language" @select="select" />
      <div v-if="themeText" class="explore-page__text explore-prose" :dir="dir || undefined" v-html="themeText"></div>
      <div v-if="description" class="explore-page__text explore-prose" :dir="dir || undefined" v-html="description"></div>

      <LocationBackground :location="location" :language="language" :dir="dir" />

      <AdditionalInformation :texts="ownInformation" :travel="travel" />
      <ExploreMap v-if="pins.length" :pins="pins" :zoom="mapZoom" />
      <SuggestedRoutes :location="location" />
      <ExploreTiles :heading="t('explore.next.location')" :tiles="locationTiles" />
      <ExploreTiles :heading="t('explore.next.monument')" :tiles="monumentTiles" />
      <TravelRecords :books="travel.books" :tours="travel.tours" />
    </article>
  </ExploreFrame>
</template>
