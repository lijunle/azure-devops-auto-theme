// @ts-check

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

injectScript(chrome.extension.getURL("/src/inject.js"));
