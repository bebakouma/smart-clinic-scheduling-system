const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create patients
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        first_name: 'John',
        last_name: 'Smith',
        date_of_birth: new Date('1985-03-15'),
        phone: '555-0101',
        email: 'john.smith@example.com',
        preferred_contact_method: 'email'
      }
    }),
    prisma.patient.create({
      data: {
        first_name: 'Jane',
        last_name: 'Doe',
        date_of_birth: new Date('1990-07-22'),
        phone: '555-0102',
        email: 'jane.doe@example.com',
        preferred_contact_method: 'sms'
      }
    }),
    prisma.patient.create({
      data: {
        first_name: 'Robert',
        last_name: 'Johnson',
        date_of_birth: new Date('1978-11-08'),
        phone: '555-0103',
        email: 'r.johnson@example.com',
        preferred_contact_method: 'phone'
      }
    })
  ]);

  console.log(`Created ${patients.length} patients`);

  // Create appointments (future dates)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);

  const appointments = await Promise.all([
    prisma.appointment.create({
      data: {
        patient_id: patients[0].id,
        provider_name: 'Dr. Williams',
        appointment_type: 'General Checkup',
        appointment_datetime: tomorrow,
        status: 'scheduled'
      }
    }),
    prisma.appointment.create({
      data: {
        patient_id: patients[1].id,
        provider_name: 'Dr. Brown',
        appointment_type: 'Follow-up',
        appointment_datetime: nextWeek,
        status: 'confirmed'
      }
    }),
    prisma.appointment.create({
      data: {
        patient_id: patients[2].id,
        provider_name: 'Dr. Williams',
        appointment_type: 'General Checkup',
        appointment_datetime: tomorrow,
        status: 'scheduled',
        notes: 'Patient requested morning slot'
      }
    })
  ]);

  console.log(`Created ${appointments.length} appointments`);

  // Create waitlist entry
  const waitlistEntry = await prisma.waitlistEntry.create({
    data: {
      patient_id: patients[1].id,
      requested_appointment_type: 'General Checkup',
      preferred_date: tomorrow,
      preferred_time_range: 'morning',
      status: 'waiting'
    }
  });

  console.log('Created 1 waitlist entry');

  // Create intake form
  const intakeForm = await prisma.intakeForm.create({
    data: {
      patient_id: patients[0].id,
      appointment_id: appointments[0].id,
      reason_for_visit: 'Annual physical exam',
      insurance_provider: 'Blue Cross',
      insurance_member_id: 'BC-12345',
      allergies: 'Penicillin',
      medications: 'Lisinopril 10mg daily',
      emergency_contact_name: 'Mary Smith',
      emergency_contact_phone: '555-0199'
    }
  });

  console.log('Created 1 intake form');
  console.log('Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
