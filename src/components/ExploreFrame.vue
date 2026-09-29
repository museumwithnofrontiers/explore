<script setup>
import FeaturedPartnerships from './FeaturedPartnerships.vue'
import SelectionPanel from './SelectionPanel.vue'

// Every page below the home page, as legacy lays it out: "Make Your
// Selection" and the page's featured partnerships in a column beside the
// content, the breadcrumb over it.
defineProps({
  /** [{ label, to? }]: the trail from the home page, the current page last. */
  crumbs: { type: Array, default: () => [] },
  /** SelectionPanel's props: the path being explored and where it stands on it. */
  selection: { type: Object, required: true },
  partnerships: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="explore-frame">
    <aside class="explore-frame__aside">
      <SelectionPanel v-bind="selection" />
      <FeaturedPartnerships :partnerships="partnerships" />
    </aside>
    <div class="explore-frame__main">
      <nav v-if="crumbs.length" class="explore-crumbs">
        <template v-for="(crumb, index) in crumbs" :key="index">
          <span v-if="index > 0" class="explore-crumbs__separator" aria-hidden="true"></span>
          <RouterLink v-if="crumb.to && index < crumbs.length - 1" class="explore-crumbs__link" :to="crumb.to">{{ crumb.label }}</RouterLink>
          <span v-else class="explore-crumbs__current" aria-current="page">{{ crumb.label }}</span>
        </template>
      </nav>
      <slot />
    </div>
  </div>
</template>
