<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@museumwnf/viewer-core'
import { FacetSelect } from '@museumwnf/viewer-layout/content'
import {
  byTitle, countries, filtersOf, monumentLink, monumentName, placeLink, shownLocations, shownMonuments,
  shownTerritories, themeCountries, themeLink, themes, title,
} from '../composables/explore.js'

// Legacy's "Make Your Selection": one select per step of the path, each
// listing what the step above leaves, the steps already taken selected.
// Picking one goes to its page. By theme the steps are themes, countries,
// territories, locations and monuments; by country a filter comes second.
const props = defineProps({
  /** 'theme' or 'country': the path the visitor is on. */
  mode: { type: String, required: true },
  theme: { type: Object, default: null },
  country: { type: Object, default: null },
  filter: { type: String, default: '' },
  territory: { type: Object, default: null },
  location: { type: Object, default: null },
  /** The monument shown, as `monumentsOf()` builds it. */
  monument: { type: Object, default: null },
})
const { t, locale } = useI18n()
const router = useRouter()

const context = computed(() => ({ theme: props.theme, filter: props.filter || null }))
const option = (collection) => ({ value: collection.id, label: title(collection, locale.value) })
const sorted = (list) => [...list].sort(byTitle(locale.value))

const themeOptions = computed(() => sorted(themes.value).map(option))
const countryOptions = computed(() =>
  sorted(props.mode === 'theme' ? (props.theme ? themeCountries(props.theme) : []) : countries.value).map(option),
)
const place = computed(() => props.territory ?? props.country)
const locations = computed(() => (place.value ? sorted(shownLocations(place.value, context.value)) : []))
const territoryOptions = computed(() =>
  props.country ? sorted(shownTerritories(props.country, context.value)).map(option) : [],
)
const filterOptions = computed(() => {
  if (!props.country) return []
  const all = shownLocations(props.country).flatMap((l) => shownMonuments(l)).flatMap(filtersOf)
  return [...new Set(all)].sort((a, b) => a.localeCompare(b)).map((f) => ({ value: f, label: f }))
})
const locationOptions = computed(() => locations.value.map(option))
const monuments = computed(() =>
  (props.location ? [props.location] : locations.value)
    .flatMap((l) => shownMonuments(l, context.value))
    .map((m) => ({ monument: m, value: `${m.location.id}|${m.main.id}`, label: monumentName(m, locale.value) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale.value)),
)
const monumentValue = computed(() =>
  props.monument ? `${props.monument.location.id}|${props.monument.main.id}` : '',
)

const byId = (list, id) => list.find((c) => c.id === id)

function go(to) {
  if (to) router.push(to)
}
const pickTheme = (id) => go(themeLink(byId(themes.value, id)))
const pickCountry = (id) => {
  const country = byId(props.mode === 'theme' ? themeCountries(props.theme) : countries.value, id)
  go(country && placeLink(country, { theme: props.theme }))
}
const pickFilter = (filter) => go(placeLink(props.country, { filter }))
const pickTerritory = (id) => {
  const territory = byId(shownTerritories(props.country, context.value), id)
  go(territory && placeLink(territory, context.value))
}
const pickLocation = (id) => go(placeLink(byId(locations.value, id), context.value))
const pickMonument = (value) => {
  const hit = monuments.value.find((m) => m.value === value)
  go(hit && monumentLink(hit.monument, { theme: props.theme }))
}

// Legacy's sentence under the selection, one form per path, then its link home.
const exploring = computed(() =>
  props.mode === 'theme' ? t('explore.select.exploringTheme') : t('explore.select.exploringCountry'),
)
</script>

<template>
  <section class="explore-select" :aria-labelledby="'explore-select-heading'">
    <h2 id="explore-select-heading" class="explore-select__heading">{{ t('explore.select.heading') }}</h2>
    <template v-if="mode === 'theme'">
      <FacetSelect :label="`1. ${t('explore.select.themes')}`" :placeholder="t('explore.select.pickTheme')" :options="themeOptions" :model-value="theme?.id ?? ''" @update:model-value="pickTheme" />
      <FacetSelect :label="`2. ${t('explore.select.countries')}`" :placeholder="t('explore.select.pickCountry')" :options="countryOptions" :model-value="country?.id ?? ''" :disabled="!countryOptions.length" @update:model-value="pickCountry" />
      <FacetSelect :label="`3. ${t('explore.select.territories')}`" :placeholder="t('explore.select.pickTerritory')" :options="territoryOptions" :model-value="territory?.id ?? ''" :disabled="!territoryOptions.length" @update:model-value="pickTerritory" />
      <FacetSelect :label="`4. ${t('explore.select.locations')}`" :placeholder="t('explore.select.pickLocation')" :options="locationOptions" :model-value="location?.id ?? ''" :disabled="!locationOptions.length" @update:model-value="pickLocation" />
      <FacetSelect :label="`5. ${t('explore.select.monuments')}`" :placeholder="t('explore.select.pickMonument')" :options="monuments" :model-value="monumentValue" :disabled="!monuments.length" @update:model-value="pickMonument" />
    </template>
    <template v-else>
      <FacetSelect :label="`1. ${t('explore.select.countries')}`" :placeholder="t('explore.select.pickCountry')" :options="countryOptions" :model-value="country?.id ?? ''" @update:model-value="pickCountry" />
      <FacetSelect :label="`2. ${t('explore.select.filters')}`" :placeholder="t('explore.select.pickFilter')" :options="filterOptions" :model-value="filter" :disabled="!filterOptions.length" @update:model-value="pickFilter" />
      <FacetSelect :label="`3. ${t('explore.select.territories')}`" :placeholder="t('explore.select.pickTerritory')" :options="territoryOptions" :model-value="territory?.id ?? ''" :disabled="!territoryOptions.length" @update:model-value="pickTerritory" />
      <FacetSelect :label="`4. ${t('explore.select.locations')}`" :placeholder="t('explore.select.pickLocation')" :options="locationOptions" :model-value="location?.id ?? ''" :disabled="!locationOptions.length" @update:model-value="pickLocation" />
      <FacetSelect :label="`5. ${t('explore.select.monuments')}`" :placeholder="t('explore.select.pickMonument')" :options="monuments" :model-value="monumentValue" :disabled="!monuments.length" @update:model-value="pickMonument" />
    </template>
    <p class="explore-select__note">
      {{ exploring }} <RouterLink :to="{ name: 'home' }">{{ t('explore.select.returnHome') }}</RouterLink>
    </p>
  </section>
</template>
