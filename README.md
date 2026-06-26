# 日麻单人机器人对战

一个无需后端的日麻单人 Web 小游戏：玩家与 3 名机器人进行东风战，支持摸牌、切牌、立直、自摸、荣和与流局。

> 这是轻量娱乐版 MVP，不完整模拟日麻全部役种、番符、宝牌、鸣牌、场风、自风、立直棒与本场计分。

## 功能

- 单人对战 3 个机器人
- 基础日麻牌山：万、筒、索、字牌，共 136 张
- 基础和牌判断：4 组面子 + 1 对将，或七对子
- 机器人自动摸切与简易弃牌策略
- 简化计分与东风战结果展示
- 纯静态页面，可直接用 GitHub Pages 部署

## 本地运行

直接打开 `index.html`，或使用任意静态服务器：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。

## GitHub Actions 部署

仓库内置 `.github/workflows/deploy.yml`。推送到 `main` 后，Actions 会将静态文件部署到 GitHub Pages。

首次使用时请在仓库 Settings 中确认 Pages 使用 GitHub Actions 作为 Source。
