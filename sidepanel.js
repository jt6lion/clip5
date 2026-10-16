// Clip5 - sidepanel.js

const SLOT_COUNT = 5;
const STORAGE_KEY = "clip5_slots";

async function loadSlots() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || new Array(SLOT_COUNT).fill("");
}

async function clearSlot(index) {
  const slots = await loadSlots();
  slots[index] = "";
  await chrome.storage.local.set({ [STORAGE_KEY]: slots });
}

// 一時的にボタンの文字を変えて、押したことを知らせる
function flashLabel(button, label) {
  const original = button.textContent;
  button.textContent = label;
  setTimeout(() => (button.textContent = original), 1000);
}

function createButton(label, disabled, onClick) {
  const button = document.createElement("button");
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener("click", () => onClick(button));
  return button;
}

async function render() {
  const slots = await loadSlots();
  const list = document.getElementById("slots");
  list.replaceChildren();

  for (let i = 0; i < SLOT_COUNT; i++) {
    const text = slots[i] || "";

    const num = document.createElement("span");
    num.className = "num";
    num.textContent = `[${i + 1}]`;

    const preview = document.createElement("span");
    preview.className = text ? "text" : "text empty";
    preview.textContent = text ? text.replace(/\s+/g, " ") : "（空）";
    preview.title = text;

    const copyButton = createButton("コピー", !text, async (button) => {
      try {
        await navigator.clipboard.writeText(text);
        flashLabel(button, "コピー済");
      } catch {
        flashLabel(button, "失敗");
      }
    });

    const clearButton = createButton("消去", !text, () => clearSlot(i));

    const item = document.createElement("li");
    item.append(num, preview, copyButton, clearButton);
    list.append(item);
  }
}

// 別のタブで保存されたときも表示を更新する
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) render();
});

render();
