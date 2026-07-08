-- @param {String} $1:slug
SELECT EXISTS (
  SELECT 1 FROM urls WHERE slug = $1
) AS "exists";