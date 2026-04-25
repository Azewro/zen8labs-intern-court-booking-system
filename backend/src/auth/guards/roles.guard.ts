import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // Nếu API không gắn mác @Roles nào cả -> Ai cũng được vô
    if (!requiredRoles) {
      return true;
    }
    
    // Lấy thông tin user từ JWT (Đã được JwtAuthGuard nhét vào req trước đó)
    const { user } = context.switchToHttp().getRequest();
    
    // So sánh xem role của user hiện tại có nằm trong danh sách được phép không
    return requiredRoles.some((role) => user?.role === role);
  }
}
