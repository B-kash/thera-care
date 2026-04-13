import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TotpCryptoService } from './totp-crypto.service';
import { TwoFactorService } from './two-factor.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
            '7d') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: 'PRE_2FA_JWT',
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret:
            config.get<string>('PRE_2FA_JWT_SECRET')?.trim() ||
            `${config.getOrThrow<string>('JWT_SECRET')}.pre2fa`,
          signOptions: {
            expiresIn: '10m' as StringValue,
          },
        }),
      inject: [ConfigService],
    },
    TotpCryptoService,
    TwoFactorService,
    AuthService,
    JwtStrategy,
    RolesGuard,
  ],
  exports: [
    AuthService,
    JwtModule,
    PassportModule,
    RolesGuard,
    TwoFactorService,
  ],
})
export class AuthModule {}
