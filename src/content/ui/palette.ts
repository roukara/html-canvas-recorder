/**
 * The page overlay draws on top of somebody else's site, so it repeats the
 * popup's palette rather than inventing one: selection is achromatic, orange
 * means a recording is under way, and nothing else carries a hue.
 *
 * The one thing the popup does not have to solve is an unknown background.
 * Every mark here pairs a dark core with a white halo, so it survives a dark
 * page and a light one without changing colour — the colour is the meaning.
 */

/** Selection: weight and shape, never a hue. Matches --state-selected. */
export const OVERLAY_SELECTED = '#000'

/** A recording is under way. Matches --color-orange. */
export const OVERLAY_RECORDING = '#ff8000'

/** Same hue held at .3 alpha; the pulse is weight, not a second colour. */
export const OVERLAY_RECORDING_DIM = 'rgba(255, 128, 0, .3)'

/** Carries the mark on a dark page; invisible on a light one, where the core reads. */
export const OVERLAY_HALO = 'rgba(255, 255, 255, .9)'

export const OVERLAY_ON_DARK = '#fff'
