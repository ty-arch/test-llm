import { Body, Controller, Get, Ip, Param, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { CurrentUser, type AuthUser } from "./current-user.decorator";
import { Public } from "./public.decorator";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Get("health")
  health() {
    return { ok: true };
  }

  @Public()
  @Post("login")
  async login(@Body() dto: LoginDto, @Ip() ip: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, ip, req.headers["user-agent"]);
    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/auth",
      maxAge: Number(process.env.REFRESH_EXPIRES_DAYS ?? 7) * 24 * 60 * 60 * 1000,
    });
    return { accessToken: result.accessToken };
  }

  @Public()
  @Post("refresh")
  async refresh(@Req() req: Request, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.refresh_token;
    if (!raw) throw new UnauthorizedException();
    const result = await this.authService.refresh(raw, ip, req.headers["user-agent"]);
    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/auth",
      maxAge: Number(process.env.REFRESH_EXPIRES_DAYS ?? 7) * 24 * 60 * 60 * 1000,
    });
    return { accessToken: result.accessToken };
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.refresh_token);
    res.clearCookie("refresh_token", { path: "/auth" });
    return { ok: true };
  }

  @Get("sessions")
  async sessions(@CurrentUser() user: AuthUser) {
    return this.authService.sessions(user.id);
  }

  @Post("sessions/:id/revoke")
  async revokeSession(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.authService.revokeSession(user.id, id);
    return { ok: true };
  }

  @Get("me")
  async me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }
}
