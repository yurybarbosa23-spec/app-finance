const express = require('express')
const router  = express.Router()
const auth    = require('../middlewares/auth')
const { listar, criar, editar, deletar } = require('../controllers/transactionController')

router.get('/',       auth, listar)
router.post('/',      auth, criar)
router.put('/:id',    auth, editar)
router.delete('/:id', auth, deletar)

module.exports = router
