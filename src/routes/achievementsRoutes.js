const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const achievementsController = require('../controllers/achievementsController');

router.get('/', verifyToken, achievementsController.getMyAchievements);

module.exports = router;
