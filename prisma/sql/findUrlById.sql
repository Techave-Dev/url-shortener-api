-- @param {BigInt} $1:id
SELECT
  id, 
  slug,
  original_url AS "originalUrl",
  user_id AS "userId",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM urls
WHERE id = $1;