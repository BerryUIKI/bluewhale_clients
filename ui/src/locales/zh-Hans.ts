import type { Messages } from "./en";

export const zhHans: Messages = {
  shell: {
    navigation: "主导航",
    skipToContent: "跳到主要内容",
    home: "概览",
    settings: "设置",
    localFirst: "本地优先，账本只保存在这台设备上。",
  },
  home: {
    title: "概览",
    subtitle: "一览你的账本。",
    runtimeTitle: "桌面运行时",
    runtimeLoading: "正在检查桌面运行时…",
    runtimeUnavailableHint: "请通过 pnpm dev 或已安装的应用打开，以连接桌面运行时。",
    version: "版本",
    platform: "平台",
    emptyTitle: "还没有账本",
    emptyBody: "设置账本后，概览会显示在这里。",
  },
  settings: {
    title: "设置",
    language: "语言",
    languageDescription: "选择界面语言。",
    appearance: "外观",
    appearanceDescription: "跟随系统主题或手动选择。",
    appearanceSystem: "跟随系统",
    appearanceLight: "浅色",
    appearanceDark: "深色",
    about: "关于",
    aboutName: "应用",
    aboutVersion: "版本",
    aboutLoading: "正在读取应用信息…",
  },
  errors: {
    conflict: "更改与当前状态冲突。",
    forbidden: "不允许执行此操作。",
    internal: "出现问题，请重试。",
    invalid_request: "请求无效。",
    not_found: "请求的内容不存在。",
    unavailable: "桌面运行时不可用。",
  },
  notFound: {
    title: "页面不存在",
    body: "你访问的页面不存在。",
    backHome: "返回概览",
  },
  errorBoundary: {
    title: "界面意外停止",
    body: "重新加载窗口即可继续，数据不受影响。",
    reload: "重新加载",
  },
};
