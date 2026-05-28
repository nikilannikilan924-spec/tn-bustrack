require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { createSocketServer } = require('./src/config/socket');
const { errorHandler } = require('./src/middleware/errorHandler');
const routeRoutes = require('./src/routes/routeRoutes');
const busRoutes = require('./src/routes/busRoutes');
const stopRoutes = require('./src/routes/stopRoutes');
const alertRoutes = require('./src/routes/alertRoutes');
const authRoutes = require('./src/routes/authRoutes');

const app = express();
const server = http.createServer(app);
createSocketServer(server);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'TN Bus Tracker API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/alerts', alertRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT || 5000);
server.listen(port, () => {
  console.log(`TN Bus Tracker backend running on http://localhost:${port}`);
});
