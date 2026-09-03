const appointmentsRepo = require('../../src/repositories/appointments.repository');
const { prisma } = require('../../src/config/database');

jest.mock('../../src/config/database', () => ({
  prisma: { appointment: { findFirst: jest.fn() } }
}));

describe('findConflict - no_show handling', () => {
  it('should exclude no_show appointments from conflict search', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);

    await appointmentsRepo.findConflict('Dr. Smith', new Date(), new Date());

    const passedWhere = prisma.appointment.findFirst.mock.calls[0][0].where;
    expect(passedWhere.status.notIn).toContain('no_show');
  });
});
