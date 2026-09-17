import { OAuthStateStore } from './oauth-state.store';
import { RedisService } from '../../redis/redis.service';

describe('OAuthStateStore', () => {
  let store: OAuthStateStore;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(() => {
    redisService = {
      isReady: jest.fn().mockReturnValue(true),
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
    } as any;

    store = new OAuthStateStore(redisService);
  });

  it('should generate and persist a cryptographic state nonce', (done) => {
    const mockCookie = jest.fn();
    const req = { res: { cookie: mockCookie } };

    store.store(req, (err, state) => {
      expect(err).toBeNull();
      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state?.length).toBe(48); // 24 bytes hex = 48 chars
      expect(mockCookie).toHaveBeenCalledWith(
        'oauth_state',
        state,
        expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
      );
      expect(redisService.set).toHaveBeenCalledWith(`oauth:state:${state}`, '1', 600);
      done();
    });
  });

  it('should verify matching state and prevent replay (single-use)', (done) => {
    const req = { cookies: {}, res: { clearCookie: jest.fn() } };

    store.store(req, (err, state) => {
      expect(state).toBeDefined();

      // First verification: should succeed
      store.verify(req, state!, (vErr, ok) => {
        expect(vErr).toBeNull();
        expect(ok).toBe(true);

        // Second verification with same state: should fail (replay attack prevented)
        store.verify(req, state!, (vErr2, ok2) => {
          expect(vErr2).toBeNull();
          expect(ok2).toBe(false);
          done();
        });
      });
    });
  });

  it('should reject tampered or non-existent state nonces', (done) => {
    const req = { cookies: {}, res: { clearCookie: jest.fn() } };

    store.verify(req, 'malicious_or_tampered_nonce', (err, ok, info) => {
      expect(err).toBeNull();
      expect(ok).toBe(false);
      expect(info?.message).toContain('Invalid or expired');
      done();
    });
  });
});
