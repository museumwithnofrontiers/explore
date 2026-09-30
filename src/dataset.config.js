import {
  languageLabels, mediaUrl, mwnfLinks, offeredLanguages, sectionMeta, useDataPackage,
} from '@museumwnf/viewer-core'
import { TextPageView } from '@museumwnf/viewer-layout/views'
import SiteShell from './SiteShell.vue'
import ExploreHome from './views/ExploreHome.vue'
import ItinerariesPage from './views/ItinerariesPage.vue'
import ItineraryPage from './views/ItineraryPage.vue'
import MonumentPage from './views/MonumentPage.vue'
import PlacePage from './views/PlacePage.vue'
import SubItineraryPage from './views/SubItineraryPage.vue'
import ThemePage from './views/ThemePage.vue'
import { banner, exploreCollection, resolveLegacyPath, title } from './composables/explore.js'

// The whole declaration of Explore with MWNF. Before it mounts, the website
// reads nothing from its package but the manifest: the languages it offers,
// their labels and its name come from `manifest.site`, and every record is
// loaded by the route that reads it. Nothing else in `src/` imports
// `@inventory-data`.
//
// The package (@museumwnf/explore-data, inventory-app
// scripts/exporters/docs/explore-data-package.md) is Explore's collection tree:
// themes, countries with their territories and locations, and the monuments
// the locations hold. The pages are this website's own (src/views), made of
// viewer-layout's blocks; `composables/explore.js` holds the rules legacy
// applied, from the inventory-app analysis doc.

const { manifest } = useDataPackage()

// The languages the package declares for the site, kept where the items
// carry them. Explore's own texts are English; a theme or a monument may be
// read in more, through its own "Read in" buttons.
const languages = offeredLanguages()

// Every route names the section it belongs to and the entities its view
// reads. Every page shows the banner and the partnerships, which live on the
// collection tree's root, so every route reads the collections.
const meta = sectionMeta(['collections', 'languages'])

const back = { label: 'core.action.back', to: { name: 'home' } }
const textPage = (body) => ({ spec: { body, back } })

// The Explore root's title: legacy's dictionary word `explore_mwnf`.
const siteName = manifest.site?.names?.en ?? ''

export default {
  // The dataset package this website renders. Must match the alias in
  // vite.config.js and the dependency in package.json.
  datasetPackage: '@museumwnf/explore-data',

  siteName,

  features: {
    // No generic entity pages: those routes expose the data package's shape
    // rather than the site's.
    entities: [],
  },

  languages,

  shell: SiteShell,

  // The menu is legacy's green bar, the ways into the site; the header's
  // links are legacy's own pages; the footer's, MWNF's.
  navigation: {
    languages: languageLabels(languages),
    links: [
      { section: 'home', label: 'core.nav.home', to: { name: 'home' } },
      { section: 'themes', label: 'explore.nav.byTheme', to: { name: 'home', hash: '#explore-by-theme' } },
      { section: 'countries', label: 'explore.nav.byCountry', to: { name: 'home', hash: '#explore-by-country' } },
      {
        section: 'itineraries',
        label: 'explore.nav.byItinerary',
        to: { name: 'home', hash: '#explore-by-itinerary' },
      },
    ],
    headerLinks: [
      { label: 'explore.nav.whatsNew', to: { name: 'new' } },
      { label: 'core.nav.about', to: { name: 'about' } },
      { label: 'core.nav.credits', to: { name: 'credits' } },
      { label: 'explore.nav.getInvolved', to: { name: 'get-involved' } },
    ],
    footerLinks: [
      { label: 'explore.nav.mwnfPortal', href: mwnfLinks.portal, external: true },
      { label: 'core.footer.aboutMwnf', href: mwnfLinks.about, external: true },
      { label: 'core.footer.contact', href: mwnfLinks.contact, external: true },
      { label: 'explore.nav.importantInformation', to: { name: 'important-information' } },
      { label: 'core.footer.legalNotice', href: mwnfLinks.legalNotice, external: true },
      { label: 'core.footer.credits', href: mwnfLinks.credits, external: true },
      { label: 'core.footer.cookies', href: mwnfLinks.cookies, external: true },
    ],
  },

  // Legacy's banner, on every page: one of the home banners drawn per visit,
  // the site's name and its leitmotif over it, and what it shows as its
  // caption.
  banner: {
    variant: 'strip',
    image: () => mediaUrl(banner.value?.image) ?? '',
    title: () => siteName,
    subtitle: 'explore.home.leitmotif',
    caption: ({ locale }) => {
      const shown = banner.value
      if (!shown) return ''
      return {
        name: shown.name ?? '',
        location: title(exploreCollection('location', shown.location), locale),
        country: title(exploreCollection('country', shown.country), locale),
      }
    },
  },

  // Where the site records' pictures live: the legacy media server, which the
  // package's paths point into.
  media: {
    legacyHost: 'https://images.museumwnf.org',
  },

  links: mwnfLinks,

  // The route map. A record is addressed by its package id; the way it is
  // explored — the theme, the filter, the location a monument is seen
  // from — travels in the query.
  extraViews: [
    {
      path: '/',
      name: 'home',
      component: ExploreHome,
      meta: meta('home'),
    },
    {
      path: '/theme/:id',
      name: 'theme',
      component: ThemePage,
      props: true,
      meta: meta('themes'),
    },
    {
      path: '/country/:id',
      name: 'country',
      component: PlacePage,
      props: true,
      meta: meta('explore', 'items'),
    },
    {
      path: '/territory/:id',
      name: 'territory',
      component: PlacePage,
      props: true,
      meta: meta('explore', 'items'),
    },
    {
      path: '/location/:id',
      name: 'location',
      component: PlacePage,
      props: true,
      meta: meta('explore', 'items'),
    },
    {
      path: '/monument/:id',
      name: 'monument',
      component: MonumentPage,
      props: true,
      // The partners: the museums some monuments are, whose texts legacy shows.
      meta: meta('explore', 'items', 'partners'),
    },
    // The itineraries: a country's list, a thematic itinerary, a
    // sub-itinerary; and a location's routes, drawn as sub-itineraries are.
    {
      // Not `/itineraries/…`: that is legacy's address space, resolved below.
      path: '/country/:id/itineraries',
      name: 'itineraries',
      component: ItinerariesPage,
      props: true,
      meta: meta('itineraries'),
    },
    {
      path: '/itinerary/:id',
      name: 'itinerary',
      component: ItineraryPage,
      props: true,
      meta: meta('itineraries', 'items'),
    },
    {
      path: '/sub-itinerary/:id',
      name: 'sub-itinerary',
      component: SubItineraryPage,
      props: (route) => ({ id: route.params.id, kind: 'sub-itinerary' }),
      meta: meta('itineraries', 'items'),
    },
    {
      path: '/route/:id',
      name: 'route',
      component: SubItineraryPage,
      props: (route) => ({ id: route.params.id, kind: 'route' }),
      meta: meta('explore', 'items'),
    },
    { path: '/about', name: 'about', component: TextPageView, props: textPage('explore.about.body'), meta: meta('about') },
    { path: '/credits', name: 'credits', component: TextPageView, props: textPage('explore.credits.body'), meta: meta('credits') },
    {
      path: '/get-involved',
      name: 'get-involved',
      component: TextPageView,
      props: textPage('explore.getInvolved.body'),
      meta: meta('get-involved'),
    },
    {
      path: '/important-information',
      name: 'important-information',
      component: TextPageView,
      props: textPage('explore.importantInformation.body'),
      meta: meta('important-information'),
    },
    { path: '/new', name: 'new', component: TextPageView, props: textPage('explore.whatsNew.body'), meta: meta('new') },
  ],

  // Legacy's addresses — `/themes/t-1/c-es/l-337/m-557/lan-en`,
  // `/countries/c-es/l-337`, `/itineraries/c-pt/i-97/si-100` — each resolving
  // onto the page it names.
  legacyRoutes: [
    { path: '/themes/:path(.*)', resolve: (params) => resolveLegacyPath(params.path) },
    { path: '/countries/:path(.*)', resolve: (params) => resolveLegacyPath(params.path) },
    { path: '/itineraries/:path(.*)', resolve: (params) => resolveLegacyPath(params.path, 'itineraries') },
  ],
}
