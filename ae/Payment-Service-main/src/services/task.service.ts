import prisma from '../../config/prisma';
import { TaskPaymentStatus } from '@prisma/client';

export interface Task {
  id?: number;
  taskId: string;
  userId: string; // User who created the task
  amount: number; // Amount in USDC
  budget: number; // Total budget including fees
  quantity: number; // Number of payments to be made
  feePercent: number; // Fee percentage (e.g., 2.5 for 2.5%)
  status?: TaskPaymentStatus; // pending, payment_done, paid_out, refunded, etc.
  txHash?: string; // Transaction hash for verification
  createdAt?: Date;
  updatedAt?: Date;
}

export class TaskService {
  /**
   * Create a new task
   */
  async createTask(task: Task): Promise<Task> {
    try {
      const created = await prisma.task.create({
        data: {
          taskId: task.taskId,
          userId: task.userId,
          amount: task.amount,
          budget: task.budget,
          quantity: task.quantity,
          feePercent: task.feePercent,
          status: task.status || 'pending',
        },
      });

      return {
        id: created.id,
        taskId: created.taskId,
        userId: created.userId,
        amount: Number(created.amount),
        budget: Number(created.budget),
        quantity: created.quantity,
        feePercent: Number(created.feePercent),
        status: created.status,
        txHash: created.txHash || undefined,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        throw new Error('Task with this task_id already exists');
      }
      throw error;
    }
  }

  /**
   * Get task by taskId
   */
  async getTaskById(taskId: string): Promise<Task | null> {
    const task = await prisma.task.findUnique({
      where: { taskId },
    });

    if (!task) return null;

    return {
      id: task.id,
      taskId: task.taskId,
      userId: task.userId,
      amount: Number(task.amount),
      budget: Number(task.budget),
      quantity: task.quantity,
      feePercent: Number(task.feePercent),
      status: task.status,
      txHash: task.txHash || undefined,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskPaymentStatus,
    txHash?: string
  ): Promise<Task> {
    try {
      const updated = await prisma.task.update({
        where: { taskId },
        data: {
          status,
          ...(txHash && { txHash }),
        },
      });

      return {
        id: updated.id,
        taskId: updated.taskId,
        userId: updated.userId,
        amount: Number(updated.amount),
        budget: Number(updated.budget),
        quantity: updated.quantity,
        feePercent: Number(updated.feePercent),
        status: updated.status,
        txHash: updated.txHash || undefined,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Record not found
        throw new Error('Task not found');
      }
      throw error;
    }
  }

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<Task[]> {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map((task) => ({
      id: task.id,
      taskId: task.taskId,
      userId: task.userId,
      amount: Number(task.amount),
      budget: Number(task.budget),
      quantity: task.quantity,
      feePercent: Number(task.feePercent),
      status: task.status,
      txHash: task.txHash || undefined,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
  }

  /**
   * Delete task by taskId
   */
  async deleteTask(taskId: string): Promise<boolean> {
    try {
      await prisma.task.delete({
        where: { taskId },
      });
      return true;
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Record not found
        return false;
      }
      throw error;
    }
  }

  /**
   * Get tasks by userId
   */
  async getTasksByUserId(userId: string): Promise<Task[]> {
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map((task) => ({
      id: task.id,
      taskId: task.taskId,
      userId: task.userId,
      amount: Number(task.amount),
      budget: Number(task.budget),
      quantity: task.quantity,
      feePercent: Number(task.feePercent),
      status: task.status,
      txHash: task.txHash || undefined,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: TaskPaymentStatus): Promise<Task[]> {
    const tasks = await prisma.task.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map((task) => ({
      id: task.id,
      taskId: task.taskId,
      userId: task.userId,
      amount: Number(task.amount),
      budget: Number(task.budget),
      quantity: task.quantity,
      feePercent: Number(task.feePercent),
      status: task.status,
      txHash: task.txHash || undefined,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
  }
}

export const taskService = new TaskService();
