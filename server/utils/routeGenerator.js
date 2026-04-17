const { format } = require('./index');
const { normalizeUserIdFilter } = require('./idResolver');

/**
 * 将 Refine simple-rest 的过滤参数转换为 MongoDB 查询条件
 * Refine 发送: field_like=value (contains), field=value (eq)
 */
function parseFiltersToMongoQuery(rawFilters) {
    const mongoFilter = {};
    for (const [key, value] of Object.entries(rawFilters)) {
        if (!value || value === '') continue;
        if (key.endsWith('_like')) {
            // contains → regex 模糊查询
            const field = key.slice(0, -5);
            mongoFilter[field] = { $regex: value, $options: 'i' };
        } else {
            // 精确匹配
            mongoFilter[key] = value;
        }
    }
    return mongoFilter;
}

/**
 * 自动路由生成器 (Generic CRUD)
 * @param {import('express').Application|import('express').Router} appOrRouter 
 * @param {string} path 
 * @param {import('mongoose').Model} Model 
 */
const createRoutes = (appOrRouter, path, Model) => {
    appOrRouter.get(`/${path}`, async (req, res) => {
        try {
            const { _start, _end, _sort, _order, ...rawFilters } = req.query;
            
            // 解析 Refine 的过滤参数格式（支持 _like 模糊查询）
            const parsedFilters = parseFiltersToMongoQuery(rawFilters);
            const filters = await normalizeUserIdFilter(parsedFilters);

            const count = await Model.countDocuments(filters);
            let query = Model.find(filters);

            if (_sort) {
                const sortField = _sort === 'id' ? '_id' : _sort;
                query = query.sort({ [sortField]: _order === 'ASC' ? 1 : -1 });
            } else {
                query = query.sort({ createdAt: -1 });
            }

            if (_start !== undefined && _end !== undefined) {
                query = query.skip(parseInt(_start)).limit(parseInt(_end) - parseInt(_start));
            }

            const data = await query.exec();
            res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
            res.setHeader('X-Total-Count', count);
            res.json(data.map(format));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    appOrRouter.get(`/${path}/:id`, async (req, res) => {
        try {
            const data = await Model.findById(req.params.id);
            res.json(format(data));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    appOrRouter.post(`/${path}`, async (req, res) => {
        try {
            const data = await Model.create({ ...req.body, createdAt: new Date() });
            res.json(format(data));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    appOrRouter.patch(`/${path}/:id`, async (req, res) => {
        try {
            const updated = await Model.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
            res.json(format(updated));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    appOrRouter.delete(`/${path}/:id`, async (req, res) => {
        try {
            await Model.findByIdAndDelete(req.params.id);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
};

module.exports = createRoutes;
