<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { NotFoundView, md, useI18n, useRecordLanguage } from '@museumwnf/viewer-core'
import ExploreFrame from '../components/ExploreFrame.vue'
import ExploreMap from '../components/ExploreMap.vue'
import ExploreTiles from '../components/ExploreTiles.vue'
import PlaceMenu from '../components/PlaceMenu.vue'
import ReadIn from '../components/ReadIn.vue'
import SuggestedRoutes from '../components/SuggestedRoutes.vue'
import TravelRecords from '../components/TravelRecords.vue'
import {
  byTitle, collectionById, countryOf, legacyId, levelOf, monumentLink, monumentName, placeLink,
  placePosition, positionOf, shownLocations, shownMonuments, shownTerritories, pathTerritory, text, themeCountries, themeCountryLanguages, themeCountryText,
  themeLink, ownText, title, travelFor, useCollectionLanguages, useTexts,
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
const country = computed(() => countryOf(place.value))
// The territory on the path: the page's own, or the one the address names
// for a location (`?territory=`); legacy's panel left it unchosen otherwise.
const territory = computed(() =>
  level.value === 'territory'
    ? place.value
    : level.value === 'location'
      ? pathTerritory(place.value, route.query.territory)
      : null,
)
const context = computed(() => ({ theme: theme.value, filter: filter.value || null, territory: territory.value }))
const location = computed(() => (level.value === 'location' ? place.value : null))

// Legacy's ExplorePage: the name in English; the description in full, "Read
// in" the languages it has a row in. A country reached by theme shows the
// theme's own text about it instead of its own. A location's own text is its
// historical background, in the tab menu.
const byThemeText = computed(() => Boolean(theme.value) && level.value === 'country')
const translated = useCollectionLanguages(() => place.value)
const languages = computed(() =>
  level.value === 'location'
    ? []
    : byThemeText.value
      ? themeCountryLanguages(theme.value, place.value)
      : translated.value,
)
const { language, select, dir } = useRecordLanguage(place, { languages: () => languages.value })
// Each language's own row: legacy showed an empty description empty.
const own = computed(() => ownText('collections', place.value?.id, language.value))
const name = computed(() => title(place.value, 'en'))

// Legacy listed the country's territories under its name on the theme path,
// and named the theme again there when it covers a single country.
const territoriesLine = computed(() =>
  byThemeText.value
    ? [...shownTerritories(place.value, context.value)].sort(byTitle('en')).map((c) => title(c, 'en')).join(', ')
    : '',
)
const singleCountryTheme = computed(() =>
  theme.value && level.value !== 'location' && themeCountries(theme.value).length === 1 ? title(theme.value, 'en') : '',
)
const themeText = computed(() =>
  byThemeText.value ? md(themeCountryText(theme.value, place.value, language.value)) : '',
)
const description = computed(() => (level.value === 'location' || byThemeText.value ? '' : md(own.value.description)))

// The tab menu's texts: legacy read them in English.
const fields = computed(() => {
  const extra = text('collections', place.value?.id, 'en').extra ?? {}
  return Object.fromEntries(
    ['how_to_reach', 'contact', 'info'].filter((key) => extra[key]).map((key) => [key, md(extra[key])]),
  )
})

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
          to: monumentLink(m, context.value),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, locale.value)),
)

// Legacy's map: the places or the monuments the page leads to, no closer
// than the page's own zoom.
const pins = computed(() =>
  level.value === 'location'
    ? shownMonuments(place.value, context.value).flatMap((m) => {
        const at = positionOf(m)
        return at ? [{ ...at, label: monumentName(m, locale.value), to: monumentLink(m, context.value) }] : []
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
  if (level.value === 'location' && territory.value) {
    trail.push({ label: title(territory.value, locale.value), to: placeLink(territory.value, context.value) })
  }
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
</script>

<template>
  <NotFoundView v-if="!place" />
  <p v-else-if="!ready" class="explore-loading">{{ t('core.status.loading') }}</p>
  <ExploreFrame v-else :crumbs="crumbs" :selection="selection">
    <article class="explore-page" :class="`explore-page--${level}`">
      <h1 class="explore-page__title">{{ name }}</h1>
      <div v-if="territoriesLine || singleCountryTheme" class="explore-theme-info">
        <div v-if="territoriesLine" class="explore-territories">{{ territoriesLine }}</div>
        <div v-if="singleCountryTheme" class="explore-territories">{{ singleCountryTheme }}</div>
      </div>
      <!-- Legacy drew the block, and its margin, without a description too. -->
      <div class="explore-description">
        <ReadIn :languages="languages" :language="language" @select="select" />
        <div v-if="themeText" class="explore-page__text explore-prose" :dir="dir || undefined" v-html="themeText"></div>
        <div v-if="description" class="explore-page__text explore-prose" :dir="dir || undefined" v-html="description"></div>
      </div>

      <PlaceMenu :location="location" :fields="fields" :travel="travel" />
      <ExploreMap v-if="pins.length" :pins="pins" :zoom="mapZoom" />
      <SuggestedRoutes :location="location" />
      <ExploreTiles :heading="t('explore.next.location')" :tiles="locationTiles" />
      <ExploreTiles :heading="t('explore.next.monument')" :tiles="monumentTiles" />
      <TravelRecords :books="travel.books" :tours="travel.tours" />
    </article>
  </ExploreFrame>
</template>
