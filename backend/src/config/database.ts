import { DataSource } from 'typeorm';
import { Book } from '../entities/Book';
import { Thread } from '../entities/Thread';
import { User } from '../entities/User';
import dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'chapterone',
  synchronize: process.env.NODE_ENV !== 'production',
  dropSchema: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  entities: [Book, Thread, User],
  migrations: [],
  subscribers: [],
}); 