<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from '@museumwnf/viewer-core'
import { legacyCut, legacyLines } from '../composables/explore.js'

// Legacy's DescriptionComponent: the text cut at `chars` (explore.js
// `legacyCut`), "Read more." after it, and the whole text with "Read less."
// once opened. Legacy wrote both words in English on every page.
const props = defineProps({
  /** The Markdown text. */
  text: { type: String, default: '' },
  chars: { type: Number, required: true },
  dir: { type: String, default: '' },
  /** The glossary terms marked in the text, as viewer-core's `mdInline` takes them. */
  glossary: { type: [Object, Array, Map], default: null },
})
const { t } = useI18n()
const full = ref(false)
watch(() => props.text, () => { full.value = false })

const cut = computed(() => legacyCut(props.text, props.chars))
const whole = computed(() => legacyCut(props.text, Infinity).text)
const html = computed(() =>
  legacyLines(full.value ? whole.value : cut.value.text, props.glossary ? { glossary: props.glossary } : {}),
)
</script>

<template>
  <div v-if="text" class="explore-read-more" :dir="dir || undefined">
    <span class="explore-read-more__text" v-html="html"></span>
    <span v-if="cut.cut" class="explore-read-more__toggle" role="button" tabindex="0" @click="full = !full" @keydown.enter="full = !full">{{ full ? t('explore.text.readLess') : t('explore.text.readMore') }}</span>
  </div>
</template>
