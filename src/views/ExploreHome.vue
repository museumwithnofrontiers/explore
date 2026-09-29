<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { md, mdStrip, useI18n } from '@museumwnf/viewer-core'
import { FacetSelect } from '@museumwnf/viewer-layout/content'
import ExploreTiles from '../components/ExploreTiles.vue'
import FeaturedPartnerships from '../components/FeaturedPartnerships.vue'
import {
  byTitle, countries, countryPicture, partnershipsFor, placeLink, text, themeLink, themePictures, themes, title,
  useTexts,
} from '../composables/explore.js'

// The home page, as legacy drew it: the welcome, then one section per way in.
// "Explore by Theme" lists the themes in legacy's order, each with one of its
// pictures drawn per visit, and two of them drawn again as "Highlighted
// Themes"; "Explore by Country" lists the countries. Legacy drew both picks
// per request and read no flag for either. The itineraries' section and the
// map come with the itinerary pages.
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

function cut(value) {
  const plain = mdStrip(value ?? '')
  return plain.length > DESCRIPTION_LENGTH ? `${plain.slice(0, DESCRIPTION_LENGTH).trimEnd()}...` : plain
}

const themeCards = computed(() =>
  themes.value.map((theme) => ({
    id: theme.id,
    name: title(theme, locale.value),
    description: cut(text('collections', theme.id, locale.value).description),
    image: pictureOf.get(theme.id),
    to: themeLink(theme),
  })),
)
const highlighted = computed(() => highlightedIds.map((id) => themeCards.value.find((card) => card.id === id)).filter(Boolean))

const sortedCountries = computed(() => [...countries.value].sort(byTitle(locale.value)))
const countryOptions = computed(() => sortedCountries.value.map((c) => ({ value: c.id, label: title(c, locale.value) })))
const countryTiles = computed(() =>
  sortedCountries.value.map((country) => ({
    id: country.id,
    label: title(country, locale.value),
    image: countryPicture(country),
    to: placeLink(country),
  })),
)
function pickCountry(id) {
  const country = countries.value.find((c) => c.id === id)
  if (country) router.push(placeLink(country))
}

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
      <ul class="explore-themes">
        <li v-for="card in themeCards" :key="card.id" class="explore-themes__card">
          <img v-if="card.image" class="explore-themes__image" :src="card.image" alt="" loading="lazy" />
          <div class="explore-themes__body">
            <h3 class="explore-themes__name">{{ card.name }}</h3>
            <p class="explore-themes__description">{{ card.description }}</p>
            <RouterLink class="explore-button" :to="card.to">{{ t('core.action.explore') }}</RouterLink>
          </div>
        </li>
      </ul>

      <h3 class="explore-home__subheading">{{ t('explore.home.highlighted') }}</h3>
      <ul class="explore-highlighted">
        <li v-for="card in highlighted" :key="card.id" class="explore-highlighted__card">
          <RouterLink class="explore-highlighted__link" :to="card.to">
            <img v-if="card.image" class="explore-highlighted__image" :src="card.image" alt="" loading="lazy" />
            <span class="explore-highlighted__name">{{ card.name }}</span>
            <span class="explore-highlighted__description">{{ card.description }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <section id="explore-by-country" class="explore-home__section">
      <h2 class="explore-home__heading">{{ t('explore.nav.byCountry') }}</h2>
      <p class="explore-home__intro">{{ t('explore.home.byCountry') }}</p>
      <FacetSelect
        class="explore-home__select"
        :label="t('explore.select.countries')"
        :placeholder="t('explore.select.pickCountry')"
        :options="countryOptions"
        model-value=""
        @update:model-value="pickCountry"
      />
      <ExploreTiles :tiles="countryTiles" />
    </section>

    <FeaturedPartnerships :partnerships="partnerships" variant="row" />
  </div>
</template>
