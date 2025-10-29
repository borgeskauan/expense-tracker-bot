import { Router } from 'express';
import { HealthResponse } from '../types/ai';

export function createHealthRoutes() {
  const router = Router();

  // Health check route
  router.get('/', (req, res) => {
    const response: HealthResponse = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      features: ['chat', 'function_calling', 'math_operations', 'multi_step_reasoning']
    };
    
    res.json(response);
  });

  return router;
}