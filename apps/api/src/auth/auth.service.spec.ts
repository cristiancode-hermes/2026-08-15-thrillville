import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../entities/entities';

const makeUser = (over: Partial<User> = {}): User =>
  ({ id: 'usr-1', username: 'demo', email: 'demo@thrillville.dev', passwordHash: 'x', role: 'visitor', createdAt: new Date(), ...over }) as User;

describe('AuthService', () => {
  let usersRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let jwt: { sign: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    usersRepo = {
      findOne: jest.fn(),
      create: jest.fn((u) => u),
      save: jest.fn(async (u) => u),
    };
    jwt = { sign: jest.fn(() => 'jwt-token') };
    service = new AuthService(usersRepo as any, jwt as any as JwtService);
  });

  it('register crea usuario con password hasheado y devuelve token', async () => {
    usersRepo.findOne.mockResolvedValue(null);
    const res = await service.register({ username: 'nuevo', email: 'nuevo@x.com', password: 'secret1' });
    const saved = usersRepo.save.mock.calls[0][0];
    expect(saved.passwordHash).not.toBe('secret1');
    expect(await bcrypt.compare('secret1', saved.passwordHash)).toBe(true);
    expect(res.token).toBe('jwt-token');
    expect(res.user.username).toBe('nuevo');
    expect(res.user.role).toBe('visitor');
  });

  it('register rechaza email duplicado con 409', async () => {
    usersRepo.findOne.mockResolvedValue(makeUser());
    await expect(service.register({ username: 'nuevo', email: 'demo@thrillville.dev', password: 'secret1' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('login por username devuelve token', async () => {
    const hash = await bcrypt.hash('demo1234', 4);
    usersRepo.findOne.mockResolvedValue(makeUser({ passwordHash: hash }));
    const res = await service.login({ identifier: 'demo', password: 'demo1234' });
    expect(res.token).toBe('jwt-token');
  });

  it('login por email devuelve token', async () => {
    const hash = await bcrypt.hash('demo1234', 4);
    usersRepo.findOne.mockResolvedValue(makeUser({ passwordHash: hash }));
    const res = await service.login({ identifier: 'demo@thrillville.dev', password: 'demo1234' });
    expect(res.token).toBe('jwt-token');
    // busca por email normalizado
    expect(usersRepo.findOne.mock.calls[0][0].where[0]).toEqual({ email: 'demo@thrillville.dev' });
  });

  it('login con contraseña incorrecta lanza 401', async () => {
    usersRepo.findOne.mockResolvedValue(makeUser({ passwordHash: await bcrypt.hash('otra', 4) }));
    await expect(service.login({ identifier: 'demo', password: 'mala' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
