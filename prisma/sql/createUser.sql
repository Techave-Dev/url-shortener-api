-- @param {String} $1:email
-- @param {String} $2:passwordHash
-- @param {String} $3:name
INSERT INTO users (email, password_hash, name, created_at, updated_at)
VALUES ($1, $2, $3, NOW(), NOW())
RETURNING id, email, name, created_at AS "createdAt", updated_at AS "updatedAt";