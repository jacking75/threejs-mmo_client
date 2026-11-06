/** Original vector silhouettes matching the staff crowns and bow limb designs. */
const staffCrowns: Readonly<Record<string, readonly [string, string]>> = {
  "apprentice-staff": ["#ad91f3", '<path d="m48 6 12 15-12 16-12-16Z"/>'],
  "crescent-staff": ["#b9eaff", '<path d="M55 5C21 6 22 43 55 39 37 30 37 15 55 5Z"/>'],
  "sun-oracle-staff": ["#f5cb60", '<circle cx="48" cy="23" r="12"/><path d="M48 2v7m0 28v7M27 23h7m28 0h7M33 8l5 5m20 20 5 5m0-30-5 5M38 33l-5 5" fill="none" stroke-width="4"/>'],
  "verdant-staff": ["#82d998", '<path d="M48 41C19 31 26 7 29 5c17 5 23 15 19 36Zm0 0C44 18 60 7 72 9c-1 17-9 28-24 32Z"/>'],
  "frost-spire-staff": ["#a1efff", '<path d="m48 2 9 18-9 24-9-24Zm-14 12 5 15-9 5-7-15Zm28 0 11 5-7 15-9-5Z"/>'],
  "ember-cage-staff": ["#ff9668", '<path d="M48 5C65 20 61 34 48 40 32 35 28 25 42 12l-1 15 7-22Z"/><path d="M29 10 25 31l23 15 23-15-4-21" fill="none" stroke-width="4"/>'],
  "astral-staff": ["#acb8ff", '<ellipse cx="48" cy="24" rx="23" ry="9" transform="rotate(-30 48 24)" fill="none" stroke-width="3"/><path d="m48 4 5 13 14 1-11 8 4 14-12-8-12 8 4-14-11-8 14-1Z"/>'],
  "tidal-staff": ["#79dbdf", '<path d="M25 37Q28 5 53 8q24 7 7 24-8 5-11-3 12 0 5-10-17-5-14 20l-15-2Z"/>'],
  "raven-staff": ["#b3a1d8", '<path d="M48 37 21 22 17 6l23 10 8-12 8 12L79 6l-4 16-27 15Z"/>'],
  "clockwork-staff": ["#d9ba7d", '<path d="M39 5h18v7l9 5 6-3 7 14-7 4-4 10-13-3H41l-13 3-4-10-7-4 7-14 6 3 9-5Z"/><circle cx="48" cy="25" r="10" fill="#263b4d"/>'],
};

const bowLimbs: Readonly<Record<string, readonly [string, string]>> = {
  "scout-bow": ["#cba06c", 'M30 7Q76 48 30 89'],
  "moon-recurve": ["#b7d9ef", 'M24 7Q48 4 43 25Q82 48 43 71Q48 92 24 89'],
  "antler-bow": ["#d9d0b1", 'M34 7 46 22 58 25 62 48 58 71 46 74 34 89M45 23 60 9m-3 21 17-9M45 73 60 87m-3-21 17 9'],
  "sunwing-bow": ["#f2ca6c", 'M27 6 57 20 48 26 69 38 61 48 69 58 48 70 57 76 27 90'],
  "frost-bow": ["#93e4f5", 'M30 6 51 15 44 28 62 39 55 48 62 57 44 68 51 81 30 90'],
  "clockwork-bow": ["#c3a470", 'M30 7 53 17 68 39 68 57 53 79 30 89M48 18h17v15M48 78h17V63'],
  "serpent-bow": ["#8fcb8b", 'M28 7C78 6 37 37 63 48 37 59 78 90 28 89'],
  "storm-bow": ["#a4b8ed", 'M28 7 58 20 46 29 68 41 57 48 68 55 46 67 58 76 28 89'],
  "rose-bow": ["#e39ba9", 'M30 7Q77 15 55 35L64 48 55 61Q77 81 30 89M48 18l18-7M48 78l18 7'],
  "raven-bow": ["#a5a0cb", 'M30 7 59 15 51 23 67 29 57 35 64 48 57 61 67 67 51 73 59 81 30 89'],
};

export function rangedWeaponArt(id: string): string | undefined {
  const key = id.replace("weapon.", "");
  const staff = staffCrowns[key];
  if (staff) {
    const [color, crown] = staff;
    return `<path d="M44 34h8v56h-8Z" fill="#795941" stroke="${color}" stroke-width="2"/><path d="M41 53h14v16H41Z" fill="#34445d"/><path d="M42 81h12v8H42Z" fill="${color}"/><g fill="${color}" stroke="${color}" stroke-width="1.5" stroke-linejoin="round">${crown}</g><circle cx="48" cy="23" r="3" fill="#f1ffff"/>`;
  }
  const bow = bowLimbs[key];
  if (!bow) return undefined;
  const [color, path] = bow;
  return `<path d="M30 7 22 48 30 89" fill="none" stroke="#e7dfbf" stroke-width="1.7"/><path d="${path}" fill="none" stroke="${color}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M55 41v14" stroke="#65513f" stroke-width="7"/><path d="M12 48h70m-8-6 9 6-9 6M14 43l6 5-6 5" fill="none" stroke="#e4eaf1" stroke-width="2"/>`;
}
