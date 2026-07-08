-- @param {BigInt} $1:urlId
-- @param {String} $2:from
-- @param {String} $3:to
SELECT 
  TO_CHAR(created_at, 'YYYY-MM-DD') AS "date",
  COUNT(id) AS "count"
FROM click_events
WHERE url_id = $1
  AND (NULLIF($2, '') IS NULL OR created_at >= NULLIF($2, '')::TIMESTAMPTZ)
  AND (NULLIF($3, '') IS NULL OR created_at <= NULLIF($3, '')::TIMESTAMPTZ)
GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
ORDER BY "date" ASC;