import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ACCESS_TOKEN_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';
import { CompleteLogin2faDto } from './dto/complete-login-2fa.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TotpSetupConfirmDto } from './dto/totp-setup-confirm.dto';
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
    if ('accessToken' in result) {
      setAccessTokenCookie(res, result.accessToken);
    }
    return result;
  }

  @Post('login/2fa')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async completeLogin2fa(
    @Body() dto: CompleteLogin2faDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.completeLoginWith2fa(dto);
    setAccessTokenCookie(res, result.accessToken);
    return result;
  }

  @Post('2fa/setup/start')
  @UseGuards(AuthGuard('jwt'))
  startTotpSetup(@Req() req: Request & { user: RequestUser }) {
    return this.authService.startTotpSetup(req.user.userId);
  }

  @Post('2fa/setup/confirm')
  @UseGuards(AuthGuard('jwt'))
  confirmTotpSetup(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: TotpSetupConfirmDto,
  ) {
    return this.authService.confirmTotpSetup(req.user.userId, dto);
  }

  @Post('2fa/setup/cancel')
  @UseGuards(AuthGuard('jwt'))
  cancelTotpSetup(@Req() req: Request & { user: RequestUser }) {
    return this.authService.cancelTotpSetup(req.user.userId);
  }

  @Post('2fa/disable')
  @UseGuards(AuthGuard('jwt'))
  disableTotp(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: Disable2faDto,
  ) {
    return this.authService.disableTotp(req.user.userId, dto);
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
