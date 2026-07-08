-- @param {BigInt} $1:userId
UPDATE refresh_tokens
SET revoked = true
WHERE user_id = $1;