import { Router } from 'express';
import { FunctionService } from '../services/functionService';
import { createHealthRoutes } from './health';
import { createWhatsAppRoutes } from './whatsapp';

export function createRoutes(functionService: FunctionService) {
  const router = Router();

  router.use('/health', createHealthRoutes());
  router.use('/whatsapp', createWhatsAppRoutes(functionService));

  return router;
}