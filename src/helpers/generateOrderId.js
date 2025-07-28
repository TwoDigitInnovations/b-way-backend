function generateShortOrderId(id) {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const millis = String(now.getMilliseconds()).padStart(3, '0');
  const random = Math.floor(Math.random() * 100);

  return `ORD-${hour}${minute}${millis}${random}`;
}

module.exports = generateShortOrderId;
