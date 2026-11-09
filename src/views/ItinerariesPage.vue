<script setup>
import { computed } from 'vue'
import { NotFoundView, mdInline, useI18n } from '@museumwnf/viewer-core'
import ExploreFrame from '../components/ExploreFrame.vue'
import ExploreMap from '../components/ExploreMap.vue'
import {
  collectionById, itinerariesIn, itinerariesOfTerritory, itineraryLink, itineraryListPosition, itineraryPicture,
  legacyCut, legacyLines, levelOf, placePosition, text, title, travelForItinerary, recordTexts, useTexts,
} from '../composables/explore.js'

// A country's itineraries, as legacy's ExplorePage drew "Itineraries in …":
// its map, each itinerary pinned at its first location, never closer than the
// country's own zoom; then ItineraryList.vue's card for each, its picture, its
// name, the start of its introduction, the bar leading to it, and the Travel
// Books and Tours of the monuments it holds, each a link.
const props = defineProps({
  id: { type: String, required: true },
  /** A territory of the country: its itineraries only, as legacy's `/itineraries/c-…/tr-…`. */
  territory: { type: String, default: '' },
})
const { t, locale } = useI18n()
const ready = useTexts(['collections', 'countries'])

// Legacy cut an itinerary's introduction in this list at this many characters.
const DESCRIPTION_LENGTH = 400

const country = computed(() => {
  const collection = collectionById(props.id)
  return levelOf(collection) === 'country' ? collection : null
})

const territory = computed(() => {
  const collection = props.territory ? collectionById(props.territory) : null
  return collection?.type === 'region' ? collection : null
})

const entries = computed(() =>
  itinerariesOfTerritory(itinerariesIn(country.value), territory.value).map((itinerary) => {
    // Each itinerary's own, as legacy's ItineraryCountryItineraryResource: those
    // of the monuments it holds; a tour named with its places after a comma
    // (ItineraryList.vue).
    const travel = travelForItinerary(itinerary)
    const titleOf = (record) => mdInline(recordTexts(record, locale.value).title ?? '')
    const tourTitle = (record) => {
      const subtitle = recordTexts(record, locale.value).subtitle
      return subtitle ? `${titleOf(record)}, ${mdInline(subtitle)}` : titleOf(record)
    }
    const description = text('collections', itinerary.id, locale.value).description
    return {
      id: itinerary.id,
      name: title(itinerary, locale.value),
      // Printed as it came, cut, its line breaks kept.
      description: description ? legacyLines(legacyCut(description, DESCRIPTION_LENGTH).text) : '',
      image: itineraryPicture(itinerary),
      to: itineraryLink(itinerary),
      at: itineraryListPosition(itinerary, territory.value),
      books: travel.books.map((b) => ({ id: b.id, title: titleOf(b), href: recordTexts(b, locale.value).read_more })),
      tours: travel.tours.map((r) => ({ id: r.id, title: tourTitle(r), href: recordTexts(r, locale.value).read_more })),
    }
  }),
)

const pins = computed(() => entries.value.flatMap((e) => (e.at ? [{ ...e.at, label: e.name, to: e.to }] : [])))
const mapZoom = computed(() => placePosition(country.value)?.zoom ?? null)

const crumbs = computed(() => [
  { label: t('core.nav.home'), to: { name: 'home' } },
  { label: title(country.value, locale.value) },
])
</script>

<template>
  <NotFoundView v-if="!country" />
  <p v-else-if="!ready" class="explore-loading">{{ t('core.status.loading') }}</p>
  <ExploreFrame
    v-else
    :crumbs="crumbs"
    :selection="{ mode: 'itinerary', country, territory }"
  >
    <article class="explore-page">
      <h1 class="explore-page__title">{{ t('explore.itinerary.inCountry') }} {{ title(country, locale) }}</h1>
      <ExploreMap v-if="pins.length" :pins="pins" :zoom="mapZoom" />
      <article v-for="entry in entries" :key="entry.id" class="explore-itinerary">
        <div class="explore-itinerary__image" :style="entry.image ? { backgroundImage: `url(${entry.image})` } : {}"></div>
        <div class="explore-itinerary__body">
          <h2 class="explore-itinerary__name">{{ entry.name }}</h2>
          <div v-if="entry.description" class="explore-itinerary__description" v-html="entry.description"></div>
          <div class="explore-itinerary__more">
            <RouterLink :to="entry.to">{{ t('explore.itinerary.readMore') }}</RouterLink>
          </div>
          <div v-if="entry.books.length" class="explore-itinerary__travel">
            <div class="explore-itinerary__label">{{ entry.books.length > 1 ? t('explore.travel.books') : t('explore.travel.book') }}</div>
            <div v-for="book in entry.books" :key="book.id" class="explore-itinerary__record">
              <a v-if="book.href" :href="book.href" target="_blank" rel="noopener" v-html="book.title"></a>
              <span v-else v-html="book.title"></span>
            </div>
          </div>
          <div v-if="entry.tours.length" class="explore-itinerary__travel">
            <div class="explore-itinerary__label">{{ entry.tours.length > 1 ? t('explore.travel.tours') : t('explore.travel.tour') }}</div>
            <div v-for="tour in entry.tours" :key="tour.id" class="explore-itinerary__record">
              <a v-if="tour.href" :href="tour.href" target="_blank" rel="noopener" v-html="tour.title"></a>
              <span v-else v-html="tour.title"></span>
            </div>
          </div>
        </div>
      </article>
    </article>
  </ExploreFrame>
</template>
