type ThemeId = "ms.vss-web.vsts-theme" | "ms.vss-web.vsts-theme-dark";

type Theme = {
  id: ThemeId;
};

type Slot = {
  time: string;
  theme: ThemeId;
};

type ChannelMessage = ChannelMessageComplete | ChannelMessageApplyTheme;

type ChannelMessageComplete = {
  channel: string;
  action: "complete";
};

type ChannelMessageApplyTheme = {
  channel: string;
  action: "applyTheme";
  theme: ThemeId;
};

interface Window {
  require(context: "VSS/Platform/Context"): VssContext;
}

type VssContext = {
  Services: VssServicesObserver;
  VssService: typeof VssService;
};

type VssServicesObserver = {
  add(
    serviceName: string,
    configuration: { options: number; serviceFactory: typeof VssService }
  ): void;

  notify(
    configuration: { key: string; value: { options: number } },
    action: string
  ): void;
};

declare class VssService {
  pageContext: VssPageContext;
}

type VssPageContext = {
  getService(serviceName: "IVssContributionService"): VssContributionService;
  getService(serviceName: "ITfsThemeService"): TfsThemeService;
  getService(serviceName: "IVssThemeService"): VssThemeService;
};

type VssContributionService = {
  executeCommandEx(
    command: "ITfsThemeService.getThemes",
    options: VssCommandOptions
  ): Promise<Theme[]>;

  executeCommandEx(
    command: "ITfsThemeService.getCurrentThemeId",
    options: VssCommandOptions
  ): ThemeId;
};

type VssCommandOptions = {
  dependencies: string[];
  serviceName: string;
  methodName: string;
};

type TfsThemeService = {
  setTheme(theme: Theme): void;
};

type VssThemeService = {
  applyTheme(theme: Theme): void;
};
