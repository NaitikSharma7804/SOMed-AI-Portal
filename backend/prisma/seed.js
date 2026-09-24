const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const roles = [
  'PATIENT',
  'AYURVEDA_DOCTOR',
  'BDS_DOCTOR',
  'ALLOPATHY_DOCTOR',
  'SIDDHA_SPECIALIST',
  'HOMEOPATHY_SPECIALIST',
  'UNANI_SPECIALIST',
  'HOSPITAL_ADMIN',
  'DISTRICT_OFFICER',
  'NATIONAL_ADMIN',
  'PHARMACIST',
  'STATE_OFFICER'
];

async function main() {
  console.log('🌱 Seeding initial roles...');
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName }
    });
  }
  console.log('✅ All 12 system roles verified/seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
