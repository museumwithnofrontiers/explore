<script setup>
import { computed } from 'vue'
import { mediaUrl, md, mdInline, useI18n } from '@museumwnf/viewer-core'
import { recordTexts } from '../composables/explore.js'

// A page's MWNF Travel Books and MWNF Tours, the travel layer legacy shows
// under the content (decision D1): each one's title linked to its page on the
// Books or Travels site, its presentation under it, and a tour's picture and
// places. A Travel Book's cover is not carried: no rule in legacy's data
// explains which one it showed.
const props = defineProps({
  books: { type: Array, default: () => [] },
  tours: { type: Array, default: () => [] },
})
const { t, locale } = useI18n()

function entry(record, kind) {
  const texts = recordTexts(record, locale.value)
  return {
    id: `${kind}-${record.id}`,
    title: mdInline(texts.title ?? ''),
    subtitle: texts.subtitle ?? '',
    intro: md(texts.intro ?? ''),
    href: texts.read_more ?? null,
    image: kind === 'tour' ? mediaUrl(record.image) : null,
  }
}

const books = computed(() => props.books.map((book) => entry(book, 'book')))
const tours = computed(() => props.tours.map((tour) => entry(tour, 'tour')))
</script>

<template>
  <section v-if="books.length" class="explore-travel explore-travel--books">
    <h2 class="explore-travel__heading">{{ t('explore.travel.books') }}</h2>
    <article v-for="book in books" :key="book.id" class="explore-travel__record">
      <div class="explore-travel__body">
        <h3 class="explore-travel__title">
          <a v-if="book.href" :href="book.href" target="_blank" rel="noopener" v-html="book.title"></a>
          <span v-else v-html="book.title"></span>
        </h3>
        <div class="explore-travel__intro" v-html="book.intro"></div>
      </div>
    </article>
  </section>

  <section v-if="tours.length" class="explore-travel explore-travel--tours">
    <h2 class="explore-travel__heading">{{ t('explore.travel.tours') }}</h2>
    <article v-for="tour in tours" :key="tour.id" class="explore-travel__record">
      <img v-if="tour.image" class="explore-travel__image" :src="tour.image" alt="" loading="lazy" />
      <div class="explore-travel__body">
        <h3 class="explore-travel__title">
          <a v-if="tour.href" :href="tour.href" target="_blank" rel="noopener" v-html="tour.title"></a>
          <span v-else v-html="tour.title"></span>
        </h3>
        <p v-if="tour.subtitle" class="explore-travel__subtitle">{{ tour.subtitle }}</p>
        <div class="explore-travel__intro" v-html="tour.intro"></div>
      </div>
    </article>
  </section>
</template>
