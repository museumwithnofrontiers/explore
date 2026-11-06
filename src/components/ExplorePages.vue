<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from '@museumwnf/viewer-core'

// Legacy's PagesComponent (explore-client): "<< First", "< Previous", up to
// fifteen page numbers with the current one in the middle, "Next >",
// "Last >>"; eleven, nine and five numbers on narrower screens, the words
// gone below 500px. The current page and the ends are disabled, not hidden.
const props = defineProps({
  page: { type: Number, required: true },
  last: { type: Number, required: true },
})
const emit = defineEmits(['go'])
const { t } = useI18n()

const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1366)
const onResize = () => { width.value = window.innerWidth }
if (typeof window !== 'undefined') window.addEventListener('resize', onResize)
onBeforeUnmount(() => { if (typeof window !== 'undefined') window.removeEventListener('resize', onResize) })

const narrow = computed(() => width.value <= 499)
const range = computed(() => {
  const [middle, half, size] = width.value <= 599 ? [3, 2, 5] : width.value <= 724 ? [5, 4, 9] : width.value <= 849 ? [6, 5, 11] : [8, 7, 15]
  if (props.last <= size) return { from: 1, to: props.last }
  let from = props.page > middle ? props.page - half : 1
  let to
  if (props.page + half < props.last) to = from <= half && props.page <= half ? size : props.page + half
  else {
    from = props.last - (size - 1)
    to = props.last
  }
  return { from, to }
})
const numbers = computed(() => Array.from({ length: range.value.to - range.value.from + 1 }, (_, i) => range.value.from + i))
const off = (n) => n < 1 || n > props.last || n === props.page
</script>

<template>
  <div class="explore-pages">
    <button class="explore-pages__button" type="button" :disabled="off(1)" @click="emit('go', 1)">&lt;&lt;<span v-if="!narrow">{{ ' ' }}{{ t('explore.pages.first') }}</span></button>
    <button class="explore-pages__button" type="button" :disabled="off(page - 1)" @click="emit('go', page - 1)">&lt;<span v-if="!narrow">{{ ' ' }}{{ t('explore.pages.previous') }}</span></button>
    <div class="explore-pages__numbers">
      <button v-for="n in numbers" :key="n" class="explore-pages__button" type="button" :disabled="off(n)" @click="emit('go', n)">{{ n }}</button>
    </div>
    <button class="explore-pages__button" type="button" :disabled="off(page + 1)" @click="emit('go', page + 1)"><span v-if="!narrow">{{ t('explore.pages.next') }}{{ ' ' }}</span>&gt;</button>
    <button class="explore-pages__button" type="button" :disabled="off(last)" @click="emit('go', last)"><span v-if="!narrow">{{ t('explore.pages.last') }}{{ ' ' }}</span>&gt;&gt;</button>
  </div>
</template>
