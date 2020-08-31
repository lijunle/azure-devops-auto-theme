// @ts-check

const defaultSlots = [
  { time: "6:00", theme: "ms.vss-web.vsts-theme" },
  { time: "18:00", theme: "ms.vss-web.vsts-theme-dark" },
];

let slots = [];

chrome.runtime.onInstalled.addListener(initialize);

chrome.runtime.onStartup.addListener(initialize);

chrome.storage.onChanged.addListener((changes) => {
  if (changes["slots"]) {
    slots = changes["slots"].newValue;
  }
});

async function initialize() {
  slots = await retrieveSlotsOrSetDefault();
  await injectContentScript();
  await switchTheme();
  setInterval(switchTheme, 60 * 1000);
}

function retrieveSlotsOrSetDefault() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["slots"], (results) => {
      if (!results.slots) {
        chrome.storage.sync.set({ slots: defaultSlots });
        resolve(defaultSlots);
      } else {
        resolve(results.slots);
      }
    });
  });
}

function getVisualStudioTabs() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: "https://*.visualstudio.com/*" }, resolve);
  });
}

async function injectContentScript() {
  // There are two situations to inject the content script.
  // 1. There are existing Visual Studio pages when install/start extension,
  //    the content script is injected programmatically here.
  // 2. After install/start, a new Visual Studio page is created,
  //    the content script is injected declaratively in manifest.
  const tabs = await getVisualStudioTabs();
  for (const tab of tabs) {
    chrome.tabs.executeScript(tab.id, {
      file: "/src/content.js",
    });
  }
}

async function switchTheme() {
  const theme = getTheme();
  const tabs = await getVisualStudioTabs();
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, {
      action: "applyTheme",
      theme,
    });
  }
}

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
        slotTime.minute < currentTime.minute)
    ) {
      index++;
    } else {
      break;
    }
  }

  index = index === 0 ? slots.length - 1 : index - 1;
  return slots[index].theme;
}
