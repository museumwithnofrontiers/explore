<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NotFoundView, md, mdInline, renderBlock, useDataPackage, useGlossaryPopup, useI18n, useRecordSheet,
} from '@museumwnf/viewer-core'
import { GlossaryPopover } from '@museumwnf/viewer-layout/content'
import ExploreFrame from '../components/ExploreFrame.vue'
import ExploreMap from '../components/ExploreMap.vue'
import MonumentEntry from '../components/MonumentEntry.vue'
import ReadIn from '../components/ReadIn.vue'
import {
  byLanguage, collectionById, countryOf, detailsOf, findMonument, isSubItinerary, itinerariesLink, itinerariesOf,
  itineraryCountries, itineraryLink, itineraryPicture, legacyCut, legacyLines, loadTexts, monumentName, monumentView,
  ownText, placeLink, placePosition, positionOf, recordTexts, roman, routeKind, routeLink, sourceOf, subItinerariesOf,
  pathTerritory, subItineraryLink, text, themeLink, title, travelFor, useTexts,
} from '../composables/explore.js'

// A monument's page, legacy's MonumentComponent (explore-client): its tabs —
// DESCRIPTION, MAP, GET DIRECTIONS, ADDITIONAL INFORMATION, RELATED CONTENT,
// RELATED ITINERARIES —, the description the record legacy leads with
// (`monumentView`), the related content the other records and their special
// features, each opened from its heading, "In <project> <source>". The
// language a text is read in is the address's `?lan=`, as legacy's `lan-…`.
//
// The address names the monument by its own record (`/monument/:id`) and the
// location it is explored from (`?location=`): one record can be a monument
// in several locations. A monument reached through a sub-itinerary keeps it
// (`?itinerary=`), in its trail and its selection.
const props = defineProps({
  id: { type: String, required: true },
})
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const { manifest } = useDataPackage()
const ready = useTexts(['collections', 'countries', 'items', 'partners'])

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
// The territory the address names (`?territory=`), as legacy's `tr-` segment.
const territory = computed(() => pathTerritory(location.value, route.query.territory))
const sub = computed(() => {
  const collection = collectionById(route.query.itinerary)
  return collection && isSubItinerary(collection) ? collection : null
})
// A monument reached from a route links back to it, as legacy's did.
const fromRoute = computed(() => {
  const collection = collectionById(route.query.route)
  return collection && routeKind(collection) ? collection : null
})

const view = computed(() => monumentView(monument.value))
const lead = computed(() => view.value.lead)

// The language the texts are read in: the address's, as legacy's `lan-…`.
const language = computed(() => (typeof route.query.lan === 'string' && route.query.lan) || 'en')
function readIn(code) {
  if (code && code !== language.value) router.replace({ query: { ...route.query, lan: code } })
}
watch(language, (lang) => { if (lang) loadTexts(['items', 'partners'], lang) }, { immediate: true })

const { glossary, terms } = useRecordSheet(main, { entity: 'items', translations: ['partners'], languages: () => [language.value] })
const { active, onClick, close } = useGlossaryPopup(terms)
const activeHtml = computed(() => (active.value ? renderBlock(active.value.definition, { breaks: true }) : ''))

const heading = computed(() => (monument.value ? monumentName(monument.value, 'en') : ''))
const place = computed(() => [title(location.value, 'en'), title(country.value, 'en')].filter(Boolean).join(', '))

// ── The records ───────────────────────────────────────────────────────────

// An entry's row in a language, no field taken from another: legacy read
// each language's row alone. Explore's own text about a record is that
// record's `explore` row; a museum's is its partner's.
function rowOf({ kind, record }, lang) {
  if (kind === 'museum') return ownText('partners', record.id, lang)
  const row = ownText('items', record.id, lang)
  return kind === 'explore' ? (row.explore ?? {}) : row
}

// Legacy's "In <project> <source>": the project a record belongs to, in the
// language its heading is read in, and the database it comes from. Explore's
// own records and the museums name no project; an Exhibition Trails record
// its trail; a Sharing History record leading the page is called "Virtual
// Museum".
const nameIn = (names, lang) => names?.[lang] ?? names?.en ?? ''
function projectOf({ kind, record }, lang) {
  if (kind !== 'record' || sourceOf(record).source === 'explore') return ''
  if (sourceOf(record).source === 'trails') {
    const code = String(record.backward_compatibility).split(':')[2]
    return nameIn(manifest.trail_projects?.[code]?.name, lang)
  }
  return nameIn(manifest.projects?.[record.project_id]?.name, lang)
}
function fromOf({ kind, record }, leads) {
  if (kind === 'explore') return t('explore.source.explore')
  if (kind === 'museum') return t('explore.source.virtualMuseum')
  const source = sourceOf(record).source
  if (source === 'sharingHistory') return leads ? t('explore.source.virtualMuseum') : t('explore.source.sharingHistory')
  if (source === 'trails') return t('explore.source.trails')
  if (source === 'virtualMuseum') return t('explore.source.virtualMuseum')
  return t('explore.source.explore')
}

function textsOf(row) {
  return {
    name: row.name ?? '',
    alsoKnownAs: row.alternate_name || row.also_known_as || '',
    date: row.dates ?? '',
    artist: row.artist ?? '',
    history: row.history ?? '',
    description: row.description ?? '',
    preparedBy: row.prepared_by || row.author || '',
    copyEditedBy: row.copy_editor ?? '',
    translationBy: row.translator ?? '',
    translationCopyEditedBy: row.translation_copy_editor ?? '',
    bibliography: row.bibliography ?? '',
  }
}

function entryOf(source, { leads = false } = {}) {
  const { kind, record } = source
  const languages = record.languages ?? ['en']
  const headerLanguage = languages.includes(language.value) ? language.value : 'en'
  return {
    key: `${kind}:${record.id}`,
    name: mdInline(rowOf(source, headerLanguage).name ?? record.internal_name ?? ''),
    project: projectOf(source, headerLanguage),
    from: fromOf(source, leads),
    languages,
    images: record.images ?? [],
    textsIn: (lang) => textsOf(rowOf(source, lang)),
  }
}

const descriptions = computed(() => (lead.value ? [entryOf(lead.value, { leads: true })] : []))

// Legacy's related content: the other records, then the special features of
// every Virtual Museum record the monument is.
const related = computed(() => {
  if (!monument.value) return []
  const records = view.value.related.map((entry) => entryOf(entry))
  const virtualMuseum = [monument.value.main, ...monument.value.related].filter(
    (record) => sourceOf(record).source === 'virtualMuseum',
  )
  const features = virtualMuseum.flatMap((record) =>
    detailsOf(record).map((feature) => ({
      ...entryOf({ kind: 'record', record: { ...feature, languages: feature.languages ?? record.languages } }),
      project: nameIn(manifest.projects?.[feature.project_id ?? record.project_id]?.name, language.value),
      from: t('explore.source.virtualMuseum'),
    })),
  )
  return [...records, ...features]
})
const relatedIndex = ref(0)
watch(() => props.id, () => { relatedIndex.value = 0 })

// ── Getting there and additional information ──────────────────────────────

// Legacy's fields of the leading record, in the language read: each one's
// label, in capitals over the text for the directions and the contact.
const leadLanguages = computed(() => descriptions.value[0]?.languages ?? [])
const leadRow = computed(() => (lead.value ? rowOf(lead.value, language.value) : {}))
// Legacy's MonumentField wrote a few labels in capitals over their text.
const field = (key, label, value, block = false) =>
  value ? { key, label: block ? label.toUpperCase() : label, html: md(String(value)), block } : null
const directions = computed(() => {
  const row = leadRow.value
  const contact = row.monument_contact ?? {}
  return [
    field('directions', t('explore.monument.directionsLabel'), row.how_to_reach, true),
    field('address', t('explore.monument.address'), contact.address ?? row.address),
    field('contact', t('explore.info.contact'), row.contact, true),
    field('tel', t('explore.monument.telephone'), contact.phone ?? row.phone),
    field('fax', t('explore.monument.fax'), contact.fax ?? row.fax),
    field('email', t('explore.monument.email'), contact.email ?? row.email),
    field('website', t('explore.monument.website'), contact.website ?? row.website),
    field('institution', t('explore.monument.responsibleInstitution'), contact.responsible_institution ?? row.responsible_institution_org),
  ].filter(Boolean)
})
const travel = computed(() => (monument.value ? travelFor('monument', monument.value.exploreId) : {}))
const contactOf = (record) => {
  const x = recordTexts(record, 'en')
  return {
    id: record.id,
    lines: [x.name ?? x.title, x.street, x.city, x.zip, x.phone, x.fax, x.email].filter(Boolean),
    url: x.url ?? x.link ?? '',
    person: x.contact_person ?? '',
    note: x.note ?? '',
  }
}
const categoryName = (code) => {
  const category = (travel.value.categories ?? []).find((c) => c.code === code)
  return category ? (byLanguage(category.names, 'en') ?? code) : ''
}
const additional = computed(() => {
  const row = leadRow.value
  return {
    fields: [
      field('information', t('explore.monument.information'), row.info || row.explore?.info || row.opening_hours),
      field('note', t('explore.monument.notes'), row.note),
      field('bibliography', t('explore.monument.bibliography'), row.bibliography),
    ].filter(Boolean),
    accommodations: (travel.value.accommodations ?? []).map((r) => ({ ...contactOf(r), category: categoryName(r.category) })),
    guidedVisits: (travel.value.guidedVisits ?? []).map(contactOf),
    websites: (travel.value.usefulWebsites ?? []).map((site) => {
      const x = recordTexts(site, 'en')
      return { id: site.id, title: x.title ?? '', url: x.link ?? '' }
    }),
  }
})
const hasAdditional = computed(
  () =>
    additional.value.fields.length +
      additional.value.accommodations.length +
      additional.value.guidedVisits.length +
      additional.value.websites.length >
    0,
)

// ── The map and the itineraries ───────────────────────────────────────────

const position = computed(() => positionOf(monument.value))
const pin = computed(() => (position.value ? [{ ...position.value, label: heading.value }] : []))

// Legacy cut a sub-itinerary's text in this list at this many characters.
const SUB_DESCRIPTION_LENGTH = 400
const onItineraries = computed(() =>
  itinerariesOf(monument.value).map((entry) => {
    const parent = collectionById(entry.parent_id)
    const siblings = subItinerariesOf(parent)
    const texts = text('collections', entry.id, 'en')
    return {
      id: entry.id,
      parent: parent ? title(parent, 'en') : '',
      count: siblings.length,
      name: `${roman(siblings.indexOf(entry) + 1)}. ${title(entry, 'en')}`,
      duration: texts.extra?.duration ?? '',
      description: legacyLines(legacyCut(String(texts.description ?? '').replace(/\s*\n+\s*/g, ' '), SUB_DESCRIPTION_LENGTH).text),
      image: itineraryPicture(entry),
      to: subItineraryLink(entry, location.value),
    }
  }),
)

// ── The tabs ──────────────────────────────────────────────────────────────

const tabs = computed(() =>
  [
    { key: 'description', label: t('explore.monument.descriptionTab'), shown: true },
    { key: 'map', label: t('explore.monument.map'), shown: true },
    { key: 'directions', label: t('explore.monument.directions'), shown: directions.value.length > 0 },
    { key: 'additional', label: t('explore.info.heading'), shown: hasAdditional.value },
    { key: 'content', label: t('explore.monument.related'), shown: related.value.length > 0 },
    { key: 'itineraries', label: t('explore.monument.itineraries'), shown: onItineraries.value.length > 0 },
  ].filter((tab) => tab.shown),
)
const current = ref('description')
watch(() => props.id, () => { current.value = 'description' })

const parentItinerary = computed(() => (sub.value ? collectionById(sub.value.parent_id) : null))
const crumbs = computed(() => {
  const context = { theme: theme.value, territory: territory.value }
  const trail = [{ label: t('core.nav.home'), to: { name: 'home' } }]
  if (sub.value) {
    const itineraryCountry = itineraryCountries(parentItinerary.value)[0] ?? country.value
    if (itineraryCountry) {
      trail.push({ label: title(itineraryCountry, locale.value), to: itinerariesLink(itineraryCountry) })
    }
    if (parentItinerary.value) {
      trail.push({ label: title(parentItinerary.value, locale.value), to: itineraryLink(parentItinerary.value) })
    }
    trail.push({ label: title(sub.value, locale.value), to: subItineraryLink(sub.value, location.value) })
    trail.push({ label: heading.value })
    return trail
  }
  if (theme.value) trail.push({ label: title(theme.value, locale.value), to: themeLink(theme.value) })
  if (country.value) trail.push({ label: title(country.value, locale.value), to: placeLink(country.value, context) })
  if (territory.value) trail.push({ label: title(territory.value, locale.value), to: placeLink(territory.value, context) })
  if (location.value) trail.push({ label: title(location.value, locale.value), to: placeLink(location.value, context) })
  trail.push({ label: heading.value })
  return trail
})
const selection = computed(() =>
  sub.value
    ? {
        mode: 'itinerary',
        country: itineraryCountries(parentItinerary.value)[0] ?? country.value,
        itinerary: parentItinerary.value,
        subItinerary: sub.value,
        location: location.value,
        monument: monument.value,
      }
    : {
        mode: theme.value ? 'theme' : 'country',
        theme: theme.value,
        country: country.value,
        territory: territory.value,
        location: location.value,
        monument: monument.value,
      },
)
</script>

<template>
  <NotFoundView v-if="!monument" />
  <p v-else-if="!ready" class="explore-loading">{{ t('core.status.loading') }}</p>
  <ExploreFrame v-else :crumbs="crumbs" :selection="selection">
    <article class="explore-page explore-monument" @click="onClick">
      <p v-if="fromRoute" class="explore-monument__back">
        <RouterLink :to="routeLink(fromRoute)">{{ t('explore.route.back') }}</RouterLink>
      </p>
      <h1 class="explore-page__title">
        {{ heading }}<span v-if="place" class="explore-monument__place">({{ place }})</span>
      </h1>

      <div class="explore-monument-menu" role="tablist" :aria-label="heading">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          class="explore-monument-menu__item"
          :class="{ 'explore-monument-menu__item--selected': current === tab.key }"
          :aria-selected="current === tab.key ? 'true' : 'false'"
          @click="current = tab.key"
        >{{ tab.label }}</button>
      </div>

      <ExploreMap v-if="current === 'map'" :pins="pin" :zoom="position?.zoom ?? placePosition(location)?.zoom ?? null" />

      <div v-if="current === 'description'" class="explore-monument__panel">
        <div v-for="entry in descriptions" :key="entry.key">
          <div class="explore-monument__header">
            <div v-html="entry.name"></div>
            <div class="explore-monument__source">{{ t('explore.monument.in') }} <span>{{ entry.project }}</span> {{ entry.from }}</div>
          </div>
          <div class="explore-monument__entry">
            <MonumentEntry :entry="entry" :language="language" :place="place" :glossary="glossary" @language="readIn" />
          </div>
        </div>
      </div>

      <div v-if="current === 'directions'" class="explore-monument__panel explore-monument__fields">
        <ReadIn :languages="leadLanguages" :language="language" @select="readIn" />
        <div v-for="entry in directions" :key="entry.key" class="explore-field">
          <span class="explore-field__label" :class="{ 'explore-field__label--inline': !entry.block }">{{ entry.label }}<template v-if="!entry.block">: </template></span>
          <span class="explore-field__value" v-html="entry.html"></span>
        </div>
      </div>

      <div v-if="current === 'additional'" class="explore-monument__panel explore-monument__fields">
        <ReadIn :languages="leadLanguages" :language="language" @select="readIn" />
        <div v-for="entry in additional.fields" :key="entry.key" class="explore-field">
          <span class="explore-field__label explore-field__label--inline">{{ entry.label }}: </span>
          <span class="explore-field__value" v-html="entry.html"></span>
        </div>
        <div v-if="additional.accommodations.length" class="explore-additional">
          <div class="explore-additional__label">{{ t('explore.info.accommodations') }}</div>
          <div v-for="entry in additional.accommodations" :key="entry.id" class="explore-additional__entry">
            <div v-for="(line, index) in entry.lines.slice(0, 1)" :key="`n${index}`">{{ line }}</div>
            <div v-if="entry.category" class="explore-additional__category">{{ entry.category }}</div>
            <div v-for="(line, index) in entry.lines.slice(1)" :key="index">{{ line }}</div>
            <div v-if="entry.url"><a :href="entry.url" target="_blank" rel="noopener">{{ entry.url }}</a></div>
            <div v-if="entry.note">{{ entry.note }}</div>
          </div>
        </div>
        <div v-if="additional.guidedVisits.length" class="explore-additional">
          <div class="explore-additional__label">{{ t('explore.info.guidedVisits') }}</div>
          <div v-for="entry in additional.guidedVisits" :key="entry.id" class="explore-additional__entry">
            <div v-for="(line, index) in entry.lines" :key="index">{{ line }}</div>
            <div v-if="entry.url"><a :href="entry.url" target="_blank" rel="noopener">{{ entry.url }}</a></div>
            <div v-if="entry.person">{{ entry.person }}</div>
            <div v-if="entry.note">{{ entry.note }}</div>
          </div>
        </div>
        <div v-if="additional.websites.length" class="explore-additional">
          <div class="explore-additional__label">{{ t('explore.info.usefulWebsites') }}</div>
          <div v-for="site in additional.websites" :key="site.id" class="explore-additional__entry">
            <div>{{ site.title }}</div>
            <div v-if="site.url"><a :href="site.url" target="_blank" rel="noopener">{{ site.url }}</a></div>
          </div>
        </div>
      </div>

      <div v-if="current === 'content'" class="explore-monument__panel">
        <div v-for="(entry, index) in related" :key="entry.key" class="explore-monument__related">
          <div class="explore-monument__header explore-monument__header--button" role="button" tabindex="0" @click="relatedIndex = index" @keydown.enter="relatedIndex = index">
            <div v-html="entry.name"></div>
            <div class="explore-monument__source">{{ t('explore.monument.in') }} <span>{{ entry.project }}</span> {{ entry.from }}</div>
          </div>
          <div v-if="relatedIndex === index" class="explore-monument__entry">
            <MonumentEntry :entry="entry" :language="language" :place="place" :glossary="glossary" @language="readIn" />
          </div>
        </div>
      </div>

      <div v-if="current === 'itineraries'" class="explore-monument__panel">
        <div v-for="entry in onItineraries" :key="entry.id" class="explore-monument-itinerary">
          <div class="explore-monument-itinerary__parent">{{ entry.parent }} ({{ entry.count }} {{ t('explore.itinerary.subItineraries') }})</div>
          <div class="explore-sub-card">
            <div class="explore-sub-card__image" :style="entry.image ? { backgroundImage: `url(${entry.image})` } : {}"></div>
            <div class="explore-sub-card__info">
              <RouterLink class="explore-sub-card__link" :to="entry.to">
                {{ entry.name }}<template v-if="entry.duration"> [{{ entry.duration }}]</template>
              </RouterLink>
              <div v-if="entry.description" class="explore-sub-card__description" v-html="entry.description"></div>
            </div>
          </div>
        </div>
      </div>

      <GlossaryPopover :term="active" :html="activeHtml" @close="close" />
    </article>
  </ExploreFrame>
</template>
