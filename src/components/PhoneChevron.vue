<script setup>
// The chevron legacy put on a folded tab bar's chosen tab below 900px
// (composables/phoneTabs.js): down while folded, up while listed.
defineProps({
  /** 'down', 'up', or null for none. */
  direction: { type: String, default: null },
})
</script>

<template>
  <svg v-if="direction" class="explore-phone-chevron" viewBox="0 0 16 16" width="0.75em" height="0.75em" aria-hidden="true">
    <path :d="direction === 'up' ? 'M2 11l6-6 6 6' : 'M2 5l6 6 6-6'" fill="none" stroke="currentColor" stroke-width="2.5" />
  </svg>
</template>
