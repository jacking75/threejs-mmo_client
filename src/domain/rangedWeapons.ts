/** Original playable ranged weapons; all are granted to local characters. */
export const RANGED_WEAPON_DEFINITIONS = [
  { id: "weapon.apprentice-staff", slot: "weapon", weaponKind: "staff", label: "수습 마법사의 수정봉", description: "큰 푸른 수정과 황동 받침을 갖춘 기본 지팡이." },
  { id: "weapon.crescent-staff", slot: "weapon", weaponKind: "staff", label: "달무리 초승달 지팡이", description: "은빛 초승달 안에 작은 달이 떠 있는 지팡이." },
  { id: "weapon.sun-oracle-staff", slot: "weapon", weaponKind: "staff", label: "태양 예언자의 홀", description: "태양 원반과 방사형 금빛 살을 갖춘 의식용 홀." },
  { id: "weapon.verdant-staff", slot: "weapon", weaponKind: "staff", label: "신록의 가지 지팡이", description: "갈라진 나뭇가지와 넓은 잎이 자라난 숲의 지팡이." },
  { id: "weapon.frost-spire-staff", slot: "weapon", weaponKind: "staff", label: "빙첨 수정 지팡이", description: "세 갈래 얼음 결정이 솟은 차가운 마법봉." },
  { id: "weapon.ember-cage-staff", slot: "weapon", weaponKind: "staff", label: "잿불 등불 지팡이", description: "사각 철제 등불 안에 불씨를 품은 지팡이." },
  { id: "weapon.astral-staff", slot: "weapon", weaponKind: "staff", label: "별궤도 관측 지팡이", description: "서로 교차하는 천구 고리와 별핵을 갖춘 지팡이." },
  { id: "weapon.tidal-staff", slot: "weapon", weaponKind: "staff", label: "해일의 삼지창 지팡이", description: "푸른 세 갈래 물결과 진주를 얹은 바다의 지팡이." },
  { id: "weapon.raven-staff", slot: "weapon", weaponKind: "staff", label: "까마귀 날개 지팡이", description: "검은 날개가 자주색 보석을 감싸는 지팡이." },
  { id: "weapon.clockwork-staff", slot: "weapon", weaponKind: "staff", label: "태엽 기공 지팡이", description: "톱니바퀴와 회전축으로 조립한 기계식 지팡이." },
  { id: "weapon.scout-bow", slot: "weapon", weaponKind: "bow", label: "정찰병의 장궁", description: "길게 뻗은 나무 활대와 가죽 손잡이의 장궁." },
  { id: "weapon.moon-recurve", slot: "weapon", weaponKind: "bow", label: "월광 리커브 활", description: "끝이 되굽은 은빛 활대와 초승달 장식." },
  { id: "weapon.antler-bow", slot: "weapon", weaponKind: "bow", label: "숲사슴 뿔활", description: "뿔처럼 갈라진 가지와 잎을 두른 숲의 활." },
  { id: "weapon.sunwing-bow", slot: "weapon", weaponKind: "bow", label: "태양날개 활", description: "넓은 금빛 날개 판이 양쪽으로 펼쳐진 활." },
  { id: "weapon.frost-bow", slot: "weapon", weaponKind: "bow", label: "서릿발 결정궁", description: "뾰족한 얼음 결정으로 조립한 각진 활." },
  { id: "weapon.clockwork-bow", slot: "weapon", weaponKind: "bow", label: "태엽 복합궁", description: "두 개의 캠과 보강대가 달린 기계식 활." },
  { id: "weapon.serpent-bow", slot: "weapon", weaponKind: "bow", label: "쌍뱀 곡궁", description: "물결치는 활대 끝에 뱀 머리가 달린 곡궁." },
  { id: "weapon.storm-bow", slot: "weapon", weaponKind: "bow", label: "폭풍 번개궁", description: "번개처럼 꺾이는 날카로운 활대의 짧은 활." },
  { id: "weapon.rose-bow", slot: "weapon", weaponKind: "bow", label: "장미 가시궁", description: "가시 덩굴과 장미꽃이 피어난 유려한 활." },
  { id: "weapon.raven-bow", slot: "weapon", weaponKind: "bow", label: "밤까마귀 날개궁", description: "검은 깃털 판과 붉은 보석을 갖춘 날개 활." },
] as const;
export const RANGED_WEAPON_IDS = RANGED_WEAPON_DEFINITIONS.map(item => item.id);
export type RangedWeaponId = (typeof RANGED_WEAPON_DEFINITIONS)[number]["id"];
