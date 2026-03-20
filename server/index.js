require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3002;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'x-total-count'] }));
app.use(bodyParser.json());
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// 中间件：处理数组返回时的头部信息
const arrayHeadersMiddleware = (req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (Array.isArray(data)) {
            res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
            res.setHeader('X-Total-Count', data.length);
        }
        return originalJson.call(this, data);
    };
    next();
};
app.use(arrayHeadersMiddleware);

// Model Definitions
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Admin = mongoose.model('Admin', new mongoose.Schema({}, { strict: false }));
const MallItem = mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }));
const Protocol = mongoose.model('Protocol', new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now }
}, { strict: false }));

const format = (doc) => { 
    if (!doc) return null; 
    const obj = doc.toObject ? doc.toObject() : doc; 
    return { ...obj, id: obj._id }; 
};

// --- AUTH ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const adminUser = await Admin.findOne({ $or: [{ email }, { username: email }] });
    if (adminUser && (await bcrypt.compare(password, adminUser.password))) {
      res.json({ user: format(adminUser) });
    } else { res.status(401).json({ message: 'Invalid credentials' }); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- USERS ---
app.post('/api/users/sync', async (req, res) => {
  const { firebaseUid, email, phoneNumber } = req.body;
  try {
    let user = await User.findOne({ firebaseUid });
    if (!user && (email || phoneNumber)) {
      user = await User.findOne({ $or: [{ email: email || '_none_' }, { phoneNumber: phoneNumber || '_none_' }] });
    }
    
    if (!user) {
      user = await User.create({
        firebaseUid,
        email: email || `${firebaseUid}@fivenursings.com`,
        phoneNumber,
        username: email || phoneNumber || firebaseUid,
        password: await bcrypt.hash('default_password', 10),
        isVerified: false,
        isProfileComplete: false,
        scores: { diet: 0, exercise: 0, sleep: 0, mental: 0, function: 0 }
      });
    } else if (!user.firebaseUid) {
      user.firebaseUid = firebaseUid;
      await user.save();
    }
    res.json(format(user));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const handleUserPatch = async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Success', user: format(updated) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

app.patch('/api/user/:id', handleUserPatch);
app.patch('/api/users/:id', handleUserPatch);

// --- GENERIC CRUD ---
const createRoutes = (path, Model) => {
  app.get(`/api/${path}`, async (req, res) => {
    try { 
        const data = await Model.find().sort({ createdAt: -1 }); 
        res.json(data.map(format)); 
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  
  app.get(`/api/${path}/:id`, async (req, res) => {
    try { 
        const data = await Model.findById(req.params.id); 
        res.json(format(data)); 
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  
  app.post(`/api/${path}`, async (req, res) => {
    try { 
        const data = await Model.create(req.body); 
        res.json(format(data)); 
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  
  app.patch(`/api/${path}/:id`, async (req, res) => {
    try { 
        const updated = await Model.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
        res.json(format(updated)); 
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete(`/api/${path}/:id`, async (req, res) => {
    try { 
        await Model.findByIdAndDelete(req.params.id); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
};

createRoutes('users', User);
createRoutes('admins', Admin);
createRoutes('mall_items', MallItem);
createRoutes('protocols', Protocol);

const startServer = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI not set');
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log(`Connected to database: ${mongoose.connection.name}`);
        
        // Init Admin
        const adminEmail = 'admin@fivenursings.com';
        const adminExists = await Admin.findOne({ email: adminEmail });
        if (!adminExists) {
          const hashedPassword = await bcrypt.hash('123789', 10);
          await Admin.create({ username: 'admin', email: adminEmail, password: hashedPassword, role: 'Super Admin', nickname: '超级管理员' });
        }

        // Init Protocols
        const serviceProtocol = await Protocol.findOne({ key: 'service_agreement' });
        if (!serviceProtocol) {
            await Protocol.create({
                key: 'service_agreement',
                title: '服务协议',
                content: `欢迎使用康养家康复管理平台。本协议是您与平台之间关于服务使用的法律合约。\n\n1. 服务说明：康养家利用AI技术为肿瘤患者提供康复建议。所有建议仅供参考，不作为医疗诊断依据。\n2. 用户义务：用户需提供真实准确的健康数据，以便AI进行更精准的分析。\n3. 免责声明：康复方案受个体差异影响，用户在执行重大运动或饮食变更前应咨询主治医生。\n4. 账号安全：请妥善保管您的登录信息，避免泄露个人健康隐私。`
            });
            console.log('Initialized service protocol');
        }

        const privacyProtocol = await Protocol.findOne({ key: 'privacy_policy' });
        if (!privacyProtocol) {
            await Protocol.create({
                key: 'privacy_policy',
                title: '隐私政策',
                content: `保护您的健康数据隐私是我们的首要任务。\n\n1. 数据收集：我们收集您的年龄、病种、阶段、穿戴设备数据及录音日志，用于生成个性化康复建议。\n2. 数据使用：数据仅用于您的康复看板展示及AI模型分析，未经许可不会向第三方泄露。\n3. 存储安全：我们采用行业标准的加密技术存储您的敏感健康档案。\n4. 用户权利：您可以随时在个人中心删除您的健康日志或注销账号。`
            });
            console.log('Initialized privacy protocol');
        }

        app.listen(port, () => console.log(`Server is running on port ${port}`));
    } catch (err) { console.error('Failed to start server:', err); }
};
startServer();
