function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({ data });
}

module.exports = { success };
