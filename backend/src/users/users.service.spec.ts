import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@mail.com',
    fullName: 'Test User',
    password: 'hashed',
    role: 'USER',
    isActive: true,
    googleId: null,
    phoneNumber: '0901234567',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ===========================================================
  // findByEmail()
  // ===========================================================
  describe('findByEmail', () => {
    it('should return user if found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@mail.com');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@mail.com' },
      });
      expect(result?.email).toBe('test@mail.com');
    });

    it('should return null if email not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@mail.com');

      expect(result).toBeNull();
    });
  });

  // ===========================================================
  // findById()
  // ===========================================================
  describe('findById', () => {
    it('should return user if found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result?.id).toBe('user-1');
    });

    it('should return null if not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('ghost-id');

      expect(result).toBeNull();
    });
  });

  // ===========================================================
  // create()
  // ===========================================================
  describe('create', () => {
    it('should create user with provided data', async () => {
      prismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'test@mail.com',
        password: 'hashed',
        fullName: 'Test User',
      });

      expect(prismaService.user.create).toHaveBeenCalled();
      expect(result.email).toBe('test@mail.com');
    });
  });

  // ===========================================================
  // update()
  // ===========================================================
  describe('update', () => {
    it('should update user data successfully', async () => {
      prismaService.user.update.mockResolvedValue({ ...mockUser, fullName: 'Updated Name' });

      const result = await service.update('user-1', { fullName: 'Updated Name' });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { fullName: 'Updated Name' },
      });
      expect(result.fullName).toBe('Updated Name');
    });
  });

  // ===========================================================
  // findAll() — Admin view: search, filter, pagination
  // ===========================================================
  describe('findAll', () => {
    beforeEach(() => {
      prismaService.user.findMany.mockResolvedValue([mockUser]);
      prismaService.user.count.mockResolvedValue(1);
    });

    it('should return paginated list with correct meta', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should apply correct skip for page 3 with limit 5', async () => {
      await service.findAll({ page: 3, limit: 5 });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('should apply search filter on fullName, email, phoneNumber', async () => {
      await service.findAll({ search: 'test' });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ fullName: { contains: 'test', mode: 'insensitive' } }),
              expect.objectContaining({ email: { contains: 'test', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });

    it('should filter by role when role is not ALL', async () => {
      await service.findAll({ role: 'ADMIN' });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });

    it('should NOT filter by role when role is ALL', async () => {
      await service.findAll({ role: 'ALL' });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ role: expect.anything() }),
        }),
      );
    });

    it('should use correct default sort (createdAt desc)', async () => {
      await service.findAll({});

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  // ===========================================================
  // toggleStatus() — Admin quản lý user
  // ===========================================================
  describe('toggleStatus', () => {
    it('should toggle isActive from true to false', async () => {
      prismaService.user.findUnique.mockResolvedValue({ ...mockUser, isActive: true });
      prismaService.user.update.mockResolvedValue({ ...mockUser, isActive: false });

      await service.toggleStatus('user-1', 'admin-99');

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });

    it('should toggle isActive from false to true', async () => {
      prismaService.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });
      prismaService.user.update.mockResolvedValue({ ...mockUser, isActive: true });

      await service.toggleStatus('user-1', 'admin-99');

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: true } }),
      );
    });

    it('should throw ForbiddenException if admin tries to disable themselves', async () => {
      await expect(service.toggleStatus('admin-99', 'admin-99')).rejects.toThrow(ForbiddenException);
      // Không gọi DB nếu bị chặn sớm
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if target user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.toggleStatus('ghost-id', 'admin-99')).rejects.toThrow(NotFoundException);
    });
  });
});
