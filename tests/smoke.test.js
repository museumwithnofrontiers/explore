import { describe, expect, it, vi } from 'vitest'
import { loadEntities, mergeMessages } from '@museumwnf/viewer-core'
import {
  checkOfferedLanguages, checkRoutes, checkSectionMeta, checkTextsRendered, mountSite,
} from '@museumwnf/viewer-core/testing'
import { catalogues as sharedTexts } from '@museumwnf/viewer-i18n/standalone'
import ownTexts from '../locales/en.json'
import config from '../src/dataset.config.js'
import { bannerImage, partnershipLogo } from '../src/composables/chrome.js'
import newThemes from '../src/config/new-themes.json'

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
    const { app, host } = await mountOn('#/', '.explore-theme-panel')

    expect(host.querySelector('.mwnf-page')).not.toBeNull()
    expect(texts(host, '.explore-theme-panel__name')).toEqual([
      "Explore Palestine's Islamic Art and Architecture",
      'Explore the Islamic Heritage of the Mediterranean',
      'Explore Portugal',
      'Explore Baroque',
      'Explore Tyrol',
      'Explore Ariccia',
    ])
    // Legacy marks every live theme "NEW" (its status 'e').
    expect(texts(host, '.explore-theme-panel__new-text')).toEqual(Array(6).fill('NEW'))
    expect(host.querySelectorAll('.explore-highlighted__panel')).toHaveLength(2)
    // The countries: on the map and in the list under it, no tiles.
    expect(host.querySelectorAll('.explore-home__country option:not([disabled])')).toHaveLength(23)
    expect(host.querySelectorAll('#explore-by-country .explore-tiles__tile')).toHaveLength(0)
    expect(host.querySelectorAll('.explore-itinerary-panel')).toHaveLength(4)
    // The home banner, one of legacy's, from this repository.
    const banner = host.querySelector('.mwnf-banner__image').getAttribute('src')
    expect(banner).toMatch(/\/theme\/assets\/chrome\/explore\/banners\/homebanners\/\d+\.jpg$/)
    expect(banner).not.toContain('museumwnf.org')
    expect(host.querySelector('.mwnf-banner__title').textContent.trim()).toBe('Explore')
    // The two partnerships legacy shows on its home page, with their logos.
    expect(texts(host, '.explore-partnerships__title')).toEqual(['Barakat', 'European Union'])
    expect([...host.querySelectorAll('.explore-partnerships__logo')].map((img) => img.getAttribute('src'))).toEqual([
      expect.stringMatching(/\/src\/assets\/partnerships\/8\.jpg$/),
      expect.stringMatching(/\/src\/assets\/partnerships\/10\.jpg$/),
    ])

    app.unmount()
  }, 60000)

  it("draws legacy's chrome: the two logos, the three ways in, and legacy's footer", async () => {
    const { app, host } = await mountOn('#/', '.explore-footer')

    // Legacy's header: MWNF's logo first, linking to its portal; Explore's,
    // linking home; its four links in English; the search button, no
    // language list.
    expect(host.querySelector('.explore-header__mwnf img').getAttribute('src')).toMatch(/\/theme\/assets\/logo\.jpg$/)
    expect(host.querySelector('.explore-header__mwnf').getAttribute('href')).toBe('https://www.museumwnf.org')
    expect(host.querySelector('.explore-header__explore img').getAttribute('src')).toMatch(/\/theme\/assets\/explorelogo_wide\.png$/)
    expect(texts(host, '.explore-header__links a')).toEqual(["What's New?", 'About', 'Credits', 'Get Involved'])
    expect(host.querySelector('.explore-header__button')).not.toBeNull()
    expect(host.querySelector('.mwnf-language-switcher, .mwnf-header__languages')).toBeNull()
    expect(texts(host, '.mwnf-nav__link')).toEqual(['Explore by Theme', 'Explore by Country', 'Explore by Itinerary'])
    expect(texts(host, '.explore-footer__links .explore-footer__link')).toEqual([
      'MWNF Home', 'Home', 'About', 'Get involved', 'Contact', 'Important Legal Notice', 'Credits', 'Cookies',
    ])
    expect(host.querySelector('.explore-footer__policy').textContent).toMatch(/^Language policy: /)
    expect(host.querySelector('.explore-footer__copyright').textContent.trim()).toBe(
      `© Museum With No Frontiers (MWNF), 2004—${new Date().getFullYear()}`,
    )
    // Legacy's footer has no rights-holder line.
    expect(host.querySelector('.mwnf-footer').textContent).not.toContain('Rights holder')
    // "Follow us" and legacy's six social networks.
    expect(host.querySelector('.explore-footer__follow').textContent.trim()).toBe('Follow us')
    expect([...host.querySelectorAll('.explore-footer .mwnf-footer__social-link')].map((a) => a.getAttribute('aria-label'))).toEqual([
      'YouTube', 'X', 'Facebook', 'Instagram', 'Weibo', 'LinkedIn',
    ])

    app.unmount()
  }, 60000)

  it("marks the themes this website lists as new, by their package id", async () => {
    const [collections] = await loadEntities(['collections'])
    const themes = collections.filter((c) => c.type === 'theme')

    for (const { id, legacy } of newThemes.themes) {
      expect(themes.find((theme) => theme.id === id)?.backward_compatibility, legacy).toBe(legacy)
    }
  })

  it('finds a picture in this repository for every banner and partnership logo the package names', async () => {
    const [collections] = await loadEntities(['collections'])
    const home = collections.find((c) => c.purpose === 'explore-root').extra.explore_home

    expect(home.banners.length).toBeGreaterThan(0)
    for (const shown of home.banners) expect(bannerImage(shown.image), shown.image).toBeTruthy()
    for (const partnership of home.featured_partnerships) {
      expect(partnershipLogo(partnership.id), String(partnership.id)).toBeTruthy()
    }
  })

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
    // Legacy's "Read in": the languages the introduction is written in.
    await vi.waitFor(
      () => expect(host.querySelectorAll('.explore-description .explore-read-in option').length).toBeGreaterThan(1),
      { timeout: 30000 },
    )

    app.unmount()
  }, 60000)

  it("reads a theme's introduction in the languages it has a row in, its name in English", async () => {
    const theme = await collection('mwnf3_explore:thematiccycle:1')
    const { app, host } = await mountOn(`#/theme/${theme.id}`, '.explore-tiles__tile')

    const title = () => host.querySelector('.explore-page__title').textContent.trim()
    expect(title()).toBe('Explore the Islamic Heritage of the Mediterranean')
    expect(host.querySelector('.explore-page__text').textContent).toContain('Did you know that Islam')
    // Legacy's "Read in" lists every language the theme has a row in; the
    // Spanish row names the theme but has no introduction, and legacy showed
    // it empty, the name still in English.
    await vi.waitFor(
      () =>
        expect([...host.querySelectorAll('.explore-description .explore-read-in option')].map((o) => o.value)).toEqual(
          ['en', 'es', 'it'],
        ),
      { timeout: 30000 },
    )
    const select = host.querySelector('.explore-description .explore-read-in select')
    select.value = 'es'
    select.dispatchEvent(new globalThis.Event('change'))
    await vi.waitFor(() => expect(host.querySelector('.explore-page__text').textContent.trim()).toBe(''))
    expect(title()).toBe('Explore the Islamic Heritage of the Mediterranean')

    app.unmount()
  }, 60000)

  it('renders a country by theme, and the same country by country', async () => {
    const theme = await collection('mwnf3_explore:thematiccycle:1')
    const spain = await collection('mwnf3_explore:country:es')

    const byTheme = await mountOn(`#/country/${spain.id}?theme=${theme.id}`, '.explore-tiles__tile')
    expect(byTheme.host.querySelector('.explore-territories').textContent.split(', ')).toHaveLength(6)
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
    // Legacy opens a location on its historical background, cut with "Read more.".
    const background = await mountOn(`#/location/${withBackground.id}`, '.explore-background__label')
    expect(background.host.querySelector('.explore-menu__item--selected').textContent.trim()).toBe('HISTORICAL BACKGROUND')
    expect(background.host.querySelector('.explore-background__label').textContent).toContain('| Historical Background')
    expect(
      background.host.querySelector('.explore-background .explore-read-more__text').textContent.trim().length,
    ).toBeGreaterThan(100)
    background.app.unmount()
  }, 90000)

  // A record's heading as legacy wrote it, "In <project> <source>", spaces collapsed.
  const sources = (host, scope = '') =>
    texts(host, `${scope} .explore-monument__source`).map((s) => s.replace(/\s+/g, ' '))

  it("renders a monument: its own record's description, and the records it also stands for as related content", async () => {
    const [items] = await loadEntities(['items'])
    const toledo = await collection('mwnf3_explore:location:337')
    // Monument 557 is a Travels "Exhibition Trails" record and a Virtual
    // Museum one: legacy shows the first, and the second as related content.
    const trails = items.find((i) => i.backward_compatibility === 'mwnf3_travels:monument:IAM:es:1:IX:1:b')
    const { app, host } = await mountOn(`#/monument/${trails.id}?location=${toledo.id}`, '.explore-entry')

    expect(host.querySelector('.explore-page__title').textContent.replace(/\s+/g, ' ').trim()).toBe(
      'Mosque of Cristo de la Luz(Toledo, Spain)',
    )
    expect(sources(host)[0]).toMatch(/^In .*Exhibition Trails$/)
    expect(host.querySelector('.explore-entry').textContent).toContain('This mosque, in fact, is two buildings')
    expect(host.querySelector('.explore-entry__caption').textContent).toBe(
      'Mosque of Cristo de la Luz, general view, Toledo. | Photographer: Guillermo Maestro Casado, Madrid | © Museum With No Frontiers (MWNF)',
    )
    expect(host.textContent).toContain('Prepared by: María Teresa Pérez Higuera')
    // "Read in" the languages the record is written in.
    expect([...host.querySelectorAll('.explore-entry .explore-read-in option')].map((o) => o.value)).toEqual([
      'en', 'es', 'fr', 'it', 'pt',
    ])

    const tabs = texts(host, '.explore-monument-menu__item')
    expect(tabs).toEqual([
      'DESCRIPTION', 'MAP', 'GET DIRECTIONS', 'ADDITIONAL INFORMATION', 'RELATED CONTENT', 'RELATED ITINERARIES',
    ])
    const open = async (label, selector) => {
      host.querySelectorAll('.explore-monument-menu__item')[texts(host, '.explore-monument-menu__item').indexOf(label)].click()
      await vi.waitFor(() => expect(host.querySelector(selector)).not.toBeNull())
    }
    await open('GET DIRECTIONS', '.explore-field')
    expect(host.querySelector('.explore-field__label').textContent.trim()).toBe('DIRECTIONS')
    expect(host.querySelector('.explore-field__value').textContent.trim()).toBe(
      'In the calle Cristo de la Luz. Go up the stairs on the right.',
    )
    await open('RELATED CONTENT', '.explore-monument__related')
    expect(sources(host, '.explore-monument__related')[0]).toBe('In Discover Islamic Art Virtual Museum')
    await open('RELATED ITINERARIES', '.explore-monument-itinerary')
    expect(host.querySelector('.explore-monument-itinerary__parent').textContent.trim()).toBe(
      'Mudejar Art. Islamic Aesthetics in Christian Art (13 Sub-Itineraries)',
    )
    expect(host.querySelector('.explore-monument-itinerary .explore-sub-card__link').textContent.replace(/\s+/g, ' ').trim()).toBe(
      'IX. Traces of the Past: Churches, Synagogues and Palaces [One day]',
    )
    // Its map: one marker, at legacy's position of the monument.
    await open('MAP', '.explore-map')
    await vi.waitFor(() => expect(host.querySelectorAll('.explore-map path.leaflet-interactive')).toHaveLength(1))

    app.unmount()
  }, 60000)

  it("renders a monument that is a museum: the museum's own texts, as legacy's Virtual Museum", async () => {
    const [items] = await loadEntities(['items'])
    const kairouan = await collection('mwnf3_explore:location:472')
    // Monument 1032 is the Museum of Islamic Art (Kairouan): Explore has no
    // description of it, so legacy shows the museum's own, naming no project.
    const record = items.find((i) => i.backward_compatibility === 'mwnf3_explore:monument:1032')
    const { app, host } = await mountOn(`#/monument/${record.id}?location=${kairouan.id}`, '.explore-entry')

    expect(sources(host)[0]).toBe('In Virtual Museum')
    // The museum's text arrives with the partners' translations, after the name.
    await vi.waitFor(
      () => expect(host.querySelector('.explore-entry').textContent).toContain('located in Raqqada'),
      { timeout: 30000 },
    )
    // Explore's own record of it is never related content.
    expect(texts(host, '.explore-monument-menu__item')).not.toContain('RELATED CONTENT')

    app.unmount()
  }, 60000)

  it('renders a monument led by a Sharing History record: named Virtual Museum there, Sharing History below', async () => {
    const [items] = await loadEntities(['items'])
    const location = await collection('mwnf3_explore:location:223')
    // Monument 1747 stands for seven Sharing History records and nothing
    // else: legacy shows the first by number as "Virtual Museum", and the
    // others as related content.
    const record = items.find((i) => i.backward_compatibility === 'mwnf3_sharing_history:sh_monuments:awe:tr:10')
    const { app, host } = await mountOn(`#/monument/${record.id}?location=${location.id}`, '.explore-entry')

    expect(sources(host)[0]).toMatch(/^In .+ Virtual Museum$/)
    const tabs = texts(host, '.explore-monument-menu__item')
    host.querySelectorAll('.explore-monument-menu__item')[tabs.indexOf('RELATED CONTENT')].click()
    await vi.waitFor(() => expect(host.querySelector('.explore-monument__related')).not.toBeNull())
    const related = sources(host, '.explore-monument__related')
    expect(related).toHaveLength(6)
    expect(related.every((line) => /^In .+ Sharing History$/.test(line))).toBe(true)

    app.unmount()
  }, 60000)

  it("renders a monument by Explore's own text where it has a description, its record as related content", async () => {
    const [items] = await loadEntities(['items'])
    const lamego = await collection('mwnf3_explore:location:108')
    // Monument 128, Lamego's cathedral, is a Travels record, and Explore
    // describes it itself: legacy shows Explore's text, naming no project,
    // and the Travels record as related content.
    const trails = items.find((i) => i.backward_compatibility === 'mwnf3_travels:monument:GPA:pt:1:IV:2:a')
    const { app, host } = await mountOn(`#/monument/${trails.id}?location=${lamego.id}`, '.explore-entry')

    expect(sources(host)[0]).toBe('In Explore')
    expect(host.querySelector('.explore-entry').textContent).toContain('Lamego Cathedral dates back to the 11th century')
    const tabs = texts(host, '.explore-monument-menu__item')
    host.querySelectorAll('.explore-monument-menu__item')[tabs.indexOf('RELATED CONTENT')].click()
    await vi.waitFor(() => expect(host.querySelector('.explore-monument__related')).not.toBeNull())
    expect(sources(host, '.explore-monument__related')[0]).toMatch(/^In .*Exhibition Trails$/)

    app.unmount()
  }, 60000)

  it("reads a monument in French, as legacy's `lan-fr`: the French row alone, its empty description empty", async () => {
    const [items] = await loadEntities(['items'])
    const toledo = await collection('mwnf3_explore:location:337')
    const trails = items.find((i) => i.backward_compatibility === 'mwnf3_travels:monument:IAM:es:1:IX:1:b')
    const { app, host } = await mountOn(`#/monument/${trails.id}?location=${toledo.id}&lan=fr`, '.explore-entry')

    // The French texts arrive after the page.
    await vi.waitFor(
      () => expect(host.querySelector('.explore-entry__name').textContent.trim()).toBe('Mosquée Cristo de la Luz'),
      { timeout: 30000 },
    )
    expect(host.querySelector('.explore-entry .explore-read-in select').value).toBe('fr')
    expect(host.querySelector('.explore-entry').textContent).not.toContain('This mosque, in fact, is two buildings')

    app.unmount()
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
    const { app, host } = await mountOn('#/', '.explore-itinerary-panel')
    const [countries, itineraries] = host.querySelectorAll('#explore-by-itinerary select')
    // Each select opens on its placeholder.
    expect(countries.options).toHaveLength(12)
    expect(itineraries.options).toHaveLength(13)
    expect(host.querySelectorAll('.explore-itinerary-panel')).toHaveLength(4)
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
    // Legacy numbered them in Roman numerals.
    expect(texts(page.host, '.explore-sub-card__link').slice(0, 2)).toEqual([
      'I. The Beach of Adventure [Two days]',
      'II. Lands of the Order of Christ [Two days]',
    ])
    page.app.unmount()
  }, 60000)

  it("renders a sub-itinerary: its locations in legacy's order, each one's monuments", async () => {
    const sub = await collection('mwnf3_explore:itinerary:100')
    const { app, host } = await mountOn(`#/sub-itinerary/${sub.id}`, '.explore-tiles__label')
    // Legacy wrote the tabs in capitals.
    expect(texts(host, '.explore-sub__tab')).toEqual(['SANTARÉM', 'GOLEGÃ', 'TORRES NOVAS', 'ATALAIA', 'TOMAR', 'DORNES'])
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
  // Legacy's interface was English only; its texts are read in the languages
  // the package declares, where the items carry them, through "Read in".
  it('speaks English, and reads its texts in the languages the package declares', () => {
    expect(config.languages).toEqual(['en'])
    expect(config.navigation.languages).toBeUndefined()
    expect(checkOfferedLanguages({ languages: config.contentLanguages })).toEqual([])
    expect(config.contentLanguages.length).toBeGreaterThan(1)
  })

  // The chrome is two layers, and either one failing is silent: a missing
  // entry renders as its own name rather than as an error. This asserts the
  // rendered page, not the files.
  it('renders the shared texts and its own over them', async () => {
    const theme = await collection('mwnf3_explore:thematiccycle:1')
    for (const [hash, selector] of [['#/', '.explore-theme-panel'], [`#/theme/${theme.id}`, '.explore-tiles__tile']]) {
      const { app, host } = await mountOn(hash, selector)
      // From viewer-i18n: the layout's skip link.
      expect(host.textContent).toContain('Skip to content')
      expect(checkTextsRendered(host, { namespaces: ['explore', 'core', 'layout', 'record', 'sheet'] })).toEqual([])
      app.unmount()
    }
  }, 60000)
})
