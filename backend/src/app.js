const express = require('express')
const cors = require('cors')

const app = express()

// CORS manual - resolve preflight do Capacitor/WebView
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json())

// Rotas
app.use('/api/ai', require('./routes/aiRoutes'))
app.use('/api/auth', require('./routes/auth'))
app.use('/api/accounts', require('./routes/accounts'))
app.use('/api/transactions', require('./routes/transactions'))
app.use('/api/items', require('./routes/items'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/transfers', require('./routes/transfers'))
app.use('/api/budgets', require('./routes/budgets'))
app.use('/api/bills', require('./routes/bills'))

module.exports = app