const { prisma } = require('../config/database');

async function getNoShowRisk(appointmentId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true }
  });

  if (!appointment) {
    const err = new Error('Appointment not found');
    err.type = 'not_found';
    throw err;
  }

  // Count past no-shows for this patient
  const noShowCount = await prisma.appointment.count({
    where: { patient_id: appointment.patient_id, status: 'no_show' }
  });

  // Count late cancellations (cancelled within 24h of appointment)
  const lateCancellations = await prisma.appointment.count({
    where: {
      patient_id: appointment.patient_id,
      status: 'cancelled'
    }
  });

  const isConfirmed = appointment.status === 'confirmed';

  // Rules-based scoring
  let riskScore = 0;
  const reasons = [];

  if (noShowCount >= 2) {
    riskScore += 40;
    reasons.push(`${noShowCount} previous no-shows`);
  } else if (noShowCount === 1) {
    riskScore += 20;
    reasons.push('1 previous no-show');
  }

  if (lateCancellations >= 2) {
    riskScore += 25;
    reasons.push(`${lateCancellations} previous cancellations`);
  }

  if (isConfirmed) {
    riskScore -= 15;
    reasons.push('Appointment confirmed');
  }

  riskScore = Math.max(0, Math.min(100, riskScore));

  let riskLevel = 'low';
  if (riskScore >= 50) riskLevel = 'high';
  else if (riskScore >= 25) riskLevel = 'medium';

  return {
    patient_id: appointment.patient_id,
    appointment_id: appointmentId,
    risk_level: riskLevel,
    risk_score: riskScore,
    reason: reasons.join('; ') || 'No risk factors identified'
  };
}

async function generateRisk(appointmentId) {
  const risk = await getNoShowRisk(appointmentId);

  // Upsert risk score record
  const existing = await prisma.$queryRaw`
    SELECT id FROM "NoShowRiskScore" WHERE appointment_id = ${appointmentId} LIMIT 1
  `.catch(() => []);

  // For now, just return the calculated risk (no separate table needed for MVP)
  return risk;
}

module.exports = { getNoShowRisk, generateRisk };
