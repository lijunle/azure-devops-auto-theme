chrome.storage.sync.get(["slots"], (results) => {
  /** @type {Slot[]} */
  const slots = results.slots;
  showSlots(slots);
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes["slots"] && changes["slots"].newValue) {
    showSlots(changes["slots"].newValue);
  }
});

/** @type {null | HTMLDivElement} */
const slotControls = document.querySelector("#slot-controls");

/** @type {null | HTMLTemplateElement} */
const slotControlTemplate = document.querySelector("#slot-control-template");

/** @type {null | HTMLInputElement} */
const saveButton = document.querySelector('input[type="submit"]');

/**
 * Show the slots in the options page.
 * @param {Slot[]} slots The slots.
 */
function showSlots(slots) {
  if (!slotControls || !slotControlTemplate || !saveButton) {
    return;
  }

  slotControls.innerHTML = "";
  saveButton.disabled = true;

  for (const slot of slots) {
    /** @type {HTMLDivElement} */
    // @ts-ignore
    const control = slotControlTemplate.content.cloneNode(true);

    /** @type {null | HTMLInputElement} */
    const timeInput = control.querySelector('input[type="time"]');
    if (timeInput) {
      timeInput.value = slot.time;
    }

    /** @type {null | HTMLSelectElement} */
    const themeSelector = control.querySelector("select");
    if (themeSelector) {
      themeSelector.value = slot.theme;
    }

    slotControls.appendChild(control);
  }
}

/** @type {null | HTMLFormElement} */
const form = document.querySelector("#form");
form?.addEventListener("change", () => {
  if (saveButton) {
    saveButton.disabled = false;
  }
});
form?.addEventListener("submit", (event) => {
  event.preventDefault();

  /** @type {Slot[]} */
  const slots = [];
  const slotControls = document.querySelectorAll(".slot-control");
  for (const control of slotControls) {
    /** @type {null | HTMLInputElement} */
    const timeInput = control.querySelector('input[type="time"]');
    /** @type {null | HTMLSelectElement} */
    const themeSelector = control.querySelector("select");
    if (timeInput && themeSelector) {
      const time = timeInput.value;
      /** @type {ThemeId} */
      // @ts-ignore
      const theme = themeSelector.value;
      slots.push({ time, theme });
    }
  }

  chrome.storage.sync.set({ slots }, () => {
    if (saveButton) {
      saveButton.disabled = true;
    }
  });
});
