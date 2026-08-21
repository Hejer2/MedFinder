import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database for Tunisia...');

  // 1. Specialties
  const specialties = await Promise.all([
    prisma.specialty.upsert({ where: { name: 'Cardiology' }, update: {}, create: { name: 'Cardiology' } }),
    prisma.specialty.upsert({ where: { name: 'Dermatology' }, update: {}, create: { name: 'Dermatology' } }),
    prisma.specialty.upsert({ where: { name: 'Pediatrics' }, update: {}, create: { name: 'Pediatrics' } }),
    prisma.specialty.upsert({ where: { name: 'Neurology' }, update: {}, create: { name: 'Neurology' } }),
    prisma.specialty.upsert({ where: { name: 'Dentistry' }, update: {}, create: { name: 'Dentistry' } }),
  ]);

  // 2. Users (Doctors)
  const password = await bcrypt.hash('password123', 10);

  const docSarah = await prisma.user.upsert({
    where: { email: 'dr.sarah@medfinder.tn' },
    update: {},
    create: { name: 'Dr. Sarah Ahmed', email: 'dr.sarah@medfinder.tn', password, role: 'DOCTOR' },
  });

  const docKarim = await prisma.user.upsert({
    where: { email: 'dr.karim@medfinder.tn' },
    update: {},
    create: { name: 'Dr. Karim Ben Ali', email: 'dr.karim@medfinder.tn', password, role: 'DOCTOR' },
  });
  
  const docLeila = await prisma.user.upsert({
    where: { email: 'dr.leila@medfinder.tn' },
    update: {},
    create: { name: 'Dr. Leila Trabelsi', email: 'dr.leila@medfinder.tn', password, role: 'DOCTOR' },
  });

  const docYoussef = await prisma.user.upsert({
    where: { email: 'dr.youssef@medfinder.tn' },
    update: {},
    create: { name: 'Dr. Youssef Mansour', email: 'dr.youssef@medfinder.tn', password, role: 'DOCTOR' },
  });

  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@medfinder.tn' },
    update: {},
    create: { name: 'Ahmed Patient', email: 'patient@medfinder.tn', password, role: 'PATIENT' },
  });

  const pharmacyUser = await prisma.user.upsert({
    where: { email: 'pharmacy@medfinder.tn' },
    update: {},
    create: { name: 'Pharmacie Centrale', email: 'pharmacy@medfinder.tn', password, role: 'PHARMACY' },
  });

  // 3. Doctors & Pharmacy profiles
  await prisma.doctor.upsert({
    where: { userId: docSarah.id },
    update: {},
    create: {
      userId: docSarah.id,
      specialtyId: specialties[0].id,
      clinicAddress: 'Tunis Center',
      city: 'Tunis',
      country: 'Tunisia',
      latitude: 36.8065,
      longitude: 10.1815,
      ratingAverage: 4.9,
      consultationFee: 80,
      bio: 'Expert Cardiologist in Tunis Center.',
    },
  });

  await prisma.doctor.upsert({
    where: { userId: docKarim.id },
    update: {},
    create: {
      userId: docKarim.id,
      specialtyId: specialties[1].id,
      clinicAddress: 'Sfax City',
      city: 'Sfax',
      country: 'Tunisia',
      latitude: 34.7406,
      longitude: 10.7603,
      ratingAverage: 4.8,
      consultationFee: 70,
      bio: 'Specialized in clinical dermatology and aesthetics in Sfax.',
    },
  });

  await prisma.doctor.upsert({
    where: { userId: docLeila.id },
    update: {},
    create: {
      userId: docLeila.id,
      specialtyId: specialties[4].id,
      clinicAddress: 'Sousse',
      city: 'Sousse',
      country: 'Tunisia',
      latitude: 35.8256,
      longitude: 10.6369,
      ratingAverage: 4.9,
      consultationFee: 60,
      bio: 'Expert Dentist in Sousse.',
    },
  });

  await prisma.doctor.upsert({
    where: { userId: docYoussef.id },
    update: {},
    create: {
      userId: docYoussef.id,
      specialtyId: specialties[2].id,
      clinicAddress: 'Ariana',
      city: 'Ariana',
      country: 'Tunisia',
      latitude: 36.8625,
      longitude: 10.1956,
      ratingAverage: 4.7,
      consultationFee: 65,
      bio: 'Expert Pediatrician in Ariana.',
    },
  });

  const docFatma = await prisma.user.upsert({
    where: { email: 'dr.fatma@medfinder.tn' },
    update: {},
    create: { name: 'Dr. Fatma Khemiri', email: 'dr.fatma@medfinder.tn', password, role: 'DOCTOR' },
  });

  await prisma.doctor.upsert({
    where: { userId: docFatma.id },
    update: {},
    create: {
      userId: docFatma.id,
      specialtyId: specialties[0].id,
      clinicAddress: 'Sfax Central',
      city: 'Sfax',
      country: 'Tunisia',
      latitude: 34.7406,
      longitude: 10.7603,
      ratingAverage: 4.85,
      consultationFee: 75,
      bio: 'Expert Cardiologist in Sfax.',
    },
  });

  await prisma.pharmacy.upsert({
    where: { userId: pharmacyUser.id },
    update: {},
    create: {
      userId: pharmacyUser.id,
      address: 'Avenue Habib Bourguiba, Tunis',
      city: 'Tunis',
      country: 'Tunisia',
      latitude: 36.7997,
      longitude: 10.1815,
      phone: '+216 71 123 456',
      isOpen: true,
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
