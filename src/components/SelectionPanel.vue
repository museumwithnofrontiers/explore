<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { mdInline, useI18n } from '@museumwnf/viewer-core'
import {
  byTitle, countries, countriesWithItineraries, filtersOf, itinerariesIn, itinerariesLink, itinerariesOfTerritory,
  itineraryLink, itineraryLocations, itineraryMonuments, monumentLink, monumentName, panelTerritories, placeLink,
  roman, shownLocations, shownMonuments, subItinerariesOf, subItineraryLink, themeCountries, themeLink, themes, title,
} from '../composables/explore.js'

// Legacy's "Make Your Selection": one select per step of the path, each
// listing what the step above leaves, the steps already taken selected.
// Picking one goes to its page. By theme the steps are themes, countries,
// territories, locations and monuments; by country a filter comes second; by
// itinerary, countries, itineraries, sub-itineraries, their locations and
// their monuments.
const props = defineProps({
  /** 'theme', 'country' or 'itinerary': the path the visitor is on. */
  mode: { type: String, required: true },
  theme: { type: Object, default: null },
  country: { type: Object, default: null },
  filter: { type: String, default: '' },
  territory: { type: Object, default: null },
  location: { type: Object, default: null },
  /** The monument shown, as `monumentsOf()` builds it. */
  monument: { type: Object, default: null },
  itinerary: { type: Object, default: null },
  subItinerary: { type: Object, default: null },
})
const { t, locale } = useI18n()
const router = useRouter()

const context = computed(() => ({ theme: props.theme, filter: props.filter || null, territory: props.territory }))
const option = (collection) => ({ value: collection.id, label: title(collection, locale.value) })
const sorted = (list) => [...list].sort(byTitle(locale.value))

const themeOptions = computed(() => sorted(themes.value).map(option))
const countryOptions = computed(() =>
  sorted(props.mode === 'theme' ? (props.theme ? themeCountries(props.theme) : []) : countries.value).map(option),
)
const place = computed(() => props.territory ?? props.country)
const locations = computed(() => (place.value ? sorted(shownLocations(place.value, context.value)) : []))
// Legacy's Territories step (explore.js `panelTerritories`): drawn only when
// its list holds some, the steps numbered in sequence over the ones drawn.
const territories = computed(() =>
  panelTerritories({
    mode: props.mode,
    theme: props.theme,
    country: props.country,
    filter: props.filter || null,
    itinerary: props.itinerary,
  }),
)
const territoryOptions = computed(() => sorted(territories.value).map(option))
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
  const territory = byId(territories.value, id)
  if (!territory) return
  go(props.mode === 'itinerary' ? itinerariesLink(props.country, territory) : placeLink(territory, context.value))
}
const pickLocation = (id) => go(placeLink(byId(locations.value, id), context.value))
const pickMonument = (value) => {
  const hit = monuments.value.find((m) => m.value === value)
  go(hit && monumentLink(hit.monument, { theme: props.theme, territory: props.territory }))
}

// The itinerary path.
const itineraryCountryOptions = computed(() => countriesWithItineraries(locale.value).map(option))
const itineraryOptions = computed(() =>
  props.country ? itinerariesOfTerritory(itinerariesIn(props.country), props.territory).map(option) : [],
)
// Legacy numbered the sub-itineraries as their itinerary does.
const subOptions = computed(() =>
  subItinerariesOf(props.itinerary).map((sub, index) => ({ value: sub.id, label: `${roman(index + 1)}. ${title(sub, locale.value)}` })),
)
const subLocations = computed(() => itineraryLocations(props.subItinerary))
const subLocationOptions = computed(() => subLocations.value.map(option))
const subMonuments = computed(() =>
  props.subItinerary
    ? itineraryMonuments(props.subItinerary, props.location).map((m) => ({
        monument: m,
        value: `${m.location.id}|${m.main.id}`,
        label: monumentName(m, locale.value),
      }))
    : [],
)
const pickItineraryCountry = (id) => go(itinerariesLink(byId(countriesWithItineraries(locale.value), id)))
const pickItinerary = (id) => go(itineraryLink(byId(itinerariesIn(props.country), id)))

// The steps' numbers, legacy's: 1, 2, 3… over the steps drawn on this path.
const steps = computed(() => {
  const order = {
    theme: ['themes', 'countries', 'territories', 'locations', 'monuments'],
    itinerary: ['countries', 'territories', 'itineraries', 'subItineraries', 'locations', 'monuments'],
    country: ['countries', 'filters', 'territories', 'locations', 'monuments'],
  }[props.mode] ?? []
  const drawn = order.filter((step) =>
    step === 'territories' ? territories.value.length > 0 : step === 'filters' ? showFilters.value : true,
  )
  return Object.fromEntries(drawn.map((step, index) => [step, `${index + 1}.`]))
})
// Legacy drew Filters while the country's list holds some (or no country is chosen yet).
const showFilters = computed(() => !props.country || filterOptions.value.length > 0)
const pickSub = (id) => go(subItineraryLink(byId(subItinerariesOf(props.itinerary), id)))
const pickSubLocation = (id) => go(subItineraryLink(props.subItinerary, byId(subLocations.value, id)))
const pickSubMonument = (value) => {
  const hit = subMonuments.value.find((m) => m.value === value)
  go(hit && monumentLink(hit.monument, { sub: props.subItinerary }))
}

// Legacy's sentence under the selection, one form per path, then its link home.
const exploring = computed(() =>
  props.mode === 'theme'
    ? t('explore.select.exploringTheme')
    : props.mode === 'itinerary'
      ? t('explore.select.exploringItinerary')
      : t('explore.select.exploringCountry'),
)

// The steps of the path, in legacy's order: each its numbered label, its
// placeholder, its options, its value and where picking one goes.
const row = (key, name, placeholder, options, value, pick, disabled = !options.length) =>
  ({ key, label: `${steps.value[key]} ${t(name)}`, placeholder: t(placeholder), options, value, pick, disabled })
const rows = computed(() => {
  const territoryRow = () =>
    row('territories', 'explore.select.territories', 'explore.select.pickTerritory', territoryOptions.value, props.territory?.id ?? '', pickTerritory, !props.country)
  const list =
    props.mode === 'theme'
      ? [
          row('themes', 'explore.select.themes', 'explore.select.pickTheme', themeOptions.value, props.theme?.id ?? '', pickTheme, false),
          row('countries', 'explore.select.countries', 'explore.select.pickCountry', countryOptions.value, props.country?.id ?? '', pickCountry),
          steps.value.territories && territoryRow(),
          row('locations', 'explore.select.locations', 'explore.select.pickLocation', locationOptions.value, props.location?.id ?? '', pickLocation),
          row('monuments', 'explore.select.monuments', 'explore.select.pickMonument', monuments.value, monumentValue.value, pickMonument),
        ]
      : props.mode === 'itinerary'
        ? [
            row('countries', 'explore.select.countries', 'explore.select.pickCountry', itineraryCountryOptions.value, props.country?.id ?? '', pickItineraryCountry, false),
            steps.value.territories && territoryRow(),
            row('itineraries', 'explore.itinerary.itineraries', 'explore.itinerary.pickItinerary', itineraryOptions.value, props.itinerary?.id ?? '', pickItinerary),
            row('subItineraries', 'explore.itinerary.subItineraries', 'explore.itinerary.pickSubItinerary', subOptions.value, props.subItinerary?.id ?? '', pickSub),
            row('locations', 'explore.select.locations', 'explore.select.pickLocation', subLocationOptions.value, props.location?.id ?? '', pickSubLocation),
            row('monuments', 'explore.select.monuments', 'explore.select.pickMonument', subMonuments.value, monumentValue.value, pickSubMonument),
          ]
        : [
            row('countries', 'explore.select.countries', 'explore.select.pickCountry', countryOptions.value, props.country?.id ?? '', pickCountry, false),
            steps.value.filters && row('filters', 'explore.select.filters', 'explore.select.pickFilter', filterOptions.value, props.filter, pickFilter),
            steps.value.territories && territoryRow(),
            row('locations', 'explore.select.locations', 'explore.select.pickLocation', locationOptions.value, props.location?.id ?? '', pickLocation),
            row('monuments', 'explore.select.monuments', 'explore.select.pickMonument', monuments.value, monumentValue.value, pickMonument),
          ]
  return list.filter(Boolean)
})
</script>

<template>
  <!-- Legacy's SideNavigation: the title, a step per select, the sentence home. -->
  <section class="explore-select" aria-labelledby="explore-select-heading">
    <div id="explore-select-heading" class="explore-select__title"><div>{{ t('explore.select.heading') }}</div></div>
    <div v-for="entry in rows" :key="entry.key" class="explore-select__step" :class="{ 'explore-select__step--disabled': entry.disabled }">
      <div>
        <label class="explore-select__label" :for="`explore-select-${entry.key}`">{{ entry.label }}</label>
        <select :id="`explore-select-${entry.key}`" class="explore-select__select" :value="entry.value" :disabled="entry.disabled" @change="entry.pick($event.target.value)">
          <option value="" disabled>{{ entry.placeholder }}</option>
          <option v-for="option in entry.options" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>
    </div>
    <div class="explore-select__step">
      <div>
        <p class="explore-select__note">
          <span v-html="mdInline(exploring)"></span>
          {{ ' ' }}<RouterLink class="explore-select__home" :to="{ name: 'home' }"><span v-html="mdInline(t('explore.select.returnHome'))"></span></RouterLink>
        </p>
      </div>
    </div>
  </section>
</template>
