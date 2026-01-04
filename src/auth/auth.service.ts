
import { Injectable, BadRequestException } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
    constructor(
        private emailService: EmailService,
        private jwtService: JwtService,
    ) { }

    // --- JWT AUTHENTICATION --- //

    async getTokens(userId: string, email: string, role: string) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                { sub: userId, email, role },
                { secret: process.env.JWT_SECRET || 'secret', expiresIn: '15m' },
            ),
            this.jwtService.signAsync(
                { sub: userId, email, role },
                { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret', expiresIn: '7d' },
            ),
        ]);

        return { accessToken, refreshToken };
    }

    async updateRefreshToken(userId: string, refreshToken: string) {
        // In a real app, you should hash the token before saving
        // const hash = await argon2.hash(refreshToken);
        await admin.firestore().collection('users').doc(userId).update({
            refreshToken: refreshToken,
            isOnline: true,
            lastLogin: new Date().toISOString()
        });
    }

    async login(user: any) {
        const tokens = await this.getTokens(user.uid, user.email, user.role || 'member');
        await this.updateRefreshToken(user.uid, tokens.refreshToken);
        return tokens;
    }

    async logout(userId: string) {
        await admin.firestore().collection('users').doc(userId).update({
            refreshToken: null,
            isOnline: false
        });
        return { message: 'Logged out successfully' };
    }

    async refreshTokens(userId: string, refreshToken: string) {
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) throw new BadRequestException('User not found');

        const user = userDoc.data();
        if (!user || !user.refreshToken) throw new BadRequestException('Access Denied');

        // Simple string comparison (should be hash check in production)
        if (user.refreshToken !== refreshToken) throw new BadRequestException('Access Denied');

        const tokens = await this.getTokens(user.id || userId, user.email, user.role || 'member');
        await this.updateRefreshToken(user.id || userId, tokens.refreshToken);

        return tokens;
    }

    // --- EXISTING EMAIL LOGIC --- //

    async sendForgotPassword(email: string) {
        try {
            // 1. Generate Link Reset Password dari Firebase Admin SDK
            const firebaseLink = await admin.auth().generatePasswordResetLink(email);

            // 2. Extract oobCode from the Firebase link
            const urlParams = new URLSearchParams(firebaseLink.split('?')[1]);
            const oobCode = urlParams.get('oobCode');

            if (!oobCode) {
                throw new Error('Failed to generate reset code');
            }

            // 3. Construct Custom Frontend Link
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const customLink = `${frontendUrl}/reset-password?oobCode=${oobCode}`;

            // 4. Kirim via Email Service dengan Template Custom
            await this.emailService.sendResetPasswordEmail(email, customLink);

            return { message: 'Email sent successfully' };
        } catch (error: any) {
            throw new BadRequestException(error.message);
        }
    }

    async sendVerificationCode(email: string) {
        // Generate 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 mins expiry

        // Store in Firestore "pending_verifications"
        await admin.firestore().collection('pending_verifications').doc(email).set({
            code,
            expiresAt,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send Email
        await this.emailService.sendVerificationEmail(email, code);

        return { message: 'Verification code sent' };
    }

    async verifyCode(email: string, code: string) {
        const docRef = admin.firestore().collection('pending_verifications').doc(email);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            throw new BadRequestException('Verification code has expired or not found.');
        }

        const data = docSnap.data();
        if (!data) throw new BadRequestException('Data not found');
        const now = new Date();

        // Check Expiry
        if (data.expiresAt.toDate() < now) {
            throw new BadRequestException('Verification code has expired.');
        }

        // Check Code
        if (data.code !== code) {
            throw new BadRequestException('Invalid verification code.');
        }

        // Cleanup
        await docRef.delete();

        return { message: 'Verified successfully' };
    }
}
