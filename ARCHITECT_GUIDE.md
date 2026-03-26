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

## 2. 技术架构
- **前端**：React + TypeScript + Tailwind CSS (Vite 驱动)。
- **后端**：
  - **开发环境**：Node.js + Express (本地 `server/index.js`，运行在 3002 端口)。
  - **生产环境**：Firebase Cloud Functions (云端无服务器架构，Node.js 20)。
- **数据库**：MongoDB (Atlas 云数据库)。
  - **开发库**：`fivenursing_dev`
  - **生产库**：`fivenursing_pro`
- **认证**：Firebase Authentication (统一用户身份ID)。

## 3. 后端接口规范
**Base URL**: 
- Dev: `/api` (通过 Vite Proxy 代理至 `localhost:3002`)
- Pro: `https://api-u46fik5vcq-uc.a.run.app` (Firebase Function URL)

**核心路由**:
- `/users/sync` (POST): **关键接口**。用户登录后必须调用，用于同步/创建数据库档案并回显信息。
- `/users` (GET): 用户列表（Admin 端使用）。
- `/user/:id` (PATCH): 个人资料更新（双端共享，需注意云端兼容 `/api` 前缀）。
- `/login` (POST): 管理后台登录（仅限 Admin 集合验证）。
- `/mall_items` (GET/POST/PATCH): 商城商品管理。

## 4. 关键开发经验与避坑指南 (必读)

### A. 环境隔离与贯通
- **数据库隔离**：本地开发必须连接 `fivenursing_dev`，生产环境自动连接 `fivenursing_pro`。严禁在生产库进行测试数据写入。
- **API 动态识别**：前端通过 `import.meta.env.DEV` 判断环境。
  - Dev: 使用相对路径 `/api` 触发 Proxy。
  - Pro: 使用绝对路径指向云函数 URL。

### B. 路由与接口陷阱
- **云函数 404 问题**：Firebase Functions 部署 Express App 时，如果前端请求包含 `/api` 前缀（如 `/api/users`），后端路由必须显式处理该前缀（例如 `app.use('/api', router)`），否则会报 404。
- **PATCH 接口路径**：为兼容不同调用习惯，建议同时注册 `/user/:id` 和 `/users/:id` 两个路由。

### C. 数据一致性与同步
- **用户档案同步**：Firebase Auth 仅提供 `uid`。登录后必须立即调用后端 `sync` 接口，通过 `uid` 换取完整的业务数据（昵称、五养评分等）。
- **字段持久化**：Mongoose Schema 建议在开发阶段设置 `strict: false`，防止前端新增的业务字段（如 `cancerType`）因未定义而被静默丢弃。
- **默认值误区**：前端状态初始化时（如 `useState`），**严禁使用硬编码的假数据**（如 "李先生"），应初始化为空值。否则当 API 延迟或失败时，用户会看到误导性的信息。

### D. 部署与构建
- **依赖兼容性**：云函数（Functions）对依赖版本敏感。如遇到 TypeScript 类型报错，可在 `tsconfig.json` 中开启 `skipLibCheck: true`。
- **冷启动**：云函数存在冷启动延迟，首次请求可能较慢，前端需做好 Loading 状态管理。
- **管理员初始化**：生产环境部署后，数据库是空的。务必在后端代码中加入“自动检测并创建超级管理员”的逻辑，防止部署后无法登录后台。
