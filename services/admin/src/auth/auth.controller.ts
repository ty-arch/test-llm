import { Body, Controller, Ip, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  async login(@Body() dto: LoginDto, @Ip() ip: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, ip, req.headers["user-agent"]);
    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/auth",
      maxAge: Number(process.env.REFRESH_EXPIRES_DAYS ?? 7) * 24 * 60 * 60 * 1000,
    });
    return { accessToken: result.accessToken };
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.refresh_token;
    if (!raw) throw new UnauthorizedException();
    const result = await this.authService.refresh(raw, ip, req.headers["user-agent"]);
    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
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

  // @Get("sessions") / @Post("sessions/:id/revoke") 在 Task 7 的 @CurrentUser 就绪后添加
}
