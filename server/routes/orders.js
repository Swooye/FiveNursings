const express = require('express');
const router = express.Router();
const { Order } = require('../models');
const { format } = require('../utils');
const { resolveUserIds } = require('../utils/idResolver');

// 生成订单号辅助函数
const generateOrderNo = () => {
    const now = new Date();
    const prefix = 'KY';
    const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const timePart = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    return `${prefix}${datePart}${timePart}${rand}`;
};

// GET /api/orders - 列表（含分页、过滤）
router.get('/orders', async (req, res) => {
    try {
        const { _start, _end, _sort, _order, ...rawQuery } = req.query;
        const filter = {};

        for (const [key, value] of Object.entries(rawQuery)) {
            if (!value || value === '') continue;
            if (key.endsWith('_like')) {
                const field = key.slice(0, -5);
                filter[field] = { $regex: value, $options: 'i' };
            } else if (key === 'userId') {
                filter.userId = { $in: await resolveUserIds(value) };
            } else {
                filter[key] = value;
            }
        }

        const count = await Order.countDocuments(filter);
        const sortField = _sort ? (_sort === 'id' ? '_id' : _sort) : 'createdAt';
        let query = Order.find(filter).sort({ [sortField]: _order === 'ASC' ? 1 : -1 });

        if (_start !== undefined && _end !== undefined) {
            query = query.skip(parseInt(_start)).limit(parseInt(_end) - parseInt(_start));
        }
        const data = await query.exec();
        res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
        res.setHeader('X-Total-Count', count);
        res.json(data.map(format));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orders/stats/summary - 订单统计摘要
router.get('/orders/stats/summary', async (req, res) => {
    try {
        const [total, pending, processing, shipped, delivered, cancelled] = await Promise.all([
            Order.countDocuments({}),
            Order.countDocuments({ status: 'pending' }),
            Order.countDocuments({ status: 'processing' }),
            Order.countDocuments({ status: 'shipped' }),
            Order.countDocuments({ status: 'delivered' }),
            Order.countDocuments({ status: 'cancelled' })
        ]);
        res.json({ total, pending, processing, shipped, delivered, cancelled });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orders/:id
router.get('/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(format(order));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/orders - 创建订单
router.post('/orders', async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            orderNo: req.body.orderNo || generateOrderNo(),
            createdAt: new Date()
        };
        const order = await Order.create(orderData);
        res.json(format(order));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/orders/:id - 通用更新
router.patch('/orders/:id', async (req, res) => {
    try {
        const updated = await Order.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Order not found' });
        res.json(format(updated));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/orders/:id/shipping - 录入/更新快递单号
router.put('/orders/:id/shipping', async (req, res) => {
    try {
        const { expressCompany, expressNo } = req.body;
        if (!expressNo) return res.status(400).json({ error: '快递单号不能为空' });
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                expressCompany: expressCompany || '',
                expressNo,
                expressUpdatedAt: new Date(),
                status: 'shipped',
                shippedAt: new Date(),
                updatedAt: new Date()
            },
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, order: format(order) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/orders/:id/status - 变更订单状态
router.put('/orders/:id/status', async (req, res) => {
    try {
        const { status, cancelReason } = req.body;
        const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
        if (!validStatuses.includes(status)) return res.status(400).json({ error: '无效的订单状态' });

        const updateData = { status, updatedAt: new Date() };
        if (status === 'cancelled' && cancelReason) updateData.cancelReason = cancelReason;
        if (status === 'paid') updateData.paidAt = new Date();
        if (status === 'delivered') updateData.deliveredAt = new Date();

        const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, order: format(order) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/orders/:id
router.delete('/orders/:id', async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
