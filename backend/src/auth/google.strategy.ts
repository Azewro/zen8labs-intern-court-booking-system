import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import * as https from 'https';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: 'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
      // Dùng custom agent để force IPv4, tránh ETIMEDOUT khi máy không route IPv6
      customHeaders: {},
    });

    // Force IPv4: Set custom HTTPS agent với family:4 trên oauth2 object
    // Tránh ETIMEDOUT khi Google trả về địa chỉ IPv6 mà máy không route được
    const oauth2 = (this as any)._oauth2;
    if (oauth2) {
      oauth2._agent = new https.Agent({ family: 4 } as any);
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, id } = profile;
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      googleId: id,
    };
    const verifiedUser = await this.authService.validateGoogleUser(user);
    done(null, verifiedUser);
  }
}
