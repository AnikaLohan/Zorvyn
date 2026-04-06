const createApp = require('./app');
const { PORT } = require('./config/constants');
const { getDatabase } = require('./config/database');

// Initialize database on startup
getDatabase();

const app = createApp();

app.listen(PORT, () => {
  console.log(`Finance Dashboard API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
