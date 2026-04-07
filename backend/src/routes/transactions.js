const express = require('express')
const router  = express.Router()
const auth    = require('../middlewares/auth')
const { listar, criar, deletar } = require('../controllers/transactionController')

router.get('/',       auth, listar)
router.post('/',      auth, criar)
router.delete('/:id', auth, deletar)

module.exports = router