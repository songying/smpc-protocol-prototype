// TypeScript interfaces for SMPC Protocol contracts

// Enums matching Solidity contract enums
export enum DataStatus {
  Pending = 0,
  Active = 1,
  Suspended = 2,
  Deactivated = 3
}

export enum DataCategory {
  Personal = 0,
  Financial = 1,
  Health = 2,
  Behavioral = 3,
  Commercial = 4,
  Other = 5
}

export enum ComputingStatus {
  Pending = 0,
  Approved = 1,
  Computing = 2,
  Completed = 3,
  Failed = 4,
  Cancelled = 5,
  Disputed = 6
}

export enum ComputationType {
  Aggregation = 0,
  MachineLearning = 1,
  Analytics = 2,
  Comparison = 3,
  Custom = 4
}

export enum ApprovalType {
  DataAccess = 0,
  ComputingRequest = 1,
  PolicyChange = 2,
  Emergency = 3,
  Governance = 4
}

export enum ApprovalStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Expired = 3,
  Executed = 4
}

export enum ComplianceFramework {
  GDPR = 0,
  CCPA = 1,
  HIPAA = 2,
  PCI_DSS = 3,
  SOX = 4,
  Custom = 5
}

export enum PolicyStatus {
  Draft = 0,
  Active = 1,
  Deprecated = 2,
  Archived = 3
}

export enum RequestType {
  Access = 0,
  Rectification = 1,
  Erasure = 2,
  Portability = 3,
  Restriction = 4,
  Objection = 5,
  Withdraw = 6
}

export enum RequestStatus {
  Submitted = 0,
  UnderReview = 1,
  Approved = 2,
  Rejected = 3,
  Completed = 4,
  Failed = 5
}

// DataRegistry interfaces
export interface DataEntry {
  dataHash: string;
  provider: string;
  metadataURI: string;
  price: bigint;
  status: DataStatus;
  category: DataCategory;
  timestamp: bigint;
  lastUpdated: bigint;
  tags: string[];
  isEncrypted: boolean;
  accessCount: bigint;
  dataSize: bigint;
}

export interface DataRegistrationInput {
  dataHash: string;
  metadataURI: string;
  price: string; // In ETH string format
  category: DataCategory;
  tags: string[];
  isEncrypted: boolean;
  dataSize: bigint;
}

// ComputingRequest interfaces
export interface ComputingRequestInfo {
  requestId: string;
  consumer: string;
  dataHashes: string[];
  totalFee: bigint;
  status: ComputingStatus;
  computationType: ComputationType;
  computingScript: string;
  resultURI: string;
  resultHash: string;
  timestamp: bigint;
  deadline: bigint;
  approvalCount: bigint;
  requiredApprovals: bigint;
  approvers: string[];
  requirements: string[];
  isUrgent: boolean;
  maxComputingTime: bigint;
  assignedNode: string;
}

export interface ComputingRequestInput {
  dataHashes: string[];
  totalFee: string; // In ETH string format
  computationType: ComputationType;
  computingScript: string;
  requirements: string[];
  isUrgent: boolean;
  maxComputingTime: bigint;
}

// FeeManagement interfaces
export interface FeeConfig {
  platformFeePercentage: bigint;
  auditorFeePercentage: bigint;
  providerFeePercentage: bigint;
  computingNodeFeePercentage: bigint;
  minimumFee: bigint;
  maximumFee: bigint;
}

export interface FeeBreakdown {
  totalAmount: bigint;
  platformFee: bigint;
  auditorFee: bigint;
  providerFee: bigint;
  computingNodeFee: bigint;
  remainingAmount: bigint;
}

export interface TransactionRecord {
  transactionId: string;
  payer: string;
  totalAmount: bigint;
  breakdown: FeeBreakdown;
  timestamp: bigint;
  isDistributed: boolean;
  purpose: string;
}

// ApprovalManager interfaces
export interface ApprovalRequirement {
  minApprovals: bigint;
  minAuditorApprovals: bigint;
  minProviderApprovals: bigint;
  totalRequiredStake: bigint;
  timeoutDuration: bigint;
  requiresUnanimity: boolean;
  allowSelfApproval: boolean;
}

export interface ApprovalRequestInfo {
  requestId: string;
  requestor: string;
  approvalType: ApprovalType;
  targetHash: string;
  description: string;
  metaData: string;
  status: ApprovalStatus;
  createdAt: bigint;
  deadline: bigint;
  approvalCount: bigint;
  rejectionCount: bigint;
  approvers: string[];
  rejectors: string[];
  totalStake: bigint;
  isExecuted: boolean;
  executionResult: string;
}

export interface ApprovalRequestInput {
  approvalType: ApprovalType;
  targetHash: string;
  description: string;
  metaData: string;
}

// PrivacyCompliance interfaces
export interface PrivacyPolicyInfo {
  policyId: string;
  title: string;
  version: string;
  contentURI: string;
  contentHash: string;
  framework: ComplianceFramework;
  status: PolicyStatus;
  effectiveDate: bigint;
  expirationDate: bigint;
  approvedBy: string;
  createdAt: bigint;
  lastUpdated: bigint;
}

export interface PrivacyPolicyInput {
  title: string;
  version: string;
  contentURI: string;
  contentHash: string;
  framework: ComplianceFramework;
  effectiveDate: bigint;
  expirationDate: bigint;
}

export interface DataSubjectRequest {
  requestId: string;
  dataSubject: string;
  requestType: RequestType;
  status: RequestStatus;
  description: string;
  affectedDataHashes: string[];
  reason: string;
  submittedAt: bigint;
  deadline: bigint;
  assignedOfficer: string;
  responseURI: string;
  responseHash: string;
  completedAt: bigint;
  isUrgent: boolean;
}

export interface DataSubjectRequestInput {
  requestType: RequestType;
  description: string;
  affectedDataHashes: string[];
  reason: string;
  isUrgent: boolean;
}

export interface ComplianceAudit {
  auditId: string;
  auditor: string;
  framework: ComplianceFramework;
  startDate: bigint;
  endDate: bigint;
  findingsURI: string;
  findingsHash: string;
  isCompliant: boolean;
  recommendations: string[];
  createdAt: bigint;
}

// General interfaces
export interface WalletConnection {
  address: string;
  balance: string;
  chainId: number;
  connected: boolean;
}

export interface ContractInteractionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  data?: any;
}

// Event interfaces
export interface DataRegisteredEvent {
  dataHash: string;
  provider: string;
  category: DataCategory;
  price: bigint;
  timestamp: bigint;
}

export interface RequestSubmittedEvent {
  requestId: string;
  consumer: string;
  dataHashes: string[];
  totalFee: bigint;
  computationType: ComputationType;
}

export interface ApprovalGivenEvent {
  requestId: string;
  approver: string;
  stake: bigint;
  totalApprovals: bigint;
}

export interface FeesCalculatedEvent {
  transactionId: string;
  totalAmount: bigint;
  platformFee: bigint;
  auditorFee: bigint;
  providerFee: bigint;
  computingNodeFee: bigint;
}

// MetaMask window extension
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

// Role constants
export const ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
  DATA_PROVIDER_ROLE: '0x8cad95687ba82c2ce50e74f7b754645e5117c3a5bec8151c0726d5857980a866',
  CONSUMER_ROLE: '0xeb5b5e41c7a09c0a67b8e80b8d8d69cd893a5b7f96a19e3e67ef7d3b3f2b56e1',
  AUDITOR_ROLE: '0x0a7d9b41e2e5f5c8c7b0a3e6c4c8f7a5c2a8e4d6b9e8c7a6c5b4a3e2f1d0c8b7',
  COMPUTING_NODE_ROLE: '0x7c0c5e2b0a1d8c9f4e3a7b6c5d4e8f7a2b1c8d9e6f3a7b4c5d8e9f2a1b6c3d4',
  PRIVACY_OFFICER_ROLE: '0x1b4e7d3a6c9f2e5c8b7a4d1e6f9c3a8b5e2d7f4a9c6b3e8d5f2a7c4b9e6d3a1',
  DATA_SUBJECT_ROLE: '0x4a7b2e5d8c1f6a9c3b7e4d2a8f5c9b6e3d7a4c1f8b5e2a9d6c3f7b4a8c5b2e1',
  REGULATOR_ROLE: '0x9c3f6b2e8d5a1c7f4b9e2d6a3c8f5b1e7d4a9c2f6b3e8d1a5c7f9b2e4d6a3c1',
  GOVERNANCE_ROLE: '0x2e5d8a1c4f7b3e6c9a2d5f8b1c4e7a3d6f9c2b5e8a1d4c7f3b6e9a2c5d8f1b4',
  TREASURY_ROLE: '0x8f1c4e7a3d6b9c2f5e8a1d4c7b3f6e9a2c5d8f1b4e7c3a6d9f2b5e8c1a4d7f3'
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];