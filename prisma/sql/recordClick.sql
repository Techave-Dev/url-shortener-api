-- @param {BigInt} $1:urlId
-- @param {String} $2:referrer
-- @param {String} $3:userAgent
INSERT INTO click_events (url_id, referrer, user_agent, created_at)
VALUES ($1, $2, $3, NOW())
RETURNING id, url_id AS "urlId", referrer, user_agent AS "userAgent", created_at AS "createdAt";