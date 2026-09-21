import * as crypto from 'crypto';
import { RedisService } from '../../redis/redis.service';

/**
 * Stateless, CSRF-resistant OAuth state store supporting Redis and in-memory fallback.
 * Eliminates express-session requirement while strictly validating OAuth state nonces.
 */
export class OAuthStateStore {
  private static readonly inMemoryStore = new Map<string, number>();

  constructor(private readonly redisService?: RedisService) {}

  /**
   * Generates and stores a cryptographically secure random state nonce.
   * Formal parameter count must be exactly 2 for Passport arity detection.
   */
  store(req: any, callback: (err: any, state?: string) => void): void {
    const state = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    OAuthStateStore.inMemoryStore.set(state, expiresAt);

    if (this.redisService?.isReady()) {
      this.redisService
        .set(`oauth:state:${state}`, '1', 600)
        .catch(() => {});
    }

    // Set HttpOnly cookie on response if available
    const res = req?.res;
    if (res && typeof res.cookie === 'function') {
      res.cookie('oauth_state', state, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 600 * 1000,
        path: '/',
      });
    }

    // Periodic sweep of expired memory entries
    if (OAuthStateStore.inMemoryStore.size > 500) {
      const now = Date.now();
      for (const [k, exp] of OAuthStateStore.inMemoryStore.entries()) {
        if (exp < now) OAuthStateStore.inMemoryStore.delete(k);
      }
    }

    callback(null, state);
  }

  /**
   * Verifies the incoming state parameter against stored nonces.
   * Formal parameter count must be exactly 3 for Passport arity detection.
   */
  verify(req: any, providedState: string, callback: (err: any, ok?: boolean, info?: any) => void): void {
    if (!providedState) {
      return callback(null, false, { message: 'Missing OAuth state parameter.' });
    }

    let isValid = false;

    // 1. Check in-memory nonce
    const memoryExp = OAuthStateStore.inMemoryStore.get(providedState);
    if (memoryExp && memoryExp > Date.now()) {
      isValid = true;
      OAuthStateStore.inMemoryStore.delete(providedState);
    }

    // 2. Check cookie nonce
    const cookieState = req?.cookies?.['oauth_state'];
    if (cookieState && cookieState === providedState) {
      isValid = true;
    }

    // Clear state cookie
    if (req?.res && typeof req.res.clearCookie === 'function') {
      req.res.clearCookie('oauth_state', { path: '/' });
    }

    // 3. Check Redis if available and memory didn't match
    if (!isValid && this.redisService?.isReady()) {
      this.redisService
        .get(`oauth:state:${providedState}`)
        .then((val) => {
          if (val) {
            this.redisService?.del(`oauth:state:${providedState}`).catch(() => {});
            return callback(null, true);
          }
          return callback(null, false, { message: 'Invalid or expired authorization request state.' });
        })
        .catch(() => {
          return callback(null, false, { message: 'Failed to verify authorization state.' });
        });
      return;
    }

    if (!isValid) {
      return callback(null, false, { message: 'Invalid or expired authorization request state.' });
    }

    return callback(null, true);
  }
}
