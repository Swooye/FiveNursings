# 架构备忘录 - FiveNursings 康养家

## 1. 业务定义
本系统分为两个核心端：

### User端 (面向患者/家属)
- **目标用户**：慢性病（如肿瘤）患者及其家属。
- **核心功能**：
    - 实时查看健康状况及健康干预方案。
    - 上传并管理病例、检查报告。
    - 跟踪服药依从性（Recovery Journal）。
    - 健康商城：购买药食同源产品、膏方、康复器材等。
    - AI 助手与人工教练：提供专业康复指导。

### Admin端 (面向医护人员)
- **目标用户**：医生、护士、康复教练。
- **核心功能**：
    - 患者健康档案管理：随时调取查看患者病例。
    - 服务跟进：监控患者依从性及预警（Safety Warnings）。
    - 订单与物流管理：处理商城订单。
    - 专家方案定制。

## 2. 技术架构 (Hybrid & Modular)
本系统采用**混合架构**，后端经过 V2.0 重构，实现了**模块化治理**。

- **前端 (User/Admin)**：React + TypeScript + Tailwind CSS (部署于 **Firebase Hosting**)。
- **后端 (API/AI Server)**：
  - **模块化 Express (V2.0)**：
    - `index.js`: 极简入口，仅负责中间件编排与路由挂载。
    - `/routes`: 领域模型路由（Auth, Users, DailyTasks 等）。
    - `/db.js`: 独立数据库连接管理。
    - `/utils`: 包含通用的 `routeGenerator` (自动 CRUD) 和 `idResolver` (ID 对齐)。
  - **容器化部署**：Node.js + Express + Docker (部署于 **Google Cloud Run**)。
- **数据库**：MongoDB (Atlas 云数据库)。
  - **开发库**：`fivenursing_dev`
  - **生产库**：`fivenursing_pro`
- **认证**：Firebase Authentication (统一用户内部 ID)。

## 3. 开发规范与稳定性
详细的命名规范（Database/API/Variables）、React 状态管理准则以及 CI/CD 流程，请参阅：
👉 [DEVELOPMENT_GUIDE.md](file:///Users/wayne/FiveNursings/RESOURCES/DEVELOPMENT_GUIDE.md)

## 4. 关键开发经验与避坑指南 (必读)

### A. 环境隔离与贯通
- **数据库隔离**：本地开发必须连接 `fivenursing_dev`，生产环境自动连接 `fivenursing_pro`。严禁在生产库进行测试数据写入。
- **API 动态识别**：前端通过 `import.meta.env.DEV` 判断环境。
  - Dev: 使用相对路径 `/api` 触发 Proxy。
  - Pro: 使用绝对路径指向云函数 URL。

### B. 路由与接口陷阱
- **云函数 404 问题**：Firebase Functions 部署 Express App 时，如果前端请求包含 `/api` 前缀（如 `/api/users`），后端路由必须显式处理该前缀（例如 `app.use('/api', router)`）。
- **路由匹配顺序**：在 Express 中，**精确匹配路由必须在参数路由之前**。
    - *错误示例*：先把 `/messages/:userId` 注册了，会导致请求 `/messages/unread-count/:userId` 永远无法到达，因为 `unread-count` 会被误认为是一个 `userId`。
    - *正确做法*：先注册 `/messages/unread-count/...`，再注册 `/messages/:userId`。

### C. 数据一致性与同步
- **用户档案同步**：Firebase Auth 仅提供 `uid`。登录后必须立即调用后端 `sync` 接口，通过 `uid` 换取完整的业务数据（昵称、五养评分等）。
- **字段持久化**：Mongoose Schema 建议在开发阶段设置 `strict: false`，防止前端新增的业务字段（如 `cancerType`）因未定义而被静默丢弃。
- **默认值误区**：前端状态初始化时（如 `useState`），**严禁使用硬编码的假数据**（如 "李先生"），应初始化为空值。否则当 API 延迟或失败时，用户会看到误导性的信息。

### D. 部署与构建
- **依赖兼容性**：云函数（Functions）对依赖版本敏感。如遇到 TypeScript 类型报错，可在 `tsconfig.json` 中开启 `skipLibCheck: true`。
- **冷启动**：Cloud Run 虽然存在冷启动，但通过预留实例或高性能基础镜像可缓解。
- **管理员初始化**：生产环境部署后，数据库是空的。务必在后端代码中加入“自动检测并创建超级管理员”的逻辑。

## 5. 架构稳定性与部署准则 (System Instructions)

### 5.1 后端部署准则 (Cloud Run Only)
- **容器化优先**：核心后端业务（神农大脑、B2B2C 调度等）必须基于 Dockerfile 结构，严禁转换为单一的 Firebase Functions。
- **一致性**：核心后端逻辑使用 `gcloud run deploy` 部署。

### 1.2 环境隔离与防回滚 (Isolation & Rollback)
- **Dev vs Pro**：部署前必须确认 `gcloud config get-value project` 指向。生产环境严禁用于测试。
- **原子化修改**：禁止在未运行本地模拟器 (Firebase Emulator) 的情况下直接向云端推送修改。
- **回滚策略**：若连续三次修复未能解决一致性问题，立即回滚至上一个稳定的 Git Commit。

### I. 混合部署与服务冲突防范 (Cloud Run & Functions Coexistence)
- **核心原则**：生产环境的主后端服务（含 API 路由、数据库持久化、AI 专家大脑）统一使用 **Cloud Run** 容器化部署，其服务名称固定为 `api`。
- **命名安全红线**：禁止在 Firebase Functions 中使用与 Cloud Run 服务同名的导出（Export）。
    *   *错误示例*：在 `functions/src/index.ts` 中导出 `export const api = ...`。这在执行 `firebase deploy` 时会创建/覆盖名为 `api` 的服务，导致容器后端被静默替换。
    *   *正确做法*：Functions 仅用于辅助逻辑（如 Triggers），其名称必须增加后缀或前缀（如 `api_legacy`, `on_user_created`）。
- **同步构建规范**：重部署 Functions 前，必须手动在 `functions/` 目录下执行 `npm run build`，严禁直接部署未编译的 `.ts` 变更，防止线上代码与源码版本脱节。

### J. 环境变量配置规范 (Environment Variable Standard)
- **特殊字符处理**：在通过 `gcloud run services update` 或 `deploy` 配置 `MONGODB_URI` 等包含特殊字符的变量时，严禁在值内部使用字面量单引号（'）。
    *   *风险*：某些 Shell 环境会将内部单引号视为字符串终止符，导致连接串被截断（如截断在 `@` 符号前），产生身份验证失败。
- **覆盖规则**：生产环境的环境变量必须以 Google Cloud Console 中的 Secret Manager 或 Service 配置为准。本地 `.env` 仅供本地 `server/index.js` 使用。

### E. 环境配置 (Env Vars)
- **单一真理来源**：项目采用根目录 `.env` 作为唯一配置源。
- **同步机制**：`admin/.env` 和 `user/.env` 是指向根目录的 **符号链接 (Symbolic Link)**。
- **最佳实践**：添加新配置时仅修改根目录文件。使用 `.env.example` 维护非敏感的模板供团队参考。

### F. 智能语音 (TTS) 处理
- **异步音色加载**：不同浏览器的语音包加载是异步的。必须监听 `speechSynthesis.onvoiceschanged` 并在回调中执行音色匹配。
- **生命周期清理**：在 React 组件销毁 (`useEffect` cleanup) 或页面刷新 (`beforeunload`) 时，务必调用 `speechSynthesis.cancel()`，防止语音在后台重叠播报。
### G. 用户身份标识符规范 (User ID Resolution Standard)
- **痛点**：系统中存在多种用户 ID 格式：Firebase `uid` (auth 产生的字符串) 和 MongoDB `_id` (十六进制 ObjectId)。
- **规范**：所有涉及 `userId` 业务逻辑（症状、日记、任务、计分等）的后端接口，**必须** 使用 `resolveUserIds` 辅助函数进行宽容匹配。
  - **GET 请求**：使用 `{ userId: { $in: await resolveUserIds(queryId) } }` 进行查询，确保无论前端传哪种 ID 都能读到数据。
  - **POST/PATCH 请求**：在存储前调用 `resolveUserIds`，并**统一存入 `idList[0]`**（通常是 MongoDB `_id`），确保数据不会因 ID 格式不同而产生冗余。
- **前端准则**：`App.tsx` 中的 `profile.id` 包含业务主键，但在所有 API 请求中，后端应具备上述宽容识别能力。

### H. 数据库连接安全与隔离规范 (Database Isolation Standard)
- **核心红线**：严禁在后端 `server/index.js` 或任何数据持久化层硬编码 `fivenursing_pro`。
- **动态切换逻辑**：必须通过 `process.env.NODE_ENV` 自动识别环境：
  - `development` (本地)：默认连接 `fivenursing_dev`。
  - `production` (云端)：自动连接 `fivenursing_pro`。
- **覆盖机制**：支持使用环境变量 `MONGODB_DB_NAME` 进行手动覆盖，优先级最高。
- **启动检查**：服务器启动时必须显式打印当前连接的数据库名称，严禁“静默连接”生产库。
- **后果控制**：任何导致本地开发环境污染生产库的操作均视为严重事故，需立即触发数据库回滚并更新本规范。
