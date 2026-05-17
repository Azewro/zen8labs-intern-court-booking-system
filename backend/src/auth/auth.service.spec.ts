import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { HttpException } from '@nestjs/common';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));
import * as bcrypt from 'bcrypt';
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: any;
  let jwtService: any;
  let mailService: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@mail.com',
    password: 'hashed-password',
    fullName: 'Test User',
    role: 'USER',
    isActive: true,
    googleId: null,
    phoneNumber: null,
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn(),
    };
    mailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ===========================================================
  // register()
  // ===========================================================
  describe('register', () => {
    const dto = { email: 'new@mail.com', password: 'pass123', full_name: 'New User' };

    it('should hash password and return user without password field', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);

      const result = await service.register(dto);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('pass123', 10);
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('test@mail.com');
    });

    it('should throw HttpException (400) if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(dto)).rejects.toThrow(HttpException);
      await expect(service.register(dto)).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  // ===========================================================
  // login()
  // ===========================================================
  describe('login', () => {
    const dto = { email: 'test@mail.com', password: 'pass123' };

    it('should return access_token on successful login', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.login(dto);

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', email: 'test@mail.com', role: 'USER' }),
      );
    });

    it('should throw 401 if email not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toMatchObject({ status: 401 });
    });

    it('should throw 403 if account is deactivated', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.login(dto)).rejects.toMatchObject({ status: 403 });
    });

    it('should throw 401 if user has no password (Google account)', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, password: null });

      await expect(service.login(dto)).rejects.toMatchObject({ status: 401 });
    });

    it('should throw 401 if password is wrong', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(dto)).rejects.toMatchObject({ status: 401 });
    });
  });

  // ===========================================================
  // getMe()
  // ===========================================================
  describe('getMe', () => {
    it('should return user info without password field', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.getMe('user-1');

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('test@mail.com');
    });

    it('should throw HttpException (404) if user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.getMe('ghost-id')).rejects.toMatchObject({ status: 404 });
    });
  });

  // ===========================================================
  // changePassword()
  // ===========================================================
  describe('changePassword', () => {
    it('should change password successfully', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      usersService.update.mockResolvedValue({});

      const result = await service.changePassword('user-1', {
        oldPassword: 'oldpass',
        newPassword: 'newpass123',
      });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpass123', 10);
      expect(result).toHaveProperty('message');
    });

    it('should throw 400 if Google account tries to change password', async () => {
      usersService.findById.mockResolvedValue({ ...mockUser, password: null });

      await expect(
        service.changePassword('user-1', { oldPassword: 'x', newPassword: 'y' }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('should throw 400 if old password is wrong', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.changePassword('user-1', { oldPassword: 'wrong', newPassword: 'new' }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  // ===========================================================
  // forgotPassword()
  // ===========================================================
  describe('forgotPassword', () => {
    it('should send reset email and return success message', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('reset-token');

      const result = await service.forgotPassword('test@mail.com');

      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@mail.com',
        'reset-token',
      );
      expect(result).toHaveProperty('message');
    });

    it('should throw 404 if email not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.forgotPassword('no@mail.com')).rejects.toMatchObject({ status: 404 });
    });

    it('should throw 400 if Google account tries to reset password', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, password: null });

      await expect(service.forgotPassword('test@mail.com')).rejects.toMatchObject({ status: 400 });
    });
  });

  // ===========================================================
  // resetPassword()
  // ===========================================================
  describe('resetPassword', () => {
    it('should reset password successfully with valid token', async () => {
      jwtService.verify.mockReturnValue({ email: 'test@mail.com', purpose: 'reset-password' });
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.update.mockResolvedValue({});

      const result = await service.resetPassword({ token: 'valid-token', newPassword: 'newpass' });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpass', 10);
      expect(result).toHaveProperty('message');
    });

    it('should throw 400 if token is invalid or expired', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('jwt expired'); });

      await expect(
        service.resetPassword({ token: 'bad-token', newPassword: 'x' }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('should throw 400 if token purpose is not reset-password', async () => {
      jwtService.verify.mockReturnValue({ email: 'test@mail.com', purpose: 'other' });

      await expect(
        service.resetPassword({ token: 'wrong-purpose-token', newPassword: 'x' }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
