import { EQUIPMENT_SLOTS } from "../domain/character";
import type { CharacterProfile, EquipmentSlot } from "../domain/character";
import { CLASS_CATALOG, ITEM_CATALOG, getItemDefinition, getWeaponKind } from "../domain/catalog";

import { equipOwnedItem } from "../domain/equipment";
import { itemArt } from "./itemArt";
import { isGameKey } from "../game/inputGuards";

const SLOT_LABELS: Readonly<Record<EquipmentSlot, string>> = {
  weapon: "무기",
  outfit: "의상",
  head: "머리",
  accessory: "보조 장비",
};

function selectedItemId(profile: CharacterProfile, slot: EquipmentSlot): string {
  return profile.equipped[slot] ?? (slot === "accessory" ? "accessory.none" : "head.none");
}

export interface InventoryItemView {
  readonly id: string;
  readonly label: string;
  readonly owned: boolean;
  readonly equipped: boolean;
}

export interface InventorySlotView {
  readonly slot: EquipmentSlot;
  readonly label: string;
  readonly items: readonly InventoryItemView[];
}

export function buildInventorySlotViews(profile: CharacterProfile): readonly InventorySlotView[] {
  const items = Object.values(ITEM_CATALOG);
  return EQUIPMENT_SLOTS.map((slot) => ({
    slot,
    label: SLOT_LABELS[slot],
    items: items
      .filter((item) => item.slot === slot)
      .map((item) => ({
        id: item.id,
        label: item.label,
        owned: profile.ownedItemIds.includes(item.id),
        equipped: selectedItemId(profile, slot) === item.id,
      })),
  }));
}

export interface InventoryPreview {
  updateProfile(profile: CharacterProfile): void;
  rotate(radians: number): void;
  dispose(): void;
}

export interface InventoryPanelOptions {
  readonly root: HTMLElement;
  readonly toggleButton: HTMLButtonElement;
  readonly profile: CharacterProfile;
  readonly onApply: (itemIds: readonly string[]) => boolean;
  readonly createPreview: (canvas: HTMLCanvasElement, profile: CharacterProfile) => InventoryPreview;
  readonly onOpenChange: (open: boolean) => void;
}

export class InventoryPanel {
  private profile: CharacterProfile;
  private draft: CharacterProfile;
  private open = false;
  private filter: EquipmentSlot | "all" = "all";
  private selectedId: string;
  private preview: InventoryPreview | null = null;
  private previousFocus: HTMLElement | null = null;

  public constructor(private readonly options: InventoryPanelOptions) {
    this.profile = options.profile;
    this.draft = options.profile;
    this.selectedId = options.profile.equipped.weapon ?? "weapon.training-sword";
  }

  public start(): void {
    this.options.root.addEventListener("click", this.handleClick);
    this.options.toggleButton.addEventListener("click", this.handleToggleClick);
    window.addEventListener("keydown", this.handleKeyDown);
    this.applyOpenState();
  }

  public updateProfile(profile: CharacterProfile): void {
    this.profile = profile;
    this.draft = profile;
    if (this.open) this.refresh();
  }

  public isOpen(): boolean { return this.open; }

  public setOpen(open: boolean): void {
    if (this.open === open) return;
    this.open = open;
    this.draft = this.profile;
    this.applyOpenState();
    if (open) {
      this.selectedId = this.profile.equipped.weapon ?? "weapon.training-sword";
      this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.filter = "all";
      this.renderShell();
      const canvas = this.options.root.querySelector<HTMLCanvasElement>("canvas");
      if (canvas) this.preview = this.options.createPreview(canvas, this.draft);
      this.options.root.querySelector<HTMLButtonElement>(".inventory-close")?.focus();
    } else {
      this.preview?.dispose();
      this.preview = null;
      this.options.root.replaceChildren();
      const focus = this.previousFocus?.isConnected ? this.previousFocus : this.options.toggleButton;
      focus.focus();
    }
    this.options.onOpenChange(open);
  }

  public dispose(): void {
    this.preview?.dispose();
    this.preview = null;
    this.options.root.removeEventListener("click", this.handleClick);
    this.options.toggleButton.removeEventListener("click", this.handleToggleClick);
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  private changedSlots(): EquipmentSlot[] {
    return EQUIPMENT_SLOTS.filter(slot => this.draft.equipped[slot] !== this.profile.equipped[slot]);
  }

  private renderShell(): void {
    this.options.root.innerHTML = `
      <div class="inventory-backdrop" data-inventory-close></div>
      <section class="inventory-panel" role="dialog" aria-modal="true" aria-labelledby="inventory-title" aria-describedby="inventory-instructions">
        <header class="inventory-header">
          <div class="inventory-heading">${itemArt("bag")}<div><p>장비 관리</p><h2 id="inventory-title">장비 · 인벤토리</h2></div></div>
          <button class="inventory-close" type="button" data-inventory-close aria-label="인벤토리 닫기">×</button>
        </header>
        <div class="inventory-body">
          <section class="inventory-character" aria-label="캐릭터 착장 미리보기">
            <div class="inventory-character-heading"><strong class="inventory-character-name"></strong><span>${CLASS_CATALOG[this.profile.classId].label}</span></div>
            <div class="inventory-stage">
              <canvas class="inventory-preview" aria-label="선택한 장비의 3D 캐릭터 미리보기"></canvas>
              <span class="preview-state"></span>
              <div class="preview-rotation"><button type="button" data-rotate="-1" aria-label="캐릭터 왼쪽 회전">↶</button><span>캐릭터 회전</span><button type="button" data-rotate="1" aria-label="캐릭터 오른쪽 회전">↷</button></div>
            </div>
            <div class="inventory-equipment" aria-label="미리보기 장비"></div>
          </section>
          <section class="inventory-bag" aria-label="소지품">
            <div class="inventory-bag-heading"><h3>소지품</h3><span>${this.profile.ownedItemIds.filter(id => !id.endsWith(".none")).length}개 보유</span></div>
            <nav class="inventory-filters" aria-label="아이템 종류">
              ${(["all", ...EQUIPMENT_SLOTS] as const).map(slot => `<button type="button" data-filter="${slot}" aria-pressed="${slot === this.filter}">${slot === "all" ? "전체" : SLOT_LABELS[slot]}</button>`).join("")}
            </nav>
            <p id="inventory-instructions">아이템을 선택해 입어보고, 변경 적용으로 확정하세요.</p>
            <div class="inventory-items"></div>
            <div class="inventory-detail" aria-live="polite"></div>
          </section>
        </div>
        <footer class="inventory-footer">
          <div><strong class="inventory-change-count"></strong><p class="inventory-feedback" role="status">닫으면 적용하지 않은 선택은 취소됩니다.</p></div>
          <div class="inventory-actions"><button type="button" data-reset>선택 초기화</button><button type="button" data-inventory-close>취소 · 닫기</button><button class="inventory-apply" type="button" data-apply>변경 적용</button></div>
        </footer>
      </section>`;
    this.requiredElement<HTMLElement>(".inventory-character-name").textContent = this.profile.name;
    this.refresh();
  }

  private refresh(): void {
    const root = this.options.root;
    const changed = this.changedSlots();
    const visible = buildInventorySlotViews(this.draft)
      .filter(group => this.filter === "all" || group.slot === this.filter)
      .flatMap(group => group.items.filter(item => item.owned));
    this.requiredElement(".inventory-items").innerHTML = visible.map(item => {
      const definition = getItemDefinition(item.id);
      if (!definition) return "";
      const slot = definition.slot;
      const current = selectedItemId(this.profile, slot) === item.id;
      const pending = item.equipped && !current;
      return `<button class="inventory-item${item.equipped ? " is-equipped" : ""}${pending ? " is-pending" : ""}" type="button" data-item-id="${item.id}" aria-pressed="${item.equipped}" title="${item.label} · ${SLOT_LABELS[slot]} · 클릭하여 미리보기">
        <span class="inventory-item-picture">${itemArt(item.id)}</span><strong>${item.id === "head.none" ? "모자 벗기" : item.label}</strong>
        <small>${pending ? "미리보기" : current ? "장착 중" : SLOT_LABELS[slot]}</small>
      </button>`;
    }).join("");
    this.requiredElement(".inventory-equipment").innerHTML = EQUIPMENT_SLOTS.map(slot => {
      const id = selectedItemId(this.draft, slot);
      const hiddenAccessory = slot === "accessory" && getWeaponKind(this.draft.equipped.weapon) === "bow" && (id === "accessory.kite-shield" || id === "accessory.harbor-lantern");
      return `<button type="button" class="equipment-slot${changed.includes(slot) ? " is-pending" : ""}" data-filter="${slot}">${itemArt(id)}<span><small>${SLOT_LABELS[slot]}${hiddenAccessory ? " · 활 사용 중 숨김" : changed.includes(slot) ? " · 변경 예정" : " · 장착 중"}</small><strong>${getItemDefinition(id)?.label ?? "없음"}</strong></span></button>`;
    }).join("");
    root.querySelectorAll<HTMLElement>(".inventory-filters [data-filter]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === this.filter)));
    this.requiredElement(".preview-state").textContent = changed.length ? "착장 미리보기 · 아직 적용되지 않음" : "현재 장착 모습";
    this.requiredElement(".inventory-change-count").textContent = changed.length ? `${changed.length}개 부위 변경 예정` : "변경할 장비를 선택하세요";
    this.requiredElement<HTMLButtonElement>("[data-apply]").disabled = !changed.length;
    this.requiredElement<HTMLButtonElement>("[data-reset]").disabled = !changed.length;
    const item = getItemDefinition(this.selectedId);
    if (!item) return;
    const current = getItemDefinition(selectedItemId(this.profile, item.slot));
    this.requiredElement(".inventory-detail").innerHTML = `${itemArt(item.id)}<div><small>${SLOT_LABELS[item.slot]} · 보유 장비</small><h3>${item.id === "head.none" ? "모자 벗기" : item.label}</h3><p>${item.description ?? "선택한 외형은 왼쪽 캐릭터에서 확인하세요."}</p><span>현재 장착: ${current?.label ?? "없음"}</span></div>`;
    const stage = this.requiredElement<HTMLElement>(".inventory-stage");
    for (const slot of EQUIPMENT_SLOTS) stage.dataset[slot] = this.draft.equipped[slot] ?? "";
    this.preview?.updateProfile(this.draft);
  }

  private requiredElement<T extends Element = HTMLElement>(selector: string): T {
    const element = this.options.root.querySelector<T>(selector);
    if (!element) throw new Error(`Inventory element is missing: ${selector}`);
    return element;
  }

  private applyOpenState(): void {
    this.options.root.hidden = !this.open;
    this.options.root.setAttribute("aria-hidden", String(!this.open));
    this.options.toggleButton.setAttribute("aria-expanded", String(this.open));
  }

  private readonly handleToggleClick = (): void => { this.setOpen(!this.open); };

  private readonly handleClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const target = event.target;
    if (target.closest("[data-inventory-close]")) { this.setOpen(false); return; }
    const rotate = target.closest<HTMLElement>("[data-rotate]");
    if (rotate) { this.preview?.rotate(Number(rotate.dataset.rotate) * Math.PI / 4); return; }
    const filter = target.closest<HTMLElement>("[data-filter]")?.dataset.filter;
    if (filter === "all" || EQUIPMENT_SLOTS.some(slot => slot === filter)) {
      this.filter = filter as EquipmentSlot | "all";
      this.refresh();
      this.options.root.querySelector<HTMLButtonElement>(`.inventory-filters [data-filter="${filter}"]`)?.focus();
      return;
    }
    if (target.closest("[data-reset]")) {
      this.draft = this.profile;
      this.refresh();
      return;
    }
    if (target.closest("[data-apply]") && this.changedSlots().length) {
      const ids = this.changedSlots().map(slot => selectedItemId(this.draft, slot));
      const success = this.options.onApply(ids);
      if (success) { this.profile = this.draft; this.refresh(); }
      this.requiredElement(".inventory-feedback").textContent = success
        ? "장비 변경을 적용하고 저장했습니다."
        : "저장하지 못했습니다. 선택은 유지됩니다. 다시 적용해 주세요.";
      return;
    }
    const itemId = target.closest<HTMLElement>("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    const result = equipOwnedItem(this.draft, itemId);
    if (!result.ok) return;
    this.draft = result.profile;
    this.selectedId = itemId;
    this.refresh();
    this.requiredElement(".inventory-feedback").textContent = "닫으면 적용하지 않은 선택은 취소됩니다.";
    this.options.root.querySelector<HTMLButtonElement>(`[data-item-id="${itemId}"]`)?.focus();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!isGameKey(event)) return;
    if (event.code === "KeyI" && !event.repeat) {
      event.preventDefault();
      this.setOpen(!this.open);
    } else if (event.code === "Escape" && this.open) {
      event.preventDefault();
      this.setOpen(false);
    } else if (event.key === "Tab" && this.open) {
      const buttons = Array.from(this.options.root.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const first = buttons[0];
      const last = buttons.at(-1);
      if (!buttons.some(button => button === document.activeElement)) { event.preventDefault(); first?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };
}
