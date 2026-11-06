export const POINTER_DRAG_THRESHOLD_SQ = 36;

/** Let browser shortcuts, IME, and text editing keep ownership of their keys. */
export function isGameKey(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return false;
  const target = event.target;
  return !(target instanceof Element && target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"));
}
