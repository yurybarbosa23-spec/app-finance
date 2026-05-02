const express = require('express')
const router  = express.Router()
const adminMw = require('../middlewares/admin')
const ctrl    = require('../controllers/adminController')

router.use(adminMw)

router.get('/stats',                    ctrl.stats)
router.get('/users',                    ctrl.listarUsuarios)
router.post('/users',                   ctrl.criarUsuario)
router.delete('/users/:id',             ctrl.deletarUsuario)
router.put('/users/:id/reset-password', ctrl.resetarSenha)
router.get('/users/:id',                ctrl.dadosUsuario)
router.get('/users/:id/transactions',   ctrl.transacoesUsuario)
router.get('/users/:id/accounts',       ctrl.listarContasUsuario)
router.post('/users/:id/accounts',      ctrl.criarContaUsuario)
router.delete('/accounts/:id',          ctrl.deletarConta)
router.post('/users/:id/reset-all',     ctrl.resetarTudo)
router.get('/users/:id/password',       ctrl.verSenha)

module.exports = router