import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid Authorization header');
        }

        const token = authHeader.split(' ')[1];

        try {
            // 1. Verify Firebase ID Token
            const decodedToken = await admin.auth().verifyIdToken(token);

            // 2. Fetch User Role directly from Firestore (Single Source of Truth)
            const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();

            if (!userDoc.exists) {
                throw new UnauthorizedException('User profile not found in database');
            }

            const userData = userDoc.data();

            // 3. Attach user data to request object
            request.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                role: userData?.role || 'user', // Default to 'user' if not set
                ...userData
            };

            return true;
        } catch (error) {
            console.error("Firebase Auth Error:", error);
            throw new UnauthorizedException('Invalid token');
        }
    }
}
