const express = require('express')
const router  = express.Router()
const auth    = require('../middlewares/auth')
const { listar, salvar, pagar, estornar, deletar, atualizar } = require('../controllers/billController')

router.get('/',       auth, listar)
router.post('/',      auth, salvar)
router.put('/:id',    auth, atualizar)
router.post('/:id/pagar', auth, pagar)
router.post('/:id/estornar', auth, estornar)
router.delete('/:id', auth, deletar)

module.exports = router
