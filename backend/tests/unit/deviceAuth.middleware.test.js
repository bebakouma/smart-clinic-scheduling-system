const { deviceAuth, tokensMatch } = require('../../src/middleware/deviceAuth');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(token) {
  return { get: jest.fn((name) => (name === 'X-Device-Token' ? token : undefined)) };
}

describe('Device token check (Task 24, temporary placeholder)', () => {
  const REAL_TOKEN = 'a-long-random-device-token-for-tests';
  let errorSpy;
  let logSpy;

  beforeEach(() => {
    process.env.DEVICE_TOKEN = REAL_TOKEN;
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.DEVICE_TOKEN;
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('should let a request with the correct token through', () => {
    const next = jest.fn();
    const res = makeRes();

    deviceAuth(makeReq(REAL_TOKEN), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject a request with no token (401)', () => {
    const next = jest.fn();
    const res = makeRes();

    deviceAuth(makeReq(undefined), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should reject a wrong token (401)', () => {
    const next = jest.fn();
    const res = makeRes();

    deviceAuth(makeReq('not-the-right-token'), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should reject a token that only differs in length (401)', () => {
    const next = jest.fn();
    const res = makeRes();

    deviceAuth(makeReq(`${REAL_TOKEN}x`), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should reject an empty token (401)', () => {
    const next = jest.fn();
    const res = makeRes();

    deviceAuth(makeReq(''), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should fail closed when DEVICE_TOKEN is not configured', () => {
    delete process.env.DEVICE_TOKEN;
    const next = jest.fn();
    const res = makeRes();

    // Even a request that sends some token (or an empty one) must be rejected.
    deviceAuth(makeReq('anything'), res, next);
    deviceAuth(makeReq(undefined), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should give the same response for a wrong token and a missing one', () => {
    const resWrong = makeRes();
    const resMissing = makeRes();

    deviceAuth(makeReq('wrong'), resWrong, jest.fn());
    deviceAuth(makeReq(undefined), resMissing, jest.fn());

    expect(resWrong.json.mock.calls[0][0]).toEqual(resMissing.json.mock.calls[0][0]);
  });

  it('should never put the real token or the supplied token in the response or logs', () => {
    const res = makeRes();

    deviceAuth(makeReq('guess-12345'), res, jest.fn());
    delete process.env.DEVICE_TOKEN;
    deviceAuth(makeReq('guess-12345'), makeRes(), jest.fn());

    const output = JSON.stringify(res.json.mock.calls)
      + errorSpy.mock.calls.map((a) => a.join(' ')).join('\n')
      + logSpy.mock.calls.map((a) => a.join(' ')).join('\n');
    expect(output).not.toContain(REAL_TOKEN);
    expect(output).not.toContain('guess-12345');
  });

  describe('tokensMatch', () => {
    it('should compare equal tokens as a match and different tokens as not', () => {
      expect(tokensMatch('abc', 'abc')).toBe(true);
      expect(tokensMatch('abc', 'abd')).toBe(false);
      expect(tokensMatch('abc', 'abcd')).toBe(false);
    });
  });
});
