-- @param {BigInt} $1:id
DELETE FROM urls
WHERE id = $1;