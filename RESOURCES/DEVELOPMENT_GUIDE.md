# 🛡️ FiveNursings 开发与部署规范 (v1.6)

## 一、 核心开发指南 (Core Guidelines)

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

### 3. API 通信规范
- **禁止硬编码后缀**：所有 API 请求必须使用 `API_URL` 变量。
  - `const API_URL = import.meta.env.PROD ? "" : "http://localhost:3002";`
  - 生产环境依赖 `firebase.json` 的 `rewrites` 规则转发 `/api/**` 到 Cloud Run。
- **去 Firebase 函数化**：新功能开发禁止使用 `httpsCallable`。统一使用标准的 HTTP 请求（如 `fetch`）调用 Cloud Run 中的 `/api/...` 后端接口。

### 4. 数据与身份处理 (ID Consistency)
- **后端强制解析**：所有涉及 `userId` 的读写接口，必须在第一步执行 `await resolveUserIds(userId)`。
- **多端与外部系统兼容**：接口必须支持 `Firebase UID`、`ObjectID`、`姓名` 三维一体的模糊识别，并支持会话自动关联。

## 二、 核心架构与部署规则 (Hybrid Architecture)

> [!IMPORTANT]
> 项目采用 **“混合架构” (Hybrid Architecture)**：前端由 Firebase Hosting 托管，后端 API 由 Cloud Run 独立容器运行。

### 1. 分层架构
- **前端 (Frontend)**: 基于 Firebase Hosting，负责静态资源交付与客户端逻辑。
- **后端 (Backend API)**: 基于 Google Cloud Run (独立 Express 容器)，负责全部核心业务逻辑、数据库交互与 AI 服务接入。
- **路由转发**: `firebase.json` 中的 `rewrites` 规则将所有 `/api/**` 的请求原封不动地转发至 Cloud Run 服务 `api` (`us-central1`)。

### 2. 后端路由定义规范 (Routing Prefix)
- **携带前缀**：由于 Firebase Hosting 的 rewrites 规则**不会截断前缀**，当请求被转发到 Cloud Run 时，URL 依然包含 `/api`。
- **正确做法**：后端的 Express 代码必须显式监听 `/api`。例如 `app.post('/api/diary/summarize', ...)` 或使用 `app.use('/api', router)`。

### 3. 部署指令 (Deployment Commands)
- **后端部署 (Cloud Run)**:
  `gcloud run deploy api --image gcr.io/[PROJECT_ID]/api --region us-central1`
- **前端与静态部署 (Firebase Hosting)**:
  `firebase deploy --only hosting`
- **辅助函数部署 (Firebase Functions)**:
  `cd functions && npm run build && cd .. && firebase deploy --only functions`

### 4. 稳定性与安全禁止项 (Safety Redlines)

> [!CAUTION]
> 严防服务名称覆盖导致的全站 404！

- **禁止同名服务**：**严禁**在 `functions/src/index.ts` 中导出名为 `api` 的云函数。这会导致在执行 `firebase deploy` 时，将主后端的 Cloud Run `api` 服务抹除覆盖。若需部署遗留函数，必须使用 `api_legacy` 等无冲突名称。
- **禁止配置复写**：严禁自动重写或覆盖 `firebase.json`, `Dockerfile`, `firestore.rules`。
- **禁止字面量引号配置**：通过 `gcloud` 命令设置带有特殊字符的环境变量（如 `MONGODB_URI`）时，值内部禁止出现单引号字面量（'），防止连接串被 Shell 截断。

---

> [!TIP]
> 严格遵守以上规范，特别是 ID 解析规范与 Cloud Run 服务命名红线，将极大减少神秘 Bug 及全站瘫痪事故。
