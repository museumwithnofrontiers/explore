# Explore with MWNF

Museum With No Frontiers' digital-tourism website: monuments, sites and
museums to explore by theme or by country, down to each monument's sheet.
It replaces <https://explore.museumwnf.org>.

Live at <https://museumwithnofrontiers.github.io/explore/>.

It is a light, static Vue 3 front-end on the MWNF website platform, created
from [`website-template`](https://github.com/museumwithnofrontiers/website-template)
(class `standalone`) and built from these `@museumwnf` packages on npmjs:

| Package | Role |
| --- | --- |
| `@museumwnf/explore-data` | Explore's data: its themes, countries, territories and locations, the monuments they hold, and the site's records |
| `@museumwnf/viewer-core` | application engine (routing, data access, texts, language) |
| `@museumwnf/viewer-layout` | page structure and the shared components, themed via `theme/tokens.css` |
| `@museumwnf/viewer-i18n` | the shared texts |

## What the website shows

| Page | Address | What it shows |
| --- | --- | --- |
| Home | `#/` | The welcome; the themes in legacy's order, with two of them highlighted at random; the countries |
| A theme | `#/theme/<id>` | Its introduction, in every language it is written in, its countries and its travel records |
| A country, a territory, a location | `#/country/<id>`, `#/territory/<id>`, `#/location/<id>` | What the theme covers there (`?theme=`), or everything, or what carries a filter (`?filter=`); a country's or a territory's locations, a location's historical background and monuments; the travel records and practical information scoped to it |
| A monument | `#/monument/<id>?location=<id>` | Legacy's tabs: its description, how to get there, practical information, and its related content |
| About, Credits, Get Involved, Important Information, What's New | `#/about`, `#/credits`, `#/get-involved`, `#/important-information`, `#/new` | Legacy's texts |

Every page but the home page carries legacy's "Make Your Selection" column
and the featured partnerships scoped to it. Legacy's addresses still work:
`#/themes/t-1/c-es/l-337/m-557` and `#/countries/c-es/l-337` open the page
they name.

The itineraries, the maps and the search come next (inventory-app#2122). The
data package is specified in inventory-app's
[`scripts/exporters/docs/explore-data-package.md`](https://github.com/museumwithnofrontiers/inventory-app/blob/main/scripts/exporters/docs/explore-data-package.md),
and what legacy showed, with the rules this website follows, in
[`explore-legacy-analysis.md`](https://github.com/museumwithnofrontiers/inventory-app/blob/main/scripts/exporters/docs/explore-legacy-analysis.md).

## Where things are

- **`src/dataset.config.js`:** the whole declaration: routes, languages, menu, banner, legacy addresses.
- **`src/composables/explore.js`:** the records and legacy's rules over them: which monument a location shows for each Explore monument and which record is its related content, what a theme or a filter keeps, which site records a page shows.
- **`src/views/`:** the home page, the theme page, the place page (country, territory, location) and the monument page.
- **`src/components/`:** the blocks they share: the page frame with "Make Your Selection", the tiles, the travel records, the additional information, the featured partnerships.
- **`locales/en.json`:** the website's own texts. The six text pages come from legacy, through inventory-app's `site-i18n`.

Explore's own texts are English, as legacy's were. The offered languages
follow the one platform rule; a theme, a place or a monument may be read in
more through its own language buttons.

---## Translator — editing the website's texts

You only need a GitHub account and a browser. The files under `locales/` hold
**this website's own texts**, one file per language — `en.json` is English,
`fr.json` French, and so on.

Texts shared with the other websites of the same kind — the labels of an item
sheet, the navigation, the buttons — are not here: they live in
[`viewer-i18n`](https://github.com/museumwithnofrontiers/viewer-i18n) and are edited there,
the same way. This website can override any of them by writing the same entry
name in its own file. The museum content itself arrives already translated and
is not edited anywhere.

1. **Open the folder.** Bookmark this link on the website's GitHub page:
   `locales/`. Click the language file you want to change.
2. **Click the pencil** (✏️, top right of the file view). The file opens in an
   editable text box. Change only the text between the second pair of
   quotation marks on a line — the part before the colon is the name of the
   entry and must stay exactly as it is.
3. **To start a new language**, open `en.json`, copy all of its content, then
   create the new file (Add file → Create new file) named with the two-letter
   language code, e.g. `ar.json`, paste, and translate the texts. A language
   does not have to be complete: anything you have not translated shows in
   English.
4. **Click "Commit changes…" then "Propose changes".** GitHub asks nothing
   else — it saves your edit as a proposal.
5. **Wait for the automatic check.** After a minute or two, the proposal page
   shows a green tick and your change goes live on the website by itself a few
   minutes later. If something is off, a comment appears explaining in plain
   language what to fix — edit again on the same page and the check reruns.

A text is **just text**, formatted with Markdown if you want: `**bold**`,
`*italic*`, `[a link](https://example.org)`. It may not contain HTML tags, and
it may not contain `{` or `}` — nothing is ever inserted into a text, so a
number or a date is placed next to it by the website rather than inside it.

---


---

## Webdesigner — theming the website

The website's whole visual identity lives in the `theme/` folder:
`tokens.css` (colors, fonts, spacing — the normal surface), `overrides.css`
(escape hatch) and `assets/` (logo, banner, sponsor images). Small changes can
be made straight in the browser with the pencil button, like the translator
flow above — styling changes are reviewed, they do not merge automatically.
For real design work, use the live preview:

1. **One-time setup:**
   - Install **Docker Desktop** (docker.com) and **GitHub Desktop**
     (desktop.github.com), each with default settings.
   - In GitHub Desktop: File → Clone repository → pick this website's repo.
   - No npm login is needed: every `@museumwnf` package installs anonymously
     from npmjs. Nothing in this repository holds a token.
2. **Start the preview:** open a terminal in the folder (GitHub Desktop:
   Repository → Open in Command Prompt) and run:

   ```bash
   docker compose up
   ```

   The first start downloads everything and takes a few minutes; wait until a
   line shows `Local: http://localhost:5173/`, then open
   **http://localhost:5173** in your browser.
3. **Edit `theme/`, watch it live.** Every save refreshes the browser
   automatically. `tokens.css` lists every knob with a comment; put images
   into `theme/assets/` and reference them from `src/dataset.config.js`
   (banner, sponsor logos). Anything a token cannot express goes into
   `overrides.css`. A change to a layout component itself is a request for the
   `viewer-layout` package — open an issue there and a developer pairs on it.
4. **Propose your changes:** in GitHub Desktop, write a short summary bottom
   left → **Commit** → **Push origin** → **Create Pull Request** (opens in the
   browser → green **Create pull request** button). After a colleague approves
   it, the change merges and deploys by itself. Stop the preview with
   `Ctrl+C` in the terminal when done.

---

---

## Developer notes

Develop and test in Docker, like every MWNF website:

```bash
docker compose up
docker compose run --rm dev npm test
```

The smoke test (`tests/smoke.test.js`) mounts every page against the real data
package and holds it to legacy's own numbers: the six themes in legacy's
order, a theme's countries and travel records, a country's locations by theme
and by country, a location's monuments, a monument's tabs, and the legacy
redirects.

---

## Licence

This website is Content of the MWNF Website under the [MWNF legal
notice](https://www.museumwnf.org/about/legal-notice), which governs its use
(non-commercial, personal, educational and scientific use is permitted, with
attribution and mandatory reporting — see the notice for the full terms). The
notice text also ships in this repository as `LICENSE.md`.

