import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config(); // Đảm bảo đã load file .env

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // Khởi tạo Pool kết nối của thư viện pg
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    
    // Đưa Pool vào Adapter của Prisma 7
    const adapter = new PrismaPg(pool);
    
    // Gọi super và truyền adapter vào PrismaClient
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
