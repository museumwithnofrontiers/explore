import { describe, expect, it, vi } from 'vitest'
import { loadEntities, mergeMessages } from '@museumwnf/viewer-core'
import {
  checkOfferedLanguages, checkRoutes, checkSectionMeta, checkTextsRendered, mountSite,
} from '@museumwnf/viewer-core/testing'
import { catalogues as sharedTexts } from '@museumwnf/viewer-i18n/standalone'
import ownTexts from '../locales/en.json'
import config from '../src/dataset.config.js'

// The same two layers main.js assembles, in the same order: the shared bundle
// first, this website's own file last. Mounting without them would prove
// nothing about the chrome — every text would render as its own name.
const messages = mergeMessages(sharedTexts, { en: ownTexts })

// Every page is mounted against the real data package, on its own address,
// as a visitor arrives from a link. The numbers are legacy's: what the live
// site showed on the same page (inventory-app
// scripts/exporters/docs/explore-legacy-analysis.md).
async function mountOn(hash, selector) {
  const site = await mountSite(config, messages, hash)
  await vi.waitFor(() => expect(site.host.querySelector(selector)).not.toBeNull(), { timeout: 30000 })
  return site
}

async function collection(key) {
  const [collections] = await loadEntities(['collections'])
  return collections.find((c) => c.backward_compatibility === key)
}

const texts = (host, selector) => [...host.querySelectorAll(selector)].map((node) => node.textContent.trim())

describe('website smoke test', () => {
  it('mounts the home page: the themes in legacy order, two highlighted, the countries', async () => {
    const { app, host } = await mountOn('#/', '.explore-themes__card')

    expect(host.querySelector('.mwnf-page')).not.toBeNull()
    expect(texts(host, '.explore-themes__name')).toEqual([
      "Explore Palestine's Islamic Art and Architecture",
      'Explore the Islamic Heritage of the Mediterranean',
      'Explore Portugal',
      'Explore Baroque',
      'Explore Tyrol',
      'Explore Ariccia',
    ])
    expect(host.querySelectorAll('.explore-highlighted__card')).toHaveLength(2)
    expect(host.querySelectorAll('#explore-by-country .explore-tiles__tile')).toHaveLength(23)
    // The home banner, one of legacy's, from its media server.
    expect(host.querySelector('.mwnf-banner__image').getAttribute('src')).toMatch(
      /^https:\/\/images\.museumwnf\.org\/hi_res\/explore\/banners\//,
    )
    // The two partnerships legacy shows on its home page.
    expect(texts(host, '.explore-partnerships__title')).toEqual(['Barakat', 'European Union'])

    app.unmount()
  }, 60000)

  it("renders a theme: its introduction, its countries and the travel records scoped to it", async () => {
    const theme = await collection('mwnf3_explore:thematiccycle:1')
    const { app, host } = await mountOn(`#/theme/${theme.id}`, '.explore-tiles__tile')

    expect(host.querySelector('.explore-page__title').textContent.trim()).toBe(
      'Explore the Islamic Heritage of the Mediterranean',
    )
    expect(host.querySelector('.explore-page__text').textContent).toContain('Did you know that Islam')
    expect(host.querySelectorAll('.explore-tiles__tile')).toHaveLength(11)
    expect(host.querySelectorAll('.explore-travel--books .explore-travel__record')).toHaveLength(11)
    // Each book's cover, the one legacy picks from the Books database: Travel
    // Book 1 shows its English printed cover 2.
    const covers = [...host.querySelectorAll('.explore-travel--books .explore-travel__image')]
    expect(covers).toHaveLength(11)
    expect(covers[0].getAttribute('src')).toBe('https://images.museumwnf.org/small/books/3/en/31/book/2.jpg')
    expect(host.querySelectorAll('.explore-travel--tours .explore-travel__record')).toHaveLength(14)
    expect(texts(host, '.explore-partnerships__title')).toEqual(['Barakat', 'European Union'])
    // Legacy's "Read in": the languages the theme is written in.
    await vi.waitFor(() => expect(host.querySelectorAll('.mwnf-languages__button')).toHaveLength(3), { timeout: 30000 })

    app.unmount()
  }, 60000)

  it('reads a theme in Spanish: its Spanish name, and English where the Spanish row has no introduction', async () => {
    const theme = await collection('mwnf3_explore:thematiccycle:1')
    const { app, host } = await mountOn(`#/theme/${theme.id}?lang=es`, '.explore-tiles__tile')

    expect(host.querySelector('.explore-page__title').textContent.trim()).toBe(
      'Explorar el patrimonio islámico del Mediterráneo',
    )
    expect(host.querySelector('.explore-page__text').textContent).toContain('Did you know that Islam')

    app.unmount()
    // The site remembers the language chosen; the pages after this one are read in English.
    globalThis.localStorage.clear()
  }, 60000)

  it('renders a country by theme, and the same country by country', async () => {
    const theme = await collection('mwnf3_explore:thematiccycle:1')
    const spain = await collection('mwnf3_explore:country:es')

    const byTheme = await mountOn(`#/country/${spain.id}?theme=${theme.id}`, '.explore-tiles__tile')
    expect(byTheme.host.querySelector('.explore-page__subtitle').textContent.split(', ')).toHaveLength(6)
    expect(byTheme.host.querySelector('.explore-page__text').textContent).toContain('medieval Spain')
    expect(byTheme.host.querySelectorAll('.explore-tiles__tile')).toHaveLength(64)
    expect(byTheme.host.querySelectorAll('.explore-travel--books .explore-travel__record')).toHaveLength(1)
    expect(byTheme.host.querySelectorAll('.explore-travel--tours .explore-travel__record')).toHaveLength(3)
    byTheme.app.unmount()

    const byCountry = await mountOn(`#/country/${spain.id}`, '.explore-tiles__tile')
    expect(byCountry.host.querySelectorAll('.explore-tiles__tile')).toHaveLength(66)
    // No partnership is scoped to Spain.
    expect(byCountry.host.querySelector('.explore-partnerships')).toBeNull()
    byCountry.app.unmount()
  }, 90000)

  it("renders a location: its monuments by Explore's names, and its historical background", async () => {
    const theme = await collection('mwnf3_explore:thematiccycle:1')
    const toledo = await collection('mwnf3_explore:location:337')
    const { app, host } = await mountOn(`#/location/${toledo.id}?theme=${theme.id}`, '.explore-tiles__tile')

    const monuments = texts(host, '.explore-tiles__label')
    expect(monuments).toHaveLength(12)
    expect(monuments).toContain('Mosque of Cristo de la Luz')
    app.unmount()

    const [collections] = await loadEntities(['collections'])
    const withBackground = collections.find((c) => c.extra?.historical_background?.length)
    const background = await mountOn(`#/location/${withBackground.id}`, '.explore-background__text')
    expect(background.host.querySelector('.explore-background__heading').textContent).toContain('Historical background')
    expect(background.host.querySelector('.explore-background__text').textContent.trim().length).toBeGreaterThan(100)
    background.app.unmount()
  }, 90000)

  it("renders a monument: its own record's description, and the records it also stands for as related content", async () => {
    const [items] = await loadEntities(['items'])
    const toledo = await collection('mwnf3_explore:location:337')
    // Monument 557 is a Travels "Exhibition Trails" record and a Virtual
    // Museum one: legacy shows the first, and the second as related content.
    const trails = items.find((i) => i.backward_compatibility === 'mwnf3_travels:monument:IAM:es:1:IX:1:b')
    const { app, host } = await mountOn(`#/monument/${trails.id}?location=${toledo.id}`, '.explore-monument__name')

    expect(host.querySelector('.explore-page__title').textContent.replace(/\s+/g, ' ').trim()).toBe(
      'Mosque of Cristo de la Luz (Toledo, Spain)',
    )
    expect(host.querySelector('.explore-monument__source').textContent).toBe('Exhibition Trails')
    expect(host.querySelector('.explore-tabs__panel').textContent).toContain('This mosque, in fact, is two buildings')
    expect(host.textContent).toContain('María Teresa Pérez Higuera')

    const tabs = texts(host, '.explore-tabs__tab')
    // Legacy's words: the dictionary's, the client's (in its capitals) and the shared ones.
    expect(tabs).toEqual([
      'Description', 'Map', 'GET DIRECTIONS', 'ADDITIONAL INFORMATION', 'Related Content', 'RELATED ITINERARIES',
    ])
    host.querySelectorAll('.explore-tabs__tab')[4].click()
    await vi.waitFor(() => expect(host.querySelector('.explore-related')).not.toBeNull())
    expect(host.querySelector('.explore-related .explore-monument__source').textContent).toBe(
      'Virtual Museum — Discover Islamic Art',
    )
    // Its map: one marker, at legacy's position of the monument.
    host.querySelectorAll('.explore-tabs__tab')[1].click()
    await vi.waitFor(() => expect(host.querySelectorAll('.explore-map path.leaflet-interactive')).toHaveLength(1))

    app.unmount()
  }, 60000)

  it("renders a monument that is a museum: the museum's own texts, as legacy's Virtual Museum", async () => {
    const [items] = await loadEntities(['items'])
    const kairouan = await collection('mwnf3_explore:location:472')
    // Monument 1032 is the Museum of Islamic Art (Kairouan): Explore has no
    // description of it, so legacy shows the museum's own.
    const record = items.find((i) => i.backward_compatibility === 'mwnf3_explore:monument:1032')
    const { app, host } = await mountOn(`#/monument/${record.id}?location=${kairouan.id}`, '.explore-monument__name')

    expect(host.querySelector('.explore-monument__source').textContent).toBe('Virtual Museum — Discover Islamic Art')
    expect(host.querySelector('.explore-tabs__panel').textContent).toContain('located in Raqqada')
    // Explore's own record of it is never related content.
    expect(texts(host, '.explore-tabs__tab')).not.toContain('Related Content')

    app.unmount()
  }, 60000)

  it('renders a monument led by a Sharing History record: named Virtual Museum there, by its project below', async () => {
    const [items] = await loadEntities(['items'])
    const location = await collection('mwnf3_explore:location:223')
    // Monument 1747 stands for seven Sharing History records and nothing
    // else: legacy shows the first by number as "Virtual Museum", and the
    // others as related content under a word its dictionary lacks.
    const record = items.find((i) => i.backward_compatibility === 'mwnf3_sharing_history:sh_monuments:awe:tr:10')
    const { app, host } = await mountOn(`#/monument/${record.id}?location=${location.id}`, '.explore-monument__name')

    const [label, project] = host.querySelector('.explore-monument__source').textContent.split(' — ')
    expect(label).toBe('Virtual Museum')
    expect(project).toBeTruthy()
    const tabs = texts(host, '.explore-tabs__tab')
    host.querySelectorAll('.explore-tabs__tab')[tabs.indexOf('Related Content')].click()
    await vi.waitFor(() => expect(host.querySelector('.explore-related')).not.toBeNull())
    const related = texts(host, '.explore-related .explore-monument__source')
    expect(related).toHaveLength(6)
    expect(new Set(related)).toEqual(new Set([project]))

    app.unmount()
  }, 60000)

  it("renders a monument by Explore's own text where it has a description, its record as related content", async () => {
    const [items] = await loadEntities(['items'])
    const lamego = await collection('mwnf3_explore:location:108')
    // Monument 128, Lamego's cathedral, is a Travels record, and Explore
    // describes it itself: legacy shows Explore's text, unnamed, and the
    // Travels record as related content.
    const trails = items.find((i) => i.backward_compatibility === 'mwnf3_travels:monument:GPA:pt:1:IV:2:a')
    const { app, host } = await mountOn(`#/monument/${trails.id}?location=${lamego.id}`, '.explore-monument__name')

    expect(host.querySelector('.explore-tabs__panel .explore-monument__source')).toBeNull()
    expect(host.querySelector('.explore-tabs__panel').textContent).toContain('Lamego Cathedral dates back to the 11th century')
    const tabs = texts(host, '.explore-tabs__tab')
    host.querySelectorAll('.explore-tabs__tab')[tabs.indexOf('Related Content')].click()
    await vi.waitFor(() => expect(host.querySelector('.explore-related')).not.toBeNull())
    expect(host.querySelector('.explore-related .explore-monument__source').textContent).toBe('Exhibition Trails')

    app.unmount()
  }, 60000)

  it('reads a monument in French: its French name, and English where the French row has no description', async () => {
    const [items] = await loadEntities(['items'])
    const toledo = await collection('mwnf3_explore:location:337')
    const trails = items.find((i) => i.backward_compatibility === 'mwnf3_travels:monument:IAM:es:1:IX:1:b')
    const { app, host } = await mountOn(`#/monument/${trails.id}?location=${toledo.id}&lang=fr`, '.explore-monument__name')

    expect(host.querySelector('.explore-monument__name').textContent.trim()).toBe('Mosquée Cristo de la Luz')
    expect(host.querySelector('.explore-tabs__panel').textContent).toContain('This mosque, in fact, is two buildings')

    app.unmount()
    globalThis.localStorage.clear()
  }, 60000)

  it("redirects legacy's addresses to their pages", async () => {
    const [items] = await loadEntities(['items'])
    const toledo = await collection('mwnf3_explore:location:337')
    const theme = await collection('mwnf3_explore:thematiccycle:1')
    const trails = items.find((i) => i.backward_compatibility === 'mwnf3_travels:monument:IAM:es:1:IX:1:b')

    const monument = await mountSite(config, messages, '#/themes/t-1/c-es/l-337/m-557/lan-en')
    await vi.waitFor(() => expect(monument.router.currentRoute.value.name).toBe('monument'), { timeout: 30000 })
    expect(monument.router.currentRoute.value.params.id).toBe(trails.id)
    expect(monument.router.currentRoute.value.query).toMatchObject({ location: toledo.id, theme: theme.id })
    monument.app.unmount()

    const country = await mountSite(config, messages, '#/countries/c-es')
    await vi.waitFor(() => expect(country.router.currentRoute.value.name).toBe('country'), { timeout: 30000 })
    country.app.unmount()

    const sub = await collection('mwnf3_explore:itinerary:100')
    const itinerary = await mountSite(config, messages, '#/itineraries/c-pt/i-97/si-100')
    await vi.waitFor(() => expect(itinerary.router.currentRoute.value.name).toBe('sub-itinerary'), { timeout: 30000 })
    expect(itinerary.router.currentRoute.value.params.id).toBe(sub.id)
    itinerary.app.unmount()
  }, 60000)

  // The itineraries, against legacy's API (`/itineraries/…`): its 12 thematic
  // itineraries in 11 countries, their sub-itineraries in order, and each
  // sub-itinerary's locations and monuments in order.
  it('offers the itineraries on the home page: 11 countries, 12 itineraries, 4 drawn', async () => {
    const { app, host } = await mountOn('#/', '.explore-itinerary-cards__card')
    const [countries, itineraries] = host.querySelectorAll('#explore-by-itinerary select')
    // Each select opens on its placeholder.
    expect(countries.options).toHaveLength(12)
    expect(itineraries.options).toHaveLength(13)
    expect(host.querySelectorAll('.explore-itinerary-cards__card')).toHaveLength(4)
    app.unmount()
  }, 60000)

  it("lists a country's itineraries, and an itinerary's sub-itineraries", async () => {
    const portugal = await collection('mwnf3_explore:country:pt')
    const list = await mountOn(`#/country/${portugal.id}/itineraries`, '.explore-itinerary__name')
    expect(texts(list.host, '.explore-itinerary__name')).toEqual([
      'The Manueline. Portuguese Art during the Great Discoveries',
      'In the Lands of the Enchanted Moorish Maiden. Islamic Art in Portugal',
    ])
    list.app.unmount()

    const manueline = await collection('mwnf3_explore:itinerary:97')
    const page = await mountOn(`#/itinerary/${manueline.id}`, '.explore-subs__heading')
    expect(page.host.querySelector('.explore-subs__heading').textContent.trim()).toBe('14 Sub-Itineraries')
    expect(texts(page.host, '.explore-itinerary__name').slice(0, 2)).toEqual([
      'The Beach of Adventure [Two days]',
      'Lands of the Order of Christ [Two days]',
    ])
    page.app.unmount()
  }, 60000)

  it("renders a sub-itinerary: its locations in legacy's order, each one's monuments", async () => {
    const sub = await collection('mwnf3_explore:itinerary:100')
    const { app, host } = await mountOn(`#/sub-itinerary/${sub.id}`, '.explore-tiles__label')
    expect(texts(host, '.explore-sub__tab')).toEqual(['Santarém', 'Golegã', 'Torres Novas', 'Atalaia', 'Tomar', 'Dornes'])
    expect(texts(host, '.explore-tiles__label')).toEqual([
      'Church of Santa Maria de Marvila',
      'Municipal Museum',
      'Torre das Cabaças',
      'Church of Nossa Senhora da Graça',
    ])
    expect(host.querySelectorAll('.explore-map path.leaflet-interactive').length).toBeGreaterThan(0)
    app.unmount()
  }, 60000)

  it("renders a location's suggested routes, and a route", async () => {
    const ariccia = await collection('mwnf3_explore:location:409')
    const location = await mountOn(`#/location/${ariccia.id}`, '.explore-routes__select')
    const groups = [...location.host.querySelectorAll('.explore-routes__select optgroup')].map((g) => [
      g.label,
      g.querySelectorAll('option').length,
    ])
    expect(groups).toEqual([['EXPLORE', 1], ['ALSO NOT TO BE MISSED', 3], ['TO KNOW MORE', 1]])
    location.app.unmount()

    const route = await collection('mwnf3_explore:itinerary:113')
    const page = await mountOn(`#/route/${route.id}`, '.explore-tiles__label')
    expect(page.host.querySelector('.explore-page__title').textContent.trim()).toBe('Ariccia | Piazza di Corte')
    expect(page.host.querySelectorAll('.explore-tiles__label')).toHaveLength(9)
    page.app.unmount()
  }, 60000)

  for (const page of ['about', 'credits', 'get-involved', 'important-information', 'new']) {
    it(`renders the ${page} page on TextPageView`, async () => {
      const { app, host } = await mountOn(`#/${page}`, '.mwnf-prose')
      expect(host.querySelector('.mwnf-prose').textContent.trim()).not.toBe('')
      app.unmount()
    }, 30000)
  }

  it('declares every route by name, and leaves the catch-all to the router', () => {
    // A named route is what a view links to; a path written into a link is a
    // second declaration of the same address, and the two drift.
    expect(
      checkRoutes(config, {
        names: [
          'home', 'theme', 'country', 'territory', 'location', 'monument',
          'itineraries', 'itinerary', 'sub-itinerary', 'route',
          'about', 'credits', 'get-involved', 'important-information', 'new',
        ],
        legacyPaths: ['/themes/:path(.*)', '/countries/:path(.*)', '/itineraries/:path(.*)'],
      }),
    ).toEqual([])
  })

  it('declares the entities every route reads', () => {
    for (const route of config.extraViews) {
      expect(Array.isArray(route.meta?.entities), route.name).toBe(true)
    }
  })

  it('declares the section every route belongs to', () => {
    expect(checkSectionMeta(config)).toEqual([])
  })

  it('publishes no generic entity pages', () => {
    expect(config.features.entities).toEqual([])
  })

  // The one language rule, checked the same way in every website: every
  // offered language is one the package declares for this site AND one the
  // items actually carry.
  it('offers the languages the package declares, where the items carry them', () => {
    expect(checkOfferedLanguages(config)).toEqual([])
    expect(config.languages.length).toBeGreaterThan(0)
    const switcher = config.navigation.languages
    expect(switcher.map((l) => l.code)).toEqual(config.languages)
    expect(switcher.every((l) => Boolean(l.label))).toBe(true)
  })

  // The chrome is two layers, and either one failing is silent: a missing
  // entry renders as its own name rather than as an error. This asserts the
  // rendered page, not the files.
  it('renders the shared texts and its own over them', async () => {
    const theme = await collection('mwnf3_explore:thematiccycle:1')
    for (const hash of ['#/', `#/theme/${theme.id}`]) {
      const { app, host } = await mountOn(hash, '.explore-tiles__tile')
      // From viewer-i18n: the layout's skip link.
      expect(host.textContent).toContain('Skip to content')
      expect(checkTextsRendered(host, { namespaces: ['explore', 'core', 'layout', 'record', 'sheet'] })).toEqual([])
      app.unmount()
    }
  }, 60000)
})
