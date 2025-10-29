import { Router } from 'express';
import { HealthResponse } from '../types/ai';

export function createHealthRoutes() {
  const router = Router();

  // Health check route
  router.get('/', (req, res) => {
    const response: HealthResponse = {
      status: 'OK',
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  });

  return router;
}