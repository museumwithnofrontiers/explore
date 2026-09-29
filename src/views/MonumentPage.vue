<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  NotFoundView, languageLabels, md, mdInline, mdStrip, renderBlock, useDataPackage, useGlossaryPopup, useI18n,
  useRecordSheet,
} from '@museumwnf/viewer-core'
import { GlossaryPopover, MediaGallery, RecordLanguages, SpecialFeatures } from '@museumwnf/viewer-layout/content'
import AdditionalInformation from '../components/AdditionalInformation.vue'
import ExploreFrame from '../components/ExploreFrame.vue'
import {
  collectionById, countryOf, detailsOf, findMonument, loadTexts, monumentName, partnershipsFor, placeLink, sourceOf,
  territoryOf, text, themeLink, title, travelFor, useTexts,
} from '../composables/explore.js'

// A monument's page, legacy's tabs: its description (its own record's, in
// any language the record carries), how to get there, the travel layer's
// practical information, and its related content — the other records the
// Explore monument stands for, and its record's special features. The map
// and the itineraries it is on come with the itinerary pages.
//
// The address names the monument by its own record (`/monument/:id`) and the
// location it is explored from (`?location=`): one record can be a monument
// in several locations.
const props = defineProps({
  id: { type: String, required: true },
})
const { t, locale } = useI18n()
const route = useRoute()
const { manifest } = useDataPackage()
const ready = useTexts(['collections', 'countries', 'items'])

const monument = computed(() =>
  findMonument(props.id, typeof route.query.location === 'string' ? route.query.location : null),
)
const main = computed(() => monument.value?.main ?? null)
const location = computed(() => monument.value?.location ?? null)
const country = computed(() => countryOf(location.value))
const theme = computed(() => {
  const collection = collectionById(route.query.theme)
  return collection?.type === 'theme' ? collection : null
})

const { language, languages, dir, select, glossary, terms } = useRecordSheet(main, { entity: 'items' })
// The record's text in the language it is read in, field by field English where
// that language has none: legacy's French row of an Exhibition Trails record
// is often its name alone.
const own = computed(() => (main.value ? text('items', main.value.id, language.value) : {}))
watch(language, (lang) => { if (lang) loadTexts(['items'], lang) }, { immediate: true })
const { active, onClick, close } = useGlossaryPopup(terms)
const activeHtml = computed(() => (active.value ? renderBlock(active.value.definition, { breaks: true }) : ''))

const heading = computed(() => (monument.value ? monumentName(monument.value, locale.value) : ''))
const place = computed(() =>
  [title(location.value, locale.value), title(country.value, locale.value)].filter(Boolean).join(', '),
)

// ── Where each record comes from ──────────────────────────────────────────

// Legacy's dictionary names two of the sources; a Sharing History record is
// named by its project alone, and Explore's own by nothing.
const sourceLabels = computed(() => ({
  trails: t('explore.source.trails'),
  virtualMuseum: t('explore.source.virtualMuseum'),
}))
function sourceLine(record, lang) {
  const project = manifest.projects?.[record.project_id]?.name
  return [sourceLabels.value[sourceOf(record).source], project?.[lang] ?? project?.en].filter(Boolean).join(' — ')
}

function images(record, lang, name) {
  return (record.images ?? []).map((image) => {
    const caption = image.captions?.[lang] ?? image.captions?.en ?? ''
    return {
      url: image.url,
      alt: mdStrip(caption || name),
      caption,
      photographer: image.photographer ?? '',
      copyright: image.copyright ?? '',
    }
  })
}

// ── The description ───────────────────────────────────────────────────────

const credit = (label, value) => (value ? { label, value } : null)
const sheet = computed(() => {
  if (!main.value) return null
  const x = own.value
  const name = x.name ?? main.value.internal_name
  return {
    source: sourceLine(main.value, language.value),
    name: mdInline(name, { glossary: glossary.value }),
    images: images(main.value, language.value, name),
    fields: [
      credit(t('sheet.field.alsoKnownAs'), x.alternate_name),
      credit(t('sheet.field.date'), x.dates),
      credit(t('sheet.field.location'), x.location),
    ].filter(Boolean),
    description: md(x.description, { glossary: glossary.value }),
    history: md(x.history, { glossary: glossary.value }),
    bibliography: md(x.bibliography),
    credits: [
      credit(t('sheet.field.preparedBy'), x.prepared_by || x.author),
      credit(t('sheet.field.copyeditedBy'), x.copy_editor),
      credit(t('sheet.field.translationBy'), x.translator),
      credit(t('sheet.field.translationCopyeditedBy'), x.translation_copy_editor),
    ].filter(Boolean),
  }
})

// ── Getting there ─────────────────────────────────────────────────────────

const directions = computed(() => {
  if (!main.value) return []
  const x = own.value
  return [
    { key: 'howToReach', label: t('explore.info.howToReach'), value: x.how_to_reach || x.explore?.how_to_reach },
    { key: 'contact', label: t('explore.info.contact'), value: x.contact || x.monument_contact },
    { key: 'information', label: t('explore.info.information'), value: x.info || x.explore?.info },
  ]
    .filter((entry) => entry.value)
    .map((entry) => ({ ...entry, html: md(entry.value) }))
})

const travel = computed(() => (monument.value ? travelFor('monument', monument.value.exploreId) : {}))

// ── Related content ───────────────────────────────────────────────────────

const related = computed(() =>
  (monument.value?.related ?? []).map((record) => {
    const x = text('items', record.id, language.value)
    const name = x.name ?? record.internal_name
    return {
      id: record.id,
      source: sourceLine(record, language.value),
      name: mdInline(name),
      images: images(record, language.value, name),
      description: md(x.description),
      by: x.prepared_by || x.author || '',
    }
  }),
)
const features = computed(() => detailsOf(main.value))
const featureText = (feature) => text('items', feature.id, language.value)

// ── The tabs ──────────────────────────────────────────────────────────────

const tabs = computed(() =>
  [
    { key: 'description', label: t('sheet.field.description'), shown: true },
    { key: 'directions', label: t('explore.monument.directions'), shown: directions.value.length > 0 },
    {
      key: 'information',
      label: t('explore.info.heading'),
      shown: ['accommodations', 'guidedVisits', 'usefulWebsites'].some((k) => travel.value[k]?.length),
    },
    { key: 'related', label: t('record.related.title'), shown: related.value.length + features.value.length > 0 },
  ].filter((tab) => tab.shown),
)
const current = ref('description')
watch(() => props.id, () => { current.value = 'description' })

function move(event, index) {
  const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
  if (!step) return
  const next = tabs.value[(index + step + tabs.value.length) % tabs.value.length]
  current.value = next.key
  event.currentTarget.parentElement.querySelector(`[data-tab="${next.key}"]`)?.focus()
}

const crumbs = computed(() => {
  const context = { theme: theme.value }
  const trail = [{ label: t('core.nav.home'), to: { name: 'home' } }]
  if (theme.value) trail.push({ label: title(theme.value, locale.value), to: themeLink(theme.value) })
  if (country.value) trail.push({ label: title(country.value, locale.value), to: placeLink(country.value, context) })
  if (location.value) trail.push({ label: title(location.value, locale.value), to: placeLink(location.value, context) })
  trail.push({ label: heading.value })
  return trail
})
const selection = computed(() => ({
  mode: theme.value ? 'theme' : 'country',
  theme: theme.value,
  country: country.value,
  territory: territoryOf(location.value),
  location: location.value,
  monument: monument.value,
}))
const partnerships = computed(() =>
  monument.value ? partnershipsFor({ theme: theme.value, level: 'monument', id: monument.value.exploreId }) : [],
)
</script>

<template>
  <NotFoundView v-if="!monument" />
  <p v-else-if="!ready" class="explore-loading">{{ t('core.status.loading') }}</p>
  <ExploreFrame v-else :crumbs="crumbs" :selection="selection" :partnerships="partnerships">
    <article class="explore-page explore-monument" @click="onClick">
      <h1 class="explore-page__title">
        {{ heading }}<span v-if="place" class="explore-monument__place"> ({{ place }})</span>
      </h1>

      <div class="explore-tabs" role="tablist" :aria-label="heading">
        <button
          v-for="(tab, index) in tabs"
          :key="tab.key"
          :data-tab="tab.key"
          type="button"
          role="tab"
          class="explore-tabs__tab"
          :class="{ 'explore-tabs__tab--active': current === tab.key }"
          :aria-selected="current === tab.key ? 'true' : 'false'"
          :tabindex="current === tab.key ? 0 : -1"
          @click="current = tab.key"
          @keydown="move($event, index)"
        >{{ tab.label }}</button>
      </div>

      <section v-if="current === 'description' && sheet" class="explore-tabs__panel" role="tabpanel">
        <p v-if="sheet.source" class="explore-monument__source">{{ sheet.source }}</p>
        <MediaGallery v-if="sheet.images.length" :images="sheet.images" />
        <RecordLanguages :languages="languageLabels(languages)" :language="language" @select="select" />
        <div :dir="dir || undefined">
          <h2 class="explore-monument__name" v-html="sheet.name"></h2>
          <dl v-if="sheet.fields.length" class="explore-monument__fields">
            <template v-for="field in sheet.fields" :key="field.label">
              <dt>{{ field.label }}</dt>
              <dd>{{ field.value }}</dd>
            </template>
          </dl>
          <div class="explore-prose" v-html="sheet.description"></div>
          <template v-if="sheet.history">
            <h3 class="explore-monument__subheading">{{ t('sheet.field.history') }}</h3>
            <div class="explore-prose" v-html="sheet.history"></div>
          </template>
          <p v-for="entry in sheet.credits" :key="entry.label" class="explore-page__credit">{{ entry.label }}: {{ entry.value }}</p>
          <template v-if="sheet.bibliography">
            <h3 class="explore-monument__subheading">{{ t('sheet.field.bibliography') }}</h3>
            <div class="explore-prose" v-html="sheet.bibliography"></div>
          </template>
        </div>
      </section>

      <section v-if="current === 'directions'" class="explore-tabs__panel" role="tabpanel">
        <section v-for="entry in directions" :key="entry.key" class="explore-info__section">
          <h3 class="explore-info__heading">{{ entry.label }}</h3>
          <div class="explore-prose" v-html="entry.html"></div>
        </section>
      </section>

      <section v-if="current === 'information'" class="explore-tabs__panel" role="tabpanel">
        <AdditionalInformation :travel="travel" open />
      </section>

      <section v-if="current === 'related'" class="explore-tabs__panel" role="tabpanel">
        <article v-for="record in related" :key="record.id" class="explore-related">
          <p class="explore-monument__source">{{ record.source }}</p>
          <h2 class="explore-monument__name" v-html="record.name"></h2>
          <MediaGallery v-if="record.images.length" :images="record.images" />
          <div class="explore-prose" :dir="dir || undefined" v-html="record.description"></div>
          <p v-if="record.by" class="explore-page__credit">{{ t('sheet.field.preparedBy') }}: {{ record.by }}</p>
        </article>
        <SpecialFeatures :features="features" :tr="featureText" :language="language" :glossary="glossary" :dir="dir" />
      </section>

      <GlossaryPopover :term="active" :html="activeHtml" :dir="dir" @close="close" />
    </article>
  </ExploreFrame>
</template>
