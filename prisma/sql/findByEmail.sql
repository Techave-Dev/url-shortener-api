-- @param {String} $1:email
SELECT id, email, name, created_at AS "createdAt", updated_at AS "updatedAt"
FROM users
WHERE email = $1;