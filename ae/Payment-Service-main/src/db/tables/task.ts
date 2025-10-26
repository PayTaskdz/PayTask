import { db } from '../db';

export interface Task {
  id?: number;
  task_id: string;
  user_id: string; // User who created the task
  amount: number; // Amount in USDC
  budget: number; // Total budget including fees
  quantity: number; // Number of payments to be made
  fee_percent: number; // Fee percentage (e.g., 2.5 for 2.5%)
  status?: string; // pending, payment_done, paid_out, refunded, etc.
  tx_hash?: string; // Transaction hash for verification
  created_at?: Date;
  updated_at?: Date;
}

export const CREATE_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    budget DECIMAL(20, 2) NOT NULL,
    quantity INT NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    fee_percent DECIMAL(5, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    tx_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_task_id ON tasks(task_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
`;

export class TaskService {
  async createTask(task: Task): Promise<Task> {
    const query = `
      INSERT INTO tasks (task_id, user_id, amount, fee_percent, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [task.task_id, task.user_id, task.amount, task.fee_percent, task.status || 'pending'];
    
    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Task with this task_id already exists');
      }
      throw error;
    }
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE task_id = $1';
    const result = await db.query(query, [taskId]);
    return result.rows[0] || null;
  }

  async updateTaskStatus(taskId: string, status: string, txHash?: string): Promise<Task> {
    const query = txHash
      ? `UPDATE tasks SET status = $2, tx_hash = $3, updated_at = CURRENT_TIMESTAMP WHERE task_id = $1 RETURNING *`
      : `UPDATE tasks SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE task_id = $1 RETURNING *`;
    
    const values = txHash ? [taskId, status, txHash] : [taskId, status];
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Task not found');
    }
    
    return result.rows[0];
  }

  async getAllTasks(): Promise<Task[]> {
    const query = 'SELECT * FROM tasks ORDER BY created_at DESC';
    const result = await db.query(query);
    return result.rows;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const query = 'DELETE FROM tasks WHERE task_id = $1';
    const result = await db.query(query, [taskId]);
    return (result.rowCount || 0) > 0;
  }
}

export const taskService = new TaskService();
