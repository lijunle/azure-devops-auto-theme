/**
 * Inject the script into page.
 * @param {string} file The script file to inject.
 */
function injectScript(file) {
  var script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute("src", file);
  document.body.appendChild(script);
}

// The channel is used to make sure messages are delegated to the correct
// inject script after extension reloads or updates. The channel in inject
// script query string is not necessary but helpful on debugging.
const channel = Math.random().toString().substr(2, 6);
window.document.body.setAttribute("data-auto-theme-channel", channel);
injectScript(chrome.extension.getURL(`/src/inject.js?channel=${channel}`));

let resolve = () => {};
/** @type {Promise<void>} */
const completed = new Promise((x) => (resolve = x));
window.addEventListener("message", function callback(event) {
  /** @type {ChannelMessage} */
  const message = event.data;
  if (message.channel === channel && message.action === "complete") {
    window.removeEventListener("message", callback);
    resolve();
  }
});

chrome.runtime.onMessage.addListener((
  /** @type {Omit<ChannelMessage, "channel">} */ message
) => {
  completed.then(() => {
    // We need to wait on inject script completed to delegate the message.
    window.postMessage({ channel, ...message }, "*");
  });
});
