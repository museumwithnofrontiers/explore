import { chromePicture } from '@museumwnf/viewer-layout'

// The website's chrome files (inventory-app#2233, decision D7): legacy
// Explore's own, kept in this repository under theme/assets/ rather than on
// the legacy media server. viewer-layout's map of them (README, "Site
// chrome"), keyed by the path after `theme/assets/`: the two logos at the
// root, and under `chrome/` every home banner, at the legacy path the package
// names (`explore/banners/homebanners/<n>.jpg`). A path with no file here
// shows nothing, never the legacy server's copy.
export const chrome = import.meta.glob('../../theme/assets/**/*.{jpg,jpeg,png,gif,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

/** A home banner's picture, by the package's legacy path. */
export function bannerImage(path) {
  return chromePicture(chrome, path)
}

// The featured partnerships' logos are this website's content, not inventory
// data (Pascal, 2026-10-20): legacy's files, kept in src/assets/partnerships/
// under the partnership's legacy id.
const partnershipLogos = import.meta.glob('../assets/partnerships/*.jpg', { eager: true, import: 'default' })

/** A featured partnership's logo, by its legacy id. */
export function partnershipLogo(id) {
  return partnershipLogos[`../assets/partnerships/${id}.jpg`] ?? null
}
