<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// Legacy's row of tall picture panels (explore-client ExploreTheme.vue,
// ExploreItinerary.vue): side by side, scrolled sideways, with an arrow at
// each end while there is more to see that way. Each arrow moves the row by
// one panel. The panels are the slot's; `count` re-measures the row when it
// changes.
defineProps({
  count: { type: Number, default: 0 },
  /** The arrows' accessible names. */
  previousLabel: { type: String, default: '' },
  nextLabel: { type: String, default: '' },
})

const row = ref(null)
const canPrevious = ref(false)
const canNext = ref(false)

function measure() {
  const element = row.value
  if (!element) return
  canPrevious.value = element.scrollLeft > 0
  canNext.value = element.scrollLeft + element.clientWidth < element.scrollWidth - 1
}

function move(direction) {
  const element = row.value
  const panel = element?.firstElementChild
  if (!panel) return
  const gap = parseFloat(window.getComputedStyle(element).columnGap) || 0
  element.scrollBy({ left: direction * (panel.getBoundingClientRect().width + gap), behavior: 'smooth' })
}

onMounted(async () => {
  await nextTick()
  measure()
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => window.removeEventListener('resize', measure))
watch(() => row.value?.childElementCount, () => nextTick(measure))
</script>

<template>
  <div class="explore-panels">
    <button
      v-show="canPrevious"
      type="button"
      class="explore-panels__arrow explore-panels__arrow--previous"
      :aria-label="previousLabel"
      @click="move(-1)"
    ></button>
    <div ref="row" class="explore-panels__row" @scroll.passive="measure">
      <slot />
    </div>
    <button
      v-show="canNext"
      type="button"
      class="explore-panels__arrow explore-panels__arrow--next"
      :aria-label="nextLabel"
      @click="move(1)"
    ></button>
  </div>
</template>
