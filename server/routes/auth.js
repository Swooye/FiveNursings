const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Admin } = require('../models');
const { format } = require('../utils');

// --- 管理员登录 ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        res.json(format(admin));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 管理员管理扩展 ---
router.put('/admins/:id/password', async (req, res) => {
    try {
        const { password } = req.body;
        const admin = await Admin.findById(req.params.id);
        if (!admin) return res.status(404).json({ error: 'Admin not found' });

        admin.password = password; // pre-save hook will hash it
        await admin.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Generic CRUD for Admins ---
const createRoutes = require('../utils/routeGenerator');
createRoutes(router, 'admins', Admin);

module.exports = router;
