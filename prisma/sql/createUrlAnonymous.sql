-- @param {String} $1:slug
-- @param {String} $2:originalUrl
INSERT INTO urls (slug, original_url, user_id, created_at, updated_at)
VALUES ($1, $2, NULL, NOW(), NOW())
RETURNING 
  id, 
  slug, 
  original_url AS "originalUrl", 
  user_id AS "userId", 
  created_at AS "createdAt", 
  updated_at AS "updatedAt";
