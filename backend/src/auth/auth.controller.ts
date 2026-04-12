import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ACCESS_TOKEN_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { RequestUser } from './strategies/jwt.strategy';

const COOKIE_MAX_AGE_MS = Number(
  process.env.ACCESS_TOKEN_COOKIE_MAX_AGE_MS ?? 7 * 24 * 60 * 60 * 1000,
);

function setAccessTokenCookie(res: Response, accessToken: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    setAccessTokenCookie(res, result.accessToken);
    return result;
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    setAccessTokenCookie(res, result.accessToken);
    return result;
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: Request & { user: RequestUser }) {
    return this.authService.getProfile(req.user.userId);
  }
}
