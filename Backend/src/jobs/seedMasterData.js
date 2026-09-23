/*
 * Seeds common ERP master data (roles, departments, designations) for a
 * workspace/tenant.
 *
 *   node src/jobs/seedMasterData.js                 # every existing workspace
 *   node src/jobs/seedMasterData.js <workspaceId>   # one workspace
 *
 * Idempotent: every write is an upsert keyed on (workspaceId, name), so
 * re-running never creates duplicates and never deletes anything.
 */

const mongoose = require('mongoose');

const connectDB = require('../config/db');
const Company = require('../models/Company');
const Role = require('../models/Role');
const Department = require('../models/Department');
const Designation = require('../models/Designation');

const ROLES = [
  'Super Admin',
  'Admin',
  'Manager',
  'Team Lead',
  'HR Manager',
  'HR Executive',
  'Finance Manager',
  'Accountant',
  'Sales Manager',
  'Sales Executive',
  'Purchase Manager',
  'Purchase Executive',
  'Inventory Manager',
  'Warehouse Manager',
  'Operations Manager',
  'Project Manager',
  'Software Engineer',
  'Senior Software Engineer',
  'Support Executive',
  'Employee',
];

// Department -> designations that belong to it.
const DEPARTMENTS = {
  Administration: ['Admin Executive', 'Office Administrator'],
  'Human Resources': ['HR Manager', 'HR Executive'],
  'Finance & Accounts': [
    'Finance Manager',
    'Accountant',
    'Accounts Executive',
  ],
  Sales: [
    'Sales Manager',
    'Sales Executive',
    'Business Development Executive',
  ],
  Marketing: ['Marketing Manager', 'Marketing Executive'],
  Purchase: ['Purchase Manager', 'Purchase Executive'],
  Procurement: ['Procurement Executive'],
  Inventory: ['Inventory Manager'],
  Warehouse: ['Warehouse Manager', 'Store Executive'],
  Operations: ['Operations Manager', 'Operations Executive'],
  Projects: ['Project Manager', 'Project Coordinator'],
  Engineering: ['Engineering Manager', 'Software Architect'],
  'Software Development': [
    'Senior Software Engineer',
    'Software Engineer',
    'Junior Software Engineer',
  ],
  'IT & Support': ['Support Manager', 'Support Executive'],
  'Customer Support': ['Customer Support Executive'],
  'Quality Assurance': ['QA Manager', 'QA Engineer'],
  Production: [],
  Logistics: ['Logistics Manager', 'Logistics Executive'],
  Legal: [],
  Management: [
    'Managing Director',
    'Director',
    'General Manager',
    'Senior Manager',
    'Manager',
    'Assistant Manager',
    'Team Lead',
    'Employee',
  ],
};

const upsert = async (Model, filter, insertDoc) => {
  const result = await Model.updateOne(
    filter,
    {
      $setOnInsert: insertDoc,
      $set: { status: 'active' },
    },
    { upsert: true }
  );

  return result.upsertedCount ? 'created' : 'existing';
};

const tally = () => ({ created: 0, existing: 0 });

const seedWorkspace = async (workspaceId) => {
  const counts = {
    roles: tally(),
    departments: tally(),
    designations: tally(),
  };

  for (const name of ROLES) {
    const outcome = await upsert(
      Role,
      { workspaceId, name },
      { workspaceId, name }
    );

    counts.roles[outcome] += 1;
  }

  for (const [departmentName, designations] of Object.entries(DEPARTMENTS)) {
    const outcome = await upsert(
      Department,
      { workspaceId, name: departmentName },
      { workspaceId, name: departmentName }
    );

    counts.departments[outcome] += 1;

    const department = await Department.findOne({
      workspaceId,
      name: departmentName,
    })
      .select('_id')
      .lean();

    for (const designationName of designations) {
      const designationOutcome = await upsert(
        Designation,
        { workspaceId, name: designationName },
        {
          workspaceId,
          name: designationName,
          departmentId: department._id,
        }
      );

      counts.designations[designationOutcome] += 1;
    }
  }

  return counts;
};

const run = async () => {
  await connectDB();

  const requested = process.argv[2];
  let workspaceIds;

  if (requested) {
    if (!mongoose.Types.ObjectId.isValid(requested)) {
      throw new Error(`Invalid workspace id: ${requested}`);
    }

    workspaceIds = [new mongoose.Types.ObjectId(requested)];
  } else {
    workspaceIds = await Company.distinct('workspaceId');
  }

  if (!workspaceIds.length) {
    console.log('No workspaces found. Nothing to seed.');
  }

  const total = {
    roles: tally(),
    departments: tally(),
    designations: tally(),
  };

  for (const workspaceId of workspaceIds) {
    const counts = await seedWorkspace(workspaceId);

    console.log(`\nWorkspace ${workspaceId}`);

    Object.entries(counts).forEach(([key, value]) => {
      total[key].created += value.created;
      total[key].existing += value.existing;

      console.log(
        `  ${key.padEnd(13)} created: ${value.created}, existing: ${value.existing}`
      );
    });
  }

  console.log(`\nTotal across ${workspaceIds.length} workspace(s):`);

  Object.entries(total).forEach(([key, value]) => {
    console.log(
      `  ${key.padEnd(13)} created: ${value.created}, existing: ${value.existing}`
    );
  });

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('Seed failed:', err.message);

  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }

  process.exit(1);
});
