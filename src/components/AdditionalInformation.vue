<script setup>
import { computed } from 'vue'
import { useI18n } from '@museumwnf/viewer-core'
import { byLanguage, recordTexts } from '../composables/explore.js'

// Legacy's "Additional information" toggle: the page's own practical texts
// (how to reach a location, its contacts), then the travel layer's
// accommodations by category, guided visits and useful websites scoped to
// the page. It renders nothing when there is nothing to show.
const props = defineProps({
  /** [{ key, label, html }]: the page's own texts, the label resolved and the text rendered. */
  texts: { type: Array, default: () => [] },
  /** `travelFor()`'s answer. */
  travel: { type: Object, default: () => ({}) },
  /** Shown open, without its toggle, where the block is a tab of its own. */
  open: { type: Boolean, default: false },
})
const { t, locale } = useI18n()

const contact = (record) => {
  const texts = recordTexts(record, locale.value)
  return {
    id: record.id,
    name: texts.name ?? texts.title ?? '',
    address: [texts.street, [texts.zip, texts.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    phone: texts.phone ?? '',
    fax: texts.fax ?? '',
    email: texts.email ?? '',
    url: texts.url ?? texts.link ?? '',
    note: texts.note ?? '',
  }
}

const accommodations = computed(() => {
  const categories = props.travel.categories ?? []
  const groups = categories
    .map((category) => ({
      code: category.code,
      name: byLanguage(category.names, locale.value) ?? category.code,
      entries: (props.travel.accommodations ?? []).filter((a) => a.category === category.code).map(contact),
    }))
    .filter((group) => group.entries.length > 0)
  const known = new Set(categories.map((c) => c.code))
  const others = (props.travel.accommodations ?? []).filter((a) => !known.has(a.category)).map(contact)
  return others.length ? [...groups, { code: '', name: '', entries: others }] : groups
})
const guidedVisits = computed(() => (props.travel.guidedVisits ?? []).map(contact))
const websites = computed(() =>
  (props.travel.usefulWebsites ?? []).map((site) => {
    const texts = recordTexts(site, locale.value)
    return { id: site.id, title: texts.title ?? texts.link ?? '', url: texts.link ?? '', note: texts.note ?? '' }
  }),
)
const shown = computed(
  () => props.texts.length + accommodations.value.length + guidedVisits.value.length + websites.value.length > 0,
)
</script>

<template>
  <component :is="open ? 'div' : 'details'" v-if="shown" class="explore-info" :class="{ 'explore-info--open': open }">
    <summary v-if="!open" class="explore-info__summary">{{ t('explore.info.heading') }}</summary>

    <section v-for="entry in texts" :key="entry.key" class="explore-info__section">
      <h3 class="explore-info__heading">{{ entry.label }}</h3>
      <div class="explore-info__text" v-html="entry.html"></div>
    </section>

    <section v-if="accommodations.length" class="explore-info__section">
      <h3 class="explore-info__heading">{{ t('explore.info.accommodations') }}</h3>
      <template v-for="group in accommodations" :key="group.code">
        <h4 v-if="group.name" class="explore-info__category">{{ group.name }}</h4>
        <ul class="explore-info__contacts">
          <li v-for="entry in group.entries" :key="entry.id" class="explore-info__contact">
            <strong>{{ entry.name }}</strong>
            <span v-if="entry.address">{{ entry.address }}</span>
            <span v-if="entry.phone">{{ entry.phone }}</span>
            <span v-if="entry.fax">{{ entry.fax }}</span>
            <a v-if="entry.email" :href="`mailto:${entry.email}`">{{ entry.email }}</a>
            <a v-if="entry.url" :href="entry.url" target="_blank" rel="noopener">{{ entry.url }}</a>
          </li>
        </ul>
      </template>
    </section>

    <section v-if="guidedVisits.length" class="explore-info__section">
      <h3 class="explore-info__heading">{{ t('explore.info.guidedVisits') }}</h3>
      <ul class="explore-info__contacts">
        <li v-for="entry in guidedVisits" :key="entry.id" class="explore-info__contact">
          <strong>{{ entry.name }}</strong>
          <span v-if="entry.address">{{ entry.address }}</span>
          <span v-if="entry.phone">{{ entry.phone }}</span>
          <a v-if="entry.email" :href="`mailto:${entry.email}`">{{ entry.email }}</a>
          <a v-if="entry.url" :href="entry.url" target="_blank" rel="noopener">{{ entry.url }}</a>
        </li>
      </ul>
    </section>

    <section v-if="websites.length" class="explore-info__section">
      <h3 class="explore-info__heading">{{ t('explore.info.usefulWebsites') }}</h3>
      <ul class="explore-info__websites">
        <li v-for="site in websites" :key="site.id">
          <a v-if="site.url" :href="site.url" target="_blank" rel="noopener">{{ site.title }}</a>
          <span v-else>{{ site.title }}</span>
          <span v-if="site.note" class="explore-info__note">{{ site.note }}</span>
        </li>
      </ul>
    </section>
  </component>
</template>
