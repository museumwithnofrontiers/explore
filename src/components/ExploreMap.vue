<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Legacy's map through Leaflet, with no key (Pascal, 2026-10-20): legacy
// opened every map on satellite imagery, so Esri World Imagery is the view a
// map opens on, and OpenStreetMap's street map is the other layer. A marker
// for each place or monument the page leads to, the markers standing on one
// spot sharing one popup of links, the view fitted to them and never closer
// than the page's own zoom. A pin with no link (a monument's own map) opens
// nothing.
const props = defineProps({
  /** [{ lat, lng, label, to }] */
  pins: { type: Array, default: () => [] },
  /** The page's own zoom: the closest the fitted view goes. */
  zoom: { type: Number, default: null },
  /** { satellite, streets }: the layer switch's two names; no switch without both. */
  layerLabels: { type: Object, default: null },
})

const router = useRouter()
const element = ref(null)
let map = null
let markers = null

// Each provider's terms ask every map using its tiles to credit it, in these words.
const SATELLITE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  options: {
    maxZoom: 19,
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
}
const STREETS = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  options: {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
}

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
  const satellite = L.tileLayer(SATELLITE.url, SATELLITE.options).addTo(map)
  const streets = L.tileLayer(STREETS.url, STREETS.options)
  if (props.layerLabels?.satellite && props.layerLabels?.streets) {
    L.control.layers({ [props.layerLabels.satellite]: satellite, [props.layerLabels.streets]: streets }).addTo(map)
  }
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
