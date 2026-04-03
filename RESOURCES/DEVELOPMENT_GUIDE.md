# 五养教练项目：开发规范与稳定性指南 (DEVELOPMENT_GUIDE)

本指南旨在确立项目的统一开发规范，总结重大 Bug 规避经验，并指导日常功能的稳健实现。

---

## 1. 命名规范 (Naming Conventions)

> [!IMPORTANT]
> **一致性高于一切**。所有新功能必须遵守以下命名规则。

### 1.1 数据库集合 (MongoDB Collections / Tables)
- **风格**：`snake_case` (全小写，下划线分隔)。
- **单复数**：必须使用**复数**形式。
- **示例**：
  - ✅ `daily_tasks`, `chat_messages`, `voice_logs`, `diary_entries`, `mall_items`
  - ❌ `dailytasks`, `ChatMessages`, `user`, `mallitem`

### 1.2 数据库字段 (MongoDB Fields / Document Keys)
- **风格**：`lowerCamelCase` (首字母小写驼峰)。
- **原因**：为了与 JavaScript 对象属性无缝对接，减少前端映射成本。
- **示例**：
  - ✅ `userId`, `isRead`, `sessionTitle`, `firebaseUid`, `suggestedTimes`
  - ❌ `user_id`, `is_read`, `SessionTitle`

### 1.3 API 接口 (RESTful API)
- **路径风格**：`kebab-case` (全小写，短横线分隔) 或保持现有习惯。
- **资源路径**：`/api` 统一前缀。
- **示例**：
  - `/api/daily-tasks` 或 `/api/daily_tasks`
  - `/api/users/:userId/full-context`

### 1.4 代码变量与类 (JS/TS)
- **变量/函数**：`lowerCamelCase` (如：`getUserInfo`)。
- **类/组件/Mongoose模型**：`UpperPascalCase` (如：`DailyTask`, `ChatMessage`)。
- **常量**：`UPPER_SNAKE_CASE` (如：`API_BASE_URL`)。

---

## 2. React 状态管理与副作用解耦

### 核心规则
- **禁止在 `setState` 闭包内执行异步操作**。
- 状态更新应当是**纯函数**。
- **推荐模式**：先计算出新状态并更新 UI，然后在异步流程中触发后续响应。

```tsx
// 推荐做法
let nextMsgs: ChatMessage[] = [];
setMessages(prev => {
    nextMsgs = [...prev, userMsg]; 
    return nextMsgs;
});

// 在外部执行异步副作用
generateResponse(promptMsg, nextMsgs);
```

---

## 3. 原子化 UI 更新（防止竞态）

- 对于异步更新流程，使用**占位符（LoadingMsg）**逻辑。
- 在成功回调中，通过引用精准替换占位符。
- 确保一次交互产生的所有状态转变是**原子化**的，防止消息重叠或闪烁。

---

## 4. 后端开发准则

- **路由匹配顺序**：在 Express 中，**精确匹配路由必须在参数路由之前**。
- **默认值处理**：Mongoose Schema 建议设置 `strict: false` 以增强开发灵活性，但生产环境字段必须明确。
- **隔离性**：严禁在 `fivenursing_pro` 进行任何侵入性测试。

---

## 5. npm Workspaces 管理

- **锁定文件**：原则上仅在根目录维护一个 `package-lock.json`。
- **部署环境**：GitHub Actions 显式使用 **Node 20**。

---

## 6. 基础设施保护与路由准则 (Infrastructure Security)

### 6.1 不可变配置文件 (Immutable Files)
> [!CAUTION]
> 除非有明确指令，否则严禁自动重写或修改以下核心基础设施文件：
> - `firebase.json` (rewrites/hosting 配置)
> - `Dockerfile` (容器构建指令)
> - `firestore.rules` & `storage.rules` (安全准则)

### 6.2 路径映射与 404 预防
- **Rewrites 准则**：Firebase Hosting 的所有 `/api/*` 请求必须通过 `rewrites` 转发至 Cloud Run 服务。
- **防止重复前缀**：修改 API 路由前，必须核对后端 Express 路径与 Hosting 转发路径。
    - *反面示例*：后端定义 `app.get('/api/users')`，Hosting 转发 `/api` 到 Backend，最终请求变成 `/api/api/users` 导致 404。
    - *正确做法*：后端仅监听 `/users`，依靠网关/Hosting 统一补充 `/api` 前缀。

### 6.3 部署授权
- 本地环境已通过 **B 账号 (资源账号)** 授权。直接调用 `cloudrun` 工具执行指令，不要尝试重新验证身份。

---

> [!TIP]
> 遵守以上规范将极大减少命名冲突和逻辑冲突带来的神秘 Bug。
