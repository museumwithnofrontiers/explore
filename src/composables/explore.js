import { computed, reactive, watch } from 'vue'
import {
  entityRef, glossaryEntries, glossaryTermsForText, loadEntities, mdInline, mdStrip, renderBlock, siblingSiteUrl,
  useDataPackage, useGlossaryPopup, useI18n, useSiteConfig,
} from '@museumwnf/viewer-core'
import newThemes from '../config/new-themes.json'

// Explore's records, read the one way every website reads them: lazily, each
// entity a shared ref that stays `null` until a route declaring it in
// `meta.entities` brings its chunk in. Nothing here imports `@inventory-data`.
//
// The package (@museumwnf/explore-data, inventory-app
// scripts/exporters/docs/explore-data-package.md) is one collection tree under
// the site root: the themes, the countries with their territories and
// locations, the itineraries. A location's members are the monuments, each
// standing for the Explore monument ids its membership keeps. The site
// records — banners, featured partnerships, the travel layer — are on the
// root, each scoped to the pages it shows on. The rules that read them are
// the analysis doc's (scripts/exporters/docs/explore-legacy-analysis.md).

const pkg = useDataPackage()

export const collections = entityRef('collections')
export const items = entityRef('items')
export const languageRecords = entityRef('languages')
export const partners = entityRef('partners')

// ── Texts ────────────────────────────────────────────────────────────────
//
// A translation file is loaded once per language, and a page re-renders when
// it arrives: `loaded` is what a computed reading a text depends on.

const loaded = reactive(new Set())

export function loadTexts(entities, lang) {
  const codes = [...new Set([lang, 'en'])]
  return Promise.all(
    entities.flatMap((entity) =>
      codes.map(async (code) => {
        await pkg.loadTranslations(entity, code)
        loaded.add(`${entity}:${code}`)
      }),
    ),
  )
}

/** One record's own row in `lang`, nothing taken from English: legacy's monument texts. */
export function ownText(entity, id, lang) {
  loaded.has(`${entity}:${lang}`)
  return pkg.tr(entity, id, lang)
}

/**
 * One record's texts in `lang`, field by field English where it has none in
 * that language: a theme's Spanish row carries its name and no introduction,
 * and the page still shows one.
 */
export function text(entity, id, lang) {
  loaded.has(`${entity}:${lang}`)
  loaded.has(`${entity}:en`)
  const english = pkg.tr(entity, id, 'en')
  if (lang === 'en') return english
  const own = Object.entries(pkg.tr(entity, id, lang)).filter(([, value]) => value !== '' && value != null)
  return { ...english, ...Object.fromEntries(own) }
}

/** A text's first `length` characters, as plain text: legacy cut its cards' and lists' texts so. */
// Legacy's texts reached its client as plain text, each line break written
// `<br/>` and a new line; its `truncate` cut that string at the last space
// before `chars` and added "...". The cut is taken here on that same form of
// the Markdown text, so it falls where legacy's fell (inventory-app#2424).
const LEGACY_BREAK = '<br/>\n'

/** `{ text, cut }`: the Markdown text cut as legacy cut it at `chars`, `cut` false when it fits. */
export function legacyCut(value, chars) {
  const markdown = String(value ?? '').replace(/\r\n/g, '\n').replace(/ {2,}\n/g, '\n').trim()
  const raw = markdown.split('\n').join(LEGACY_BREAK)
  if (raw.length <= chars) return { text: markdown, cut: false }
  const slice = `${raw.substring(0, raw.lastIndexOf(' ', chars))}...`
  return { text: slice.split(LEGACY_BREAK).join('\n'), cut: true }
}

/** The text as legacy printed it, its line breaks kept (`<br>`), inline Markdown rendered. */
export function legacyLines(markdown, options = {}) {
  return String(markdown ?? '').split('\n').map((line) => mdInline(line, options)).join('<br>\n')
}

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
/** Legacy's `subItineraryOrderRoman`: 1 → "I". */
export function roman(n) {
  let rest = n
  return ROMAN.reduce((out, [value, digits]) => {
    while (rest >= value) {
      out += digits
      rest -= value
    }
    return out
  }, '')
}

/** The languages among `codes` a collection has a description in: legacy's "Read in" list. */
export function describedLanguages(codes, id) {
  return codes.filter(
    (code) =>
      loaded.has(`collections:${code}`) &&
      String(pkg.translations('collections', code)[id]?.description ?? '').trim() !== '',
  )
}

/** The site's content languages, the collections' texts loading in each: what a "Read in" may offer. */
export function useContentLanguages() {
  const config = useSiteConfig()
  const codes = config.contentLanguages ?? config.languages ?? ['en']
  for (const code of codes) loadTexts(['collections'], code)
  return codes
}

/**
 * The collections a location's historical background reads, in legacy's
 * order (explore-api Location::getHistoricalBackground): the location's own
 * text, then the Travels locations whose introductions it names.
 */
export function backgroundSources(location) {
  if (location?.type !== 'location') return []
  const travels = (location.extra?.historical_background ?? []).map((key) => tree.value.byKey.get(key)?.id)
  return [location.id, ...travels.filter(Boolean)]
}

export function excerpt(value, length) {
  const plain = mdStrip(value ?? '')
  return plain.length > length ? `${plain.slice(0, length).trimEnd()}...` : plain
}

/**
 * The site's languages a collection is translated in, for its "Read in"
 * buttons: every one of them is loaded, and a collection's page reads its
 * text in whichever the visitor picks.
 */
export function useCollectionLanguages(getCollection) {
  const config = useSiteConfig()
  const codes = config.contentLanguages ?? config.languages ?? ['en']
  for (const code of codes) loadTexts(['collections'], code)
  return computed(() => {
    const id = getCollection()?.id
    return codes.filter((code) => loaded.has(`collections:${code}`) && pkg.translations('collections', code)[id])
  })
}

/**
 * The glossary terms a text reaches, as legacy's DescriptionComponent marked
 * them in an itinerary's and a sub-itinerary's text: every spelling of the
 * glossary, in the text's own language, found in it (explore-api
 * ItineraryTreeResource, ItinerarySubItineraryResource). Returns the spelling
 * list the renderers take, and the popup legacy opened on a term. The route
 * loads the glossary's records (`meta.entities`); its texts load here, in the
 * language the text is read in.
 */
export function useTextGlossary(getText, getLanguage) {
  watch(getLanguage, (lang) => { if (lang) loadTexts(['glossary'], lang) }, { immediate: true })
  const terms = computed(() => {
    const lang = getLanguage()
    loaded.has(`glossary:${lang}`)
    return glossaryTermsForText(getText() ?? '', lang)
  })
  const glossary = computed(() => glossaryEntries(terms.value))
  const { active, onClick, close } = useGlossaryPopup(terms)
  const activeHtml = computed(() => (active.value ? renderBlock(active.value.definition, { breaks: true }) : ''))
  return { glossary, active, onClick, close, activeHtml }
}

/** Loads the texts a page reads, in the site language and in English; `true` once both are in. */
export function useTexts(entities) {
  const { locale } = useI18n()
  watch(locale, (lang) => loadTexts(entities, lang), { immediate: true })
  return computed(() => entities.every((e) => loaded.has(`${e}:${locale.value}`) && loaded.has(`${e}:en`)))
}

// ── The tree ─────────────────────────────────────────────────────────────

/** Legacy's own id of an Explore record: the last part of its key (`mwnf3_explore:location:337` → `337`). */
export function legacyId(record) {
  return String(record?.backward_compatibility ?? '').split(':').pop()
}

export const tree = computed(() => {
  const list = collections.value ?? []
  const byId = new Map(list.map((c) => [c.id, c]))
  const byKey = new Map(list.map((c) => [c.backward_compatibility, c]))
  // The package lists siblings in their display order; the children keep it.
  const children = new Map()
  for (const collection of list) {
    if (!collection.parent_id || !byId.has(collection.parent_id)) continue
    if (!children.has(collection.parent_id)) children.set(collection.parent_id, [])
    children.get(collection.parent_id).push(collection)
  }
  const purpose = (p) => list.find((c) => c.purpose === p) ?? null
  return {
    byId,
    byKey,
    children,
    root: purpose('explore-root'),
    themesRoot: purpose('explore-themes-root'),
    countriesRoot: purpose('explore-countries-root'),
    itinerariesRoot: purpose('explore-itineraries-root'),
  }
})

export const childrenOf = (id) => tree.value.children.get(id) ?? []
export const collectionById = (id) => tree.value.byId.get(id) ?? null

/** An Explore collection by its legacy id: `explore('location', 337)`. */
export function exploreCollection(kind, id) {
  return tree.value.byKey.get(`mwnf3_explore:${kind}:${id}`) ?? null
}

/** The six live themes, in legacy's order. */
export const themes = computed(() =>
  tree.value.themesRoot ? childrenOf(tree.value.themesRoot.id).filter((c) => c.type === 'theme') : [],
)

export const countries = computed(() =>
  tree.value.countriesRoot ? childrenOf(tree.value.countriesRoot.id) : [],
)

/**
 * A collection's name. A country is named as legacy named it, from the
 * countries' own names (`countries.json`), which Explore's country
 * collections do not always follow ("Türkiye", not "Turkey").
 */
export function title(collection, lang) {
  if (!collection) return ''
  if (collection.country_id && collection.parent_id === tree.value.countriesRoot?.id) {
    const name = text('countries', collection.country_id, lang).name
    if (name) return name.trim()
  }
  return text('collections', collection.id, lang).title || collection.internal_name
}

export const byTitle = (lang) => (a, b) => title(a, lang).localeCompare(title(b, lang), lang)

/** A place's level: a country, a territory (legacy's region) or a location. */
export function levelOf(collection) {
  if (collection?.type === 'region') return 'territory'
  if (collection?.type === 'location') return 'location'
  if (collection?.parent_id && collection.parent_id === tree.value.countriesRoot?.id) return 'country'
  return null
}

export function countryOf(collection) {
  let node = collection
  while (node && levelOf(node) !== 'country') node = collectionById(node.parent_id)
  return node
}

export function territoryOf(location) {
  const parent = collectionById(location?.parent_id)
  return parent?.type === 'region' ? parent : null
}

export function territoriesOf(country) {
  return childrenOf(country?.id).filter((c) => c.type === 'region')
}

/** Every location under a place: a country's own and its territories', or the location itself. */
export function locationsUnder(place) {
  if (!place) return []
  if (place.type === 'location') return [place]
  return childrenOf(place.id).flatMap((child) =>
    child.type === 'location' ? [child] : child.type === 'region' ? locationsUnder(child) : [],
  )
}

// ── Monuments ────────────────────────────────────────────────────────────
//
// An Explore monument is an id on a location's memberships
// (`explore_monument_ids`). Most stand for another database's record, and
// some for several; some are museums (`explore_museums`, partners). Legacy
// shows one of them as the monument and the others as its related content,
// by its API's rule (`monumentView`). Among the records, an Exhibition Trails
// (Travels) record comes first, then a Virtual Museum one, then Sharing
// History, then Explore's own.

const SOURCES = [
  ['mwnf3_travels:', 'trails'],
  ['mwnf3:', 'virtualMuseum'],
  ['mwnf3_sharing_history:', 'sharingHistory'],
  ['mwnf3_explore:', 'explore'],
]

/** Where a record comes from, as legacy names it: `trails`, `virtualMuseum`, `sharingHistory` or `explore`. */
export function sourceOf(item) {
  const key = item?.backward_compatibility ?? ''
  const rank = SOURCES.findIndex(([prefix]) => key.startsWith(prefix))
  return rank === -1 ? { rank: SOURCES.length, source: 'explore' } : { rank, source: SOURCES[rank][1] }
}

export const itemById = computed(() => new Map((items.value ?? []).map((i) => [i.id, i])))

const detailsByParent = computed(() => {
  const map = new Map()
  for (const item of items.value ?? []) {
    if (item.type !== 'detail' || !item.parent_id) continue
    if (!map.has(item.parent_id)) map.set(item.parent_id, [])
    map.get(item.parent_id).push(item)
  }
  return map
})

/** A record's details, legacy's "Special Features": items of their own, each pointing at it. */
export function detailsOf(item) {
  return detailsByParent.value.get(item?.id) ?? []
}

const monumentCache = new WeakMap()

/**
 * A location's monuments, one per Explore monument id: `{ exploreId,
 * location, main, related, museumKeys }`. `main` is the record the monument
 * is addressed by, its first by source, and `related` its other records;
 * `museumKeys` the partner keys of the museums it is, in legacy's order.
 */
export function monumentsOf(location) {
  if (!location) return []
  const lookup = itemById.value
  const cached = monumentCache.get(location)
  if (cached?.lookup === lookup) return cached.monuments
  const groups = new Map()
  const museums = new Map()
  for (const member of location.items ?? []) {
    for (const exploreId of member.extra?.explore_monument_ids ?? []) {
      if (!groups.has(exploreId)) groups.set(exploreId, [])
      groups.get(exploreId).push(member.id)
      // A monument with several records names its museums on each membership.
      const keys = museums.get(exploreId) ?? []
      for (const key of member.extra?.explore_museums?.[exploreId] ?? []) {
        if (!keys.includes(key)) keys.push(key)
      }
      museums.set(exploreId, keys)
    }
  }
  const monuments = [...groups]
    .map(([exploreId, ids]) => {
      const records = ids.map((id) => lookup.get(id)).filter(Boolean)
      // A stable sort: records of one source keep the membership's order.
      const [main, ...related] = [...records].sort((a, b) => sourceOf(a).rank - sourceOf(b).rank)
      return { exploreId: String(exploreId), location, main, related, museumKeys: museums.get(exploreId) ?? [] }
    })
    .filter((m) => m.main)
  monumentCache.set(location, { lookup, monuments })
  return monuments
}

const partnerByKey = computed(() => new Map((partners.value ?? []).map((p) => [p.backward_compatibility, p])))

/** The museums a monument is, as partners, in legacy's order. */
export function museumsOf(monument) {
  return (monument?.museumKeys ?? []).map((key) => partnerByKey.value.get(key)).filter(Boolean)
}

/**
 * What a monument's page shows, by legacy's rule (its API's
 * `MonumentResource`, the analysis doc's "Legacy's record for a monument"):
 * `{ lead, related }`, each entry `{ kind, record }` — `kind` `record` for an
 * item, `explore` for Explore's own text about a record, `museum` for a
 * partner. The lead is the first of:
 * 1. Explore's own text, when it has a description;
 * 2. the first museum the monument is;
 * 3. the first of its records, by source, then in legacy's order within it;
 * 4. Explore's own record, without a description.
 * The related content is then one museum at most and the other records.
 * Explore's own record is never related content.
 */
export function monumentView(monument) {
  if (!monument) return { lead: null, related: [] }
  const all = [monument.main, ...monument.related]
  // Within a source, legacy takes Travels and Virtual Museum records by
  // English title, and Sharing History records in their numbers' order (its
  // title sort reads a field that model doesn't have).
  const order = (record) =>
    sourceOf(record).source === 'sharingHistory'
      ? Number(legacyId(record))
      : mdStrip(text('items', record.id, 'en').name ?? '')
  const within = (a, b) => (order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : 0)
  const records = all
    .filter((record) => sourceOf(record).source !== 'explore')
    .sort((a, b) => sourceOf(a).rank - sourceOf(b).rank || within(a, b))
  const native = all.find((record) => sourceOf(record).source === 'explore') ?? null
  const museums = museumsOf(monument)
  const exploreDescription = native
    ? text('items', native.id, 'en').description
    : text('items', monument.main.id, 'en').explore?.description

  const entries = (list, kind) => list.map((record) => ({ kind, record }))
  if (exploreDescription) {
    const lead = native ? { kind: 'record', record: native } : { kind: 'explore', record: monument.main }
    return { lead, related: [...entries(museums.slice(0, 1), 'museum'), ...entries(records, 'record')] }
  }
  if (museums.length > 0) {
    return {
      lead: { kind: 'museum', record: museums[0] },
      related: [...entries(museums.slice(1, 2), 'museum'), ...entries(records, 'record')],
    }
  }
  if (records.length > 0) {
    return { lead: { kind: 'record', record: records[0] }, related: entries(records.slice(1), 'record') }
  }
  return { lead: native ? { kind: 'record', record: native } : null, related: [] }
}

/** Explore's name for a monument, which is how legacy lists it; the record's own name where Explore has none. */
export function monumentName(monument, lang) {
  for (const record of [monument.main, ...monument.related]) {
    const name = text('items', record.id, lang).explore?.name || text('items', record.id, 'en').explore?.name
    if (name) return name.trim()
  }
  return text('items', monument.main.id, lang).name || monument.main.internal_name
}

/**
 * A monument's position, legacy's own: its location membership keeps it per
 * Explore monument id (`explore_geo`), whichever record the monument resolves to.
 */
export function positionOf(monument) {
  for (const member of monument?.location?.items ?? []) {
    const geo = member.extra?.explore_geo?.[monument.exploreId]
    if (geo) return { lat: Number(geo.latitude), lng: Number(geo.longitude), zoom: zoomOf(geo.map_zoom) }
  }
  return null
}


/** A collection's own position: a country's, a territory's or a location's. */
export function placePosition(collection) {
  if (collection?.latitude == null || collection?.longitude == null) return null
  return { lat: Number(collection.latitude), lng: Number(collection.longitude), zoom: zoomOf(collection.map_zoom) }
}

function zoomOf(value) {
  return value == null || value === '' ? null : Number(value)
}

export function findMonument(itemId, locationId) {
  const candidates = locationId
    ? [collectionById(locationId)]
    : (collections.value ?? []).filter((c) => c.type === 'location' && c.items?.some((m) => m.id === itemId))
  for (const location of candidates) {
    const hit = monumentsOf(location).find((m) => m.main.id === itemId)
    if (hit) return hit
  }
  return null
}

// ── What a page shows ────────────────────────────────────────────────────
//
// A page is reached by theme or by country. By theme, a place shows what is in
// the theme; by country, what carries the filter chosen, when there is one.

export function themeItemIds(theme) {
  return theme ? new Set((theme.items ?? []).map((m) => m.id)) : null
}

function records(monument) {
  return [monument.main, ...monument.related]
}

export function filtersOf(monument) {
  return [...new Set(records(monument).flatMap((r) => r.filters ?? []))]
}

/** `{ theme, filter }` → a predicate over monuments. */
export function monumentFilter({ theme, filter } = {}) {
  const inTheme = themeItemIds(theme)
  return (monument) =>
    (!inTheme || records(monument).some((r) => inTheme.has(r.id))) &&
    (!filter || filtersOf(monument).includes(filter))
}

export function shownMonuments(location, context = {}) {
  return monumentsOf(location).filter(monumentFilter(context))
}

/** The locations a place shows; with no theme and no filter, every one of them. */
export function shownLocations(place, context = {}) {
  const locations = locationsUnder(place)
  if (!context.theme && !context.filter) return locations
  return locations.filter((l) => shownMonuments(l, context).length > 0)
}

export function shownTerritories(country, context = {}) {
  return territoriesOf(country).filter((t) => shownLocations(t, context).length > 0)
}

const allTerritories = () => (collections.value ?? []).filter((c) => c.type === 'region')
const itineraryTerritoryIds = (itinerary) =>
  (text('collections', itinerary?.id, 'en').extra?.territory_ids ?? []).map(String)

/**
 * The territories the selection panel lists, as legacy's explore-api answers
 * them (inventory-app#2424); the panel draws its Territories step only when
 * there are some.
 *   theme path      `/territories?t&c`: the country's territories (every one,
 *                   with no country) linked to the theme (`regionsthemes`, the
 *                   territory's `theme_ids`);
 *   country path    `/territories?c&f`: the country's territories, with a
 *                   filter those holding a location of that kind;
 *   itinerary path  `/itineraries/territories?c&i`: the country's territories
 *                   that have itineraries (`explore_itineraries_rel_territory`,
 *                   the itinerary's `territory_ids`), the itinerary's own when
 *                   one is chosen.
 */
export function panelTerritories({ mode, theme = null, country = null, filter = null, itinerary = null }) {
  const pool = country ? territoriesOf(country) : allTerritories()
  if (mode === 'theme') {
    if (!theme) return pool
    const id = legacyId(theme)
    return pool.filter((t) => (text('collections', t.id, 'en').extra?.theme_ids ?? []).map(String).includes(id))
  }
  if (mode === 'itinerary') {
    // Legacy's explore_itineraries holds the sub-itineraries too, and they
    // carry most of the links; a chosen itinerary answers for its own and its
    // sub-itineraries' (legacy's fallback, its `regionId` list).
    const records = itinerary
      ? [itinerary, ...childrenOf(itinerary.id)]
      : (collections.value ?? []).filter((c) => String(c.backward_compatibility).startsWith('mwnf3_explore:itinerary:'))
    const linked = new Set(records.flatMap(itineraryTerritoryIds))
    return pool.filter((t) => linked.has(legacyId(t)))
  }
  if (!filter) return pool
  return pool.filter((t) => locationsUnder(t).some((l) => monumentsOf(l).some((m) => filtersOf(m).includes(filter))))
}

/** The countries a theme covers (`country_ids` on its English translation). */
export function themeCountries(theme) {
  const codes = text('collections', theme?.id, 'en').extra?.country_ids ?? []
  return codes.map((code) => exploreCollection('country', code)).filter(Boolean)
}

/** The theme's own text about a country, in `lang`, English where it has none. */
export function themeCountryText(theme, country, lang) {
  const texts = text('collections', theme?.id, 'en').extra?.country_texts ?? []
  const code = legacyId(country)
  const ofCountry = texts.filter((t) => t.countryId === code)
  return (ofCountry.find((t) => t.langId === lang) ?? ofCountry.find((t) => t.langId === 'en'))?.text ?? ''
}

/** The languages the theme's text about a country is written in: that page's "Read in". */
export function themeCountryLanguages(theme, country) {
  const texts = text('collections', theme?.id, 'en').extra?.country_texts ?? []
  const code = legacyId(country)
  return [...new Set(texts.filter((t) => t.countryId === code).map((t) => t.langId))]
}

/**
 * A country's picture, its flag on legacy's tiles. A theme also carries
 * pictures of its own per country (`thematiccycle_country_pictures`), which
 * legacy never showed: the one there is a test card.
 */
export function countryPicture(country) {
  return country?.images?.[0]?.url ?? null
}

/** A theme's pictures, without the country pictures it also carries. */
export function themePictures(theme) {
  return (theme?.images ?? []).filter((i) => !/ country picture$/.test(i.alt_text ?? ''))
}

/**
 * Whether the home page marks a theme "NEW". Which themes are new is this
 * website's own choice, not inventory data (Pascal, 2026-10-20): the themes
 * listed in src/config/new-themes.json, by their package id. It starts as
 * legacy's set, the six its API flagged `newStatus`.
 */
const newThemeIds = new Set(newThemes.themes.map((theme) => theme.id))

export function isNewTheme(theme) {
  return newThemeIds.has(theme.id)
}

// ── Itineraries ──────────────────────────────────────────────────────────
//
// Under the itineraries root: the thematic itineraries (legacy's kind 4),
// each with its sub-itineraries, and the routes a location links to (kinds
// 1 to 3, "explore", "also not to be missed", "to know more"). Each keeps its
// kind and its order among its siblings in `extra.explore_itinerary`; its
// English translation's `extra` lists its locations in legacy's order. A
// sub-itinerary's members are its monuments' Travels records, each keeping
// the Explore monument it stands for and the location legacy files it under.

const itineraryKind = (collection) => collection?.extra?.explore_itinerary?.type ?? null
const itineraryOrder = (a, b) =>
  (a.extra?.explore_itinerary?.order ?? 0) - (b.extra?.explore_itinerary?.order ?? 0)

/** The thematic itineraries, in legacy's order. */
export const itineraries = computed(() =>
  tree.value.itinerariesRoot
    ? childrenOf(tree.value.itinerariesRoot.id).filter((c) => itineraryKind(c) === '4').sort(itineraryOrder)
    : [],
)

/** The routes a location links to. */
export const routes = computed(() =>
  tree.value.itinerariesRoot
    ? childrenOf(tree.value.itinerariesRoot.id).filter((c) => ['1', '2', '3'].includes(itineraryKind(c)))
    : [],
)

/** A route's kind, as legacy names the group it lists it in: `explore`, `notToBeMissed` or `toKnowMore`. */
export function routeKind(route) {
  return { 1: 'explore', 2: 'notToBeMissed', 3: 'toKnowMore' }[itineraryKind(route)] ?? null
}

export function subItinerariesOf(itinerary) {
  return childrenOf(itinerary?.id).filter((c) => itineraryKind(c) === '4').sort(itineraryOrder)
}

export function isSubItinerary(collection) {
  return itineraryKind(collection) === '4' && itineraryKind(collectionById(collection.parent_id)) === '4'
}

/** A sub-itinerary's or a route's locations, in legacy's order. */
export function itineraryLocations(itinerary) {
  const ids = text('collections', itinerary?.id, 'en').extra?.location_ids ?? []
  return ids.map((id) => exploreCollection('location', id)).filter(Boolean)
}

/**
 * The countries an itinerary covers, as legacy's API names them: a thematic
 * itinerary's own list, a sub-itinerary's `country_ids`.
 */
export function itineraryCountries(itinerary) {
  const own = itinerary?.extra?.explore_itinerary?.countries ?? []
  const codes = own.length ? own : (text('collections', itinerary?.id, 'en').extra?.country_ids ?? [])
  return [...new Set(codes)].map((code) => exploreCollection('country', code)).filter(Boolean)
}

/** The countries with thematic itineraries, by name. */
export function countriesWithItineraries(lang) {
  const seen = new Map()
  for (const itinerary of itineraries.value) {
    for (const country of itineraryCountries(itinerary)) seen.set(country.id, country)
  }
  return [...seen.values()].sort(byTitle(lang))
}

export function itinerariesIn(country) {
  return itineraries.value.filter((i) => itineraryCountries(i).some((c) => c.id === country?.id))
}

function monumentByExploreId(exploreId, location) {
  const id = String(exploreId)
  const inLocation = location ? monumentsOf(location).find((m) => m.exploreId === id) : null
  if (inLocation) return inLocation
  for (const candidate of (collections.value ?? []).filter((c) => c.type === 'location')) {
    const hit = monumentsOf(candidate).find((m) => m.exploreId === id)
    if (hit) return hit
  }
  return null
}

/**
 * A sub-itinerary's or a route's monuments, in its order: all of them, or
 * those legacy files under one of its locations.
 */
export function itineraryMonuments(itinerary, location = null) {
  const members = [...(itinerary?.items ?? [])]
    .filter((m) => m.extra?.explore_monument_id != null)
    .filter((m) => !location || String(m.extra.location_id) === legacyId(location))
    // Legacy lists two monuments of one rank by their id.
    .sort(
      (a, b) =>
        (a.extra.mn_order ?? 0) - (b.extra.mn_order ?? 0) ||
        Number(a.extra.explore_monument_id) - Number(b.extra.explore_monument_id),
    )
  const seen = new Set()
  const monuments = []
  for (const member of members) {
    const place = location ?? exploreCollection('location', member.extra.location_id)
    const monument = monumentByExploreId(member.extra.explore_monument_id, place)
    if (monument && !seen.has(monument.exploreId)) {
      seen.add(monument.exploreId)
      monuments.push(monument)
    }
  }
  return monuments
}

/**
 * An itinerary's picture: a thematic itinerary's own; for a sub-itinerary,
 * none of its own, so, as legacy's API does, one of its first location's
 * monuments'.
 */
export function itineraryPicture(itinerary) {
  const own = itinerary?.images?.[0]?.url
  if (own) return own
  const [first] = itineraryLocations(itinerary)
  const [monument] = first ? itineraryMonuments(itinerary, first) : []
  return monument?.main.images?.[0]?.url ?? null
}

/** The sub-itineraries a monument is on. */
export function itinerariesOf(monument) {
  if (!monument) return []
  const parents = itineraries.value.flatMap((itinerary) => subItinerariesOf(itinerary))
  return parents.filter((sub) =>
    (sub.items ?? []).some((m) => String(m.extra?.explore_monument_id) === monument.exploreId),
  )
}

export function itineraryLink(itinerary) {
  return { name: 'itinerary', params: { id: itinerary.id } }
}

export function subItineraryLink(sub, location = null) {
  return { name: 'sub-itinerary', params: { id: sub.id }, query: location ? { location: location.id } : {} }
}

export function routeLink(route) {
  return { name: 'route', params: { id: route.id } }
}

export function itinerariesLink(country, territory = null) {
  return { name: 'itineraries', params: { id: country.id }, query: territory ? { territory: territory.id } : {} }
}

/** The itineraries of a territory (`explore_itineraries_rel_territory`), among `list`. */
export function itinerariesOfTerritory(list, territory) {
  if (!territory) return list
  const id = legacyId(territory)
  return list.filter((i) => [i, ...childrenOf(i.id)].some((r) => itineraryTerritoryIds(r).includes(id)))
}

// ── Site records ─────────────────────────────────────────────────────────

export const siteRecords = computed(() => tree.value.root?.extra ?? {})

/**
 * A value of a map keyed by language id, in `lang`, English where it has none:
 * the package keys a site record's texts by language id (`eng`), and the
 * site speaks codes (`en`).
 */
export function byLanguage(values, lang) {
  const id = (languageRecords.value ?? []).find((l) => l.code === lang)?.id
  return (id && values?.[id]) || values?.eng || null
}

export function recordTexts(record, lang) {
  return byLanguage(record?.texts, lang) ?? {}
}

const LEVELS = {
  theme: 'themes',
  country: 'countries',
  territory: 'territories',
  location: 'locations',
  monument: 'monuments',
  itinerary: 'itineraries',
}

/** Whether a site record's scope names this page: its list for the page's level holds the page's legacy id. */
export function scoped(record, level, id) {
  return (record?.scope?.[LEVELS[level]] ?? []).map(String).includes(String(id))
}

/**
 * The travel layer on one page. Monument pages show no Travel Book and no
 * Tour, whatever their scope (the analysis doc's "Site records").
 */
export function travelFor(level, id) {
  const travel = siteRecords.value.explore_travel ?? {}
  const pick = (list) => (list ?? []).filter((r) => scoped(r, level, id))
  const byOrder = (a, b) => (a.order ?? a.id) - (b.order ?? b.id)
  return {
    books: level === 'monument' ? [] : pick(travel.books),
    tours: level === 'monument' ? [] : pick(travel.tours),
    accommodations: pick(travel.accommodations).sort(byOrder),
    guidedVisits: pick(travel.guided_visits).sort(byOrder),
    usefulWebsites: pick(travel.useful_websites).sort(byOrder),
    categories: [...(travel.accommodation_categories ?? [])].sort((a, b) => a.order - b.order),
  }
}

/**
 * An itinerary's local team, as legacy's API gave it with every text of the
 * itinerary (ExploreItinerary::getDescription): its own, in the first language
 * that has one, else its parent itinerary's, the same way. English is read
 * first; `codes` are the other languages whose texts are loaded.
 */
export function localTeamOf(itinerary, codes = []) {
  const languages = [...new Set(['en', ...codes])]
  for (const record of [itinerary, collectionById(itinerary?.parent_id)]) {
    if (!record) continue
    for (const code of languages) {
      const team = ownText('collections', record.id, code).extra?.local_team
      if (team) return team
    }
  }
  return ''
}

/**
 * The Explore monuments an itinerary holds: its own and its sub-itineraries'
 * (legacy's `getMonumentsAsString`, explore_itineraries_rel_monuments of the
 * itinerary and of its children).
 */
export function itineraryMonumentIds(itinerary) {
  const ids = new Set()
  for (const record of [itinerary, ...childrenOf(itinerary?.id)]) {
    for (const member of record?.items ?? []) {
      const id = member.extra?.explore_monument_id
      if (id != null) ids.add(String(id))
    }
  }
  return ids
}

/**
 * The Travel Books and Tours of an itinerary, a sub-itinerary or a route:
 * those scoped to any monument it holds, as legacy's ExploreItinerary did
 * (`getTravelBook`/`getTour` by monument ids), each once.
 */
export function travelForItinerary(itinerary) {
  const monuments = itineraryMonumentIds(itinerary)
  const travel = siteRecords.value.explore_travel ?? {}
  const pick = (list) => (list ?? []).filter((r) => (r.scope?.monuments ?? []).some((id) => monuments.has(String(id))))
  return { books: pick(travel.books), tours: pick(travel.tours) }
}

/**
 * The featured partnerships a page shows: on the home page those marked for
 * it; elsewhere, those of the theme being explored and those scoped to the
 * page itself.
 */
export function partnershipsFor({ home = false, theme = null, level = null, id = null } = {}) {
  const all = siteRecords.value.explore_home?.featured_partnerships ?? []
  return all.filter(
    (p) =>
      (home && p.home) ||
      (theme && scoped(p, 'theme', legacyId(theme))) ||
      (level && scoped(p, level, id)),
  )
}

/**
 * The featured partnerships under "Make Your Selection", as legacy's
 * SideNavigation gathered them (inventory-app#2424): those scoped to each step
 * of the path the panel shows — the theme, the country, the territory, the
 * itinerary, the location, in that order — each partnership once.
 */
export function pathPartnerships({ theme = null, country = null, territory = null, itinerary = null, location = null } = {}) {
  const all = siteRecords.value.explore_home?.featured_partnerships ?? []
  const steps = [
    ['theme', theme],
    ['country', country],
    ['territory', territory],
    ['itinerary', itinerary],
    ['location', location],
  ].filter(([, record]) => record)
  const seen = new Set()
  const out = []
  for (const [level, record] of steps) {
    for (const p of all.filter((x) => scoped(x, level, legacyId(record)))) {
      if (!seen.has(p.id)) out.push(p)
      seen.add(p.id)
    }
  }
  return out
}

// ── Search: legacy's "MWNF Database Search" ─────────────────────────────────

// explore-api's SearchController (inventory-app#2424) searched four tables,
// each record a result of its own: Explore's monuments, then the Virtual
// Museum's, Sharing History's and the Exhibition Trails' monuments that are
// tied to an Explore monument (`exploremonument_vm` and the like) — the very
// records this package holds. A record matched when its English text holds
// the term, and had to have a picture; the results ran by the number of times
// the term appears (compared as text, as legacy's sort did), then by name,
// twenty-four a page.
export const SEARCH_PAGE_SIZE = 24
const SEARCH_ORIGINS = [
  ['mwnf3_explore:monument:', 'explore'],
  ['mwnf3:monuments:', 'virtual-museum'],
  ['mwnf3_sharing_history:sh_monuments:', 'sharing-history'],
  ['mwnf3_travels:monument:', 'trails'],
]

function searchText(texts) {
  return Object.entries(texts ?? {})
    .filter(([key, value]) => key !== 'explore' && (typeof value === 'string' || Array.isArray(value)))
    .map(([, value]) => [value].flat().filter((v) => typeof v === 'string').join(' '))
    .join(' ')
    .toLowerCase()
}

/** Where each record is shown in Explore: its location and its monument there. */
const recordPlaces = computed(() => {
  const places = new Map()
  for (const location of (collections.value ?? []).filter((c) => c.type === 'location')) {
    for (const member of location.items ?? []) {
      if (!places.has(member.id)) places.set(member.id, location)
    }
  }
  return places
})

/**
 * Legacy's search results for `query`: `{ record, origin, name, location,
 * country, project, from, monument }`, sorted as legacy sorted them.
 */
export function searchRecords(query) {
  const term = String(query ?? '').trim().toLowerCase()
  if (!term) return []
  const english = pkg.translations('items', 'en')
  const manifest = pkg.manifest ?? {}
  const hits = []
  for (const record of items.value ?? []) {
    const origin = SEARCH_ORIGINS.find(([prefix]) => String(record.backward_compatibility).startsWith(prefix))?.[1]
    if (!origin || !(record.images?.length > 0)) continue
    const texts = english[record.id]
    const place = () => {
      const location = recordPlaces.value.get(record.id) ?? null
      const monument = location ? monumentsOf(location).find((m) => [m.main, ...m.related].some((r) => r.id === record.id)) ?? null : null
      return { location, country: location ? countryOf(location) : null, monument }
    }
    // Explore's own text about a record of another database (its `explore`
    // row) was a record of its own in legacy's search, an "Explore" result
    // beside the record's: legacy searched the Explore monuments' texts that
    // have a description.
    const own = texts?.explore
    if (origin !== 'explore' && String(own?.description ?? '').trim()) {
      const ownHaystack = searchText(own)
      const ownCount = ownHaystack.split(term).length - 1
      if (ownCount > 0) {
        hits.push({
          record,
          origin: 'explore',
          key: `${ownCount}-${ownHaystack}`,
          name: String(own.name ?? texts?.name ?? record.internal_name ?? '').trim(),
          date: '',
          project: '',
          ...place(),
        })
      }
    }
    const haystack = searchText(texts)
    const count = haystack.split(term).length - 1
    if (count === 0) continue
    const trail = origin === 'trails' ? manifest.trail_projects?.[String(record.backward_compatibility).split(':')[2]] : null
    // Legacy named an Explore record's project by the source word itself (SearchPage).
    const project = origin === 'explore' ? '' : (trail?.name?.en ?? manifest.projects?.[record.project_id]?.name?.en ?? '')
    hits.push({
      record,
      origin,
      key: `${count}-${haystack}`,
      name: String(texts?.name ?? record.internal_name ?? '').trim(),
      date: String(texts?.dates ?? '').trim(),
      project,
      ...place(),
    })
  }
  return hits.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : a.name.toLowerCase().localeCompare(b.name.toLowerCase())))
}

/**
 * Where a result opens: Explore's own and the trails' records on Explore's
 * monument page, as legacy linked them; the others on their home site's item
 * page (the project's `home_site`), our sites standing in for legacy's.
 */
export function searchResultLink(hit) {
  if (hit.origin === 'explore' || hit.origin === 'trails') return hit.monument ? { to: monumentLink(hit.monument) } : null
  const home = pkg.manifest?.projects?.[hit.record.project_id]?.home_site
  return home ? { href: siblingSiteUrl(home, `/item/${hit.record.id}`) } : null
}

// One banner per visit, drawn from the active ones, as legacy drew one per request.
let bannerIndex = null

export const banner = computed(() => {
  const list = siteRecords.value.explore_home?.banners ?? []
  if (list.length === 0) return null
  bannerIndex ??= Math.floor(Math.random() * list.length)
  return list[bannerIndex % list.length]
})

// ── Routes ───────────────────────────────────────────────────────────────

const placeRoute = { country: 'country', territory: 'territory', location: 'location' }

/**
 * The page of a place, keeping the theme or the filter it is explored by,
 * and, for a location, the territory it was reached through: legacy's path
 * named the territory only when the visitor had chosen it (`…/tr-8/l-337`).
 */
export function placeLink(place, { theme = null, filter = null, territory = null } = {}) {
  const query = {}
  if (theme) query.theme = theme.id
  if (filter) query.filter = filter
  if (territory && levelOf(place) === 'location') query.territory = territory.id
  return { name: placeRoute[levelOf(place)], params: { id: place.id }, query }
}

export function themeLink(theme) {
  return { name: 'theme', params: { id: theme.id } }
}

/** A monument's page, keeping the theme, the territory, the sub-itinerary or the route it is explored by. */
export function monumentLink(monument, { theme = null, territory = null, sub = null, route = null } = {}) {
  const query = { location: monument.location.id }
  if (theme) query.theme = theme.id
  if (territory) query.territory = territory.id
  if (sub) query.itinerary = sub.id
  if (route) query.route = route.id
  return { name: 'monument', params: { id: monument.main.id }, query }
}

/** The territory an address names for a location (`?territory=`), when it is the location's own. */
export function pathTerritory(location, id) {
  const territory = territoryOf(location)
  return territory && typeof id === 'string' && territory.id === id ? territory : null
}

/**
 * Legacy's addresses: `/themes/t-1/c-es/tr-8/l-337/m-557/lan-en`,
 * `/countries/c-es/f-3/l-337/r-113/m-557` and
 * `/itineraries/c-pt/i-97/si-100/m-557`, each segment named by its prefix. The
 * deepest one names the page; the theme and the language travel along. A
 * filter's legacy id has no counterpart in the package, so it is dropped.
 */
export async function resolveLegacyPath(path, section = null) {
  await loadEntities(['collections', 'items', 'languages'])
  const parts = {}
  for (const segment of String(path ?? '').split('/')) {
    const match = /^(lan|tr|si|t|c|f|l|r|m|i)-(.+)$/.exec(segment)
    if (match) parts[match[1]] = match[2]
  }
  const theme = parts.t ? exploreCollection('thematiccycle', parts.t) : null
  const query = {}
  if (theme) query.theme = theme.id
  // The language a monument's texts are read in (MonumentPage `?lan=`).
  if (parts.lan) query.lan = parts.lan
  const sub = parts.si ? exploreCollection('itinerary', parts.si) : null
  const route = parts.r ? exploreCollection('itinerary', parts.r) : null
  const along = sub ?? route
  if (parts.m && along) {
    const member = (along.items ?? []).find((m) => String(m.extra?.explore_monument_id) === parts.m)
    const monument = member
      ? monumentByExploreId(parts.m, exploreCollection('location', member.extra.location_id))
      : null
    if (monument) {
      const context = sub ? { itinerary: sub.id } : { route: route.id }
      return {
        name: 'monument',
        params: { id: monument.main.id },
        query: { ...query, location: monument.location.id, ...context },
      }
    }
  }
  if (sub) return { name: 'sub-itinerary', params: { id: sub.id }, query }
  if (route) return { name: 'route', params: { id: route.id }, query }
  const itinerary = parts.i ? exploreCollection('itinerary', parts.i) : null
  if (itinerary) return { name: 'itinerary', params: { id: itinerary.id }, query }
  if (section === 'itineraries' && parts.c) {
    const country = exploreCollection('country', parts.c)
    const territory = parts.tr ? exploreCollection('region', parts.tr) : null
    if (territory) query.territory = territory.id
    if (country) return { name: 'itineraries', params: { id: country.id }, query }
  }
  const location = parts.l ? exploreCollection('location', parts.l) : null
  // A location reached through its territory keeps it, in the panel and the trail.
  const throughTerritory = location && parts.tr ? pathTerritory(location, exploreCollection('region', parts.tr)?.id) : null
  if (throughTerritory) query.territory = throughTerritory.id
  if (parts.m && location) {
    const monument = monumentsOf(location).find((m) => m.exploreId === parts.m)
    if (monument) return { name: 'monument', params: { id: monument.main.id }, query: { ...query, location: location.id } }
  }
  const place = location
    ?? (parts.tr ? exploreCollection('region', parts.tr) : null)
    ?? (parts.c ? exploreCollection('country', parts.c) : null)
  if (place) return { name: placeRoute[levelOf(place)], params: { id: place.id }, query }
  if (theme) return { name: 'theme', params: { id: theme.id }, query: {} }
  return null
}
