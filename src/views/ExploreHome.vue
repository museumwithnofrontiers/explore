<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { md, useI18n } from '@museumwnf/viewer-core'
import { FacetSelect } from '@museumwnf/viewer-layout/content'
import ExploreMap from '../components/ExploreMap.vue'
import ExplorePanels from '../components/ExplorePanels.vue'
import FeaturedPartnerships from '../components/FeaturedPartnerships.vue'
import {
  byTitle, countries, countriesWithItineraries, excerpt, isNewTheme, itineraries, itinerariesLink,
  itineraryCountries, itineraryLink, itineraryPicture, partnershipsFor, placeLink, placePosition, text, themeLink,
  themePictures, themes, title, useTexts,
} from '../composables/explore.js'

// The home page, as legacy drew it (explore-client HomePage.vue and its three
// sections): the welcome, then one section per way in. "Explore by Theme"
// is a row of tall picture panels, the themes in legacy's order, each with
// one of its pictures drawn per visit and legacy's "NEW" corner where legacy
// sets it, then two of them drawn again as "Highlighted Themes"; "Explore by
// Country" is the map with the countries' list under it; "Explore by
// Itinerary" picks a country or an itinerary, over four itineraries drawn per
// visit. Legacy drew each pick per request and read no flag for any.
const { t, locale } = useI18n()
const router = useRouter()
const ready = useTexts(['collections', 'countries'])

// Legacy cut a theme's description on the card at this many characters.
const DESCRIPTION_LENGTH = 100

function shuffled(list) {
  const pool = [...list]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

const pictureOf = new Map(themes.value.map((theme) => [theme.id, shuffled(themePictures(theme))[0]?.url ?? null]))
const highlightedIds = shuffled(themes.value).slice(0, 2).map((theme) => theme.id)
const featuredItineraryIds = shuffled(itineraries.value).slice(0, 4).map((itinerary) => itinerary.id)

// A panel's picture is a CSS background, as legacy's was: the panel crops it
// to its own shape.
const background = (url) => (url ? { backgroundImage: `url("${url}")` } : {})

const themeCards = computed(() =>
  themes.value.map((theme) => ({
    id: theme.id,
    name: title(theme, locale.value),
    description: excerpt(text('collections', theme.id, locale.value).description, DESCRIPTION_LENGTH),
    image: pictureOf.get(theme.id),
    isNew: isNewTheme(theme),
    to: themeLink(theme),
  })),
)
const highlighted = computed(() => highlightedIds.map((id) => themeCards.value.find((card) => card.id === id)).filter(Boolean))

const sortedCountries = computed(() => [...countries.value].sort(byTitle(locale.value)))
function pickCountry(event) {
  const country = countries.value.find((c) => c.id === event.target.value)
  if (country) router.push(placeLink(country))
}
const countryPins = computed(() =>
  countries.value.flatMap((country) => {
    const at = placePosition(country)
    return at ? [{ ...at, label: title(country, locale.value), to: placeLink(country) }] : []
  }),
)

// "Explore by Itinerary": its countries, and its itineraries named with their
// country ("Country | Itinerary"), each sorted by name, as legacy did.
const itineraryCountryOptions = computed(() =>
  countriesWithItineraries(locale.value).map((c) => ({ value: c.id, label: title(c, locale.value) })),
)
const fullName = (itinerary) =>
  [...itineraryCountries(itinerary).map((c) => title(c, locale.value)), title(itinerary, locale.value)].join(' | ')
const itineraryOptions = computed(() =>
  itineraries.value
    .map((i) => ({ value: i.id, label: fullName(i) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale.value)),
)
function pickItineraryCountry(id) {
  const country = countriesWithItineraries(locale.value).find((c) => c.id === id)
  if (country) router.push(itinerariesLink(country))
}
function pickItinerary(id) {
  const itinerary = itineraries.value.find((i) => i.id === id)
  if (itinerary) router.push(itineraryLink(itinerary))
}
const itineraryCards = computed(() =>
  featuredItineraryIds
    .map((id) => itineraries.value.find((i) => i.id === id))
    .filter(Boolean)
    .map((itinerary) => ({
      id: itinerary.id,
      country: itineraryCountries(itinerary).map((c) => title(c, locale.value)).join(', '),
      name: title(itinerary, locale.value),
      image: itineraryPicture(itinerary),
      to: itineraryLink(itinerary),
    })),
)

const description = computed(() => md(t('explore.home.description')))
const partnerships = computed(() => partnershipsFor({ home: true }))
</script>

<template>
  <p v-if="!ready" class="explore-loading">{{ t('core.status.loading') }}</p>
  <div v-else class="explore-home">
    <div class="explore-home__description explore-prose" v-html="description"></div>

    <section id="explore-by-theme" class="explore-home__section">
      <h2 class="explore-home__heading">{{ t('explore.nav.byTheme') }}</h2>
      <p class="explore-home__intro">{{ t('explore.home.byTheme') }}</p>
      <ExplorePanels
        :count="themeCards.length"
        :previous-label="t('core.pagination.previous')"
        :next-label="t('core.pagination.next')"
      >
        <div v-for="card in themeCards" :key="card.id" class="explore-theme-panel">
          <div class="explore-theme-panel__image" :style="background(card.image)"></div>
          <div v-if="card.isNew" class="explore-theme-panel__new">
            <span class="explore-theme-panel__new-text">{{ t('explore.theme.new') }}</span>
          </div>
          <div class="explore-theme-panel__text">
            <h3 class="explore-theme-panel__name">{{ card.name }}</h3>
            <p class="explore-theme-panel__description">{{ card.description }}</p>
          </div>
          <RouterLink class="explore-theme-panel__button" :to="card.to">{{ t('core.action.explore') }}</RouterLink>
        </div>
      </ExplorePanels>

      <h3 class="explore-home__subheading">{{ t('explore.home.highlighted') }}</h3>
      <div class="explore-highlighted">
        <RouterLink v-for="card in highlighted" :key="card.id" class="explore-highlighted__panel" :to="card.to">
          <span class="explore-highlighted__image" :style="background(card.image)"></span>
          <span class="explore-highlighted__info">
            <span class="explore-highlighted__name">{{ card.name }}</span>
            <span class="explore-highlighted__description">{{ card.description }}</span>
          </span>
        </RouterLink>
      </div>
    </section>

    <section id="explore-by-country" class="explore-home__section">
      <h2 class="explore-home__heading">{{ t('explore.nav.byCountry') }}</h2>
      <p class="explore-home__intro">{{ t('explore.home.byCountry') }}</p>
      <div class="explore-home__map">
        <ExploreMap v-if="countryPins.length" :pins="countryPins" />
        <select class="explore-home__country" :aria-label="t('explore.select.pickCountry')" value="" @change="pickCountry">
          <option value="" disabled selected>{{ t('explore.select.pickCountry') }}</option>
          <option v-for="country in sortedCountries" :key="country.id" :value="country.id">{{ title(country, locale) }}</option>
        </select>
      </div>
    </section>

    <section id="explore-by-itinerary" class="explore-home__section">
      <h2 class="explore-home__heading">{{ t('explore.nav.byItinerary') }}</h2>
      <p class="explore-home__intro">{{ t('explore.home.byItinerary') }}</p>
      <div class="explore-home__selects">
        <FacetSelect
          class="explore-home__select"
          :label="t('explore.select.countries')"
          :placeholder="t('explore.select.pickCountry')"
          :options="itineraryCountryOptions"
          model-value=""
          @update:model-value="pickItineraryCountry"
        />
        <FacetSelect
          class="explore-home__select"
          :label="t('explore.itinerary.itineraries')"
          :placeholder="t('explore.itinerary.pickItinerary')"
          :options="itineraryOptions"
          model-value=""
          @update:model-value="pickItinerary"
        />
      </div>
      <ExplorePanels
        class="explore-itinerary-panels"
        :count="itineraryCards.length"
        :previous-label="t('core.pagination.previous')"
        :next-label="t('core.pagination.next')"
      >
        <RouterLink v-for="card in itineraryCards" :key="card.id" class="explore-itinerary-panel" :to="card.to">
          <span class="explore-itinerary-panel__image" :style="background(card.image)"></span>
          <span class="explore-itinerary-panel__overlay">
            <span class="explore-itinerary-panel__country">{{ card.country }}</span>
            <span class="explore-itinerary-panel__name">{{ card.name }}</span>
          </span>
        </RouterLink>
      </ExplorePanels>
    </section>

    <FeaturedPartnerships :partnerships="partnerships" variant="row" />
  </div>
</template>
