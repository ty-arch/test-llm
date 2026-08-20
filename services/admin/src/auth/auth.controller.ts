import { Body, Controller, Ip, Post, Req, Res } from "@nestjs/common";
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
}
