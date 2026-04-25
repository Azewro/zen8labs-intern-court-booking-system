import { SetMetadata } from '@nestjs/common';

// Tạo custom decorator @Roles('ADMIN') để gắn mác cho các API
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
