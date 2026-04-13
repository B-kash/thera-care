import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/strategies/jwt.strategy';
import { auditContextFromRequest } from '../audit/audit-request.util';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Req() req: Request & { user: RequestUser },
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.listForAdmin(req.user.tenantId, query);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @Body() dto: CreateUserDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.usersService.create(dto, auditContextFromRequest(req));
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.usersService.update(id, dto, auditContextFromRequest(req));
  }

  /**
   * Clears TOTP + backup codes for another user in the same clinic (lost device).
   * Target user must re-enroll from Security. Does not change their password.
   */
  @Post(':id/two-factor/clear')
  @Roles(UserRole.ADMIN)
  adminClearTwoFactor(
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.usersService.adminClearTwoFactor(req.user, targetUserId);
  }
}
