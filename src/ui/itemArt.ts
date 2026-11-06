import { EXPANDED_ITEM_ART } from "./expandedItemArt";

/** Original inline vector illustrations; no external images or font glyph icons. */
export function itemArt(id: string): string {
  let drawing: string;
  if (EXPANDED_ITEM_ART[id]) {
    drawing = EXPANDED_ITEM_ART[id];
  } else if (id.startsWith("weapon.")) {
    const moon = id === "weapon.moon-sword";
    drawing = `<g transform="rotate(36 48 48)"><path d="M48 6 57 23 53 62H43L39 23Z" fill="${moon ? "#b9eaff" : "#c9d4da"}" stroke="#6e8c9d" stroke-width="2"/><path d="M48 9V61H43L41 24Z" fill="${moon ? "#619ed9" : "#7c939e"}"/><path d="m31 61 17-5 17 5-3 7-14-5-14 5Z" fill="${moon ? "#e3bc70" : "#9daab0"}" stroke="#667985" stroke-width="2"/><path d="M44 65h8v17h-8z" fill="${moon ? "#544674" : "#74513d"}" stroke="#dcaf62" stroke-width="2"/><path d="m48 80 6 7-6 6-6-6Z" fill="${moon ? "#c9a85e" : "#9daab0"}"/>${moon ? '<path d="m48 28 3 12-3 10-3-10Z" fill="#ecffff"/>' : ''}</g>`;
  } else if (id.startsWith("outfit.")) {
    const color = id.includes("traveler") ? "#3b9195" : id.includes("mage") ? "#6964ac" : id.includes("ranger") ? "#528664" : "#4d80ab";
    drawing = `<path d="m33 17-14 8-10 26 14 7 7-15-5 41h46l-5-41 7 15 14-7-10-26-14-8-15 6Z" fill="${color}" stroke="#d4bc83" stroke-width="2"/><path d="m33 17 15 10 15-10-7 17H40Z" fill="#e3d7bb"/><path d="M48 34v49M30 53h36" stroke="#e0b76c" stroke-width="3"/><path d="m24 27 6 12M72 27l-6 12" stroke="#dde2df" stroke-width="7"/><path d="M29 55h38v8H29z" fill="#523c31"/><rect x="43" y="54" width="10" height="10" rx="1" fill="#cda559"/><path d="m35 68-2 11m28-11 2 11" stroke="#ffffff" opacity=".2" stroke-width="3"/>`;
  } else if (id === "head.starter-cap") {
    drawing = '<path d="M20 56c-2-41 55-46 57-4l-28 9Z" fill="#527c88" stroke="#aac8ca" stroke-width="2"/><path d="M48 22q-12 14-10 32M56 21q14 13 15 30" fill="none" stroke="#7ca3ac" stroke-width="2"/><path d="m20 52 55-4 3 10-57 5Z" fill="#a58358" stroke="#dbbd88" stroke-width="2"/><path d="M20 61c13-6 33-7 49-5l16 12c-3 12-46 12-65-7Z" fill="#527c88" stroke="#a4bfc1" stroke-width="2"/>';
  } else if (id === "bag") {
    drawing = '<path d="M34 28v-7c0-14 28-14 28 0v7" fill="none" stroke="#d7b471" stroke-width="6"/><rect x="18" y="27" width="60" height="57" rx="12" fill="#91643e" stroke="#e4bd79" stroke-width="3"/><path d="M18 36q30 25 60 0v-9H18Z" fill="#c18c50" stroke="#e4bd79" stroke-width="2"/><rect x="41" y="42" width="14" height="17" rx="2" fill="#e9c679"/><path d="M30 68h36" stroke="#e2b275" stroke-width="3"/>';
  } else {
    drawing = '<circle cx="48" cy="36" r="17" fill="none" stroke="#aebfcb" stroke-width="3"/><path d="M21 82v-9c0-23 54-23 54 0v9M23 77l51-54" fill="none" stroke="#aebfcb" stroke-width="3"/>';
  }
  return `<svg class="item-art" viewBox="0 0 96 96" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${drawing}</svg>`;
}
