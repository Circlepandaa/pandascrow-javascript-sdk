import type { ApiData } from '../http';
import { Resource } from './base';

/**
 * Dashboard-style login. Integrations normally only need the API key; use this
 * when you need a user's uuid from their email and password.
 */
export class Auth extends Resource {
  /** Returns the user (including `uuid`), or a flag saying an OTP / 2FA step is needed. */
  login(email: string, password: string): Promise<ApiData> {
    return this.http.post('/login', { email, password });
  }

  /** Second step when login asked for an OTP. */
  verifyLoginOtp(email: string, otp: string): Promise<ApiData> {
    return this.http.post('/login/otp', { email, otp_code: otp });
  }
}
