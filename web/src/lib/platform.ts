/** Klawisz modyfikujący w skrótach: ⌘ na Macu, Ctrl gdzie indziej. */
export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl';
