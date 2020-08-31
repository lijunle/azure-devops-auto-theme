function autoSwitchTheme(service, themeDark, themeLight) {
  const hour = new Date().getHours();
  const theme = 6 < hour && hour < 18 ? themeLight : themeDark;

  // Apply the theme and save it.
  service.pageContext.getService("ITfsThemeService").setTheme(theme);

  // Apply the theme but not save it.
  // service.pageContext.getService("IVssThemeService").setTheme(themeDark);
}

try {
  const context = window.require("VSS/Platform/Context");
  const serviceName = "AzureDevOpsAutoThemeService";
  let service;
  context.Services.add(serviceName, {
    options: 1,
    serviceFactory: class extends context.VssService {
      constructor() {
        super();
        service = this;
        // This service is not initialized yet, do not access page context here.
      }
    },
  });
  context.Services.notify({ key: serviceName, value: { options: 4 } }, "add");

  service.pageContext
    .getService("IVssContributionService")
    .executeCommandEx("auto-theme-prepare", {
      methodName: "getThemes",
      serviceName: "ITfsThemeService",
      dependencies: [
        "ms.vss-tfs-web.theme-management-content",
        "ms.vss-tfs-web.available-themes-data-provider",
      ],
    });

  service.pageContext
    .getService("IVssContributionService")
    .getDataAsync("ms.vss-tfs-web.available-themes-data-provider")
    .then((data) => {
      // console.info(data.themes);
      const themeDark = data.themes.filter((x) => x.name == "Dark")[0];
      const themeLight = data.themes.filter((x) => x.name == "Light")[0];
      autoSwitchTheme(service, themeDark, themeLight);

      setInterval(
        () => autoSwitchTheme(service, themeDark, themeLight),
        60 * 1000
      );
    });
} catch {}
