import { z } from 'zod';

// Query parameters schema for task discovery
export const TaskDiscoveryQuerySchema = z.object({
  category: z.string().optional(),
  minReward: z.coerce.number().min(0).optional(),
  maxReward: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['createdAt', 'reward', 'deadline']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TaskDiscoveryQuery = z.infer<typeof TaskDiscoveryQuerySchema>;

// Response types
export interface TaskDiscoveryItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  reward: string;
  qty: number;
  deadline: string | null;
  status: string;
  createdAt: string;
  client: {
    id: string;
    email: string;
  };
  _count: {
    assignments: number;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TaskDiscoveryResponse {
  success: boolean;
  data: {
    data: TaskDiscoveryItem[];
    pagination: PaginationMeta;
  };
}

