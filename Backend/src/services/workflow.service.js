const mongoose = require("mongoose");

const Workflow = require("../models/Workflow");
const WorkflowInstance = require("../models/WorkflowInstance");
const User = require("../models/User");
const Role = require("../models/Role");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const getCompanyId = (req) => {
  if (!req.companyId) {
    throw new Error("Company context is missing");
  }

  return req.companyId;
};

const getUserId = (req) => {
  if (!req.userId) {
    throw new Error("User context is missing");
  }

  return req.userId;
};

const generateWorkflowNumber = async (companyId) => {
  const year = new Date().getFullYear();

  const lastWorkflow = await Workflow.findOne({
    companyId,
    workflowNumber: new RegExp(`^WF-${year}-`),
  })
    .sort({ workflowNumber: -1 })
    .select("workflowNumber")
    .lean();

  let sequence = 1;

  if (lastWorkflow?.workflowNumber) {
    const parts = lastWorkflow.workflowNumber.split("-");
    const lastSequence = Number(parts[2]);

    if (Number.isFinite(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `WF-${year}-${String(sequence).padStart(5, "0")}`;
};

const ensureWorkflowBelongsToCompany = async (
  workflowId,
  companyId
) => {
  if (!isValidObjectId(workflowId)) {
    throw new Error("Invalid workflow ID");
  }

  const workflow = await Workflow.findOne({
    _id: workflowId,
    companyId,
    deletedAt: null,
  });

  if (!workflow) {
    throw new Error("Workflow not found");
  }

  return workflow;
};

const ensureUserBelongsToCompany = async (
  userId,
  companyId
) => {
  if (!userId) return null;

  if (!isValidObjectId(userId)) {
    throw new Error("Invalid approver user ID");
  }

  const user = await User.findOne({
    _id: userId,
    companyId,
  })
    .select("_id name email roleId")
    .lean();

  if (!user) {
    throw new Error(
      "Approver user does not belong to this company"
    );
  }

  return user;
};

const ensureRoleBelongsToCompany = async (
  roleId,
  companyId
) => {
  if (!roleId) return null;

  if (!isValidObjectId(roleId)) {
    throw new Error("Invalid approver role ID");
  }

  const role = await Role.findOne({
    _id: roleId,
    companyId,
  })
    .select("_id name")
    .lean();

  if (!role) {
    throw new Error(
      "Approver role does not belong to this company"
    );
  }

  return role;
};

const validateSteps = async (steps, companyId) => {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error(
      "At least one workflow step is required"
    );
  }

  const normalizedSteps = [];

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];

    if (!step?.name?.trim()) {
      throw new Error(
        `Step ${index + 1} name is required`
      );
    }

    if (
      !["user", "role"].includes(step.approverType)
    ) {
      throw new Error(
        `Step ${index + 1} has invalid approver type`
      );
    }

    if (
      step.approverType === "user" &&
      !step.approverUserId
    ) {
      throw new Error(
        `Step ${index + 1} requires an approver user`
      );
    }

    if (
      step.approverType === "role" &&
      !step.approverRoleId
    ) {
      throw new Error(
        `Step ${index + 1} requires an approver role`
      );
    }

    if (step.approverType === "user") {
      await ensureUserBelongsToCompany(
        step.approverUserId,
        companyId
      );
    }

    if (step.approverType === "role") {
      await ensureRoleBelongsToCompany(
        step.approverRoleId,
        companyId
      );
    }

    normalizedSteps.push({
      stepNumber: index + 1,
      name: step.name.trim(),
      description: step.description?.trim() || "",
      approverType: step.approverType,
      approverUserId:
        step.approverType === "user"
          ? step.approverUserId
          : null,
      approverRoleId:
        step.approverType === "role"
          ? step.approverRoleId
          : null,
      isRequired:
        step.isRequired !== false,
      allowSelfApproval:
        step.allowSelfApproval === true,
      autoApprove:
        step.autoApprove === true,
      timeoutHours:
        Number(step.timeoutHours) >= 0
          ? Number(step.timeoutHours)
          : 0,
    });
  }

  return normalizedSteps;
};

const findActiveWorkflow = async (
  companyId,
  entityType
) => {
  return Workflow.findOne({
    companyId,
    entityType,
    status: "active",
    deletedAt: null,
  })
    .sort({
      priority: -1,
      createdAt: -1,
    })
    .lean();
};

const isUserAllowedForStep = async (
  step,
  userId,
  companyId
) => {
  if (!step) return false;

  if (
    step.approverType === "user"
  ) {
    return (
      String(step.approverUserId) ===
      String(userId)
    );
  }

  if (
    step.approverType === "role"
  ) {
    const user = await User.findOne({
      _id: userId,
      companyId,
    })
      .select("roleId")
      .lean();

    if (!user?.roleId) {
      return false;
    }

    return (
      String(user.roleId) ===
      String(step.approverRoleId)
    );
  }

  return false;
};

const getCurrentStep = (workflow, stepNumber) => {
  return workflow.steps.find(
    (step) =>
      Number(step.stepNumber) ===
      Number(stepNumber)
  );
};

const advanceWorkflow = async (
  instance,
  workflow,
  actionBy,
  comments = ""
) => {
  const currentStep = getCurrentStep(
    workflow,
    instance.currentStepNumber
  );

  if (!currentStep) {
    instance.status = "approved";
    instance.completedAt = new Date();
    return instance;
  }

  instance.history.push({
    stepNumber: currentStep.stepNumber,
    stepName: currentStep.name,
    action: "approved",
    actionBy,
    actionAt: new Date(),
    comments,
  });

  const nextStep = getCurrentStep(
    workflow,
    currentStep.stepNumber + 1
  );

  if (!nextStep) {
    instance.status = "approved";
    instance.completedAt = new Date();
    return instance;
  }

  instance.currentStepNumber =
    nextStep.stepNumber;

  instance.currentStepId = nextStep._id;

  return instance;
};

module.exports = {
  isValidObjectId,
  getCompanyId,
  getUserId,
  generateWorkflowNumber,
  ensureWorkflowBelongsToCompany,
  ensureUserBelongsToCompany,
  ensureRoleBelongsToCompany,
  validateSteps,
  findActiveWorkflow,
  isUserAllowedForStep,
  getCurrentStep,
  advanceWorkflow,
};