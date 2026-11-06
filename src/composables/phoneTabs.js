import { onBeforeUnmount, ref } from 'vue'

// Legacy's tab bars below 900px (explore-client MonumentComponent.vue and
// SubItinerary.vue, `lessThan899` and `showTabDropdowns`): only the chosen tab
// shows, with a chevron down; tapping it lists every tab, its chevron up;
// tapping one chooses it and folds the list again.
const NARROW = '(max-width: 899px)'

export function usePhoneTabs() {
  const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(NARROW) : null
  const narrow = ref(media?.matches ?? false)
  const open = ref(false)
  const onChange = (event) => {
    narrow.value = event.matches
    if (!event.matches) open.value = false
  }
  media?.addEventListener?.('change', onChange)
  onBeforeUnmount(() => media?.removeEventListener?.('change', onChange))

  /** Whether a tab is drawn: every one when wide or listed, the chosen one alone otherwise. */
  const shown = (chosen) => !narrow.value || open.value || chosen
  /** The chosen tab's chevron on a phone: 'down' folded, 'up' listed; none otherwise. */
  const chevron = (chosen, count = 2) => (narrow.value && chosen && count > 1 ? (open.value ? 'up' : 'down') : null)
  /** A tap: the chosen tab lists or folds the others; another one is chosen and folds them. */
  function tap(chosen, choose) {
    if (narrow.value && chosen) {
      open.value = !open.value
      return
    }
    choose()
    open.value = false
  }
  return { narrow, open, shown, chevron, tap }
}
