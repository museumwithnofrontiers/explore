<script setup>
import { computed, ref, watch } from 'vue'
import { isRtl, mdInline, mediaUrl, useI18n } from '@museumwnf/viewer-core'
import ReadIn from './ReadIn.vue'
import ReadMoreText from './ReadMoreText.vue'
import { legacyLines } from '../composables/explore.js'

// Legacy's MonumentDescription (explore-client): one record's pictures, the
// first large with its caption and copyright under it and the others as
// thumbnails, a click opening it full screen; "Read in" the languages the
// record is written in; its name and the name it is also known as, its date
// and artist; its history cut at 550 characters and its description at 2000,
// each with "Read more."; then who wrote and translated it, its bibliography
// and citation. Every word is legacy's English.
const props = defineProps({
  /**
   * `{ languages, images, textsIn(lang) }`: the codes the record is written
   * in, its pictures (`url`, `captions`, `photographer`, `copyright`), and
   * its texts in a language as `{ name, alsoKnownAs, date, artist, history,
   * description, authors, preparedBy, copyEditedBy, translationBy,
   * translationCopyEditedBy, bibliography, citation }`.
   */
  entry: { type: Object, required: true },
  /** The language the page is read in; the record's own when it has it. */
  language: { type: String, default: 'en' },
  /** The location and the country in English, for a caption the picture lacks. */
  place: { type: String, default: '' },
  glossary: { type: [Object, Array, Map], default: null },
})
const emit = defineEmits(['language'])
const { t } = useI18n()

// Legacy cut the history and the description at these many characters.
const HISTORY_LENGTH = 550
const DESCRIPTION_LENGTH = 2000

// Legacy's setLanguage: the page's language where the record has it, else
// English, else its first.
const language = computed(() => {
  const codes = props.entry.languages ?? []
  return codes.includes(props.language) ? props.language : codes.includes('en') ? 'en' : (codes[0] ?? 'en')
})
const dir = computed(() => (isRtl(language.value) ? 'rtl' : ''))
const texts = computed(() => props.entry.textsIn(language.value) ?? {})

// Legacy's fallbacks where the description is empty.
const description = computed(() => {
  if (texts.value.description) return texts.value.description
  const codes = props.entry.languages ?? []
  if (codes.length <= 1) return t('explore.monument.noDescription')
  return language.value === 'en' ? t('explore.monument.noEnglishDescription') : ''
})

// ── The pictures ──────────────────────────────────────────────────────────

const images = computed(() => props.entry.images ?? [])
const current = ref(0)
const lightbox = ref(false)
watch(images, () => { current.value = 0 })
const main = computed(() => images.value[current.value] ?? null)
const caption = computed(() => {
  const image = main.value
  if (!image) return ''
  const own = image.captions?.[language.value] ?? image.captions?.en ?? ''
  let text = own ? mdInline(own) : `${mdInline(texts.value.name ?? '')}${props.place ? ` (${props.place})` : ''}`
  if (image.photographer) text += ` | ${t('explore.monument.photographer')}: ${image.photographer}`
  return `${text} | © ${image.copyright || t('explore.monument.defaultCopyright')}`
})
const step = (by) => {
  current.value = (current.value + by + images.value.length) % images.value.length
}
</script>

<template>
  <div class="explore-entry">
    <div v-if="main" class="explore-entry__photos explore-entry__part">
      <div class="explore-entry__main-photo" role="button" tabindex="0" @click="lightbox = true" @keydown.enter="lightbox = true">
        <img :src="mediaUrl(main.url)" alt="" />
      </div>
      <div class="explore-entry__caption" v-html="caption"></div>
      <div v-if="images.length > 1" class="explore-entry__thumbnails">
        <button
          v-for="(image, index) in images"
          :key="image.url"
          type="button"
          class="explore-entry__thumbnail"
          :class="{ 'explore-entry__thumbnail--current': index === current }"
          :aria-label="String(index + 1)"
          @click="current = index"
        ><img :src="mediaUrl(image.url, 'small')" alt="" /></button>
      </div>
    </div>
    <div v-else class="explore-entry__part explore-entry__no-image" v-html="mdInline(t('explore.monument.noImage'))"></div>

    <div v-if="lightbox && main" class="explore-entry__lightbox" @click="lightbox = false">
      <img :src="mediaUrl(main.url)" alt="" />
      <template v-if="images.length > 1">
        <button type="button" class="explore-entry__lightbox-button explore-entry__lightbox-button--left" :aria-label="t('explore.pages.previous')" @click.stop="step(-1)">
          <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M10 2 4 8l6 6" fill="none" stroke="currentColor" stroke-width="2" /></svg>
        </button>
        <button type="button" class="explore-entry__lightbox-button explore-entry__lightbox-button--right" :aria-label="t('explore.pages.next')" @click.stop="step(1)">
          <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="m6 2 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" /></svg>
        </button>
      </template>
    </div>

    <ReadIn class="explore-entry__part" :languages="entry.languages ?? []" :language="language" @select="emit('language', $event)" />

    <div class="explore-entry__part explore-entry__name" :dir="dir || undefined">
      <div v-html="mdInline(texts.name ?? '')"></div>
      <div v-if="texts.alsoKnownAs">{{ t('explore.monument.alsoKnownAs') }}: <span v-html="mdInline(texts.alsoKnownAs)"></span></div>
    </div>
    <div v-if="texts.date" class="explore-entry__part" :dir="dir || undefined">{{ t('explore.monument.date') }}: <span v-html="mdInline(texts.date)"></span></div>
    <div v-if="texts.artist" class="explore-entry__part" :dir="dir || undefined">{{ t('explore.monument.artist') }}: <span v-html="mdInline(texts.artist)"></span></div>
    <div v-if="texts.history" class="explore-entry__part">
      <div class="explore-entry__label" :dir="dir || undefined">{{ t('explore.monument.history') }}</div>
      <ReadMoreText :text="texts.history" :chars="HISTORY_LENGTH" :dir="dir" :glossary="glossary" />
    </div>
    <div class="explore-entry__part">
      <div v-if="texts.history" class="explore-entry__label" :dir="dir || undefined">{{ t('explore.monument.description') }}</div>
      <ReadMoreText :text="description" :chars="DESCRIPTION_LENGTH" :dir="dir" :glossary="glossary" />
    </div>
    <div class="explore-entry__part explore-entry__citation" :dir="dir || undefined">
      <div class="explore-entry__authors">
        <div v-if="texts.authors"><span class="explore-entry__citation-label">{{ t('explore.monument.authors') }}: </span><span v-html="mdInline(texts.authors)"></span></div>
        <div v-if="texts.preparedBy">{{ t('explore.monument.preparedBy') }}: <span v-html="mdInline(texts.preparedBy)"></span></div>
        <div v-if="texts.copyEditedBy">{{ t('explore.monument.copyeditedBy') }}: <span v-html="mdInline(texts.copyEditedBy)"></span></div>
        <div v-if="texts.translationBy">{{ t('explore.monument.translationBy') }}: <span v-html="mdInline(texts.translationBy)"></span></div>
        <div v-if="texts.translationCopyEditedBy">{{ t('explore.monument.translationCopyeditedBy') }}: <span v-html="mdInline(texts.translationCopyEditedBy)"></span></div>
      </div>
      <div v-if="texts.bibliography" class="explore-entry__bibliography"><span class="explore-entry__citation-label">{{ t('explore.monument.bibliography') }}: </span><span v-html="legacyLines(texts.bibliography)"></span></div>
      <div v-if="texts.citation"><span class="explore-entry__citation-label">{{ t('explore.monument.citation') }}: </span><a :href="texts.citation" target="_blank" rel="noopener">{{ texts.citation }}</a></div>
    </div>
  </div>
</template>
