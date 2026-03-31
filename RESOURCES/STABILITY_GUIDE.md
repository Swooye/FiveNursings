# 五养教练项目：代码稳定性与 CI/CD 规范指南

本指南旨在总结项目中遇到的重大交互 Bug 和构建故障，并确立开发规范。

---

## 1. React 状态管理与副作用解耦

### 陷阱回顾
在 `AIChat.tsx` 中，之前曾将 `generateResponse`（异步 AI 会话请求）直接放入了 `setMessages(prev => { ... })` 的函数式更新闭包内。由于 React 18 的 **Strict Mode** 在开发环境下会触发两次状态更新，导致 AI 也会被错误地唤起两次，甚至引发死循环。

### 开发规范
- **禁止在 `setState` 闭包内执行异步或有副作用的操作**。
- 状态更新应当是**纯函数**。
- **推荐模式**：先计算出新状态并更新 UI，然后在状态变更后的副作用流程中（或异步函数的后续流中）触发 AI 响应。

```tsx
// 推荐做法
let nextMsgs: ChatMessage[] = [];
setMessages(prev => {
    nextMsgs = [...prev, userMsg]; // 这里的逻辑应当纯粹
    return nextMsgs;
});

// 在外部执行副作用
generateResponse(promptMsg, nextMsgs);
```

---

## 2. 原子化 UI 更新（防止竞态）

### 陷阱回顾
当“位置共享消息”与“AI 自动回复”同时异步更新状态时，如果处理不当，会导致消息气泡重叠、闪烁或直接消失。

### 开发规范
- 对于需要先确认服务器响应再更新 UI 的流程，使用**占位符（LoadingMsg）**。
- 在成功回调中，通过对象引用（如 `m === loadingMsg`）精准替换占位符。
- 确保一次成功的交互逻辑产生的状态转变是**原子化**的。

---

## 3. npm Workspaces 下的 Lockfile 管理

### 陷阱回顾
子目录（如 `functions/`）在 Workspace 模式下运行 `npm install` 默认会更新根目录的锁定文件，而非子目录内的。然而 Firebase Cloud Build 部署时需要通过子目录内的 `package-lock.json` 来执行 `npm ci`。如果子目录的锁定文件缺失或过旧，会导致云端缺少如 `jest`、`babel` 等关键构建依赖。

### 开发规范
- **原则上避免在子目录维护锁定文件**。
- 如果存在部署兼容性问题，应删除 `functions/package-lock.json`，让云端部署流程回退到 `npm install` 动态安装或优先读取根目录 Workspace 的全局锁定文件。
- **必须**在 GitHub Actions 脚本中显式设置 `setup-node@v4` 为 **Node 20**，以保证 `fetch` 类型和运行时的统一。

---

## 4. 全局干预提醒（Visibility Logic）

### 规范
- 健康干预（`type: 'intervention'`）属于全局消息，由 OpenClaw 或系统任务发起。
- 后端查询接口（`/api/messages/:userId`）应当在按 `sessionId` 过滤时，**强制混入**该用户名下所有的干预类消息，确保多会话场景下提醒不丢失。

---

> [!TIP]
> 遵守以上规范将极大减少竞态带来的神秘 Bug，并保证 CI/CD 流程在环境变更时的健壮性。
