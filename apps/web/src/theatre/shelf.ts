/**
 * Theatre is shelved: the background renders full-screen song art only.
 * Scene rotation, video/user-media clips, atmosphere FX, and sitewide
 * swipe-to-skip are off. The cinematic body fade, focus lanes, and subtitle
 * display still run, staggered behind the song art (see useSongArtIdleReveal).
 * Flip to false to restore the full theatre — every gate reads this one flag.
 */
export const THEATRE_SHELVED = true
