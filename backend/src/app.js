const express = require('express')
const cors    = require('cors')
const app     = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth',         require('./routes/auth'))
app.use('/api/accounts',     require('./routes/accounts'))
app.use('/api/transactions', require('./routes/transactions'))
app.use('/api/items',        require('./routes/items'))
app.use('/api/admin',        require('./routes/admin'))
app.use('/api/transfers',    require('./routes/transfers'))
app.use('/api/budgets',      require('./routes/budgets'))

module.exports = app