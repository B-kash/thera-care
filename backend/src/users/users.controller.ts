import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/strategies/jwt.strategy';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.THERAPIST, UserRole.STAFF)
  findAll(@Req() req: Request & { user: RequestUser }) {
    return this.usersService.findAllSafe(req.user.tenantId);
  }

  /**
   * Clears TOTP + backup codes for another user in the same clinic (lost device).
   * Target user must re-enroll from Security. Does not change their password.
   */
  @Post(':id/two-factor/clear')
  @Roles(UserRole.ADMIN)
  adminClearTwoFactor(
    @Param('id', new ParseUUIDPipe()) targetUserId: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.usersService.adminClearTwoFactor(req.user, targetUserId);
  }
}
