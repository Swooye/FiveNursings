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
- **后端**：Node.js + Express (统一运行在 `server/` 目录)。
- **数据库**：MongoDB (Atlas 云数据库)。
- **认证**：Firebase Authentication (用于手机验证码及第三方登录)。

## 3. 后端接口规范 (Base URL: /api)
- `/api/users`: 用户管理（Admin 端使用）。
- `/api/user/:id`: 个人资料更新（User 端及 Admin 端共享）。
- `/api/login`: 后端管理登录（Admin 端使用）。

## 4. 开发环境端口
- User 端前端：`9000/9002` (Workstation 映射端口)。
- Admin 端前端：`3001`。
- 统一后端：`3002`。
