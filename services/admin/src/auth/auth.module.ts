import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule, type JwtSignOptions } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PasswordService } from "./password.service";
import { RefreshTokenService } from "./refresh-token.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        // JWT_EXPIRES_IN is a string from env; @nestjs/jwt types it as number | StringValue.
        signOptions: { expiresIn: (config.get<string>("JWT_EXPIRES_IN") ?? "15m") as JwtSignOptions["expiresIn"] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, RefreshTokenService],
})
export class AuthModule {}
