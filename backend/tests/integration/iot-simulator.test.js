const app = require('../../src/app');
const deviceService = require('../../src/services/device.service');
const simulator = require('../../../scripts/iot-device-simulator');

jest.mock('../../src/config/database', () => ({
  prisma: {
    appointment: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

const { prisma } = require('../../src/config/database');

const TOKEN = 'simulator-test-device-token';

// Run the simulator's main() and capture what it prints.
async function runSimulator(argv, envOverrides = {}, extra = {}) {
  const lines = [];
  const code = await simulator.main({
    argv,
    env: { DEVICE_TOKEN: TOKEN, ...envOverrides },
    log: (line) => lines.push(line),
    sleep: async () => {},
    ...extra
  });
  return { code, output: lines.join('\n') };
}

describe('IoT device simulator (Task 24)', () => {
  describe('helpers', () => {
    it('should parse a command, positional arguments and options', () => {
      const parsed = simulator.parseArgs(['run', '--codes', 'A,B', '--interval', '5']);

      expect(parsed.command).toBe('run');
      expect(parsed.options).toEqual({ codes: 'A,B', interval: '5' });
    });

    it('should reject an option that has no value', () => {
      expect(() => simulator.parseArgs(['run', '--interval'])).toThrow('needs a value');
    });

    it('should build a check-in event and an occupancy event', () => {
      const checkin = simulator.buildEvent('dev-1', 'checkin', 'K7QM4XWD');
      const occupancy = simulator.buildEvent('dev-1', 'occupancy', 3);

      expect(checkin).toMatchObject({ deviceId: 'dev-1', type: 'checkin', confirmationCode: 'K7QM4XWD' });
      expect(occupancy).toMatchObject({ deviceId: 'dev-1', type: 'occupancy', count: 3 });
      expect(new Date(checkin.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should mask a confirmation code for display', () => {
      expect(simulator.maskCode('K7QM4XWD')).toBe('K7******');
    });
  });

  describe('sending events (fake network)', () => {
    it('should send the token in the X-Device-Token header only', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { accepted: true } })
      });
      const event = simulator.buildEvent('dev-1', 'occupancy', 2);

      await simulator.sendEvent(event, { url: 'http://localhost:3000/x', token: TOKEN, fetchImpl });

      const [, options] = fetchImpl.mock.calls[0];
      expect(options.headers['X-Device-Token']).toBe(TOKEN);
      expect(options.body).not.toContain(TOKEN);
    });

    it('should report a network failure as status 0 instead of throwing', async () => {
      const fetchImpl = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      const event = simulator.buildEvent('dev-1', 'occupancy', 2);

      const result = await simulator.sendEvent(event, { url: 'http://localhost:1/x', token: TOKEN, fetchImpl });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(0);
      expect(result.error).toContain('Could not reach the backend');
    });
  });

  describe('command line behavior', () => {
    it('should refuse to start without DEVICE_TOKEN', async () => {
      const fetchImpl = jest.fn();

      const { code, output } = await runSimulator(['occupancy', '3'], { DEVICE_TOKEN: '' }, { fetchImpl });

      expect(code).toBe(2);
      expect(output).toContain('DEVICE_TOKEN is not set');
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('should show usage for an unknown command', async () => {
      const { code, output } = await runSimulator(['explode']);

      expect(code).toBe(2);
      expect(output).toContain('Unknown command');
      expect(output).toContain('Usage:');
    });

    it('should reject a bad occupancy count', async () => {
      const { code } = await runSimulator(['occupancy', 'lots']);

      expect(code).toBe(2);
    });

    it('should warn when the URL is not local and does not use TLS', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: {} }) });

      const { output } = await runSimulator(
        ['occupancy', '1'],
        { DEVICE_API_URL: 'http://clinic.example.com/api/device/events' },
        { fetchImpl }
      );

      expect(output).toContain('does not use TLS');
    });

    it('should not warn for a local URL', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: {} }) });

      const { output } = await runSimulator(['occupancy', '1'], {}, { fetchImpl });

      expect(output).not.toContain('TLS');
    });

    it('should never print the device token', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Device authentication required' } })
      });

      const { output } = await runSimulator(['checkin', 'K7QM4XWD'], {}, { fetchImpl });

      expect(output).not.toContain(TOKEN);
      expect(output).not.toContain('K7QM4XWD'); // the code is masked too
    });
  });

  describe('against the real backend over HTTP', () => {
    let server;
    let url;
    let errorSpy;

    beforeAll((done) => {
      process.env.DEVICE_TOKEN = TOKEN;
      server = app.listen(0, '127.0.0.1', () => {
        url = `http://127.0.0.1:${server.address().port}/api/device/events`;
        done();
      });
    });

    afterAll((done) => {
      delete process.env.DEVICE_TOKEN;
      server.close(done);
    });

    beforeEach(() => {
      jest.clearAllMocks();
      deviceService._reset();
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => errorSpy.mockRestore());

    it('should deliver an occupancy event that the backend accepts', async () => {
      const { code, output } = await runSimulator(['occupancy', '6'], { DEVICE_API_URL: url });

      expect(code).toBe(0);
      expect(output).toContain('-> 200 OK');
      expect(deviceService.getOccupancy()[0]).toMatchObject({ deviceId: 'sim-device-1', count: 6 });
    });

    it('should check a patient in when the device scans a valid code', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 9, status: 'scheduled', checked_in: false, confirmation_code: 'K7QM4XWD'
      });
      prisma.appointment.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: 9, ...data })
      );

      const { code, output } = await runSimulator(['checkin', 'K7QM4XWD'], { DEVICE_API_URL: url });

      expect(code).toBe(0);
      expect(output).toContain('-> 200 OK (checked_in)');
      expect(prisma.appointment.update.mock.calls[0][0].data.checked_in).toBe(true);
    });

    it('should report a rejection and exit with an error when the token is wrong', async () => {
      const { code, output } = await runSimulator(
        ['occupancy', '2'],
        { DEVICE_API_URL: url, DEVICE_TOKEN: 'not-the-right-token' }
      );

      expect(code).toBe(1);
      expect(output).toContain('401');
      expect(deviceService.getOccupancy()).toHaveLength(0);
    });

    it('should report a rejected scan for an unknown code', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      const { code, output } = await runSimulator(['checkin', 'ZZZZZZZZ'], { DEVICE_API_URL: url });

      expect(code).toBe(1);
      expect(output).toContain('404');
    });

    it('should run a short session: scan two codes and report a growing waiting room', async () => {
      prisma.appointment.findUnique.mockImplementation(({ where }) =>
        Promise.resolve({ id: 1, status: 'scheduled', checked_in: false, confirmation_code: where.confirmation_code })
      );
      prisma.appointment.update.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));

      const { code, output } = await runSimulator(
        ['run', '--codes', 'AAAAAAAA,BBBBBBBB', '--ticks', '3', '--interval', '1', '--start-count', '2'],
        { DEVICE_API_URL: url }
      );

      expect(code).toBe(0);
      expect(output).toContain('done, 0 failed event(s)');
      // 2 people were already waiting, then 2 scans: 3 and 4, then no more scans.
      expect(deviceService.getOccupancy()[0].count).toBe(4);
      expect(prisma.appointment.update).toHaveBeenCalledTimes(2);
    });
  });
});
