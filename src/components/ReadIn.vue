<script setup>
import { useI18n } from '@museumwnf/viewer-core'

// Legacy's "Read in" (SubItineraryList.vue, SubItinerary.vue,
// MonumentComponent.vue): a select of the language codes the text is written
// in, drawn only when there is more than one. Legacy wrote the label in
// English on every page.
defineProps({
  languages: { type: Array, default: () => [] },
  language: { type: String, default: '' },
})
const emit = defineEmits(['select'])
const { t } = useI18n()
</script>

<template>
  <div v-if="languages.length > 1" class="explore-read-in">
    <label>{{ t('explore.text.readIn') }} <select :value="language" @change="emit('select', $event.target.value)">
      <option v-for="code in languages" :key="code" :value="code">{{ code }}</option>
    </select></label>
  </div>
</template>
