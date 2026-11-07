<script setup>
import { reactive } from 'vue'

// Legacy's "Explore by …" tiles (ExplorePage .explore-next-tile) and a
// sub-itinerary's monuments (SubItinerary .monument-tile): three across, 200px
// high with rounded corners, the whole tile the link. A place's tile is dark
// green, its name over it; a country's is its picture under a darker shade,
// its name over it; a monument's is its picture, its name under it. A picture
// that fails to load leaves the plain tile rather than a broken image.
defineProps({
  /** The next step, resolved ("Explore by Location"); none where the page already says it. */
  heading: { type: String, default: '' },
  /** [{ id, label, image?, to }] */
  tiles: { type: Array, default: () => [] },
  /** `place`, `country` or `monument`: legacy's three kinds of tile. */
  kind: { type: String, default: 'place' },
})
const failed = reactive(new Set())
</script>

<template>
  <section v-if="tiles.length" class="explore-tiles" :class="`explore-tiles--${kind}`">
    <h2 v-if="heading" class="explore-tiles__heading">{{ heading }}</h2>
    <ul class="explore-tiles__list">
      <li v-for="tile in tiles" :key="tile.id" class="explore-tiles__item">
        <RouterLink
          class="explore-tiles__tile"
          :to="tile.to"
          :aria-label="kind === 'monument' ? tile.label : undefined"
        >
          <img
            v-if="tile.image && !failed.has(tile.id)"
            class="explore-tiles__image"
            :src="tile.image"
            alt=""
            loading="lazy"
            @error="failed.add(tile.id)"
          />
          <span v-if="kind !== 'monument'" class="explore-tiles__label">{{ tile.label }}</span>
        </RouterLink>
        <RouterLink v-if="kind === 'monument'" class="explore-tiles__name" :to="tile.to">{{ tile.label }}</RouterLink>
      </li>
    </ul>
  </section>
</template>
