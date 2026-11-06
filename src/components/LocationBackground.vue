<script setup>
import { computed, ref, watch } from 'vue'
import { isRtl, useI18n } from '@museumwnf/viewer-core'
import ReadIn from './ReadIn.vue'
import ReadMoreText from './ReadMoreText.vue'
import { backgroundSources, describedLanguages, legacyCut, legacyLines, text, title, useContentLanguages } from '../composables/explore.js'

// A location's historical background, as legacy's ExplorePage and
// SubItinerary drew it (explore-api Location::getHistoricalBackground):
// "<location> | Historical Background", then Explore's own text, "Read in"
// the languages it is written in, cut at legacy's length with "Read more.";
// then the Travels location's introduction it names, behind "Read detailed
// Historical Background.", with its own "Read in". Where Explore has no text,
// the Travels one comes first. Legacy wrote the words in English.
const props = defineProps({
  location: { type: Object, default: null },
  /** Whether to draw the "<location> | Historical Background" label. */
  label: { type: Boolean, default: true },
})
const { t } = useI18n()
const codes = useContentLanguages()

// Legacy cut the first text at this many characters.
const DESCRIPTION_LENGTH = 575

const blocks = computed(() =>
  backgroundSources(props.location)
    .map((id) => ({ id, languages: describedLanguages(codes, id) }))
    .filter((block) => block.languages.length > 0)
    .slice(0, 2),
)
const first = computed(() => blocks.value[0] ?? null)
const second = computed(() => blocks.value[1] ?? null)

// Legacy's setLanguage: the language read stays while the text has it, else
// English, else the first.
const pick = (current, languages) =>
  languages.includes(current) ? current : languages.includes('en') ? 'en' : (languages[0] ?? '')
const firstLanguage = ref('en')
const secondLanguage = ref('en')
watch(first, (block) => { firstLanguage.value = pick(firstLanguage.value, block?.languages ?? []) }, { immediate: true })
watch(second, (block) => { secondLanguage.value = pick(secondLanguage.value, block?.languages ?? []) }, { immediate: true })

const open = ref(false)
watch(() => props.location?.id, () => { open.value = false })

const textOf = (block, lang) => String(text('collections', block?.id, lang).description ?? '')
const dirOf = (lang) => (isRtl(lang) ? 'rtl' : '')
const detailed = computed(() => legacyLines(legacyCut(textOf(second.value, secondLanguage.value), Infinity).text))
</script>

<template>
  <div v-if="first" class="explore-background">
    <div class="explore-background__block">
      <div v-if="label" class="explore-background__label">{{ title(location, 'en') }} | {{ t('explore.location.background') }}</div>
      <ReadIn class="explore-background__read-in" :languages="first.languages" :language="firstLanguage" @select="firstLanguage = $event" />
      <ReadMoreText :text="textOf(first, firstLanguage)" :chars="DESCRIPTION_LENGTH" :dir="dirOf(firstLanguage)" />
    </div>
    <div v-if="second" class="explore-background__block">
      <template v-if="open">
        <ReadIn class="explore-background__read-in" :languages="second.languages" :language="secondLanguage" @select="secondLanguage = $event" />
        <div class="explore-background__detailed" :dir="dirOf(secondLanguage) || undefined" v-html="detailed"></div>
      </template>
      <a class="explore-background__toggle" role="button" tabindex="0" @click="open = !open" @keydown.enter="open = !open">{{
        open ? t('explore.location.hideDetailed') : t('explore.location.readDetailed')
      }}</a>
    </div>
  </div>
</template>
