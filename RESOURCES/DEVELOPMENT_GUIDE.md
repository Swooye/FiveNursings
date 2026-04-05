# 🛡️ FiveNursings 开发与部署规范 (v1.5)

### 一、 API 通信规范
1. **禁止硬编码后缀**：所有 API 请求必须使用 `API_URL` 变量。
   - `const API_URL = import.meta.env.PROD ? "" : "http://localhost:3002";`
   - 生产环境依赖 `firebase.json` 的 `rewrites` 规则转发 `/api/**` 到 Cloud Run。
2. **去 Firebase 函数化**：新功能开发禁止使用 `httpsCallable`。统一使用 `fetch('/api/...')`，确保逻辑在 Cloud Run 中闭环。

### 二、 用户身份处理 (ID Consistency)
1. **后端强制解析**：所有涉及 `userId` 的读写接口，必须在第一步执行 `await resolveUserIds(userId)`。
2. **外部系统兼容**：针对 OpenClaw 等三方系统，接口必须支持 `Firebase UID`、`ObjectID`、`姓名` 三维一体的模糊识别。

### 三、 UI 稳定性 (Chart & Layout)
1. **图表安全保护**：所有 `ResponsiveContainer` 必须声明 `minWidth={0} minHeight={0}`。
2. **会话自动关联**：系统自动下发的消息（如干预提醒）若无 `sessionId`，必须在后端自动关联至用户最新的活跃会话，防止消息“漂流”。

### 四、 部署验证规范
1. **灰度验证路径**：由于存在 `dist` 缓存，发布后必须进行 `Cmd+Shift+R` 强制刷新验证。
2. **多项目识别**：发布前必须通过 `gcloud config get-value project` 确认当前项目 ID，防止将后端部署到旧的实验性项目中。

---

## 核心开发指南 (Core Guidelines)

### 1. 命名规范 (Naming Conventions)
> [!IMPORTANT]
> **一致性高于一切**。
- **数据库集合**：`snake_case` (复数)，如 `daily_tasks`, `chat_messages`。
- **数据库字段**：`lowerCamelCase`，如 `userId`, `isRead`。
- **API 接口**：`/api` 统一前缀，路径使用 `kebab-case`。
- **代码变量**：变量/函数 `lowerCamelCase`，类/组件/Mongoose模型 `UpperPascalCase`。

### 2. React 状态管理与副作用解耦
- **禁止在 `setState` 闭包内执行异步操作**。
- **原子化 UI 更新**：使用占位符逻辑，在成功回调中精准替换。

### 3. 后端开发准则
- **路由匹配顺序**：在 Express 中，精确匹配路由必须在参数路由之前。
- **默认值处理**：Mongoose Schema 建议设置 `strict: false`。

### 4. 基础设施保护 (Infrastructure Security)
> [!CAUTION]
> 严禁自动重写 `firebase.json`, `Dockerfile`, `firestore.rules`。
- **Rewrites 准则**：所有 `/api/*` 请求必须通过 `rewrites` 转发至 Cloud Run。
- **账号授权**：确保 `gcloud` 活跃项目为 **fivenursings-73917017-a0dfd**。
- **防止重复前缀**：修改 API 路由前，必须核对后端 Express 路径与 Hosting 转发路径。
    - *反面示例*：后端定义 `app.get('/api/users')`，Hosting 转发 `/api` 到 Backend，最终请求变成 `/api/api/users` 导致 404。
    - *正确做法*：后端仅监听 `/users`，依靠网关/Hosting 统一补充 `/api` 前缀。

---

## 7. 核心架构与部署规则 (Hybrid Architecture & Deployment)

> [!IMPORTANT]
> 项目采用 **“混合架构” (Hybrid Architecture)**：前端由 Firebase Hosting 托管，后端 API 由 Cloud Run 独立容器运行。

### 7.1 分层架构
- **前端 (Frontend)**: 基于 Firebase Hosting，负责静态资源交付与客户端逻辑。
- **后端 (Backend API)**: 基于 Google Cloud Run (独立 Express 容器)，负责业务逻辑、数据库交互与 AI 服务接入。
- **路由转发**: `firebase.json` 中的 `rewrites` 规则将所有 `/api/**` 的请求转发至 Cloud Run 服务 `api` (`us-central1`)。

### 7.2 部署 指令 (Deployment Commands)
- **后端部署 (Cloud Run)**:
  `gcloud run deploy api --source . --project fivenursings-73917017-a0dfd`
- **前端部署 (Firebase Hosting)**:
  `firebase deploy --only hosting`

### 7.3 稳定性与安全禁止项 (Safety Guidelines)
- **!!! 二级严禁事项 !!!**:
  - **严禁**尝试将后端逻辑（API 路由、控制器、中间件）从独立的 Cloud Run 容器合并回 Firebase Functions。Cloud Run 是当前且唯一的生产 API 源。
  - **严禁**擅自修改 `firebase.json` 中的 API rewrite 路径，除非后端网关架构发生重大调整。
- **账号授权**:
  - 始终确保 `gcloud` 当前激活项目为 **账号 B (fivenursings-73917017-a0dfd)
  - 始终确保 `firebase` 当前激活项目为 **账号 B (fivenursings-73917017-a0dfd)**。

---

> [!TIP]
> 遵守以上规范将极大减少命名冲突和逻辑冲突带来的神秘 Bug。
