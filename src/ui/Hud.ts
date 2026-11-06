import type { CharacterProfile } from "../domain/character";
import { CLASS_CATALOG, getItemDefinition, getWeaponKind } from "../domain/catalog";
import type { AnimationState } from "../game/animationState";
import { itemArt } from "./itemArt";

export interface HudView {
  readonly characterName: string;
  readonly classLabel: string;
  readonly classMark: string;
  readonly weaponLabel: string;
}

export function buildHudView(profile: CharacterProfile): HudView {
  const classLabel = CLASS_CATALOG[profile.classId].label;
  const weapon = profile.equipped.weapon
    ? getItemDefinition(profile.equipped.weapon)
    : undefined;
  return {
    characterName: profile.name,
    classLabel,
    classMark: classLabel.slice(0, 1),
    weaponLabel: `장착 무기 · ${weapon?.label ?? "없음"}`,
  };
}

export interface HudOptions {
  readonly root: HTMLElement;
  readonly profile: CharacterProfile;
  readonly onExit: () => void;
  readonly onAttack: () => void;
}

export class Hud {
  private readonly root: HTMLElement;
  private readonly onExit: () => void;
  private readonly onAttack: () => void;
  private profile: CharacterProfile;
  private nameElement: HTMLElement | null = null;
  private classElement: HTMLElement | null = null;
  private portraitElement: HTMLElement | null = null;
  private weaponElement: HTMLElement | null = null;
  private locomotionElement: HTMLElement | null = null;
  private exitButton: HTMLButtonElement | null = null;
  private attackButton: HTMLButtonElement | null = null;

  public constructor(options: HudOptions) {
    this.root = options.root;
    this.profile = options.profile;
    this.onExit = options.onExit;
    this.onAttack = options.onAttack;
  }

  public start(): void {
    this.root.insertAdjacentHTML("beforeend", `
      <header class="field-hud field-hud--identity">
        <div class="field-portrait" aria-hidden="true"></div>
        <div class="field-character-copy">
          <p>모험가</p>
          <strong></strong>
          <span class="field-class-label"></span>
          <span class="field-weapon-label"></span>
        </div>
      </header>
      <aside class="field-hud field-hud--status" aria-label="필드 상태">
        <div class="field-area-emblem" aria-hidden="true">✧</div>
        <div class="field-location"><small>현재 지역</small><strong>별빛 초원</strong><span>자유 탐험 · <b class="field-locomotion">대기 중</b></span></div>
      </aside>
      <aside class="field-hint" aria-label="조작 안내"><strong>조작 안내</strong><span><kbd>W A S D</kbd> 이동 <kbd>Shift</kbd> 달리기</span><span>좌/우 드래그 · 시점 회전 / 휠 · 확대</span></aside>
      <div class="field-hotbar" aria-label="게임 단축키 바">
        <button class="hotbar-slot attack-toggle" type="button" title="검 공격 · F 또는 필드 좌클릭"><kbd>F</kbd>${itemArt("weapon.training-sword")}<strong>검 공격</strong><small>F / 좌클릭</small></button>
        <button class="hotbar-slot inventory-toggle" type="button" aria-controls="inventory-overlay" aria-expanded="false" title="인벤토리 · I"><kbd>I</kbd>${itemArt("bag")}<strong>인벤토리</strong><small>장비 · 의상 변경</small></button>
      </div>
      <button class="field-exit" type="button">캐릭터 선택으로</button>
    `);

    this.nameElement = this.requiredElement<HTMLElement>(".field-character-copy > strong");
    this.classElement = this.requiredElement<HTMLElement>(".field-class-label");
    this.portraitElement = this.requiredElement<HTMLElement>(".field-portrait");
    this.weaponElement = this.requiredElement<HTMLElement>(".field-weapon-label");
    this.locomotionElement = this.requiredElement<HTMLElement>(".field-locomotion");
    this.exitButton = this.requiredElement<HTMLButtonElement>(".field-exit");
    this.attackButton = this.requiredElement<HTMLButtonElement>(".attack-toggle");
    this.attackButton.addEventListener("click", this.onAttack);
    this.exitButton.addEventListener("click", this.onExit);
    this.renderProfile();
  }

  public updateProfile(profile: CharacterProfile): void {
    this.profile = profile;
    this.renderProfile();
  }

  public setLocomotion(state: AnimationState): void {
    const labels: Record<AnimationState, string> = { idle: "대기 중", run: "이동 중", sprint: "달리는 중", attack_1: "공격 중" };
    if (this.locomotionElement) this.locomotionElement.textContent = labels[state];
    if (this.attackButton) this.attackButton.classList.toggle("is-active", state === "attack_1");
  }

  public setInventoryOpen(open: boolean): void {
    if (this.attackButton) this.attackButton.disabled = open;
    if (this.exitButton) this.exitButton.disabled = open;
  }

  public dispose(): void {
    this.exitButton?.removeEventListener("click", this.onExit);
    this.attackButton?.removeEventListener("click", this.onAttack);
    this.attackButton = null;
    this.nameElement = null;
    this.classElement = null;
    this.portraitElement = null;
    this.weaponElement = null;
    this.locomotionElement = null;
    this.exitButton = null;
  }

  private renderProfile(): void {
    if (!this.nameElement || !this.classElement || !this.portraitElement || !this.weaponElement) return;
    const view = buildHudView(this.profile);
    this.nameElement.textContent = view.characterName;
    this.classElement.textContent = view.classLabel;
    this.portraitElement.textContent = view.classMark;
    this.weaponElement.textContent = view.weaponLabel;
    const art = this.attackButton?.querySelector(".item-art");
    if (art) art.outerHTML = itemArt(this.profile.equipped.weapon ?? "weapon.training-sword");
    if (this.attackButton) {
      const labels = { sword: "검 공격", staff: "마법 시전", bow: "활 발사" } as const;
      const label = labels[getWeaponKind(this.profile.equipped.weapon)];
      this.attackButton.title = `${label} · F 또는 필드 좌클릭`;
      const labelElement = this.attackButton.querySelector("strong");
      if (labelElement) labelElement.textContent = label;
    }
  }

  private requiredElement<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`HUD element is missing: ${selector}`);
    return element;
  }
}
