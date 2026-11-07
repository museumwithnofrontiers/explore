<script setup>
import { computed } from 'vue'
import { mediaUrl, md, mdInline, useI18n } from '@museumwnf/viewer-core'
import { recordTexts } from '../composables/explore.js'

// A page's MWNF Travel Books and MWNF Tours, as legacy's BooksTours.vue drew
// them under the content (decision D1): "Related Featured Book(s)", then
// "Related MWNF Tour(s)", each record a card with its picture (a book's
// cover, a tour's picture; legacy's dark green where it has none), its title
// linked to its page on the Books or Travels site, and its presentation.
// Legacy read every record in English.
const props = defineProps({
  books: { type: Array, default: () => [] },
  tours: { type: Array, default: () => [] },
})
const { t } = useI18n()

function entry(record, kind) {
  const texts = recordTexts(record, 'en')
  return {
    id: `${kind}-${record.id}`,
    title: mdInline(texts.title ?? ''),
    intro: md(texts.intro ?? ''),
    href: texts.read_more ?? null,
    image: kind === 'book' ? mediaUrl(texts.cover, 'small') : mediaUrl(record.image),
  }
}

const groups = computed(() => [
  {
    kind: 'books',
    heading: props.books.length > 1 ? t('explore.travel.books') : t('explore.travel.book'),
    records: props.books.map((book) => entry(book, 'book')),
  },
  {
    kind: 'tours',
    heading: props.tours.length > 1 ? t('explore.travel.tours') : t('explore.travel.tour'),
    records: props.tours.map((tour) => entry(tour, 'tour')),
  },
].filter((group) => group.records.length))
</script>

<template>
  <section v-for="group in groups" :key="group.kind" class="explore-travel" :class="`explore-travel--${group.kind}`">
    <h2 class="explore-travel__heading">{{ group.heading }}</h2>
    <article v-for="record in group.records" :key="record.id" class="explore-travel__record">
      <div
        class="explore-travel__image"
        :style="record.image ? { backgroundImage: `url(${record.image})` } : {}"
      ></div>
      <div class="explore-travel__body">
        <a v-if="record.href" class="explore-travel__title" :href="record.href" target="_blank" rel="noopener" v-html="record.title"></a>
        <span v-else class="explore-travel__title" v-html="record.title"></span>
        <div class="explore-travel__intro" v-html="record.intro"></div>
      </div>
    </article>
  </section>
</template>
