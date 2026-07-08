-- @param {BigInt} $1:id
SELECT id, email, name, created_at AS "createdAt", updated_at AS "updatedAt"
FROM users
WHERE id = $1;