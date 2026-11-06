<script setup>
import { computed } from 'vue'
import { NotFoundView, mdInline, useI18n, useRecordLanguage } from '@museumwnf/viewer-core'
import ExploreFrame from '../components/ExploreFrame.vue'
import ExploreMap from '../components/ExploreMap.vue'
import LocalTeam from '../components/LocalTeam.vue'
import ReadIn from '../components/ReadIn.vue'
import ReadMoreText from '../components/ReadMoreText.vue'
import TravelRecords from '../components/TravelRecords.vue'
import {
  collectionById, describedLanguages, itineraryCountries, itineraryLocations, itineraryPicture, itinerariesLink,
  legacyCut, legacyId, placePosition, roman, subItinerariesOf, subItineraryLink, text, title, travelFor,
  useCollectionLanguages, useTexts,
} from '../composables/explore.js'

// A thematic itinerary's page, as legacy's SubItineraryList: its map, each
// sub-itinerary at its first location; "Read in" the languages its
// introduction is written in, the introduction cut at legacy's length with
// "Read more."; its sub-itineraries, counted, each a card with its picture,
// its numeral, name and duration, and the start of its text; its local team;
// its Travel Books and Tours (inventory-app#2424).
const props = defineProps({
  id: { type: String, required: true },
})
const { t, locale } = useI18n()
const ready = useTexts(['collections', 'countries', 'items'])

// Legacy cut the introduction at this many characters, a sub-itinerary's
// text in the list at that many.
const DESCRIPTION_LENGTH = 575
const SUB_DESCRIPTION_LENGTH = 400

const itinerary = computed(() => {
  const collection = collectionById(props.id)
  return collection?.extra?.explore_itinerary?.type === '4' && subItinerariesOf(collection).length
    ? collection
    : null
})
const translated = useCollectionLanguages(() => itinerary.value)
const languages = computed(() => describedLanguages(translated.value, itinerary.value?.id))
const { language, select, dir } = useRecordLanguage(itinerary, { languages: () => languages.value })
const own = computed(() => text('collections', itinerary.value?.id, language.value))

// Legacy showed a sub-itinerary's text on one line: its line breaks as spaces.
const oneLine = (markdown) => mdInline(String(markdown ?? '').replace(/\s*\n+\s*/g, ' '))

const subs = computed(() =>
  subItinerariesOf(itinerary.value).map((sub, index) => {
    const texts = text('collections', sub.id, locale.value)
    return {
      id: sub.id,
      sub,
      name: `${roman(index + 1)}. ${title(sub, locale.value)}`,
      duration: texts.extra?.duration ?? '',
      description: oneLine(legacyCut(texts.description, SUB_DESCRIPTION_LENGTH).text),
      image: itineraryPicture(sub),
      to: subItineraryLink(sub),
    }
  }),
)

// Legacy's map: each sub-itinerary at its first location.
const pins = computed(() =>
  subs.value.flatMap((entry) => {
    const at = placePosition(itineraryLocations(entry.sub)[0])
    return at ? [{ ...at, label: entry.name, to: entry.to }] : []
  }),
)

const country = computed(() => itineraryCountries(itinerary.value)[0] ?? null)
const travel = computed(() => travelFor('itinerary', legacyId(itinerary.value)))
const crumbs = computed(() => {
  const trail = [{ label: t('core.nav.home'), to: { name: 'home' } }]
  if (country.value) trail.push({ label: title(country.value, locale.value), to: itinerariesLink(country.value) })
  trail.push({ label: title(itinerary.value, locale.value) })
  return trail
})
</script>

<template>
  <NotFoundView v-if="!itinerary" />
  <p v-else-if="!ready" class="explore-loading">{{ t('core.status.loading') }}</p>
  <ExploreFrame
    v-else
    :crumbs="crumbs"
    :selection="{ mode: 'itinerary', country, itinerary }"
  >
    <article class="explore-page">
      <h1 class="explore-page__title">{{ title(itinerary, 'en') }}</h1>
      <ExploreMap v-if="pins.length" :pins="pins" />
      <ReadIn :languages="languages" :language="language" @select="select" />
      <ReadMoreText class="explore-page__text" :text="own.description ?? ''" :chars="DESCRIPTION_LENGTH" :dir="dir" />

      <section v-if="subs.length" class="explore-subs">
        <h2 class="explore-subs__heading">{{ subs.length }} {{ t('explore.itinerary.subItineraries') }}</h2>
        <article v-for="entry in subs" :key="entry.id" class="explore-sub-card">
          <div class="explore-sub-card__image" :style="entry.image ? { backgroundImage: `url(${entry.image})` } : {}"></div>
          <div class="explore-sub-card__info">
            <RouterLink class="explore-sub-card__link" :to="entry.to">
              {{ entry.name }}<template v-if="entry.duration"> [{{ entry.duration }}]</template>
            </RouterLink>
            <div v-if="entry.description" class="explore-sub-card__description" v-html="entry.description"></div>
          </div>
        </article>
      </section>

      <LocalTeam :team="own.extra?.local_team ?? ''" :dir="dir" />
      <TravelRecords :books="travel.books" :tours="travel.tours" />
    </article>
  </ExploreFrame>
</template>
