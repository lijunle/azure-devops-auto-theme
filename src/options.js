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

/** @type {HTMLDivElement} */
const slotControls = validate(document.querySelector("#slot-controls"));

/** @type {HTMLTemplateElement} */
const template = validate(document.querySelector("#slot-control-template"));

/** @type {HTMLInputElement} */
const saveButton = validate(document.querySelector('input[type="submit"]'));

/** @type {HTMLFormElement} */
const form = validate(document.querySelector("#form"));

/**
 * Show the slots in the options page.
 * @param {Slot[]} slots The slots.
 */
function showSlots(slots) {
  slotControls.innerHTML = "";
  saveButton.disabled = true;

  for (const slot of slots) {
    const control = toElement(template.content.cloneNode(true));

    getTimeInput(control).value = slot.time;
    getThemeSelector(control).value = slot.theme;

    slotControls.appendChild(control);
  }
}

form.addEventListener("change", () => {
  saveButton.disabled = false;
});
form.addEventListener("submit", (event) => {
  event.preventDefault();

  /** @type {Slot[]} */
  const slots = [];
  const slotControls = document.querySelectorAll(".slot-control");
  for (const control of slotControls) {
    const time = getTimeInput(control).value;
    const theme = toThemeId(getThemeSelector(control).value);
    slots.push({ time, theme });
  }

  chrome.storage.sync.set({ slots }, () => {
    saveButton.disabled = true;
  });
});

/**
 * Get the time input from the slot control
 * @param {Element} slotControl The slot control.
 * @returns {HTMLInputElement} The time input element.
 */
function getTimeInput(slotControl) {
  /** @type {HTMLInputElement} */
  const timeInput = validate(slotControl.querySelector('input[type="time"]'));
  return timeInput;
}

/**
 * Get the theme selector from the slot control
 * @param {Element} slotControl The slot control.
 * @returns {HTMLSelectElement} The theme selector element.
 */
function getThemeSelector(slotControl) {
  /** @type {HTMLSelectElement} */
  const themeSelector = validate(slotControl.querySelector("select"));
  return themeSelector;
}

/**
 * Convert the value to theme ID.
 * @param {string} value The value.
 * @returns {ThemeId} The theme ID.
 */
function toThemeId(value) {
  // @ts-expect-error Type casting the value to theme ID.
  return value;
}

/**
 * Type cast the node to an element.
 * @param {Node} element The node.
 * @returns {Element} The element.
 */
function toElement(element) {
  // @ts-expect-error Type casting to element.
  return element;
}

/**
 * Validate the value is not null.
 * @template T
 * @param {null | T} value The value.
 * @returns {T} The value after validated.
 */
function validate(value) {
  if (value) {
    return value;
  } else {
    throw new Error("The value is null");
  }
}
