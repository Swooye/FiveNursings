import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Safer Model Definitions
const getUserModel = () => mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const getAdminModel = () => mongoose.models.Admin || mongoose.model('Admin', new mongoose.Schema({}, { strict: false }));
const getMallItemModel = () => mongoose.models.MallItem || mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }));
const getProtocolModel = () => mongoose.models.Protocol || mongoose.model('Protocol', new mongoose.Schema({}, { strict: false }));

const format = (doc: any) => { if (!doc) return null; const obj = doc.toObject(); return { ...obj, id: obj._id }; };

// Auth Logic
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const Admin = getAdminModel();
    const adminUser = await Admin.findOne({ $or: [{ email }, { username: email }] });
    if (adminUser && (await bcrypt.compare(password, (adminUser as any).password))) {
      res.json({ user: format(adminUser) });
    } else { res.status(401).json({ message: 'Invalid credentials' }); }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// REST Routes
app.get('/users', async (req, res) => {
    try {
        const User = getUserModel();
        const data = await User.find().sort({ createdAt: -1 });
        res.setHeader('X-Total-Count', data.length);
        res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
        res.json(data.map(format));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/mall_items', async (req, res) => {
    try {
        const MallItem = getMallItemModel();
        const data = await MallItem.find().sort({ createdAt: -1 });
        res.setHeader('X-Total-Count', data.length);
        res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
        res.json(data.map(format));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/protocols', async (req, res) => {
    try {
        const Protocol = getProtocolModel();
        const data = await Protocol.find();
        res.json(data.map(format));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Add more routes as needed...
// Simplified for deployment testing

export default app;
