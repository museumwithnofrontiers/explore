<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@museumwnf/viewer-core'
import { itineraryLocations, routeKind, routeLink, routes, title } from '../composables/explore.js'

// Legacy's "Suggested Routes" on a location that has routes: its introduction,
// then one select, its routes grouped by kind in legacy's order.
const props = defineProps({
  location: { type: Object, default: null },
})
const { t, locale } = useI18n()
const router = useRouter()

const KINDS = ['explore', 'notToBeMissed', 'toKnowMore']

const groups = computed(() => {
  const here = routes.value.filter((r) => itineraryLocations(r).some((l) => l.id === props.location?.id))
  return KINDS.map((kind) => ({
    kind,
    label: {
      explore: t('explore.route.explore'),
      notToBeMissed: t('explore.route.notToBeMissed'),
      toKnowMore: t('explore.route.toKnowMore'),
    }[kind],
    routes: here
      .filter((r) => routeKind(r) === kind)
      .sort((a, b) => (a.extra.explore_itinerary.order ?? 0) - (b.extra.explore_itinerary.order ?? 0))
      .map((r) => ({ id: r.id, name: title(r, locale.value) })),
  })).filter((group) => group.routes.length > 0)
})

function go(event) {
  const route = routes.value.find((r) => r.id === event.target.value)
  if (route) router.push(routeLink(route))
}
</script>

<template>
  <section v-if="groups.length" id="suggested-routes" class="explore-routes">
    <h2 class="explore-routes__heading">{{ t('explore.route.heading') }}</h2>
    <p class="explore-routes__intro">{{ t('explore.route.intro') }}</p>
    <select class="explore-routes__select" :aria-label="t('explore.route.heading')" @change="go">
      <option value="" selected disabled>{{ t('explore.route.pickRoute') }}</option>
      <optgroup v-for="group in groups" :key="group.kind" :label="group.label">
        <option v-for="entry in group.routes" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
      </optgroup>
    </select>
  </section>
</template>
