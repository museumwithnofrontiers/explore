import { chromePicture } from '@museumwnf/viewer-layout'

// The website's chrome files (inventory-app#2233, decision D7): legacy
// Explore's own, kept in this repository under theme/assets/ rather than on
// the legacy media server. viewer-layout's map of them (README, "Site
// chrome"), keyed by the path after `theme/assets/`: the two logos at the
// root, and under `chrome/` every picture the package names by its legacy
// path — a home banner `explore/banners/homebanners/<n>.jpg`, a partnership's
// logo `explore/partners/<id>/<id>.jpg`. A path with no file here shows
// nothing, never the legacy server's copy.
export const chrome = import.meta.glob('../../theme/assets/**/*.{jpg,jpeg,png,gif,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

/** A home banner's picture, by the package's legacy path. */
export function bannerImage(path) {
  return chromePicture(chrome, path)
}

/** A featured partnership's logo, by the package's legacy path. */
export function partnershipLogo(path) {
  return chromePicture(chrome, path)
}
