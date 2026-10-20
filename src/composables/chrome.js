// The website's chrome pictures: legacy Explore's own, kept in this repository
// (theme/assets) rather than on the legacy media server (inventory-app#2233,
// decision D7). The package names them by their legacy paths — a home
// banner `explore/banners/homebanners/<n>.jpg`, a partnership's logo
// `explore/partners/<id>/<id>.jpg` — and each path finds its file here. A path
// with no file here shows nothing, never the legacy server's copy.
//
// The logos and the favicon are fixed, and are imported where they are shown.

const banners = import.meta.glob('../../theme/assets/banners/*.jpg', { eager: true, import: 'default' })
const partnershipLogos = import.meta.glob('../../theme/assets/partnerships/*.jpg', { eager: true, import: 'default' })

/** A home banner's picture, by the package's legacy path. */
export function bannerImage(path) {
  const name = /^explore\/banners\/homebanners\/(\d+)\.jpg$/.exec(path ?? '')?.[1]
  return (name && banners[`../../theme/assets/banners/${name}.jpg`]) || null
}

/** A featured partnership's logo, by the package's legacy path. */
export function partnershipLogo(path) {
  const id = /^explore\/partners\/(\d+)\/\d+\.jpg$/.exec(path ?? '')?.[1]
  return (id && partnershipLogos[`../../theme/assets/partnerships/${id}.jpg`]) || null
}
