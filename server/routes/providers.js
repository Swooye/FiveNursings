const express = require('express');
const router = express.Router();
const { Provider } = require('../models');
const createRoutes = require('../utils/routeGenerator');

// Register generic CRUD routes for organizations
createRoutes(router, 'providers', Provider);

module.exports = router;
