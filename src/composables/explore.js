import { computed, reactive, watch } from 'vue'
import { entityRef, loadEntities, mdStrip, useDataPackage, useI18n, useSiteConfig } from '@museumwnf/viewer-core'

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
  const codes = useSiteConfig().languages ?? ['en']
  for (const code of codes) loadTexts(['collections'], code)
  return computed(() => {
    const id = getCollection()?.id
    return codes.filter((code) => loaded.has(`collections:${code}`) && pkg.translations('collections', code)[id])
  })
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
// some for several: legacy shows one of them as the monument and the others
// as its related content. Its pick, read from the live site over every
// crawled monument: an Exhibition Trails (Travels) record first, then a
// Virtual Museum one, then Sharing History, then Explore's own.

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

/** A location's monuments: `{ exploreId, location, main, related }`, one per Explore monument id. */
export function monumentsOf(location) {
  if (!location) return []
  const lookup = itemById.value
  const cached = monumentCache.get(location)
  if (cached?.lookup === lookup) return cached.monuments
  const groups = new Map()
  for (const member of location.items ?? []) {
    for (const exploreId of member.extra?.explore_monument_ids ?? []) {
      if (!groups.has(exploreId)) groups.set(exploreId, [])
      groups.get(exploreId).push(member.id)
    }
  }
  const monuments = [...groups]
    .map(([exploreId, ids]) => {
      const records = ids.map((id) => lookup.get(id)).filter(Boolean)
      // A stable sort: records of one source keep the membership's order.
      const [main, ...related] = [...records].sort((a, b) => sourceOf(a).rank - sourceOf(b).rank)
      return { exploreId: String(exploreId), location, main, related }
    })
    .filter((m) => m.main)
  monumentCache.set(location, { lookup, monuments })
  return monuments
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

/**
 * A location's historical background: Explore's own text, signed by its
 * `prepared_by`, then each Travels location's introduction it names, signed by
 * its author.
 */
export function locationBackground(location, lang) {
  if (location?.type !== 'location') return []
  const own = text('collections', location.id, lang)
  const texts = []
  if (own.description) texts.push({ key: 'own', text: own.description, by: own.extra?.prepared_by ?? '' })
  for (const key of location.extra?.historical_background ?? []) {
    const travels = tree.value.byKey.get(key)
    const travelsText = travels ? text('collections', travels.id, lang) : {}
    if (travelsText.description) {
      texts.push({
        key,
        text: travelsText.description,
        by: travelsText.extra?.author || travelsText.extra?.prepared_by || '',
      })
    }
  }
  return texts
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

export function itinerariesLink(country) {
  return { name: 'itineraries', params: { id: country.id } }
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

/** The page of a place, keeping the theme or the filter it is explored by. */
export function placeLink(place, { theme = null, filter = null } = {}) {
  const query = {}
  if (theme) query.theme = theme.id
  if (filter) query.filter = filter
  return { name: placeRoute[levelOf(place)], params: { id: place.id }, query }
}

export function themeLink(theme) {
  return { name: 'theme', params: { id: theme.id } }
}

/** A monument's page, keeping the theme, the sub-itinerary or the route it is explored by. */
export function monumentLink(monument, { theme = null, sub = null, route = null } = {}) {
  const query = { location: monument.location.id }
  if (theme) query.theme = theme.id
  if (sub) query.itinerary = sub.id
  if (route) query.route = route.id
  return { name: 'monument', params: { id: monument.main.id }, query }
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
  if (parts.lan) query.lang = parts.lan
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
    if (country) return { name: 'itineraries', params: { id: country.id }, query }
  }
  const location = parts.l ? exploreCollection('location', parts.l) : null
  if (parts.m && location) {
    const monument = monumentsOf(location).find((m) => m.exploreId === parts.m)
    if (monument) return { name: 'monument', params: { id: monument.main.id }, query: { ...query, location: location.id } }
  }
  const place = location
    ?? (parts.tr ? exploreCollection('region', parts.tr) : null)
    ?? (parts.c ? exploreCollection('country', parts.c) : null)
  if (place) return { name: placeRoute[levelOf(place)], params: { id: place.id }, query }
  if (theme) return { name: 'theme', params: { id: theme.id }, query: parts.lan ? { lang: parts.lan } : {} }
  return null
}
