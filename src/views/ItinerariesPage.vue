<script setup>
import { computed } from 'vue'
import { NotFoundView, mdInline, useI18n } from '@museumwnf/viewer-core'
import ExploreFrame from '../components/ExploreFrame.vue'
import {
  collectionById, excerpt, itinerariesIn, itineraryLink, itineraryPicture, legacyId, levelOf, partnershipsFor, text,
  title, travelFor, recordTexts, useTexts,
} from '../composables/explore.js'

// A country's itineraries, legacy's "Itineraries in …": each one's picture,
// its name, the start of its introduction, the link to it, and the Travel
// Books and Tours scoped to it.
const props = defineProps({
  id: { type: String, required: true },
})
const { t, locale } = useI18n()
const ready = useTexts(['collections', 'countries'])

// Legacy cut an itinerary's introduction in this list at this many characters.
const DESCRIPTION_LENGTH = 400

const country = computed(() => {
  const collection = collectionById(props.id)
  return levelOf(collection) === 'country' ? collection : null
})

const entries = computed(() =>
  itinerariesIn(country.value).map((itinerary) => {
    const travel = travelFor('itinerary', legacyId(itinerary))
    const titleOf = (record) => mdInline(recordTexts(record, locale.value).title ?? '')
    return {
      id: itinerary.id,
      name: title(itinerary, locale.value),
      description: excerpt(text('collections', itinerary.id, locale.value).description, DESCRIPTION_LENGTH),
      image: itineraryPicture(itinerary),
      to: itineraryLink(itinerary),
      books: travel.books.map((b) => ({ id: b.id, title: titleOf(b), href: recordTexts(b, locale.value).read_more })),
      tours: travel.tours.map((r) => ({ id: r.id, title: titleOf(r), href: recordTexts(r, locale.value).read_more })),
    }
  }),
)

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
    :selection="{ mode: 'itinerary', country }"
    :partnerships="partnershipsFor({ level: 'country', id: legacyId(country) })"
  >
    <article class="explore-page">
      <h1 class="explore-page__title">{{ t('explore.itinerary.inCountry') }} {{ title(country, locale) }}</h1>
      <article v-for="entry in entries" :key="entry.id" class="explore-itinerary">
        <img v-if="entry.image" class="explore-itinerary__image" :src="entry.image" alt="" loading="lazy" />
        <div class="explore-itinerary__body">
          <h2 class="explore-itinerary__name">{{ entry.name }}</h2>
          <p v-if="entry.description" class="explore-itinerary__description">{{ entry.description }}</p>
          <RouterLink class="explore-button" :to="entry.to">{{ t('explore.itinerary.readMore') }}</RouterLink>
          <template v-if="entry.books.length">
            <h3 class="explore-itinerary__label">{{ t('explore.travel.books') }}</h3>
            <p v-for="book in entry.books" :key="book.id" class="explore-itinerary__record">
              <a v-if="book.href" :href="book.href" target="_blank" rel="noopener" v-html="book.title"></a>
              <span v-else v-html="book.title"></span>
            </p>
          </template>
          <template v-if="entry.tours.length">
            <h3 class="explore-itinerary__label">{{ t('explore.travel.tours') }}</h3>
            <p v-for="tour in entry.tours" :key="tour.id" class="explore-itinerary__record">
              <a v-if="tour.href" :href="tour.href" target="_blank" rel="noopener" v-html="tour.title"></a>
              <span v-else v-html="tour.title"></span>
            </p>
          </template>
        </div>
      </article>
    </article>
  </ExploreFrame>
</template>
