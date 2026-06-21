import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting migration of farmer locations to drop points...");

  // Find all farmers with latitude and longitude
  const farmers = await prisma.farmer.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    include: {
      dropPoints: true,
      user: true,
    }
  });

  console.log(`Found ${farmers.length} farmers with location data.`);

  let migratedCount = 0;

  for (const farmer of farmers) {
    if (farmer.dropPoints.length === 0) {
      await prisma.dropPoint.create({
        data: {
          farmerId: farmer.id,
          name: `${farmer.name} Main Location`,
          description: farmer.description,
          latitude: farmer.latitude!,
          longitude: farmer.longitude!,
          address: farmer.address,
          imageUrl: farmer.profileImage,
          isActive: true,
          tags: farmer.isVerified ? ["Verified"] : [],
        }
      });
      migratedCount++;
      console.log(`Migrated location for farmer: ${farmer.name}`);
    }
  }

  console.log(`Migration complete. Created ${migratedCount} new drop points.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
