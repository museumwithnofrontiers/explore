<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NotFoundView, isRtl, useI18n } from '@museumwnf/viewer-core'
import ExploreFrame from '../components/ExploreFrame.vue'
import ExploreMap from '../components/ExploreMap.vue'
import ExploreTiles from '../components/ExploreTiles.vue'
import LocalTeam from '../components/LocalTeam.vue'
import PhoneChevron from '../components/PhoneChevron.vue'
import LocationBackground from '../components/LocationBackground.vue'
import ReadIn from '../components/ReadIn.vue'
import ReadMoreText from '../components/ReadMoreText.vue'
import TravelRecords from '../components/TravelRecords.vue'
import {
  collectionById, countryOf, describedLanguages, isSubItinerary, itinerariesLink, itineraryCountries, itineraryLink,
  itineraryLocations, itineraryMonuments, legacyCut, legacyId, monumentLink, monumentName, ownText, placeLink,
  placePosition, positionOf, roman, routeKind, subItinerariesOf, text, title, travelFor, useCollectionLanguages,
  useTexts,
} from '../composables/explore.js'
import { usePhoneTabs } from '../composables/phoneTabs.js'

// A sub-itinerary's page, and a route's: legacy draws both with one
// component (explore-client SubItinerary.vue). Its name in English, a
// sub-itinerary's numbered as in its itinerary; its text "Read in" the
// languages it is written in, cut at legacy's length with "Read more.", and
// its author in that language; its locations as tabs (a sub-itinerary's),
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

// Legacy cut the text at this many characters, a monument's name on its tile at that many.
const DESCRIPTION_LENGTH = 575
const TILE_NAME_LENGTH = 65

const translated = useCollectionLanguages(() => itinerary.value)
const languages = computed(() => describedLanguages(translated.value, itinerary.value?.id))
// Legacy's setLanguage: the language read stays while the text has it, else English, else the first.
const chosen = ref('en')
const language = computed(() =>
  languages.value.includes(chosen.value) ? chosen.value : languages.value.includes('en') ? 'en' : (languages.value[0] ?? 'en'),
)
const dir = computed(() => (isRtl(language.value) ? 'rtl' : ''))
const own = computed(() => ownText('collections', itinerary.value?.id, language.value))
const english = computed(() => text('collections', itinerary.value?.id, 'en'))
const author = computed(() => own.value.extra?.author ?? '')

const locations = computed(() => itineraryLocations(itinerary.value))
const location = computed(
  () => locations.value.find((l) => l.id === route.query.location) ?? locations.value[0] ?? null,
)
const country = computed(() => itineraryCountries(itinerary.value)[0] ?? countryOf(location.value))

const heading = computed(() => {
  const name = title(itinerary.value, 'en')
  if (props.kind === 'route') return `${title(location.value, 'en')} | ${name}`
  const position = subItinerariesOf(parent.value).indexOf(itinerary.value)
  const numbered = position >= 0 ? `${roman(position + 1)}. ${name}` : name
  const duration = english.value.extra?.duration
  return duration ? `${numbered} [${duration}]` : numbered
})

const monuments = computed(() => itineraryMonuments(itinerary.value, location.value))
const context = computed(() =>
  props.kind === 'route' ? { route: itinerary.value } : { sub: itinerary.value },
)
const tiles = computed(() =>
  monuments.value.map((m) => ({
    id: m.exploreId,
    label: legacyCut(monumentName(m, 'en'), TILE_NAME_LENGTH).text,
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

// Below 900px legacy folded the location tabs to the chosen one.
const phone = usePhoneTabs()

// Legacy's arrows scrolled the tabs by one tab and its margins.
const tabsBox = ref(null)
function scrollTabs(direction) {
  tabsBox.value?.scrollBy({ left: direction * 160, behavior: 'smooth' })
}

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
    // Legacy's trail named the sub-itinerary as its title does, then the location shown.
    trail.push({ label: heading.value.replace(/ \[[^\]]*\]$/, ''), to: { name: 'sub-itinerary', params: { id: props.id } } })
    if (location.value) trail.push({ label: title(location.value, locale.value) })
    return trail
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
        // Legacy chose the location shown, the first until another is picked.
        location: location.value,
      },
)
</script>

<template>
  <NotFoundView v-if="!itinerary" />
  <p v-else-if="!ready" class="explore-loading">{{ t('core.status.loading') }}</p>
  <ExploreFrame v-else :crumbs="crumbs" :selection="selection">
    <article class="explore-page explore-sub">
      <h1 class="explore-page__title">{{ heading }}</h1>
      <div v-if="languages.length" class="explore-sub__description">
        <ReadIn :languages="languages" :language="language" @select="chosen = $event" />
        <ReadMoreText :text="own.description ?? ''" :chars="DESCRIPTION_LENGTH" :dir="dir" />
        <p v-if="author" class="explore-sub__author">{{ t('explore.itinerary.author') }} {{ author }}</p>
      </div>

      <h2 class="explore-sub__label">
        {{ kind === 'route' ? t('explore.route.inside') : t('explore.itinerary.inside') }}
      </h2>
      <!-- Legacy's location tabs, scrolled by its arrows past five. -->
      <div v-if="kind !== 'route'" class="explore-sub__tabs-wrap" :class="{ 'explore-sub__tabs-wrap--arrows': locations.length > 5 }">
        <template v-if="locations.length > 5">
          <button type="button" class="explore-sub__arrow explore-sub__arrow--left" :aria-label="t('explore.pages.previous')" @click="scrollTabs(-1)">
            <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M10 2 4 8l6 6" fill="none" stroke="currentColor" stroke-width="2" /></svg>
          </button>
          <button type="button" class="explore-sub__arrow explore-sub__arrow--right" :aria-label="t('explore.pages.next')" @click="scrollTabs(1)">
            <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="m6 2 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" /></svg>
          </button>
        </template>
        <div ref="tabsBox" class="explore-sub__tabs" role="tablist">
          <template v-for="entry in locations" :key="entry.id">
            <button
              v-if="phone.shown(entry.id === location?.id)"
              type="button"
              role="tab"
              class="explore-sub__tab"
              :class="{ 'explore-sub__tab--active': entry.id === location?.id }"
              :aria-selected="entry.id === location?.id ? 'true' : 'false'"
              :aria-expanded="phone.chevron(entry.id === location?.id, locations.length) ? String(phone.open.value) : undefined"
              @click="phone.tap(entry.id === location?.id, () => pick(entry))"
            >{{ title(entry, 'en').toUpperCase() }}<PhoneChevron :direction="phone.chevron(entry.id === location?.id, locations.length)" /></button>
          </template>
        </div>
      </div>

      <ExploreMap v-if="pins.length" :pins="pins" :zoom="placePosition(location)?.zoom ?? null" />
      <!-- Legacy's label here tested a field its data never had: it never showed. -->
      <LocationBackground :location="location" :label="false" />
      <ExploreTiles :tiles="tiles" />

      <LocalTeam :team="own.extra?.local_team ?? ''" :dir="dir" />
      <TravelRecords :books="travel.books" :tours="travel.tours" />
    </article>
  </ExploreFrame>
</template>
