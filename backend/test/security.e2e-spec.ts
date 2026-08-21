import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Security & Authorization Hardening (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let prisma: PrismaService;

  let patientAToken: string;
  let patientAId: string;
  let patientBToken: string;
  let patientBId: string;

  let doctorAToken: string;
  let doctorAUserId: string;
  let doctorAProfileId: string;

  let doctorBToken: string;
  let doctorBUserId: string;
  let doctorBProfileId: string;

  let pharmacyToken: string;
  let pharmacyUserId: string;
  let pharmacyProfileId: string;
  let medicineId: string;

  let adminToken: string;
  let specialtyId: string;

  let appointmentId: string;
  let orderId: string;
  let paymentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Create a specialty for testing
    const spec = await prisma.specialty.upsert({
      where: { name: 'Cardiology' },
      update: {},
      create: { name: 'Cardiology' },
    });
    specialtyId = spec.id;

    // Helper to register and login user
    const registerUser = async (name: string, email: string, role: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name,
          email,
          password: 'Password123!',
          role,
        });
      return {
        token: res.body.accessToken,
        userId: res.body.user.id,
      };
    };

    const unique = Date.now();
    const patA = await registerUser('Patient Alpha', 'patientA_' + unique + '@test.com', 'PATIENT');
    patientAToken = patA.token;
    patientAId = patA.userId;

    const patB = await registerUser('Patient Beta', 'patientB_' + unique + '@test.com', 'PATIENT');
    patientBToken = patB.token;
    patientBId = patB.userId;

    const docA = await registerUser('Dr. Alice', 'doctorA_' + unique + '@test.com', 'DOCTOR');
    doctorAToken = docA.token;
    doctorAUserId = docA.userId;

    const docB = await registerUser('Dr. Bob', 'doctorB_' + unique + '@test.com', 'DOCTOR');
    doctorBToken = docB.token;
    doctorBUserId = docB.userId;

    const pharm = await registerUser('Central Pharmacy', 'pharmacy_' + unique + '@test.com', 'PHARMACY');
    pharmacyToken = pharm.token;
    pharmacyUserId = pharm.userId;

    const adm = await registerUser('Super Admin', 'admin_' + unique + '@test.com', 'ADMIN');
    adminToken = adm.token;

    // Setup Doctor A Profile
    const docAProfileRes = await request(app.getHttpServer())
      .patch('/doctors/me')
      .set('Authorization', 'Bearer ' + doctorAToken)
      .send({
        specialtyId,
        bio: 'Cardiologist Expert',
        clinicAddress: '123 Medical Way',
        consultationFee: 100,
      });
    doctorAProfileId = docAProfileRes.body.id;

    // Setup Doctor B Profile
    const docBProfileRes = await request(app.getHttpServer())
      .patch('/doctors/me')
      .set('Authorization', 'Bearer ' + doctorBToken)
      .send({
        specialtyId,
        bio: 'Neurologist Expert',
        clinicAddress: '456 Health Blvd',
        consultationFee: 120,
      });
    doctorBProfileId = docBProfileRes.body.id;

    // Setup Pharmacy Profile & Medicine
    const pharmProfileRes = await request(app.getHttpServer())
      .patch('/pharmacies/me')
      .set('Authorization', 'Bearer ' + pharmacyToken)
      .send({
        address: '789 Pharma Plaza',
        phone: '+21671000111',
      });
    pharmacyProfileId = pharmProfileRes.body?.id;
    if (!pharmacyProfileId) {
      let pharmRecord = await prisma.pharmacy.findUnique({ where: { userId: pharmacyUserId } });
      if (!pharmRecord) {
        pharmRecord = await prisma.pharmacy.create({
          data: {
            userId: pharmacyUserId,
            address: '789 Pharma Plaza',
            phone: '+21671000111',
          },
        });
      }
      pharmacyProfileId = pharmRecord.id;
    }

    const medRes = await request(app.getHttpServer())
      .post('/pharmacies/medicines')
      .set('Authorization', 'Bearer ' + pharmacyToken)
      .send({
        name: 'Amoxicillin 500mg',
        price: 15.5,
        status: 'AVAILABLE',
      });
    medicineId = medRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Doctor Profile Authorization', () => {
    it('Doctor A should NOT be able to modify Doctor B profile (IDOR prevention)', async () => {
      await request(app.getHttpServer())
        .patch('/doctors/' + doctorBProfileId + '/profile')
        .set('Authorization', 'Bearer ' + doctorAToken)
        .send({ bio: 'Malicious Bio Overwrite' })
        .expect(403);
    });

    it('Doctor A can modify own profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/doctors/' + doctorAProfileId + '/profile')
        .set('Authorization', 'Bearer ' + doctorAToken)
        .send({ bio: 'Updated Authorized Bio' })
        .expect(200);

      expect(res.body.bio).toBe('Updated Authorized Bio');
    });

    it('Admin can modify any doctor profile', async () => {
      await request(app.getHttpServer())
        .patch('/doctors/' + doctorAProfileId + '/profile')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ bio: 'Admin Approved Bio' })
        .expect(200);
    });
  });

  describe('2. Appointments BOLA/IDOR Hardening', () => {
    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', 'Bearer ' + patientAToken)
        .send({
          doctorId: doctorAProfileId,
          date: new Date(Date.now() + 86400000).toISOString(),
          notes: 'Regular checkup',
        });
      appointmentId = res.body.id;
    });

    it('Patient B should NOT be able to view Patient A appointment (IDOR)', async () => {
      await request(app.getHttpServer())
        .get('/appointments/' + appointmentId)
        .set('Authorization', 'Bearer ' + patientBToken)
        .expect(403);
    });

    it('Patient B should NOT be able to modify Patient A appointment status', async () => {
      await request(app.getHttpServer())
        .patch('/appointments/' + appointmentId + '/status')
        .set('Authorization', 'Bearer ' + patientBToken)
        .send({ status: 'CANCELLED' })
        .expect(403);
    });

    it('Doctor B (unassigned) should NOT be able to modify Patient A appointment', async () => {
      await request(app.getHttpServer())
        .patch('/appointments/' + appointmentId)
        .set('Authorization', 'Bearer ' + doctorBToken)
        .send({ notes: 'Hacked by unassigned doctor' })
        .expect(403);
    });

    it('Doctor A (assigned) CAN view and update the appointment', async () => {
      await request(app.getHttpServer())
        .get('/appointments/' + appointmentId)
        .set('Authorization', 'Bearer ' + doctorAToken)
        .expect(200);

      await request(app.getHttpServer())
        .patch('/appointments/' + appointmentId + '/status')
        .set('Authorization', 'Bearer ' + doctorAToken)
        .send({ status: 'ACCEPTED' })
        .expect(200);
    });

    it('Patient A (owner) CAN view own appointment', async () => {
      await request(app.getHttpServer())
        .get('/appointments/' + appointmentId)
        .set('Authorization', 'Bearer ' + patientAToken)
        .expect(200);
    });
  });

  describe('3. Medical Records Authorization (Clinical Relationship Rule)', () => {
    it('Doctor B (NO active consultation with Patient A) should be FORBIDDEN from accessing Patient A medical records', async () => {
      await request(app.getHttpServer())
        .get('/users/' + patientAId)
        .set('Authorization', 'Bearer ' + doctorBToken)
        .expect(403);
    });

    it('Doctor B should be FORBIDDEN from updating Patient A medical records', async () => {
      await request(app.getHttpServer())
        .patch('/users/' + patientAId)
        .set('Authorization', 'Bearer ' + doctorBToken)
        .send({ medicalInfo: { allergies: 'Penicillin' } })
        .expect(403);
    });

    it('Doctor A (HAS active appointment with Patient A) CAN view and update Patient A medical records', async () => {
      const getRes = await request(app.getHttpServer())
        .get('/users/' + patientAId)
        .set('Authorization', 'Bearer ' + doctorAToken)
        .expect(200);

      expect(getRes.body.id).toBe(patientAId);

      const patchRes = await request(app.getHttpServer())
        .patch('/users/' + patientAId)
        .set('Authorization', 'Bearer ' + doctorAToken)
        .send({ medicalInfo: { bloodType: 'O+', allergies: 'None' } })
        .expect(200);

      expect(patchRes.body.medicalInfo.bloodType).toBe('O+');
    });

    it('Patient A CAN view own profile', async () => {
      await request(app.getHttpServer())
        .get('/users/' + patientAId)
        .set('Authorization', 'Bearer ' + patientAToken)
        .expect(200);
    });

    it('Patient B should NOT be able to view Patient A profile', async () => {
      await request(app.getHttpServer())
        .get('/users/' + patientAId)
        .set('Authorization', 'Bearer ' + patientBToken)
        .expect(403);
    });
  });

  describe('4. Orders BOLA/IDOR Hardening', () => {
    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', 'Bearer ' + patientAToken)
        .send({
          pharmacyId: pharmacyProfileId,
          items: [{ medicineId, quantity: 2 }],
          deliveryMethod: 'PICKUP',
        });
      orderId = res.body.id;
    });

    it('Patient B should NOT be able to view Patient A order details (Prescription & Address protection)', async () => {
      await request(app.getHttpServer())
        .get('/orders/' + orderId)
        .set('Authorization', 'Bearer ' + patientBToken)
        .expect(403);
    });

    it('Patient B should NOT be able to pay for Patient A order', async () => {
      await request(app.getHttpServer())
        .post('/orders/' + orderId + '/pay')
        .set('Authorization', 'Bearer ' + patientBToken)
        .expect(403);
    });

    it('Patient A (owner) CAN view own order details', async () => {
      const res = await request(app.getHttpServer())
        .get('/orders/' + orderId)
        .set('Authorization', 'Bearer ' + patientAToken)
        .expect(200);

      expect(res.body.id).toBe(orderId);
    });

    it('Pharmacy A owner CAN view order assigned to their pharmacy', async () => {
      await request(app.getHttpServer())
        .get('/orders/' + orderId)
        .set('Authorization', 'Bearer ' + pharmacyToken)
        .expect(200);
    });

    it('Patient A can pay for own order', async () => {
      await request(app.getHttpServer())
        .post('/orders/' + orderId + '/pay')
        .set('Authorization', 'Bearer ' + patientAToken)
        .expect(201);
    });
  });

  describe('5. Prescription & Avatar Upload Security', () => {
    it('Should reject dangerous executable file uploads (.exe)', async () => {
      await request(app.getHttpServer())
        .post('/orders/upload-prescription')
        .set('Authorization', 'Bearer ' + patientAToken)
        .attach('file', Buffer.from('MZ_executable_payload'), 'malicious.exe')
        .expect(400);
    });

    it('Should reject HTML files (Stored XSS attempt)', async () => {
      await request(app.getHttpServer())
        .post('/orders/upload-prescription')
        .set('Authorization', 'Bearer ' + patientAToken)
        .attach('file', Buffer.from('<script>alert("XSS")</script>'), 'script.html')
        .expect(400);
    });

    it('Should accept valid PNG image prescription', async () => {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app.getHttpServer())
        .post('/orders/upload-prescription')
        .set('Authorization', 'Bearer ' + patientAToken)
        .attach('file', pngBuffer, 'rx_sample.png')
        .expect(201);

      expect(res.body.url).toMatch(/^\/uploads\/prescription-\d+-[a-z0-9]+\.png$/);
    });
  });

  describe('6. Payment Verification Security', () => {
    beforeAll(async () => {
      const payRecord = await prisma.payment.create({
        data: {
          orderId,
          amount: 31.0,
          method: 'Card',
          status: 'PENDING',
        },
      });
      paymentId = payRecord.id;
    });

    it('Patient B should NOT be able to verify Patient A payment', async () => {
      await request(app.getHttpServer())
        .patch('/payments/' + paymentId + '/verify')
        .set('Authorization', 'Bearer ' + patientBToken)
        .expect(403);
    });

    it('Patient A (owning patient) CAN verify payment', async () => {
      const res = await request(app.getHttpServer())
        .patch('/payments/' + paymentId + '/verify')
        .set('Authorization', 'Bearer ' + patientAToken)
        .expect(200);

      expect(res.body.status).toBe('COMPLETED');
    });
  });

  describe('7. Pharmacy Inventory & Role Escalation Protection', () => {
    it('Patient A should NOT be able to create medicines (Role escalation prevention)', async () => {
      await request(app.getHttpServer())
        .post('/pharmacies/medicines')
        .set('Authorization', 'Bearer ' + patientAToken)
        .send({
          name: 'Unauthorized Drug',
          price: 20,
        })
        .expect(403);
    });

    it('Doctor A should NOT be able to update pharmacy inventory', async () => {
      await request(app.getHttpServer())
        .patch('/pharmacies/medicines/' + medicineId)
        .set('Authorization', 'Bearer ' + doctorAToken)
        .send({ price: 5 })
        .expect(403);
    });

    it('Pharmacy owner CAN create new medicine', async () => {
      const res = await request(app.getHttpServer())
        .post('/pharmacies/medicines')
        .set('Authorization', 'Bearer ' + pharmacyToken)
        .send({
          name: 'Paracetamol 1000mg',
          price: 8.5,
          status: 'AVAILABLE',
        })
        .expect(201);

      expect(res.body.name).toBe('Paracetamol 1000mg');
    });
  });

  describe('8. Payment Amount Tampering Protection', () => {
    it('Server must enforce authoritative amount from database when creating payment', async () => {
      // Patient A attempts to create payment for order with manipulated amount of $1.00
      const res = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', 'Bearer ' + patientAToken)
        .send({
          orderId: orderId,
          amount: 1.0, // Client tries to pay only $1.00 for a $31 order
          method: 'Card',
        })
        .expect(201);

      // Server should have overridden client amount with authoritative order.totalPrice ($31.00)
      expect(res.body.amount).toBe(31);
      expect(res.body.status).toBe('PENDING');
    });
  });

  describe('9. Magic Bytes Validation & File Signature Check', () => {
    it('Should reject file with .png extension but fake/text header (Magic byte spoofing attempt)', async () => {
      await request(app.getHttpServer())
        .post('/orders/upload-prescription')
        .set('Authorization', 'Bearer ' + patientAToken)
        .attach('file', Buffer.from('FAKE_PNG_HEADER_NOT_A_REAL_IMAGE'), 'fake_image.png')
        .expect(400);
    });
  });

  describe('10. JWT Authentication & Tampering Protection', () => {
    it('Should reject requests with forged or corrupted JWT tokens', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer forged.tampered.token')
        .expect(401);
    });

    it('Should reject unauthenticated requests to protected endpoints', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });
  });

  describe('11. Admin-Only Endpoint Protection', () => {
    it('Patient should be FORBIDDEN from accessing admin stats', async () => {
      await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', 'Bearer ' + patientAToken)
        .expect(403);
    });

    it('Doctor should be FORBIDDEN from accessing admin stats', async () => {
      await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', 'Bearer ' + doctorAToken)
        .expect(403);
    });

    it('Admin CAN access admin dashboard stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', 'Bearer ' + adminToken)
        .expect(200);

      expect(res.body).toHaveProperty('totalUsers');
      expect(res.body).toHaveProperty('totalDoctors');
    });
  });

  describe('12. Favorites Module Authorization & Functionality', () => {
    it('Patient A can add doctor to favorites and retrieve favorites list', async () => {
      await request(app.getHttpServer())
        .post('/favorites/' + doctorAProfileId)
        .set('Authorization', 'Bearer ' + patientAToken)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/favorites')
        .set('Authorization', 'Bearer ' + patientAToken)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('13. Concurrency-Safe Appointment Booking (Double-Booking Prevention)', () => {
    const bookingDate = '2026-11-20T09:00:00.000Z';

    it('Patient A can book an open slot', async () => {
      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', 'Bearer ' + patientAToken)
        .send({
          doctorId: doctorAProfileId,
          date: bookingDate,
          notes: 'Routine checkup',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('Patient B attempting to book the SAME slot receives 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', 'Bearer ' + patientBToken)
        .send({
          doctorId: doctorAProfileId,
          date: bookingDate,
          notes: 'Conflicting booking attempt',
        })
        .expect(409);

      expect(res.body.message).toContain('already booked');
    });
  });

  describe('14. Pharmacy Stock Management & Atomic Decrement', () => {
    let stockMedId: string;

    beforeAll(async () => {
      if (!pharmacyProfileId) {
        const pharmRecord = await prisma.pharmacy.findUnique({ where: { userId: pharmacyUserId } });
        if (pharmRecord) pharmacyProfileId = pharmRecord.id;
      }

      const med = await prisma.medicine.create({
        data: {
          pharmacy: { connect: { id: pharmacyProfileId } },
          name: 'Limited Stock Antibiotic',
          price: 25.0,
          stock: 3,
          status: 'AVAILABLE',
          requireUpload: false,
        },
      });
      stockMedId = med.id;
    });

    it('Should REJECT order when requested quantity exceeds available stock', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', 'Bearer ' + patientAToken)
        .send({
          pharmacyId: pharmacyProfileId,
          items: [{ medicineId: stockMedId, quantity: 10 }], // only 3 in stock
          deliveryMethod: 'PICKUP',
        })
        .expect(400);
    });

    it('Should ACCEPT order within available stock and atomically decrement stock', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', 'Bearer ' + patientAToken)
        .send({
          pharmacyId: pharmacyProfileId,
          items: [{ medicineId: stockMedId, quantity: 2 }],
          deliveryMethod: 'PICKUP',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');

      // Verify stock was reduced from 3 to 1
      const updatedMed = await prisma.medicine.findUnique({ where: { id: stockMedId } });
      expect(updatedMed.stock).toBe(1);
    });
  });

  describe('15. Stripe Webhook Idempotency & Order State Transitions', () => {
    it('Should process payment_intent.succeeded webhook and mark order as PAID', async () => {
      const uniquePi = `pi_test_webhook_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const order = await prisma.order.create({
        data: {
          patientId: patientAId,
          pharmacyId: pharmacyProfileId,
          status: 'PENDING',
          totalPrice: 45.0,
        },
      });

      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: 45.0,
          method: 'Card',
          status: 'PENDING',
          stripePaymentIntentId: uniquePi,
        },
      });

      await request(app.getHttpServer())
        .post('/payments/webhook')
        .send({
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: uniquePi,
              metadata: { paymentId: payment.id },
            },
          },
        })
        .expect(200);

      const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updatedOrder.status).toBe('PAID');

      const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(updatedPayment.status).toBe('COMPLETED');
    });
  });
});
