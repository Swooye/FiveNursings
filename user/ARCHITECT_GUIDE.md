一、 核心医学理论：五治五养全程管理
本项目基于林洪生教授的“固本清源”理论，AI 必须根据以下框架生成内容：

1. “五治”分阶段治疗（判定背景）
防护治疗：针对手术/放化疗期间，核心是“减毒增效”。

巩固治疗：针对术后/放化疗结束，核心是“防复发、防转移”。

维持治疗：针对晚期/带瘤生存，核心是“祛邪扶正平衡”。

加载治疗：针对耐药/病情进展，核心是“中西医结合增效”。

单纯中医药治疗：针对无法耐受西医治疗者。

2. “五养”康复维度（生成内容）
饮食调养：三因制宜（因人/因时/因地），具体到食材。

运动调养：动静结合，推荐八段锦/太极拳，强度为“微汗而不喘”。

心理调养：五音疗法、正念，调理五脏气血。

功能调养：针对副反应（如麻木、乏力）的穴位、吐纳建议。

膏方调养：针对虚实夹杂体质的长期调理。

二、 全场景数据架构 (MongoDB 唯一真相源)
严禁使用本地缓存或 Firebase Firestore，所有业务数据必须持久化至 MongoDB。

1. 康复档案域 (Rehabilitation Domain)
UserProfiles：用户基础病理、当前“五治”阶段标签。

HealthMetrics：IoT 实时监测数据（心率、睡眠、步数、情绪）。

AssessmentRecords：定期康复评估量表结果。

2. 交互与 AI 域 (Interaction Domain)
InteractionLogs：[必须] 记录 AI 对话长记忆。包含用户主诉、意图标签、AI 答复，用于后续 RAG 检索。

ProfessionalReports：存储生成的“五治五养”专业简报及版本快照。

3. 商业与服务域 (Commerce Domain)
CommerceOrders：用户购买的五养物资（膏方、辅具）及护理服务订单。

ProductCatalog：中医康复物资库（关联五养维度）。

三、 技术栈开发约束
1. 前后端解耦规范
前端 (React/IDX)：严禁硬编码 API Key，严禁直连 MongoDB。

后端 (Firebase Functions)：

必须使用 onCall 触发器。

区域约束：强制指定 us-central1。

安全约束：必须验证 request.auth。

环境变量：连接串必须从 process.env.MONGODB_URI 读取。

2. 状态管理规范
所有 Firebase 服务（Auth, Functions）必须从 @/firebase.ts 的单例导出。

调用云函数示例：httpsCallable(functions, 'funcName')。

四、 AI 修改代码禁令 (Hard Rules)
禁止重写初始化：严禁在任何组件内重新编写 initializeApp。

禁止忽略错误处理：所有云函数调用必须包含 try-catch 并打印 error.code。

禁止破坏 UI 布局：在添加功能时，不得修改 ResponsiveContainer 的固定宽高限制。

数据必写性：生成报告或对话结束时，必须有对应的 db.collection().insertOne() 操作。