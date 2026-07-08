-- @param {String} $1:slug
SELECT 
  id, 
  slug, 
  original_url AS "originalUrl", 
  user_id AS "userId",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM urls
WHERE slug = $1;