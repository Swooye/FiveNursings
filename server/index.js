const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3002;

// Middlewares
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-total-count']
}));
app.use(bodyParser.json());

// Add X-Total-Count header for Refine
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (Array.isArray(data)) {
      res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
      res.setHeader('X-Total-Count', data.length);
    }
    return originalJson.call(this, data);
  };
  next();
});

// --- Schemas ---

// User (Customers)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'User' },
  nickname: { type: String },
  name: { type: String },
  avatar: { type: String },
  gender: { type: String },
  birthDate: { type: String },
  height: { type: Number },
  weight: { type: Number },
  phoneNumber: { type: String },
  cancerType: { type: String, default: '未设置' },
  stage: { type: String, default: '康复期' },
  constitution: { type: String, default: '平和质' },
  scores: {
    diet: { type: Number, default: 0 },
    exercise: { type: Number, default: 0 },
    sleep: { type: Number, default: 0 },
    mental: { type: Number, default: 0 },
    function: { type: Number, default: 0 }
  }
});
const User = mongoose.model('User', userSchema);

// Admin
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Admin' },
  nickname: { type: String }
});
const Admin = mongoose.model('Admin', adminSchema);

// Plans
const planSchema = new mongoose.Schema({
  title: String,
  description: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Active', 'Completed', 'Draft'], default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});
const Plan = mongoose.model('Plan', planSchema);

// Mall Items (Enhanced for E-commerce)
const mallItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number }, // 原价
  category: { type: String, required: true }, // 膏方, 滋补, 器械, 药食同源
  stock: { type: Number, default: 0 },
  description: String,
  imageUrl: String,
  status: { type: String, enum: ['on_sale', 'off_sale'], default: 'off_sale' }, // 上架/下架
  brand: String,
  spec: String, // 规格: 如 500g/瓶
  sales: { type: Number, default: 0 }, // 销量
  createdAt: { type: Date, default: Date.now }
});
const MallItem = mongoose.model('MallItem', mallItemSchema);

// Protocols
const protocolSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  title: String,
  content: String,
  updatedAt: { type: Date, default: Date.now }
});
const Protocol = mongoose.model('Protocol', protocolSchema);

// --- Helper for Refine REST ---
const format = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id };
};

// --- Seed Data Function ---
const seedData = async () => {
  if (await MallItem.countDocuments() === 0) {
    await MallItem.create([
      { 
        name: '五养人参膏', 
        price: 299, 
        originalPrice: 399,
        category: '膏方', 
        stock: 100, 
        description: '甄选长白山人参，科学配比，补气养血。',
        status: 'on_sale',
        spec: '250g/瓶',
        imageUrl: 'https://images.unsplash.com/photo-1584017945366-b97b0e9b11f7?auto=format&fit=crop&q=80&w=200'
      },
      { 
        name: '康复拉力器', 
        price: 88, 
        category: '器械', 
        stock: 50, 
        description: '机能恢复训练，可调节阻力。',
        status: 'on_sale',
        spec: '标准款',
        imageUrl: 'https://images.unsplash.com/photo-1591940742878-13aba4b7a35e?auto=format&fit=crop&q=80&w=200'
      }
    ]);
  }
  if (await Protocol.countDocuments() === 0) {
    await Protocol.create([
      { key: 'service', title: '服务协议', content: '欢迎使用康养家康复管理平台。本协议是您与平台之间关于服务使用的法律合约。' },
      { key: 'privacy', title: '隐私政策', content: '保护您的健康数据隐私是我们的首要任务。' }
    ]);
  }
};

// --- Routes ---

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
      const data = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(format(data));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.delete(`/api/${path}/:id`, async (req, res) => {
    try {
      await Model.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
};

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ $or: [{ email }, { username: email }] });
    if (admin && (await bcrypt.compare(password, admin.password))) {
      res.json({ user: format(admin) });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

createRoutes('users', User);
createRoutes('admins', Admin);
createRoutes('plans', Plan);
createRoutes('mall_items', MallItem);
createRoutes('protocols', Protocol);

const startServer = async () => {
    try {
        const uri = 'mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/?appName=Cluster0';
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB');
        
        const adminEmail = 'admin@fivenursings.com';
        if (!await Admin.findOne({ email: adminEmail })) {
          const hashedPassword = await bcrypt.hash('123789', 10);
          await Admin.create({ username: 'admin', email: adminEmail, password: hashedPassword, role: 'Super Admin', nickname: '超级管理员' });
        }
        await seedData();
        app.listen(port, () => console.log(`Server is running on port ${port}`));
    } catch (err) {
        console.error('Failed to start server:', err);
    }
};

startServer();
