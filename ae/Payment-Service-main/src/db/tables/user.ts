import { db } from '../db';

export interface User {
  id?: number;
  user_id: string;
  wallet_address: string;
  created_at?: Date;
  updated_at?: Date;
}

export const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    wallet_address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
`;

export class UserService {
  async createUser(user: User): Promise<User> {
    const query = `
      INSERT INTO users (user_id, wallet_address)
      VALUES ($1, $2)
      RETURNING *
    `;
    const values = [user.user_id, user.wallet_address];
    
    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new Error('User with this user_id already exists');
      }
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE wallet_address = $1';
    const result = await db.query(query, [walletAddress]);
    return result.rows[0] || null;
  }

  async getAllUsers(): Promise<User[]> {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    const result = await db.query(query);
    return result.rows;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    return (result.rowCount || 0) > 0;
  }
}

export const userService = new UserService();
