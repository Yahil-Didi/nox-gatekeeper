import { Body, Controller, Delete, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import type { CookieOptions, Response } from 'express';
import { config } from '../config';
import { CurrentUser, SignedInUser } from './auth.types';
import { SessionGuard } from './session.guard';
import { SessionsService } from './sessions.service';

class SignInDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(200)
  password: string;
}

/**
 * The cookie can't be read by scripts (httpOnly) and isn't sent from other sites (SameSite=Strict),
 * which also blocks CSRF. Set COOKIE_SECURE=true behind HTTPS.
 */
const cookieOptions = (expires?: Date): CookieOptions => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: config.session.secureCookie,
  path: '/',
  expires,
});

/** Sign-in for admins and viewers: POST starts a session, DELETE ends it. */
@Controller('api/v1/sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  async signIn(@Body() body: SignInDto, @Res({ passthrough: true }) res: Response) {
    const { token, expiresAt } = await this.sessions.signIn(body.email, body.password);
    res.cookie(config.session.cookieName, token, cookieOptions(expiresAt));
    return { signedIn: true, expiresAt };
  }

  @Get('current')
  @UseGuards(SessionGuard)
  current(@CurrentUser() signedIn: SignedInUser) {
    return this.sessions.describe(signedIn);
  }

  @Delete('current')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async signOut(@CurrentUser() signedIn: SignedInUser, @Res({ passthrough: true }) res: Response) {
    await this.sessions.signOut(signedIn.tokenHash);
    res.clearCookie(config.session.cookieName, cookieOptions());
  }
}
