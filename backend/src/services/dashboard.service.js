const { prisma } = require('../config/database');

async function getSummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayCount, upcomingCount, cancelledCount, noShowCount, waitlistCount, confirmedCount] = await Promise.all([
    prisma.appointment.count({
      where: { appointment_datetime: { gte: today, lt: tomorrow } }
    }),
    prisma.appointment.count({
      where: { appointment_datetime: { gte: tomorrow }, status: { not: 'cancelled' } }
    }),
    prisma.appointment.count({
      where: { status: 'cancelled' }
    }),
    prisma.appointment.count({
      where: { status: 'no_show' }
    }),
    prisma.waitlistEntry.count({
      where: { status: 'waiting' }
    }),
    prisma.appointment.count({
      where: { confirmation_status: 'confirmed', status: { not: 'cancelled' } }
    })
  ]);

  return {
    today: todayCount,
    upcoming: upcomingCount,
    cancelled: cancelledCount,
    no_shows: noShowCount,
    waitlist_active: waitlistCount,
    confirmed: confirmedCount
  };
}

async function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.appointment.findMany({
    where: { appointment_datetime: { gte: today, lt: tomorrow } },
    include: { patient: true },
    orderBy: { appointment_datetime: 'asc' }
  });
}

async function getNoShows() {
  return prisma.appointment.findMany({
    where: { status: 'no_show' },
    include: { patient: true },
    orderBy: { appointment_datetime: 'desc' }
  });
}

module.exports = { getSummary, getToday, getNoShows };
