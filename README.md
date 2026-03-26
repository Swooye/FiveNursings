# FiveNursings (康养家) —— 肿瘤康复全维管理平台

FiveNursings 是一款专为肿瘤患者设计的康复管理平台，基于“五治五养”体系（饮食、运动、睡眠、心理、功能）提供全方位的健康跟踪与 AI 智能干预。

## 🚀 快速启动 (本地开发)

### 1. 环境准备
确保您的计算机已安装 Node.js (v18+) 和 MongoDB。

### 2. 配置环境变量
项目使用根目录 `.env` 作为唯一真理来源，子项目通过符号链接同步。
```bash
cp .env.example .env
# 编辑 .env 并填入 OpenRouter API Key
ln -s ../.env admin/.env
ln -s ../.env user/.env
```

### 3. 一键启动
在根目录下执行以下脚本，即可同时启动后端服务器、用户端和管理端：
```bash
bash start-dev.sh
```
- **用户端 (User)**: `http://localhost:3000`
- **管理后台 (Admin)**: `http://localhost:5174`
- **本地后端 (Server)**: `http://localhost:3002`

## 📂 项目结构

- `/user`: 患者端前端 (React + Vite)
- `/admin`: 医护管理端前端 (React + Refine)
- `/server`: 本地开发后端 (Express)
- `/functions`: 生产环境后端 (Firebase Cloud Functions)
- `/migrate_data.cjs`: 数据迁移工具脚本

## 🛠 技术栈

- **Frontend**: React, TypeScript, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Node.js, Express, Firebase Functions (Node 20)
- **Database**: MongoDB Atlas (fivenursing_dev / fivenursing_pro)
- **AI Engine**: OpenRouter (Google Gemini 2.0 Flash)
- **Intervention**: OpenClaw AI Interventions

## ☁️ 生产部署

项目后端部署在 Firebase Cloud Functions：
```bash
cd functions
npm run build
firebase deploy --only functions
```

## 📖 架构文档

更多深入的技术细节、避坑指南和架构设计，请参考 [ARCHITECT_GUIDE.md](file:///Users/wayne/FiveNursings/ARCHITECT_GUIDE.md)。
