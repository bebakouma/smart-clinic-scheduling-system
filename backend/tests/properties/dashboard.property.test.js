const fc = require('fast-check');
const dashboardService = require('../../src/services/dashboard.service');

// Mock prisma used directly in dashboard.service.js
jest.mock('../../src/config/database', () => ({
  prisma: {
    appointment: { count: jest.fn() },
    waitlistEntry: { count: jest.fn() }
  }
}));

const { prisma } = require('../../src/config/database');

describe('Dashboard Service - Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // Property 12: Dashboard summary accuracy
  // Validates: Requirements 9.1, 9.2, 9.3
  // The summary counts returned must exactly match the underlying
  // counts from the database for each category.
  // ============================================================
  describe('Property 12: Dashboard summary accuracy', () => {
    it('should return counts that exactly match the underlying data', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.record({
            today: fc.nat({ max: 1000 }),
            upcoming: fc.nat({ max: 1000 }),
            cancelled: fc.nat({ max: 1000 }),
            no_shows: fc.nat({ max: 1000 }),
            waitlist_active: fc.nat({ max: 1000 }),
            confirmed: fc.nat({ max: 1000 })
          }),
          async (counts) => {
            prisma.appointment.count.mockReset();
            prisma.waitlistEntry.count.mockReset();

            // getSummary calls appointment.count 5 times (in this order):
            // today, upcoming, cancelled, no_shows, confirmed
            // and waitlistEntry.count once (waitlist_active).
            prisma.appointment.count
              .mockResolvedValueOnce(counts.today)
              .mockResolvedValueOnce(counts.upcoming)
              .mockResolvedValueOnce(counts.cancelled)
              .mockResolvedValueOnce(counts.no_shows)
              .mockResolvedValueOnce(counts.confirmed);
            prisma.waitlistEntry.count.mockResolvedValueOnce(counts.waitlist_active);

            const summary = await dashboardService.getSummary();

            expect(summary.today).toBe(counts.today);
            expect(summary.upcoming).toBe(counts.upcoming);
            expect(summary.cancelled).toBe(counts.cancelled);
            expect(summary.no_shows).toBe(counts.no_shows);
            expect(summary.waitlist_active).toBe(counts.waitlist_active);
            expect(summary.confirmed).toBe(counts.confirmed);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should never return negative counts and always include all summary keys', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.array(fc.nat({ max: 500 }), { minLength: 6, maxLength: 6 }),
          async (nums) => {
            prisma.appointment.count.mockReset();
            prisma.waitlistEntry.count.mockReset();

            prisma.appointment.count
              .mockResolvedValueOnce(nums[0])
              .mockResolvedValueOnce(nums[1])
              .mockResolvedValueOnce(nums[2])
              .mockResolvedValueOnce(nums[3])
              .mockResolvedValueOnce(nums[4]);
            prisma.waitlistEntry.count.mockResolvedValueOnce(nums[5]);

            const summary = await dashboardService.getSummary();

            for (const key of ['today', 'upcoming', 'cancelled', 'no_shows', 'waitlist_active', 'confirmed']) {
              expect(summary).toHaveProperty(key);
              expect(summary[key]).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
