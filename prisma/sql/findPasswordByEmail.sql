-- @param {String} $1:email
SELECT id, password_hash AS "passwordHash"
FROM users
WHERE email = $1;