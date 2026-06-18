// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Auth Types
export interface LoginRequest {
  address: string
  signature: string
  message: string
  nonce: string
}

export interface LoginResponse {
  user: User
  token: string
  refreshToken: string
  expiresIn: number
}

export interface User {
  id: string
  address: string
  role: UserRole
  profile?: UserProfile
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export interface UserProfile {
  name?: string
  email?: string
  avatar?: string
  bio?: string
  organization?: string
  website?: string
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    push: boolean
    browser: boolean
  }
  privacy: {
    showProfile: boolean
    showActivity: boolean
  }
}

export type UserRole = 'data_provider' | 'data_consumer' | 'auditor' | 'admin'

// Data Types
export interface Dataset {
  id: string
  name: string
  description: string
  category: DataCategory
  size: number
  format: string
  schema?: DataSchema
  metadata: DatasetMetadata
  privacy: PrivacySettings
  compliance: ComplianceStatus
  pricing: PricingInfo
  status: DatasetStatus
  providerId: string
  createdAt: string
  updatedAt: string
  lastAccessedAt?: string
}

export interface DatasetMetadata {
  tags: string[]
  industry: string
  region: string
  timeRange?: {
    start: string
    end: string
  }
  samplingRate?: number
  qualityScore: number
  licenseType: string
  usageRestrictions: string[]
}

export interface PrivacySettings {
  encryptionLevel: 'basic' | 'advanced' | 'military'
  anonymizationLevel: 'none' | 'basic' | 'k-anonymity' | 'differential'
  accessControls: AccessControl[]
  retentionPolicy: RetentionPolicy
}

export interface AccessControl {
  type: 'role' | 'user' | 'organization'
  value: string
  permissions: Permission[]
}

export interface RetentionPolicy {
  duration: number // in days
  autoDelete: boolean
  archiveAfter?: number // in days
}

export interface ComplianceStatus {
  gdpr: boolean
  ccpa: boolean
  hipaa: boolean
  sox: boolean
  custom: Record<string, boolean>
  lastAuditDate?: string
  auditScore?: number
}

export interface PricingInfo {
  model: 'fixed' | 'usage' | 'subscription'
  basePrice: number
  currency: 'ETH' | 'USD'
  computationFee?: number
  storageFeee?: number
}

export type DatasetStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived'
export type DataCategory = 'medical' | 'financial' | 'marketing' | 'research' | 'iot' | 'government' | 'other'
export type Permission = 'read' | 'write' | 'compute' | 'share' | 'delete'

export interface DataSchema {
  fields: SchemaField[]
  version: string
  description?: string
}

export interface SchemaField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array'
  required: boolean
  description?: string
  constraints?: FieldConstraints
}

export interface FieldConstraints {
  min?: number
  max?: number
  pattern?: string
  enum?: string[]
  format?: string
}

// Computation Types
export interface ComputationRequest {
  id: string
  title: string
  description: string
  datasets: string[] // dataset IDs
  algorithm: Algorithm
  parameters: Record<string, any>
  privacy: ComputationPrivacy
  budget: ComputationBudget
  status: ComputationStatus
  results?: ComputationResult
  requesterId: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface Algorithm {
  type: AlgorithmType
  name: string
  version: string
  description: string
  parameters: AlgorithmParameter[]
  requirements: AlgorithmRequirements
}

export type AlgorithmType = 
  | 'federated_learning' 
  | 'secure_aggregation' 
  | 'privacy_preserving_analytics' 
  | 'differential_privacy'
  | 'homomorphic_encryption'
  | 'secure_multiparty_computation'

export interface AlgorithmParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  required: boolean
  default?: any
  description: string
  constraints?: FieldConstraints
}

export interface AlgorithmRequirements {
  minDatasets: number
  maxDatasets?: number
  requiredDataTypes: DataCategory[]
  computeRequirements: ComputeRequirements
}

export interface ComputeRequirements {
  memory: number // MB
  cpu: number // cores
  gpu?: boolean
  estimatedTime: number // seconds
}

export interface ComputationPrivacy {
  epsilon?: number // for differential privacy
  delta?: number
  noiseLevel: 'low' | 'medium' | 'high'
  resultAggregation: 'sum' | 'average' | 'count' | 'custom'
}

export interface ComputationBudget {
  maxCost: number
  currency: 'ETH' | 'USD'
  gasLimit?: number
  priority: 'low' | 'normal' | 'high'
}

export type ComputationStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'computing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled'

export interface ComputationResult {
  resultHash: string
  encryptedResult: string
  proof: ZKProof
  metrics: ComputationMetrics
  auditTrail: AuditEntry[]
}

export interface ZKProof {
  proof: string
  publicSignals: string[]
  verificationKey: string
}

export interface ComputationMetrics {
  executionTime: number // milliseconds
  memoryUsed: number // MB
  cpuUsage: number // percentage
  dataProcessed: number // bytes
  accuracy?: number
  confidenceInterval?: [number, number]
}

// Audit Types
export interface AuditRequest {
  id: string
  type: AuditType
  targetId: string // dataset or computation request ID
  targetType: 'dataset' | 'computation'
  priority: 'low' | 'medium' | 'high' | 'critical'
  deadline: string
  description: string
  requirements: AuditRequirement[]
  status: AuditStatus
  assignedTo?: string // auditor ID
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export type AuditType = 
  | 'privacy_compliance' 
  | 'data_quality' 
  | 'security_review' 
  | 'regulatory_compliance'
  | 'algorithm_verification'

export interface AuditRequirement {
  category: string
  description: string
  criteria: string[]
  mandatory: boolean
}

export type AuditStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'requires_changes'

export interface AuditResult {
  id: string
  auditRequestId: string
  auditorId: string
  decision: 'approved' | 'rejected' | 'requires_changes'
  score: number // 0-100
  findings: AuditFinding[]
  recommendations: string[]
  compliance: ComplianceCheck[]
  summary: string
  createdAt: string
}

export interface AuditFinding {
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  recommendation: string
  status: 'open' | 'addressed' | 'accepted_risk'
}

export interface ComplianceCheck {
  regulation: string
  status: 'compliant' | 'non_compliant' | 'partial'
  details: string
  evidence?: string[]
}

export interface AuditEntry {
  id: string
  action: string
  userId: string
  userRole: UserRole
  timestamp: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

// System Types
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down'
  components: ComponentHealth[]
  uptime: number
  version: string
  lastUpdated: string
}

export interface ComponentHealth {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  uptime: number
  responseTime?: number
  errorRate?: number
  lastChecked: string
}

// Error Types
export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
  path: string
  method: string
}

// Validation Types
export interface ValidationError {
  field: string
  message: string
  value?: any
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// File Upload Types
export interface FileUploadRequest {
  file: File
  metadata: UploadMetadata
  encryption: EncryptionOptions
}

export interface UploadMetadata {
  name: string
  description: string
  category: DataCategory
  tags: string[]
  privacy: PrivacySettings
}

export interface EncryptionOptions {
  algorithm: 'AES' | 'RSA' | 'MKFHE'
  keySize: 128 | 256 | 512
  mode?: 'CBC' | 'GCM' | 'ECB'
}

export interface FileUploadResponse {
  fileId: string
  ipfsHash: string
  encryptionKey: string
  uploadUrl?: string
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  progress?: number
}

// WebSocket Types
export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: string
  userId?: string
  requestId?: string
}

export interface ProgressUpdate {
  requestId: string
  status: string
  progress: number
  message?: string
  eta?: number
}

export interface NotificationMessage {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  actions?: NotificationAction[]
  persist?: boolean
  createdAt: string
}

export interface NotificationAction {
  label: string
  action: string
  style?: 'primary' | 'secondary' | 'danger'
}