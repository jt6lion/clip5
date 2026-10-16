// Clip5 - content.js

const SLOT_COUNT = 5;
const STORAGE_KEY = "clip5_slots";

// いま選択されているテキストを取得する
function getSelectedText() {
  const el = getFocusedElement();

  // 入力欄（input / textarea）の中で選択している場合
  if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (typeof start === "number" && start !== end) {
      return el.value.slice(start, end);
    }
  }

  // ページ本文で選択している場合
  return window.getSelection().toString();
}

// 保存済みの全スロットを読み込む
async function loadSlots() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || new Array(SLOT_COUNT).fill("");
}

// 指定スロットに保存する
async function saveToSlot(index, text) {
  const slots = await loadSlots();
  slots[index] = text;
  await chrome.storage.local.set({ [STORAGE_KEY]: slots });
}

// フォーカス中の要素を取得する（Shadow DOM の中まで辿る）
function getFocusedElement() {
  let el = document.activeElement;
  while (el && el.shadowRoot && el.shadowRoot.activeElement) {
    el = el.shadowRoot.activeElement;
  }
  return el;
}

// 文字を入力できる input の type
const TEXT_INPUT_TYPES = ["text", "search", "url", "tel", "email", "password", ""];

// 文字を直接入力できる要素かどうか
function isEditable(el) {
  if (!el || el.disabled || el.readOnly) return false;
  if (el.tagName === "TEXTAREA") return true;
  if (el.tagName === "INPUT") return TEXT_INPUT_TYPES.includes(el.type);
  return el.isContentEditable;
}

// カーソル位置に文字を入れる（Cmd+Z で取り消せるように execCommand を使う）
function insertText(el, text) {
  if (document.execCommand("insertText", false, text)) return;

  // execCommand が使えない場合の予備（取り消しはできない）
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    el.setRangeText(text, el.selectionStart, el.selectionEnd, "end");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

// 指定スロットの中身を貼り付ける
async function pasteFromSlot(index) {
  const el = getFocusedElement();
  if (!isEditable(el)) return;

  const slots = await loadSlots();
  const text = slots[index];
  if (!text) {
    showToast(`スロット${index + 1}：空です`);
    return;
  }

  insertText(el, text);
}

// 画面右下に短いメッセージを表示する
function showToast(message) {
  const old = document.getElementById("clip5-toast");
  if (old) old.remove();

  const toast = document.createElement("div");
  toast.id = "clip5-toast";
  toast.textContent = message;
  toast.style.cssText = [
    "position: fixed",
    "right: 16px",
    "bottom: 16px",
    "z-index: 2147483647",
    "padding: 8px 14px",
    "background: rgba(30, 30, 30, 0.92)",
    "color: #fff",
    "font-size: 13px",
    "font-family: sans-serif",
    "border-radius: 6px",
    "pointer-events: none",
  ].join(";");

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1200);
}

// キー入力の監視
window.addEventListener(
  "keydown",
  (e) => {
    if (!e.ctrlKey || e.metaKey || e.altKey) return;

    // Ctrl+数字は環境によってキー値が変わるので e.code で判定する
    const matched = e.code.match(/^Digit([1-5])$/);
    if (!matched) return;

    const index = Number(matched[1]) - 1;

    e.preventDefault(); // ここは await より前に呼ぶ必要がある

    // 拡張機能を再読み込みすると、開いていたタブからは保存データを読めなくなる
    if (!chrome.runtime?.id) {
      showToast("Clip5：ページを再読み込みしてください");
      return;
    }

    // 貼り付け：Ctrl + 数字
    if (!e.shiftKey) {
      pasteFromSlot(index);
      return;
    }

    // 保存：Ctrl + Shift + 数字
    const text = getSelectedText();
    if (!text) {
      showToast(`スロット${index + 1}：選択されていません`);
      return;
    }

    saveToSlot(index, text).then(() => {
      showToast(`スロット${index + 1}に保存しました`);
    });
  },
  true,
);
