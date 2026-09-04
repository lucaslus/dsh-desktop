# desktop/ — 原生 macOS 壳（MVP）

[English](README.md) | 中文

桌面端方向验证原型：用一个原生 AppKit 窗口（`WKWebView`）套住现有 Web 宿主，即“薄原生壳 + `dsh web` 子进程”方案，不改任何协议；架构预留的 [IPC carrier](../../.agents/notes/implemented/architecture/2026-07-19-gui-layering-and-rpc-protocol.zh.md) 仍是下一步。

壳**不在 `DSH.app` 内捆绑 Node 运行时**：安装器会优先复用现有的 Node.js 24.15.0；否则把已校验的归档下载到 `apps/desktop/.runtime/node`。Finder 与 Dock 启动时优先使用这份受管理的运行时，其次才查找满足 `^22.19.0 || >=24.0.0` 的用户 Node。

## 行为

关闭窗口（包括 `⌘W`）会保留应用和本地宿主。点击 Dock 图标可重新打开保留的窗口及 Web 视图。**Quit** 或 `⌘Q` 才会退出应用并停止宿主。

1. 定位仓库根（`DSH_REPO` 环境变量优先，否则按仓库内构建位置推导）。
2. 优先使用安装器管理的 Node 运行时；然后依次从环境 PATH、登录 shell 的 PATH（覆盖 Homebrew/nvm）和常见前缀找 Node；版本不符弹窗提示安装。
3. 优先拉起仓库内已构建的宿主；找不到仓库时使用用户已安装的 `dsh` 命令。
4. 等待 `dsh web: http://127.0.0.1:<port>` 就绪行（该行只在整棵插件树挂载完成后打印），然后在 `WKWebView` 中加载。
5. 将 Web 主题同步到原生窗口（`ThemeBridge`）：透明标题栏使用侧边栏填充色，窗口外观跟随当前深浅主题，使左侧看起来是连续的界面。
6. 在透明标题栏上覆盖原生交互条，用于拖动窗口并执行系统配置的双击动作（默认缩放）。
7. 源码仓库可通过 **Update and Restart…** 自更新：`git pull --ff-only`、安装依赖、构建 Web、重打包应用并重启。

## 构建运行

```sh
git clone https://github.com/lucaslus/deepseek-harness-desktop.git
cd deepseek-harness-desktop
bash apps/desktop/install.sh
```

安装器使用的基线是 **Node.js 24.15.0** 与 **pnpm 11.7.0**。若现有的精确 Node 运行时包含 Corepack，`install.sh` 会直接复用它；否则会校验官方 Node.js 校验和，再将受管理的运行时下载到 `apps/desktop/.runtime`。终端仅展示带动画的高层阶段；每条命令的完整输出都会写到 `~/Library/Logs/DeepSeek Harness Desktop/`，失败时会提示日志路径。之后通过 Corepack 使用锁定版本的 pnpm，完成依赖安装、构建和应用启动。它还会询问是否在 `/Applications/DeepSeek Harness.app` 创建可被 Finder 识别的副本。这个副本只含很小的原生壳，并记录其源码 checkout；每次应用更新都会重新构建并刷新它。应用为 ad-hoc 签名并包含 `Resources/icon.icns`，不发布内置运行时或 Node 的二进制包。宿主仅监听环回地址。

## 已知 MVP 限制

- Web 内容延伸到透明且跟随主题的标题栏下方；原生标题栏区域负责窗口拖动和双击，尚无 vibrancy。
- 更新需要干净、可访问 `origin` 的 Git 仓库；遇到冲突或未提交改动会提示失败，不会覆盖本地代码。
- 宿主崩溃只显示重试界面，不自动重启。
- 仅 macOS；Windows/Linux 壳是另外的工程。
