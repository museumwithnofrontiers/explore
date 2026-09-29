<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NotFoundView, languageLabels, md, useI18n, useRecordLanguage } from '@museumwnf/viewer-core'
import { RecordLanguages } from '@museumwnf/viewer-layout/content'
import ExploreFrame from '../components/ExploreFrame.vue'
import ExploreMap from '../components/ExploreMap.vue'
import ExploreTiles from '../components/ExploreTiles.vue'
import LocalTeam from '../components/LocalTeam.vue'
import LocationBackground from '../components/LocationBackground.vue'
import TravelRecords from '../components/TravelRecords.vue'
import {
  collectionById, countryOf, isSubItinerary, itinerariesLink, itineraryCountries, itineraryLink, itineraryLocations,
  itineraryMonuments, legacyId, monumentLink, monumentName, partnershipsFor, placeLink, placePosition, positionOf,
  routeKind, text, title, travelFor, useCollectionLanguages, useTexts,
} from '../composables/explore.js'

// A sub-itinerary's page, and a route's: legacy draws both with one
// component. Its text and author; its locations as tabs (a sub-itinerary's),
// the one picked (`?location=`) on the map with its monuments, its
// historical background and its monuments' tiles, in the itinerary's order;
// its local team; its Travel Books and Tours, those of its locations.
const props = defineProps({
  id: { type: String, required: true },
  /** 'sub-itinerary' or 'route'. */
  kind: { type: String, required: true },
})
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const ready = useTexts(['collections', 'countries', 'items'])

const itinerary = computed(() => {
  const collection = collectionById(props.id)
  if (!collection) return null
  if (props.kind === 'route') return routeKind(collection) ? collection : null
  return isSubItinerary(collection) ? collection : null
})
const parent = computed(() => (props.kind === 'route' ? null : collectionById(itinerary.value?.parent_id)))

const languages = useCollectionLanguages(() => itinerary.value)
const { language, select, dir } = useRecordLanguage(itinerary, { languages: () => languages.value })
const own = computed(() => text('collections', itinerary.value?.id, language.value))
const description = computed(() => md(own.value.description))
const author = computed(() => own.value.extra?.author ?? '')

const locations = computed(() => itineraryLocations(itinerary.value))
const location = computed(
  () => locations.value.find((l) => l.id === route.query.location) ?? locations.value[0] ?? null,
)
const country = computed(() => itineraryCountries(itinerary.value)[0] ?? countryOf(location.value))

const heading = computed(() => {
  const name = title(itinerary.value, language.value)
  if (props.kind === 'route') return `${title(location.value, locale.value)} | ${name}`
  const duration = own.value.extra?.duration
  return duration ? `${name} [${duration}]` : name
})

const monuments = computed(() => itineraryMonuments(itinerary.value, location.value))
const context = computed(() =>
  props.kind === 'route' ? { route: itinerary.value } : { sub: itinerary.value },
)
const tiles = computed(() =>
  monuments.value.map((m) => ({
    id: m.exploreId,
    label: monumentName(m, locale.value),
    image: m.main.images?.[0]?.url ?? null,
    to: monumentLink(m, context.value),
  })),
)
// Legacy's map: the location's monuments, each named with its location on a
// sub-itinerary.
const pins = computed(() =>
  monuments.value.flatMap((m) => {
    const at = positionOf(m)
    if (!at) return []
    const name = monumentName(m, locale.value)
    const label = props.kind === 'route' ? name : `${title(m.location, locale.value)}: ${name}`
    return [{ ...at, label, to: monumentLink(m, context.value) }]
  }),
)

function pick(entry) {
  router.push({ query: { ...route.query, location: entry.id } })
}

// The Travel Books and Tours of its locations, each once.
const travel = computed(() => {
  const seen = { books: new Map(), tours: new Map() }
  for (const place of locations.value) {
    const scoped = travelFor('location', legacyId(place))
    for (const book of scoped.books) seen.books.set(book.id, book)
    for (const tour of scoped.tours) seen.tours.set(tour.id, tour)
  }
  return { books: [...seen.books.values()], tours: [...seen.tours.values()] }
})

const crumbs = computed(() => {
  const trail = [{ label: t('core.nav.home'), to: { name: 'home' } }]
  if (props.kind === 'route') {
    if (country.value) trail.push({ label: title(country.value, locale.value), to: placeLink(country.value) })
    if (location.value) trail.push({ label: title(location.value, locale.value), to: placeLink(location.value) })
  } else {
    if (country.value) trail.push({ label: title(country.value, locale.value), to: itinerariesLink(country.value) })
    if (parent.value) trail.push({ label: title(parent.value, locale.value), to: itineraryLink(parent.value) })
  }
  trail.push({ label: title(itinerary.value, locale.value) })
  return trail
})
const selection = computed(() =>
  props.kind === 'route'
    ? { mode: 'country', country: country.value, location: location.value }
    : {
        mode: 'itinerary',
        country: country.value,
        itinerary: parent.value,
        subItinerary: itinerary.value,
        location: route.query.location ? location.value : null,
      },
)
const partnerships = computed(() =>
  partnershipsFor({ level: 'itinerary', id: legacyId(props.kind === 'route' ? itinerary.value : parent.value) }),
)
</script>

<template>
  <NotFoundView v-if="!itinerary" />
  <p v-else-if="!ready" class="explore-loading">{{ t('core.status.loading') }}</p>
  <ExploreFrame v-else :crumbs="crumbs" :selection="selection" :partnerships="partnerships">
    <article class="explore-page explore-sub">
      <h1 class="explore-page__title" :dir="dir || undefined">{{ heading }}</h1>
      <RecordLanguages :languages="languageLabels(languages)" :language="language" @select="select" />
      <div v-if="description" class="explore-page__text explore-prose" :dir="dir || undefined" v-html="description"></div>
      <p v-if="author" class="explore-page__credit">{{ t('explore.itinerary.author') }} {{ author }}</p>

      <h2 class="explore-sub__label">
        {{ kind === 'route' ? t('explore.route.inside') : t('explore.itinerary.inside') }}
      </h2>
      <div v-if="kind !== 'route' && locations.length > 1" class="explore-sub__tabs" role="tablist">
        <button
          v-for="entry in locations"
          :key="entry.id"
          type="button"
          role="tab"
          class="explore-sub__tab"
          :class="{ 'explore-sub__tab--active': entry.id === location?.id }"
          :aria-selected="entry.id === location?.id ? 'true' : 'false'"
          @click="pick(entry)"
        >{{ title(entry, locale) }}</button>
      </div>

      <ExploreMap v-if="pins.length" :pins="pins" :zoom="placePosition(location)?.zoom ?? null" />
      <LocationBackground :location="location" :language="language" :dir="dir" />
      <ExploreTiles :tiles="tiles" />

      <LocalTeam :team="own.extra?.local_team ?? ''" :dir="dir" />
      <TravelRecords :books="travel.books" :tours="travel.tours" />
    </article>
  </ExploreFrame>
</template>
