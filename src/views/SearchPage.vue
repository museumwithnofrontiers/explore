<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { mediaUrl, useI18n } from '@museumwnf/viewer-core'
import ExplorePages from '../components/ExplorePages.vue'
import { SEARCH_PAGE_SIZE, searchRecords, searchResultLink, title, useTexts } from '../composables/explore.js'

// Legacy's SearchResults page (explore-client, inventory-app#2424): the two
// modes and the term again at the top, then either Google's results (legacy's
// Custom Search engine, drawn by Google's own script) or the MWNF Database
// results (explore.js `searchRecords`): the pager above and below, the
// record the pointer last rested on large in a column on the left, and the
// results two to a row, each its picture and "name, location, country, in
// project from". Every word is legacy's English.
const props = defineProps({
  type: { type: String, default: 'mwnf' },
})
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const ready = useTexts(['collections', 'items', 'countries'])

const GOOGLE_ENGINE = '011100841504088668422:r2cl-my4ubm'
// Legacy's word for where a result comes from.
function sourceWord(origin) {
  if (origin === 'virtual-museum') return t('explore.source.virtualMuseum')
  if (origin === 'sharing-history') return t('explore.source.sharingHistory')
  if (origin === 'trails') return t('explore.source.trails')
  return t('explore.source.explore')
}

const mode = ref(props.type === 'google' ? 'google' : 'mwnf')
const term = ref(String(route.query.q ?? ''))
const message = ref('')
const query = computed(() => String(route.query.q ?? ''))
const page = computed(() => Math.max(1, Number(route.query.page ?? 1) || 1))

const hits = computed(() => (props.type === 'mwnf' && ready.value ? searchRecords(query.value) : []))
const last = computed(() => Math.max(1, Math.ceil(hits.value.length / SEARCH_PAGE_SIZE)))
const shown = computed(() =>
  hits.value.slice((page.value - 1) * SEARCH_PAGE_SIZE, page.value * SEARCH_PAGE_SIZE).map((hit) => ({
    ...hit,
    // Legacy's words for where a result comes from; an Explore record named by its source alone.
    from: sourceWord(hit.origin),
    project: hit.project || (hit.origin === 'explore' ? sourceWord('explore') : ''),
    link: searchResultLink(hit),
    image: mediaUrl(hit.record.images?.[0]?.url, 'small'),
    place: [title(hit.location, 'en'), title(hit.country, 'en')].filter(Boolean).join(', '),
  })),
)
const focus = ref(null)
watch(shown, (list) => { focus.value = list[0] ?? null }, { immediate: true })

function submit() {
  const q = term.value.trim()
  if (!q) {
    message.value = t('explore.search.enterTerm')
    return
  }
  if (props.type === mode.value && q === query.value) {
    message.value = t('explore.search.alreadyShown')
    return
  }
  message.value = ''
  router.push({ name: 'search', params: { type: mode.value }, query: { q } })
}
const go = (n) => router.push({ name: 'search', params: { type: props.type }, query: { ...route.query, page: n } })

// Google's results: legacy's engine, its script loaded once, its results-only
// element drawn into the page and run on the term.
const googleBox = ref(null)
function runGoogle() {
  const cse = window.google?.search?.cse?.element
  if (!cse || !googleBox.value) return
  googleBox.value.innerHTML = ''
  cse.render({ div: googleBox.value, tag: 'searchresults-only', gname: 'results' })
  cse.getElement('results')?.execute(query.value)
}
function loadGoogle() {
  if (window.google?.search?.cse) return runGoogle()
  if (document.getElementById('explore-google-cse')) return
  window.__gcse = { parsetags: 'explicit', initializationCallback: runGoogle }
  const script = document.createElement('script')
  script.id = 'explore-google-cse'
  script.async = true
  script.src = `https://cse.google.com/cse.js?cx=${GOOGLE_ENGINE}`
  document.head.appendChild(script)
}
onMounted(() => { if (props.type === 'google') loadGoogle() })
watch(() => [props.type, query.value], async () => {
  mode.value = props.type === 'google' ? 'google' : 'mwnf'
  term.value = query.value
  await nextTick()
  if (props.type === 'google') loadGoogle()
})
</script>

<template>
  <div class="explore-search-page">
    <div class="explore-search-page__box">
      <div class="explore-search-page__types">
        <button class="explore-search-page__type" :class="{ 'explore-search-page__type--selected': mode === 'mwnf' }" type="button" @click="mode = 'mwnf'">{{ t('explore.search.mwnf') }}</button>
        <button class="explore-search-page__type" :class="{ 'explore-search-page__type--selected': mode === 'google' }" type="button" @click="mode = 'google'">{{ t('explore.search.google') }}</button>
      </div>
      <form class="explore-search-page__form" role="search" @submit.prevent="submit">
        <input v-model="term" class="explore-search-page__input" type="search" :placeholder="mode === 'google' ? t('explore.search.placeholderGoogle') : t('explore.search.placeholderMwnf')" />
        <button class="explore-search-page__submit" type="submit" :aria-label="t('explore.search.submit')">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" fill="none" stroke="currentColor" stroke-width="2" /><path d="M10.2 10.2 15 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
        </button>
      </form>
      <p v-if="message" class="explore-search-page__message" role="alert">{{ message }}</p>
      <RouterLink :to="{ name: 'important-information' }">{{ t('explore.nav.importantInformation') }}</RouterLink>
    </div>

    <div v-if="type === 'google'" ref="googleBox" class="explore-search-page__google"></div>
    <template v-else>
      <p v-if="!ready" class="explore-loading">{{ t('core.status.loading') }}</p>
      <template v-else-if="hits.length">
        <ExplorePages class="explore-pages--top" :page="page" :last="last" @go="go" />
        <div class="explore-search-results">
          <div v-if="focus" class="explore-search-results__main">
            <img v-if="focus.image" class="explore-search-results__main-image" :src="focus.image" alt="" />
            <div class="explore-search-results__main-name">
              <p class="explore-search-results__bold">{{ focus.name }}</p>
              <p v-if="focus.date">{{ focus.date }}</p>
            </div>
            <p>{{ focus.place }}<span v-if="focus.project">, {{ t('explore.search.in') }} <span class="explore-search-results__project">{{ focus.project }}</span> {{ focus.from }}</span></p>
          </div>
          <div class="explore-search-results__list">
            <div v-for="hit in shown" :key="`${hit.origin}:${hit.record.id}`" class="explore-search-results__result">
              <component :is="hit.link?.to ? 'RouterLink' : 'a'" :to="hit.link?.to" :href="hit.link?.href" target="_blank" rel="noopener" class="explore-search-results__image">
                <img :src="hit.image" alt="" @mouseover="focus = hit" />
              </component>
              <div class="explore-search-results__details">
                <component :is="hit.link?.to ? 'RouterLink' : 'a'" :to="hit.link?.to" :href="hit.link?.href" target="_blank" rel="noopener">
                  <span class="explore-search-results__name" @mouseover="focus = hit">{{ hit.name }}</span><span>, {{ hit.place }}<span v-if="hit.project">, {{ t('explore.search.in') }} <span class="explore-search-results__project">{{ hit.project }}</span> {{ hit.from }}</span></span>
                </component>
              </div>
            </div>
          </div>
        </div>
        <ExplorePages :page="page" :last="last" @go="go" />
      </template>
      <p v-else-if="query" class="explore-search-page__none">{{ t('explore.search.none') }}</p>
    </template>
  </div>
</template>
