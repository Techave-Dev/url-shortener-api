-- @param {BigInt} $1:urlId
SELECT 
  COALESCE(NULLIF(referrer, ''), 'direct') AS "referrer",
  COUNT(id) AS "count"
FROM click_events
WHERE url_id = $1
GROUP BY COALESCE(NULLIF(referrer, ''), 'direct')
ORDER BY "count" DESC;