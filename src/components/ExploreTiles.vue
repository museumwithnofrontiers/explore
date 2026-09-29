<script setup>
import { reactive } from 'vue'

// Legacy's "Explore by …" tiles: one per next step down the path, its name
// over its picture where it has one, the whole tile the link. A picture that
// fails to load leaves the plain tile rather than a broken image.
defineProps({
  /** The next step, resolved ("Explore by Location"); none where the page already says it. */
  heading: { type: String, default: '' },
  /** [{ id, label, image?, to }] */
  tiles: { type: Array, default: () => [] },
})
const failed = reactive(new Set())
</script>

<template>
  <section v-if="tiles.length" class="explore-tiles">
    <h2 v-if="heading" class="explore-tiles__heading">{{ heading }}</h2>
    <ul class="explore-tiles__list">
      <li v-for="tile in tiles" :key="tile.id" class="explore-tiles__item">
        <RouterLink
          class="explore-tiles__tile"
          :class="{ 'explore-tiles__tile--picture': tile.image && !failed.has(tile.id) }"
          :to="tile.to"
        >
          <img
            v-if="tile.image && !failed.has(tile.id)"
            class="explore-tiles__image"
            :src="tile.image"
            alt=""
            loading="lazy"
            @error="failed.add(tile.id)"
          />
          <span class="explore-tiles__label">{{ tile.label }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
