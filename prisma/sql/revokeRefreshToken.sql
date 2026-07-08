-- @param {String} $1:token
UPDATE refresh_tokens
SET revoked = true
WHERE token = $1;