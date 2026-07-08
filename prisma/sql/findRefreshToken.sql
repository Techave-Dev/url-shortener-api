-- @param {String} $1:token
SELECT id, token, user_id AS "userId", expires_at AS "expiresAt", revoked, created_at AS "createdAt"
FROM refresh_tokens
WHERE token = $1;