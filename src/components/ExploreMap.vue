<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Legacy's map, on OpenStreetMap's tiles through Leaflet (Pascal, 2026-09-28:
// no Google Maps and no key): a marker for each place or monument the page
// leads to, the markers standing on one spot sharing one popup of links, the
// view fitted to them and never closer than the page's own zoom. A pin with
// no link (a monument's own map) opens nothing.
const props = defineProps({
  /** [{ lat, lng, label, to }] */
  pins: { type: Array, default: () => [] },
  /** The page's own zoom: the closest the fitted view goes. */
  zoom: { type: Number, default: null },
})

const router = useRouter()
const element = ref(null)
let map = null
let markers = null

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
// OpenStreetMap's tile policy asks every map using its tiles to credit it.
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function popup(group) {
  const box = document.createElement('div')
  box.className = 'explore-map__popup'
  for (const pin of group) {
    const line = document.createElement('div')
    const link = document.createElement('a')
    link.href = router.resolve(pin.to).href
    link.textContent = pin.label
    line.append(link)
    box.append(line)
  }
  return box
}

function draw() {
  if (!map) return
  markers.clearLayers()
  const valid = props.pins.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
  if (valid.length === 0) return

  // One marker per spot, as legacy grouped its pins.
  const spots = new Map()
  for (const pin of valid) {
    const key = `${pin.lat},${pin.lng}`
    if (!spots.has(key)) spots.set(key, [])
    spots.get(key).push(pin)
  }
  // The site's green (theme/tokens.css): a path's colours are options, not CSS.
  const green = window.getComputedStyle(element.value).getPropertyValue('--explore-green').trim()
  for (const group of spots.values()) {
    const marker = L.circleMarker([group[0].lat, group[0].lng], {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: green || 'currentColor',
      fillOpacity: 0.95,
    })
    const linked = group.filter((pin) => pin.to)
    if (linked.length) marker.bindPopup(popup(linked))
    markers.addLayer(marker)
  }

  const cap = props.zoom ?? 15
  // An element with no size (a hidden tab, a test) cannot be fitted.
  if (valid.length === 1 || !element.value?.clientWidth) {
    map.setView([valid[0].lat, valid[0].lng], cap)
    return
  }
  map.fitBounds(L.latLngBounds(valid.map((p) => [p.lat, p.lng])), { padding: [24, 24] })
  if (map.getZoom() > cap) map.setZoom(cap)
}

onMounted(async () => {
  await nextTick()
  map = L.map(element.value, { scrollWheelZoom: false })
  L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map)
  markers = L.layerGroup().addTo(map)
  draw()
})

watch(() => [props.pins, props.zoom], draw, { deep: true })

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div ref="element" class="explore-map"></div>
</template>
