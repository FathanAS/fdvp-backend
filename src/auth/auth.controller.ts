
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('forgot-password')
    async forgotPassword(@Body('email') email: string) {
        return this.authService.sendForgotPassword(email);
    }

    @Post('send-verification')
    async sendVerification(@Body('email') email: string) {
        return this.authService.sendVerificationCode(email);
    }

    @Post('verify-code')
    async verifyCode(@Body() body: { email: string; code: string }) {
        return this.authService.verifyCode(body.email, body.code);
    }

    // --- JWT ENDPOINTS --- //

    @Post('login')
    async login(@Body() body: any) {
        // Body expected: { uid: string, email: string, role?: string } 
        // In real world, verify Firebase Token first here or use Guard
        return this.authService.login(body);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('logout')
    async logout(@Req() req: any) {
        return this.authService.logout(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt-refresh'))
    @Post('refresh')
    async refreshTokens(@Req() req: any) {
        const userId = req.user.sub;
        const refreshToken = req.user.refreshToken;
        return this.authService.refreshTokens(userId, refreshToken);
    }
}
