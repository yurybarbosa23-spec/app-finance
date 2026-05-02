const express = require('express')
const router  = express.Router()
const auth    = require('../middlewares/auth')
const { listar, criar, vender, deletar } = require('../controllers/itemController')

router.get('/',            auth, listar)
router.post('/',           auth, criar)
router.put('/:id/vender',  auth, vender)
router.delete('/:id',      auth, deletar)

module.exports = router