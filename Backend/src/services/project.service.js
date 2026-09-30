const mongoose = require("mongoose");

const Project = require("../models/Project");
const Task = require("../models/Task");
const Customer = require("../models/Customer");
const Branch = require("../models/Branch");
const User = require("../models/User");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const getCompanyId = (req) => {
  if (!req.companyId) {
    throw new Error("Company context is missing");
  }

  return req.companyId;
};

const ensureCustomerBelongsToCompany = async (
  customerId,
  companyId
) => {
  if (!customerId) return null;

  if (!isValidObjectId(customerId)) {
    throw new Error("Invalid customer ID");
  }

  const customer = await Customer.findOne({
    _id: customerId,
    companyId,
    deletedAt: null,
  }).lean();

  if (!customer) {
    throw new Error(
      "Customer does not belong to the current company"
    );
  }

  return customer;
};

const ensureBranchBelongsToCompany = async (
  branchId,
  companyId
) => {
  if (!branchId) return null;

  if (!isValidObjectId(branchId)) {
    throw new Error("Invalid branch ID");
  }

  const branch = await Branch.findOne({
    _id: branchId,
    deletedAt: null,
  }).lean();

  if (!branch) {
    throw new Error("Branch not found");
  }

  /*
   * Existing ERP architecture:
   *
   * req.companyId = workspace ID
   * Branch.companyId = actual Company ID
   *
   * Resolve workspace ownership through Company.
   */

  const Company = require("../models/Company");

  const company = await Company.findOne({
    _id: branch.companyId,
    workspaceId: companyId,
    status: "active",
  }).lean();

  if (!company) {
    throw new Error(
      "Branch does not belong to the current company"
    );
  }

  return branch;
};

const ensureUserBelongsToCompany = async (
  userId,
  companyId
) => {
  if (!userId) return null;

  if (!isValidObjectId(userId)) {
    throw new Error("Invalid user ID");
  }

  const user = await User.findOne({
    _id: userId,
    companyId,
  }).lean();

  if (!user) {
    throw new Error(
      "User does not belong to the current company"
    );
  }

  return user;
};

const generateProjectNumber = async (companyId) => {
  const currentYear = new Date().getFullYear();

  const prefix = `PRJ-${currentYear}-`;

  const lastProject = await Project.findOne({
    companyId,
    projectNumber: {
      $regex: `^${prefix}`,
      $options: "i",
    },
  })
    .sort({ projectNumber: -1 })
    .select("projectNumber")
    .lean();

  let sequence = 1;

  if (lastProject?.projectNumber) {
    const lastNumber = parseInt(
      lastProject.projectNumber.replace(prefix, ""),
      10
    );

    if (!Number.isNaN(lastNumber)) {
      sequence = lastNumber + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(5, "0")}`;
};

const generateTaskNumber = async (companyId) => {
  const currentYear = new Date().getFullYear();

  const prefix = `TASK-${currentYear}-`;

  const lastTask = await Task.findOne({
    companyId,
    taskNumber: {
      $regex: `^${prefix}`,
      $options: "i",
    },
  })
    .sort({ taskNumber: -1 })
    .select("taskNumber")
    .lean();

  let sequence = 1;

  if (lastTask?.taskNumber) {
    const lastNumber = parseInt(
      lastTask.taskNumber.replace(prefix, ""),
      10
    );

    if (!Number.isNaN(lastNumber)) {
      sequence = lastNumber + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(5, "0")}`;
};

const calculateProjectProgress = async (
  projectId,
  companyId
) => {
  const tasks = await Task.find({
    projectId,
    companyId,
    deletedAt: null,
  })
    .select("status progress")
    .lean();

  if (!tasks.length) {
    return 0;
  }

  const total = tasks.reduce(
    (sum, task) => sum + Number(task.progress || 0),
    0
  );

  return Math.round(total / tasks.length);
};

module.exports = {
  isValidObjectId,
  getCompanyId,
  ensureCustomerBelongsToCompany,
  ensureBranchBelongsToCompany,
  ensureUserBelongsToCompany,
  generateProjectNumber,
  generateTaskNumber,
  calculateProjectProgress,
};