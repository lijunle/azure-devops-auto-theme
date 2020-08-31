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

chrome.storage.onChanged.addListener(async (changes) => {
  if (changes["slots"] && changes["slots"].newValue) {
    slots = changes["slots"].newValue;
    await switchTheme();
  }
});

/**
 * Initialize the extension.
 * @returns {Promise<void>} The promise to initialized.
 */
async function initialize() {
  slots = await retrieveSlotsOrSetDefault();
  await injectContentScript();
  await switchTheme();
  setInterval(switchTheme, 60 * 1000);
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
 * Send messages to switch theme on all Visual Studio tabs.
 * @returns {Promise<void>} The promise to messages sent.
 */
async function switchTheme() {
  const theme = getTheme();
  const tabs = await getVisualStudioTabs();
  for (const tab of tabs) {
    if (tab.id) {
      /** @type {Omit<ChannelMessageApplyTheme, "channel">} */
      const message = {
        action: "applyTheme",
        theme,
      };
      chrome.tabs.sendMessage(tab.id, message);
    }
  }
}

/**
 * Get the target theme based on the current time and slots.
 * @returns {ThemeId} The target theme.
 */
function getTheme() {
  const date = new Date();
  const currentTime = { hour: date.getHours(), minute: date.getMinutes() };

  let index = 0;
  while (index < slots.length) {
    const parts = slots[index].time.split(":");
    const slotTime = { hour: Number(parts[0]), minute: Number(parts[1]) };
    if (
      slotTime.hour < currentTime.hour ||
      (slotTime.hour === currentTime.hour &&
        slotTime.minute <= currentTime.minute)
    ) {
      index++;
    } else {
      break;
    }
  }

  index = index === 0 ? slots.length - 1 : index - 1;
  return slots[index].theme;
}
