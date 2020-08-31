// The inject script runs in the context of the web page.
// Wrap it inside IIFE to avoid variable pollution to the web page.
(function () {
  const channel = window.document.body.getAttribute("data-auto-theme-channel");

  function getService() {
    return new Promise((resolve) => {
      // The VSS context will not initialize service again if name exists.
      // Append channel to the service name to make sure we could resolve
      // the service on each new injection (e.g., extension updated).
      const context = window.require("VSS/Platform/Context");
      const serviceName = `AzureDevOpsAutoThemeService-${channel}`;
      context.Services.add(serviceName, {
        options: 1,
        serviceFactory: class extends context.VssService {
          constructor() {
            super();

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
  }

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

  async function applyTheme(service, theme) {
    const currentThemeId = await service.pageContext
      .getService("IVssContributionService")
      .executeCommandEx("ITfsThemeService.getCurrentThemeId", {
        dependencies: ["ms.vss-tfs-web.theme-management-content"],
        serviceName: "ITfsThemeService",
        methodName: "getCurrentThemeId",
      });

    if (currentThemeId !== theme.id) {
      // Apply the theme and save it.
      service.pageContext.getService("ITfsThemeService").setTheme(theme);

      // Apply the theme but not save it.
      // service.pageContext.getService("IVssThemeService").applyTheme(theme);
    }
  }

  window.addEventListener("message", async ({ data: message }) => {
    try {
      if (message.channel === channel && message.action === "applyTheme") {
        const themeId = message.theme;
        const service = await getService();
        const themes = await getThemes(service);
        const theme = themes.filter((x) => x.id === themeId)[0];
        await applyTheme(service, theme);
      }
    } catch (error) {
      console.debug(error);
    }
  });

  // Tell content script it is ready to receive the delegated messages.
  window.postMessage({ channel, action: "complete" }, "*");
})();