const express = require('express')
const router = express.Router()
const { chat } = require('../controllers/aiController')
const authMiddleware = require('../middlewares/auth')

router.post('/chat', authMiddleware, chat)

module.exports = router