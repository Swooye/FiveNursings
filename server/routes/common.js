const express = require('express');
const router = express.Router();
const { MallItem, Protocol, Role } = require('../models');
const createRoutes = require('../utils/routeGenerator');

// Register generic CRUD routes for basic models
createRoutes(router, 'mall_items', MallItem);
createRoutes(router, 'protocols', Protocol);
createRoutes(router, 'roles', Role);

module.exports = router;
