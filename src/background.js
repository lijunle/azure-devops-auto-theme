// @ts-check

/** @type {Slot[]} */
const defaultSlots = [
  { time: "06:00", theme: "ms.vss-web.vsts-theme" },
  { time: "18:00", theme: "ms.vss-web.vsts-theme-dark" },
];

/** @type {Slot[]} */
let slots = [];

chrome.runtime.onInstalled.addListener(initialize);

chrome.runtime.onStartup.addListener(initialize);

chrome.alarms.onAlarm.addListener(setupThemeAndTimer);

chrome.storage.onChanged.addListener(async (changes) => {
  const newSlots = changes["slots"]?.newValue;
  if (newSlots) {
    slots = newSlots;
    await setupThemeAndTimer();
  }
});

/**
 * Initialize the extension.
 * @returns {Promise<void>} The promise to initialized.
 */
async function initialize() {
  slots = await retrieveSlotsOrSetDefault();
  await injectContentScript();
  await setupThemeAndTimer();
}

/**
 * Retrieve the slots from chrome extension storage.
 * If not exist, set it as default slots.
 * @returns {Promise<Slot[]>} The promise resolved with slots.
 */
function retrieveSlotsOrSetDefault() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["slots"], (results) => {
      /** @type {Slot[]} */
      const resultsSlots = results.slots;
      if (!resultsSlots) {
        chrome.storage.sync.set({ slots: defaultSlots });
        resolve(defaultSlots);
      } else {
        resolve(resultsSlots);
      }
    });
  });
}

/**
 * Get the tabs with Visual Studio pages.
 * @returns {Promise<chrome.tabs.Tab[]>} The promise resolved with tabs.
 */
function getVisualStudioTabs() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: "https://*.visualstudio.com/*" }, resolve);
  });
}

/**
 * Inject content script to the visual studio tabs.
 * @returns {Promise<void>} The promise to execution completed.
 */
async function injectContentScript() {
  // There are two situations to inject the content script.
  // 1. There are existing Visual Studio pages when install/start extension,
  //    the content script is injected programmatically here.
  // 2. After install/start, a new Visual Studio page is created,
  //    the content script is injected declaratively in manifest.
  const tabs = await getVisualStudioTabs();
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.executeScript(tab.id, {
        file: "/src/content.js",
      });
    }
  }
}

/**
 * Setup the current theme and chrome timer.
 * @returns {Promise<void>} The promise to theme and timer setup.
 */
async function setupThemeAndTimer() {
  const [currentSlot, nextSlot] = getTargetSlot();

  const tabs = await getVisualStudioTabs();
  for (const tab of tabs) {
    if (tab.id) {
      /** @type {Omit<ChannelMessageApplyTheme, "channel">} */
      const message = {
        action: "applyTheme",
        theme: currentSlot.theme,
      };
      chrome.tabs.sendMessage(tab.id, message);
    }
  }

  const nextTime = parseSlotTime(nextSlot);
  chrome.alarms.clearAll();
  chrome.alarms.create({ when: nextTime.getTime() - Date.now() });
}

/**
 * Get the current target slot and next slot based on the time and slots.
 * @returns {[Slot, Slot]} The targeted slot and next slot.
 */
function getTargetSlot() {
  const currentTime = new Date();

  let index = 0;
  while (parseSlotTime(slots[index]) <= currentTime) {
    index++;
  }

  const targetIndex = index === 0 ? slots.length - 1 : index - 1;
  return [slots[targetIndex], slots[index]];
}

/**
 * Parse the time of a slot to today time.
 * @param {Slot} slot The slot.
 * @returns {Date} The parsed time.
 */
function parseSlotTime(slot) {
  const parts = slot.time.split(":");
  const time = new Date();
  time.setHours(Number(parts[0]));
  time.setMinutes(Number(parts[1]));
  time.setSeconds(0);
  time.setMilliseconds(0);
  return time;
}
