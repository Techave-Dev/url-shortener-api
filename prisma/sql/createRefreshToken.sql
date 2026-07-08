-- @param {String} $1:token
-- @param {BigInt} $2:userId
-- @param {DateTime} $3:expiresAt
INSERT INTO refresh_tokens (token, user_id, expires_at, created_at, revoked)
VALUES ($1, $2, $3, NOW(), false)
RETURNING id, token, user_id AS "userId", expires_at AS "expiresAt", revoked, created_at AS "createdAt";