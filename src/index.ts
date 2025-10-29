import express from 'express';
import cors from 'cors';
import { dependencyService } from './services/dependencyService';
import { createRoutes } from './routes';
import { config } from './config';

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/', createRoutes(dependencyService.functionService));

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 WhatsApp webhook endpoint: http://localhost:${PORT}/whatsapp`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

export default app;