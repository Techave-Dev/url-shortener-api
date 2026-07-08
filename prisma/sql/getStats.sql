-- @param {BigInt} $1:urlId
-- @param {String} $2:from
-- @param {String} $3:to
SELECT 
  COUNT(id) AS "totalClicks"
FROM click_events
WHERE url_id = $1
  AND (NULLIF($2, '') IS NULL OR created_at >= NULLIF($2, '')::TIMESTAMPTZ)
  AND (NULLIF($3, '') IS NULL OR created_at <= NULLIF($3, '')::TIMESTAMPTZ);