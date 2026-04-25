import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Biến hatsunemikudangyeu06102004@gmail.com thành ADMIN
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'hatsunemikudangyeu06102004@gmail.com' },
    update: { role: 'ADMIN' }, // Nếu có rồi thì đổi quyền thành ADMIN
    create: {
      // Nếu chưa có thì tạo mới
      email: 'hatsunemikudangyeu06102004@gmail.com',
      password: adminPassword,
      fullName: 'Super Admin',
      role: 'ADMIN',
    },
  });
  console.log('✅ Đã cấp quyền ADMIN cho: hatsunemikudangyeu06102004@gmail.com');

  // 2. Tạo tài khoản khách hàng heronguyen0610@gmail.com
  const userPassword = await bcrypt.hash('User@123', 10);
  await prisma.user.upsert({
    where: { email: 'heronguyen0610@gmail.com' },
    update: { role: 'USER' }, // Đảm bảo quyền là USER
    create: {
      email: 'heronguyen0610@gmail.com',
      password: userPassword,
      fullName: 'Hero Nguyen',
      role: 'USER',
    },
  });
  console.log('✅ Đã tạo tài khoản Khách cho: heronguyen0610@gmail.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
