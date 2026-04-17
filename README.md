# 五养教练 - 肿瘤康复 AI 助手 (FiveNursings)

## 📚 项目导航 (Docs Index)

- 🏗️ [架构图谱 (ARCHITECT_GUIDE.md)](ARCHITECT_GUIDE.md): 系统全貌、技术栈及环境隔离指引。
- 📖 [产品需求文档 (PRD.md)](PRD.md): 产品业务逻辑、核心功能规范及路线图。
- 🛠️ [开发规范 (DEVELOPMENT_GUIDE.md)](RESOURCES/DEVELOPMENT_GUIDE.md): 命名标准 (DB/API)、状态管理准则及避坑指南。

---

## 🚀 快速启动 (Quick Start)

### 1. 环境准备
确保已安装 Node.js 20+。

### 2. 安装依赖
```bash
npm install
```

### 3. 本地开发
```bash
# 启动后端服务 (localhost:3002)
npm run backend

# 启动 User 端前端 (localhost:3000)
npm run user

# 启动 Admin 端前端 (localhost:5174)
npm run admin
```

### 4. 生产部署
本项目采用混合架构：
- **前端**：Firebase Hosting
- **后端**：Google Cloud Run

部署命令请参阅 [开发规范 (DEVELOPMENT_GUIDE.md)](RESOURCES/DEVELOPMENT_GUIDE.md)。
