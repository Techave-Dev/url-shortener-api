-- @param {BigInt} $1:urlId
SELECT COUNT(id) AS "totalClicks"
FROM click_events
WHERE url_id = $1;