/**
 * One-time data migration: reads every collection out of the old MongoDB
 * database and re-inserts it into Postgres through Prisma. Run once when
 * cutting over an environment from Mongo to Postgres, then this file (and
 * the `mongodb` devDependency it needs) can be deleted.
 *
 * Usage: npm run migrate:mongo
 * Requires both MONGODB_URI (old database) and DATABASE_URL (new database)
 * to be set in .env.
 */
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function stripMongoId<T extends { _id: ObjectId; __v?: number }>(doc: T) {
  const { _id, __v, ...rest } = doc;
  return rest;
}

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');

  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const db = mongoClient.db();

  console.log('Clearing existing Postgres data...');
  await prisma.user.deleteMany({});
  await prisma.member.deleteMany({});
  await prisma.news.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.membershipFee.deleteMany({});
  await prisma.organizationSettings.deleteMany({});

  // --- Members: keep an old Mongo _id -> new Postgres id map, since Users
  // reference members by id and need to be relinked below. ---
  const memberDocs = await db.collection('members').find().toArray();
  const memberIdMap = new Map<string, string>();
  console.log(`Migrating ${memberDocs.length} members...`);
  for (const doc of memberDocs) {
    const data = stripMongoId(doc);
    const created = await prisma.member.create({
      data: {
        ...data,
        notes: (data.notes ?? undefined) as never,
        documents: (data.documents ?? []) as never,
      } as never,
    });
    memberIdMap.set(doc._id.toString(), created.id);
  }

  const newsDocs = await db.collection('news').find().toArray();
  console.log(`Migrating ${newsDocs.length} news items...`);
  for (const doc of newsDocs) {
    await prisma.news.create({ data: stripMongoId(doc) as never });
  }

  const eventDocs = await db.collection('events').find().toArray();
  console.log(`Migrating ${eventDocs.length} events...`);
  for (const doc of eventDocs) {
    await prisma.event.create({ data: stripMongoId(doc) as never });
  }

  const feeDocs = await db.collection('membershipfees').find().toArray();
  console.log(`Migrating ${feeDocs.length} membership fees...`);
  for (const doc of feeDocs) {
    await prisma.membershipFee.create({ data: stripMongoId(doc) as never });
  }

  const settingsDocs = await db.collection('organizationsettings').find().toArray();
  console.log(`Migrating ${settingsDocs.length} organization settings...`);
  for (const doc of settingsDocs) {
    const data = stripMongoId(doc);
    await prisma.organizationSettings.create({
      data: { ...data, socialLinks: (data.socialLinks ?? undefined) as never } as never,
    });
  }

  const userDocs = await db.collection('users').find().toArray();
  console.log(`Migrating ${userDocs.length} users...`);
  for (const doc of userDocs) {
    const data = stripMongoId(doc);
    const oldMemberId = (data.memberId as ObjectId | undefined)?.toString();
    await prisma.user.create({
      data: {
        ...data,
        memberId: oldMemberId ? memberIdMap.get(oldMemberId) : undefined,
      } as never,
    });
  }

  await mongoClient.close();
  await prisma.$disconnect();
  console.log('Migration completed.');
}

run().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
