<script setup>
import { computed } from 'vue'
import { NotFoundView, languageLabels, md, useI18n, useRecordLanguage } from '@museumwnf/viewer-core'
import { RecordLanguages } from '@museumwnf/viewer-layout/content'
import ExploreFrame from '../components/ExploreFrame.vue'
import ExploreMap from '../components/ExploreMap.vue'
import LocalTeam from '../components/LocalTeam.vue'
import TravelRecords from '../components/TravelRecords.vue'
import {
  collectionById, excerpt, itineraryCountries, itineraryLocations, itineraryPicture, itinerariesLink, legacyId,
  partnershipsFor, placePosition, subItinerariesOf, subItineraryLink, text, title, travelFor, useCollectionLanguages,
  useTexts,
} from '../composables/explore.js'

// A thematic itinerary's page: its map, each sub-itinerary at its first
// location; its introduction, in any language it is written in; its
// sub-itineraries, counted, each its picture, its name and duration, and the
// start of its text; its local team; its Travel Books and Tours.
const props = defineProps({
  id: { type: String, required: true },
})
const { t, locale } = useI18n()
const ready = useTexts(['collections', 'countries', 'items'])

// Legacy cut a sub-itinerary's text in this list at this many characters.
const DESCRIPTION_LENGTH = 400

const itinerary = computed(() => {
  const collection = collectionById(props.id)
  return collection?.extra?.explore_itinerary?.type === '4' && subItinerariesOf(collection).length
    ? collection
    : null
})
const languages = useCollectionLanguages(() => itinerary.value)
const { language, select, dir } = useRecordLanguage(itinerary, { languages: () => languages.value })
const own = computed(() => text('collections', itinerary.value?.id, language.value))
const description = computed(() => md(own.value.description))

const subs = computed(() =>
  subItinerariesOf(itinerary.value).map((sub) => {
    const texts = text('collections', sub.id, locale.value)
    return {
      id: sub.id,
      sub,
      name: title(sub, locale.value),
      duration: texts.extra?.duration ?? '',
      description: excerpt(texts.description, DESCRIPTION_LENGTH),
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
    :partnerships="partnershipsFor({ level: 'itinerary', id: legacyId(itinerary) })"
  >
    <article class="explore-page">
      <h1 class="explore-page__title" :dir="dir || undefined">{{ title(itinerary, language) }}</h1>
      <ExploreMap v-if="pins.length" :pins="pins" />
      <RecordLanguages :languages="languageLabels(languages)" :language="language" @select="select" />
      <div v-if="description" class="explore-page__text explore-prose" :dir="dir || undefined" v-html="description"></div>

      <section v-if="subs.length" class="explore-subs">
        <h2 class="explore-subs__heading">{{ subs.length }} {{ t('explore.itinerary.subItineraries') }}</h2>
        <article v-for="entry in subs" :key="entry.id" class="explore-itinerary">
          <img v-if="entry.image" class="explore-itinerary__image" :src="entry.image" alt="" loading="lazy" />
          <div class="explore-itinerary__body">
            <h3 class="explore-itinerary__name">
              <RouterLink :to="entry.to">{{ entry.name }}</RouterLink>
              <span v-if="entry.duration" class="explore-itinerary__duration"> [{{ entry.duration }}]</span>
            </h3>
            <p v-if="entry.description" class="explore-itinerary__description">{{ entry.description }}</p>
          </div>
        </article>
      </section>

      <LocalTeam :team="own.extra?.local_team ?? ''" :dir="dir" />
      <TravelRecords :books="travel.books" :tours="travel.tours" />
    </article>
  </ExploreFrame>
</template>
