// The inject script runs in the context of the web page.
// Wrap it inside IIFE to avoid variable pollution to the web page.
(function () {
  /** @type {string} */
  const channel =
    window.document.body.getAttribute("data-auto-theme-channel") || "";

  /** @type {undefined | Promise<VssService>} */
  let servicePromise;

  /**
   * Get Visual Studio service.
   * @returns {Promise<VssService>} The promise resolved with service.
   */
  function getService() {
    if (!servicePromise) {
      servicePromise = getContext()
        .then((context) => {
        return new Promise((resolve, reject) => {
          // If the Auto Theme service cannot be initialized within 1 seconds,
          // reject the promise with failure.
          const timer = setTimeout(
            () => reject(new Error("Fail to initialize Auto Theme service")),
            1000
          );

          // The context will not initialize service again if name exists.
          // Append channel to the service name to make sure we could resolve
          // the service on each new injection (e.g., extension updated).
          const serviceName = `AzureDevOpsAutoThemeService-${channel}`;
          context.Services.add(serviceName, {
            options: 1,
            serviceFactory: class extends context.VssService {
              constructor() {
                super();

                clearTimeout(timer);

                // The service is not initialized at this moment, do not
                // access page context here.
                resolve(this);
              }
            },
          });
          context.Services.notify(
            { key: serviceName, value: { options: 4 } },
            "add"
          );
          });
        })
        .catch((error) => {
          // Reset the service promise cache to let it retry next time.
          servicePromise = undefined;
          throw error;
        });
    }

    return servicePromise;
  }

  /** @type {undefined | Promise<VssContext>} */
  let contextPromise;

  /**
   * Get the Visual Studio context.
   * @returns {Promise<VssContext>} The promise resolved with the context.
   */
  function getContext() {
    if (!contextPromise) {
      contextPromise = new Promise((resolve, reject) => {
        // If the context module cannot be loaded within 10 seconds, reject the
        // promise with time out failure.
        const timer = setTimeout(
          () => reject(new Error("Timeout to load Visual Studio context")),
          10 * 1000
        );

        // In some Azure DevOps pages, the context module is already loaded.
        // We need to use the sync require syntax to get it.
        try {
          resolve(window.require("VSS/Platform/Context"));
        } catch {}

        // But in some pages, the context module is not loaded yet.
        // We need to use the async require syntax to acquire it.
        try {
          window.require(["VSS/Platform/Context"], (context) => {
            clearTimeout(timer);
            resolve(context);
          });
        } catch {}
        }
      }).catch((error) => {
        // Reset the context promise cache to let it retry next time.
        contextPromise = undefined;
        throw error;
      });
    }

    return contextPromise;
  }

  /**
   * Get all available themes from service.
   * @param {VssService} service The Visual Studio service.
   * @returns {Promise<Theme[]>} The promise resolved with themes.
   */
  async function getThemes(service) {
    const themes = await service.pageContext
      .getService("IVssContributionService")
      .executeCommandEx("ITfsThemeService.getThemes", {
        dependencies: ["ms.vss-tfs-web.theme-management-content"],
        serviceName: "ITfsThemeService",
        methodName: "getThemes",
      });
    return themes;
  }

  /**
   * Apply the theme to the page.
   * @param {VssService} service The Visual Studio service.
   * @param {Theme} theme The target theme.
   * @returns {Promise<void>} The promise to theme applied.
   */
  async function applyTheme(service, theme) {
    // The current theme ID from backend storage.
    // If there are multiple pages in browser, some pages may show different
    // theme in page than the value from backend storage.
    const currentThemeId = await service.pageContext
      .getService("IVssContributionService")
      .executeCommandEx("ITfsThemeService.getCurrentThemeId", {
        dependencies: ["ms.vss-tfs-web.theme-management-content"],
        serviceName: "ITfsThemeService",
        methodName: "getCurrentThemeId",
      });

    if (currentThemeId !== theme.id) {
      // Apply the theme and save it to backend storage.
      service.pageContext.getService("ITfsThemeService").setTheme(theme);
    } else {
      // Apply the theme without save. It handles the case about the UI theme
      // and backend theme are inconsistent.
      service.pageContext.getService("IVssThemeService").applyTheme(theme);
    }
  }

  window.addEventListener("message", async (event) => {
    /** @type {ChannelMessage} */
    const message = event.data;
    try {
      if (message.channel === channel && message.action === "applyTheme") {
        const themeId = message.theme;
        const service = await getService();
        const themes = await getThemes(service);
        const theme = themes.filter((x) => x.id === themeId)[0];
        await applyTheme(service, theme);
      }
    } catch (error) {
      console.error("Auto Theme extension gets an error", error);
    }
  });

  // Tell content script it is ready to receive the delegated messages.
  /** @type {ChannelMessageComplete} */
  const completeMessage = { channel, action: "complete" };
  window.postMessage(completeMessage, "*");
})();
