/** Access + refresh token pair returned by the auth flows. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Request metadata captured for refresh-token session audit. */
export interface RequestContext {
  ip: string | undefined;
  userAgent: string | undefined;
}

/** The authenticated principal attached to a request by {@link JwtStrategy}. */
export interface CurrentUser {
  id: number;
  role: string;
}

/** Decoded access-token payload (`sub` = user id). */
export interface JwtPayload {
  sub: number;
  role: string;
}
