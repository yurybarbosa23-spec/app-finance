const express = require('express')
const router  = express.Router()
const auth    = require('../middlewares/auth')
const { listar, salvar, atualizar, deletar } = require('../controllers/budgetController')

router.get('/',       auth, listar)
router.post('/',      auth, salvar)
router.put('/:id',    auth, atualizar)
router.delete('/:id', auth, deletar)

module.exports = router