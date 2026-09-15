/**
 * Seed script — populates the `tet` dev database with demo data.
 * Safe to re-run: clears existing data in dependency order first.
 *
 * Run with:  npm run seed
 */
import { config } from 'dotenv';
config();

import '../models'; // register all associations
import sequelize, { syncDb } from './sequelize';
import {
  User, Client, ServiceType, TaskTemplate,
  Engagement, Task,
} from '../models';
import bcrypt from 'bcryptjs';

// Helpers

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

// Main seed function

async function seed() {
  console.log('[seed] syncing schema …');
  await syncDb({ force: true }); // wipe + recreate tables

  // ── 1. Users ────────────────────────────────────────────────────────────
  console.log('[seed] creating users …');
  const [admin, manager1, manager2, alice, bob, carol, dave] = await User.bulkCreate([
    { name: 'Admin User',   email: 'admin@example.com',    passwordHash: await hash('admin1234'),   role: 'admin',       isActive: true },
    { name: 'Manager One',  email: 'manager1@example.com', passwordHash: await hash('manager1234'), role: 'manager',     isActive: true },
    { name: 'Manager Two',  email: 'manager2@example.com', passwordHash: await hash('manager1234'), role: 'manager',     isActive: true },
    { name: 'Alice Team',   email: 'tm_alice@example.com', passwordHash: await hash('team1234'),    role: 'team_member', isActive: true },
    { name: 'Bob Team',     email: 'tm_bob@example.com',   passwordHash: await hash('team1234'),    role: 'team_member', isActive: true },
    { name: 'Carol Team',   email: 'tm_carol@example.com', passwordHash: await hash('team1234'),    role: 'team_member', isActive: true },
    { name: 'Dave Team',    email: 'tm_dave@example.com',  passwordHash: await hash('team1234'),    role: 'team_member', isActive: true },
  ]);
  console.log(`  created ${7} users`);

  // ── 2. Clients ──────────────────────────────────────────────────────────
  console.log('[seed] creating clients …');
  const [clientA, clientB, clientC, clientD, clientE] = await Client.bulkCreate([
    { name: 'Apex Retail Pvt Ltd',       contactEmail: 'accounts@apexretail.example',   isActive: true },
    { name: 'BlueStar Exports Ltd',      contactEmail: 'finance@bluestar.example',      isActive: true },
    { name: 'Crestwood Hospitality',     contactEmail: 'cfo@crestwood.example',         isActive: true },
    { name: 'Delta Pharma Solutions',    contactEmail: 'tax@deltapharma.example',       isActive: true },
    { name: 'Evergreen Tech Ventures',   contactEmail: 'billing@evergreen.example',     isActive: true },
  ]);
  console.log(`  created 5 clients`);

  // ── 3. Service Types + Task Templates ───────────────────────────────────
  console.log('[seed] creating service types …');

  // 3a. Monthly GST Compliance (recurring)
  const gstCompliance = await ServiceType.create({
    name: 'Monthly GST Compliance',
    description: 'Monthly return filing, reconciliation and payment.',
    recurrenceType: 'monthly',
    isActive: true,
  });
  const gstTemplates = await TaskTemplate.bulkCreate([
    { serviceTypeId: gstCompliance.id, title: 'Collect sales & purchase invoices',   orderIndex: 1 },
    { serviceTypeId: gstCompliance.id, title: 'Reconcile GSTR-2A with purchase register', orderIndex: 2 },
    { serviceTypeId: gstCompliance.id, title: 'Prepare GSTR-3B draft',               orderIndex: 3 },
    { serviceTypeId: gstCompliance.id, title: 'Client review & approval',            orderIndex: 4 },
    { serviceTypeId: gstCompliance.id, title: 'File GSTR-3B on portal',              orderIndex: 5 },
    { serviceTypeId: gstCompliance.id, title: 'Confirm payment challan',             orderIndex: 6 },
  ]);

  // 3b. GST Registration (one-time)
  const gstReg = await ServiceType.create({
    name: 'GST Registration',
    description: 'New GST registration from document collection to ARN.',
    recurrenceType: 'one_time',
    isActive: true,
  });
  const gstRegTemplates = await TaskTemplate.bulkCreate([
    { serviceTypeId: gstReg.id, title: 'Collect KYC & business documents',      orderIndex: 1 },
    { serviceTypeId: gstReg.id, title: 'Verify documents & prepare application', orderIndex: 2 },
    { serviceTypeId: gstReg.id, title: 'Submit registration on GST portal',      orderIndex: 3 },
    { serviceTypeId: gstReg.id, title: 'Track ARN & respond to queries',         orderIndex: 4 },
    { serviceTypeId: gstReg.id, title: 'Share GSTIN certificate with client',    orderIndex: 5 },
  ]);

  // 3c. GST Refund (one-time)
  const gstRefund = await ServiceType.create({
    name: 'GST Refund',
    description: 'Refund application for exports or excess ITC.',
    recurrenceType: 'one_time',
    isActive: true,
  });
  const gstRefundTemplates = await TaskTemplate.bulkCreate([
    { serviceTypeId: gstRefund.id, title: 'Identify refund category & quantum',   orderIndex: 1 },
    { serviceTypeId: gstRefund.id, title: 'Prepare RFD-01 form',                  orderIndex: 2 },
    { serviceTypeId: gstRefund.id, title: 'Attach supporting documents',          orderIndex: 3 },
    { serviceTypeId: gstRefund.id, title: 'File refund application on portal',    orderIndex: 4 },
    { serviceTypeId: gstRefund.id, title: 'Follow up on deficiency memo if any',  orderIndex: 5 },
    { serviceTypeId: gstRefund.id, title: 'Confirm refund credit to bank',        orderIndex: 6 },
  ]);

  console.log(`  created 3 service types, ${gstTemplates.length + gstRegTemplates.length + gstRefundTemplates.length} templates`);

  // ── 4. Engagements ──────────────────────────────────────────────────────
  console.log('[seed] creating engagements …');

  // Helper: create engagement + tasks from templates in one go
  async function makeEngagement(params: {
    title: string;
    clientId: number;
    serviceTypeId: number;
    periodKey: string;
    createdByUserId: number;
    startDate: Date;
    dueDate: Date;
    templates: TaskTemplate[];
    assignees: (User | null)[];   // one per template; null = unassigned
    statuses: Task['status'][];   // one per template
  }) {
    const eng = await Engagement.create({
      title: params.title,
      clientId: params.clientId,
      serviceTypeId: params.serviceTypeId,
      periodKey: params.periodKey,
      createdByUserId: params.createdByUserId,
      startDate: params.startDate,
      dueDate: params.dueDate,
      status: 'active',
    });

    await Task.bulkCreate(
      params.templates.map((tpl, i) => ({
        engagementId: eng.id,
        taskTemplateId: tpl.id,
        title: tpl.title,
        description: tpl.description ?? null,
        status: params.statuses[i] ?? 'not_started',
        assignedToUserId: params.assignees[i]?.id ?? null,
        dueDate: params.dueDate,
      }))
    );
    return eng;
  }

  // ── Engagement 1: Apex — Sep 2026 GST Compliance (manager1)
  await makeEngagement({
    title: 'Apex Retail — Sep 2026 GST Compliance',
    clientId: clientA.id, serviceTypeId: gstCompliance.id,
    periodKey: '2026-09', createdByUserId: manager1.id,
    startDate: new Date('2026-09-01'), dueDate: daysFromNow(-2), // overdue
    templates: gstTemplates,
    assignees: [alice, alice, bob, bob, null, null],
    statuses: ['completed', 'completed', 'ready_for_review', 'not_started', 'not_started', 'not_started'],
  });

  // ── Engagement 2: Apex — Aug 2026 GST Compliance (manager1) — completed
  await makeEngagement({
    title: 'Apex Retail — Aug 2026 GST Compliance',
    clientId: clientA.id, serviceTypeId: gstCompliance.id,
    periodKey: '2026-08', createdByUserId: manager1.id,
    startDate: new Date('2026-08-01'), dueDate: new Date('2026-08-20'),
    templates: gstTemplates,
    assignees: [alice, alice, alice, bob, bob, bob],
    statuses: ['completed', 'completed', 'completed', 'completed', 'completed', 'completed'],
  });

  // ── Engagement 3: BlueStar — Sep 2026 GST Compliance (manager1)
  await makeEngagement({
    title: 'BlueStar Exports — Sep 2026 GST Compliance',
    clientId: clientB.id, serviceTypeId: gstCompliance.id,
    periodKey: '2026-09', createdByUserId: manager1.id,
    startDate: new Date('2026-09-01'), dueDate: daysFromNow(3),
    templates: gstTemplates,
    assignees: [carol, carol, carol, null, null, null],
    statuses: ['completed', 'in_progress', 'not_started', 'not_started', 'not_started', 'not_started'],
  });

  // ── Engagement 4: Crestwood — Sep 2026 GST Compliance (manager2)
  await makeEngagement({
    title: 'Crestwood Hospitality — Sep 2026 GST Compliance',
    clientId: clientC.id, serviceTypeId: gstCompliance.id,
    periodKey: '2026-09', createdByUserId: manager2.id,
    startDate: new Date('2026-09-01'), dueDate: daysFromNow(0), // due today
    templates: gstTemplates,
    assignees: [dave, dave, null, null, null, null],
    statuses: ['waiting_for_client', 'not_started', 'not_started', 'not_started', 'not_started', 'not_started'],
  });

  // ── Engagement 5: Delta — GST Registration (manager2, one-time)
  await makeEngagement({
    title: 'Delta Pharma — GST Registration',
    clientId: clientD.id, serviceTypeId: gstReg.id,
    periodKey: 'one_time', createdByUserId: manager2.id,
    startDate: new Date('2026-09-01'), dueDate: daysFromNow(5),
    templates: gstRegTemplates,
    assignees: [alice, alice, alice, null, null],
    statuses: ['completed', 'completed', 'ready_for_review', 'not_started', 'not_started'],
  });

  // ── Engagement 6: Evergreen — GST Registration (manager1, one-time)
  await makeEngagement({
    title: 'Evergreen Tech — GST Registration',
    clientId: clientE.id, serviceTypeId: gstReg.id,
    periodKey: 'one_time', createdByUserId: manager1.id,
    startDate: new Date('2026-09-10'), dueDate: daysFromNow(7),
    templates: gstRegTemplates,
    assignees: [bob, bob, null, null, null],
    statuses: ['in_progress', 'not_started', 'not_started', 'not_started', 'not_started'],
  });

  // ── Engagement 7: BlueStar — GST Refund (manager2, one-time)
  await makeEngagement({
    title: 'BlueStar Exports — GST Refund (Export ITC)',
    clientId: clientB.id, serviceTypeId: gstRefund.id,
    periodKey: 'one_time', createdByUserId: manager2.id,
    startDate: new Date('2026-09-05'), dueDate: daysFromNow(-5), // overdue
    templates: gstRefundTemplates,
    assignees: [carol, carol, carol, carol, null, null],
    statuses: ['completed', 'completed', 'changes_requested', 'not_started', 'not_started', 'not_started'],
  });

  // ── Engagement 8: Crestwood — Oct 2026 GST Compliance (rollover, manager2)
  await makeEngagement({
    title: 'Crestwood Hospitality — Oct 2026 GST Compliance',
    clientId: clientC.id, serviceTypeId: gstCompliance.id,
    periodKey: '2026-10', createdByUserId: manager2.id,
    startDate: new Date('2026-10-01'), dueDate: daysFromNow(20),
    templates: gstTemplates,
    assignees: [dave, null, null, null, null, null],
    statuses: ['not_started', 'not_started', 'not_started', 'not_started', 'not_started', 'not_started'],
  });

  const taskCount = await Task.count();
  console.log(`  created 8 engagements, ${taskCount} tasks`);

  console.log('\n[seed] ✓ done\n');
  console.log('Demo credentials:');
  console.log('  admin@example.com    / admin1234');
  console.log('  manager1@example.com / manager1234');
  console.log('  manager2@example.com / manager1234');
  console.log('  tm_alice@example.com / team1234');
  console.log('  tm_bob@example.com   / team1234');
  console.log('  tm_carol@example.com / team1234');
  console.log('  tm_dave@example.com  / team1234');

  await sequelize.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] FAILED:', err);
  process.exit(1);
});
