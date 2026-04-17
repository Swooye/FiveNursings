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

## 二、 核心架构与开发流程 (Modular Architecture)

### 1. 目录结构与分工
- **`/server/index.js`**: **指挥官**。配置中间件，按优先级顺序挂载各领域路由模块。
- **`/server/routes/`**: **执行官**。存放各领域接口定义（如 `auth.js`, `dailyTasks.js`）。
- **`/server/utils/`**: **工具库**。包含 `idResolver.js` (ID 对齐) 和 `routeGenerator.js` (通用 CRUD)。
- **`/server/db.js`**: **连接器**。统一管理 MongoDB 连接，通过 `NODE_ENV` 自动切换库名。

### 2. 新增 API 模块流程 (Standard Flow)
1. **定义模型**: 在 `models/index.js` 中定义或导出对应 Mongoose 模型。
2. **创建路由**: 在 `routes/` 下新建文件（如 `routes/feature.js`）。
   - 引用 `express.Router()`。
   - 使用 `resolveUserIds` 对齐用户身份。
   - 复杂逻辑封装在 `services/` 中。
3. **挂载模块**: 在 `index.js` 中 `app.use('/api', require('./routes/feature'))`。
   - **注意**: 必须在通用 CRUD 路由注册前挂载，以防死路由。

### 3. 数据与身份处理 (ID Consistency)
- **强制辅助**: 所有涉及 `userId` 的读写接口，必须使用 `server/utils/idResolver.js` 进行转换。
- **标准响应**: 必须调用 `format(doc)` 进行格式化，确保 `id` 字段的统一暴露。

## 三、 部署规则 (Cloud Run)
...
