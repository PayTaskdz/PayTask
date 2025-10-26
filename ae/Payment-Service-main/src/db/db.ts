import { Pool, QueryResult } from 'pg';
import { config } from '../config';

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
    });

    // Test connection
    this.pool.on('connect', () => {
      console.log('Database connected successfully');
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async createDatabase(): Promise<void> {
    // Connect to default postgres database to create our database
    const adminPool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: 'postgres', // Connect to default postgres database
      user: config.database.user,
      password: config.database.password,
    });

    try {
      // Check if database exists
      const checkQuery = `
        SELECT 1 FROM pg_database WHERE datname = $1
      `;
      const result = await adminPool.query(checkQuery, [config.database.name]);

      if (result.rows.length === 0) {
        // Database doesn't exist, create it
        console.log(`Creating database: ${config.database.name}`);
        await adminPool.query(`CREATE DATABASE ${config.database.name}`);
        console.log(`Database ${config.database.name} created successfully`);
      } else {
        console.log(`Database ${config.database.name} already exists`);
      }
    } catch (error) {
      console.error('Error creating database:', error);
      throw error;
    } finally {
      await adminPool.end();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    console.log('Database connection pool closed');
  }
}

export const db = new Database();
