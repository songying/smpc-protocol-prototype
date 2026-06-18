import { z } from 'zod'

// User and Authentication Schemas
export const EthereumAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')

export const UserRoleSchema = z.enum(['data_provider', 'data_consumer', 'auditor', 'admin'])

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    browser: z.boolean().default(true)
  }),
  privacy: z.object({
    showProfile: z.boolean().default(false),
    showActivity: z.boolean().default(false)
  })
})

export const UserProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  organization: z.string().max(100).optional(),
  website: z.string().url().optional(),
  preferences: UserPreferencesSchema
})

export const UserSchema = z.object({
  id: z.string(),
  address: EthereumAddressSchema,
  role: UserRoleSchema,
  profile: UserProfileSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().optional()
})

// Authentication Schemas
export const NonceRequestSchema = z.object({
  address: EthereumAddressSchema
})

export const LoginRequestSchema = z.object({
  address: EthereumAddressSchema,
  signature: z.string().min(1),
  message: z.string().min(1),
  nonce: z.string().min(1)
})

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1)
})

// Dataset Schemas
export const DataCategorySchema = z.enum(['medical', 'financial', 'marketing', 'research', 'iot', 'government', 'other'])

export const DatasetStatusSchema = z.enum(['draft', 'pending_review', 'approved', 'rejected', 'archived'])

export const PermissionSchema = z.enum(['read', 'write', 'compute', 'share', 'delete'])

export const AccessControlSchema = z.object({
  type: z.enum(['role', 'user', 'organization']),
  value: z.string(),
  permissions: z.array(PermissionSchema)
})

export const RetentionPolicySchema = z.object({
  duration: z.number().min(1).max(3650), // 1 day to 10 years
  autoDelete: z.boolean().default(false),
  archiveAfter: z.number().min(1).optional()
})

export const PrivacySettingsSchema = z.object({
  encryptionLevel: z.enum(['basic', 'advanced', 'military']).default('basic'),
  anonymizationLevel: z.enum(['none', 'basic', 'k-anonymity', 'differential']).default('basic'),
  accessControls: z.array(AccessControlSchema).default([]),
  retentionPolicy: RetentionPolicySchema
})

export const ComplianceStatusSchema = z.object({
  gdpr: z.boolean().default(false),
  ccpa: z.boolean().default(false),
  hipaa: z.boolean().default(false),
  sox: z.boolean().default(false),
  custom: z.record(z.boolean()).default({}),
  lastAuditDate: z.string().datetime().optional(),
  auditScore: z.number().min(0).max(100).optional()
})

export const PricingInfoSchema = z.object({
  model: z.enum(['fixed', 'usage', 'subscription']).default('fixed'),
  basePrice: z.number().min(0),
  currency: z.enum(['ETH', 'USD']).default('ETH'),
  computationFee: z.number().min(0).optional(),
  storageFeee: z.number().min(0).optional()
})

export const FieldConstraintsSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  enum: z.array(z.string()).optional(),
  format: z.string().optional()
})

export const SchemaFieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'date', 'object', 'array']),
  required: z.boolean().default(false),
  description: z.string().optional(),
  constraints: FieldConstraintsSchema.optional()
})

export const DataSchemaSchema = z.object({
  fields: z.array(SchemaFieldSchema),
  version: z.string().default('1.0.0'),
  description: z.string().optional()
})

export const DatasetMetadataSchema = z.object({
  tags: z.array(z.string()).default([]),
  industry: z.string().default(''),
  region: z.string().default('global'),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  samplingRate: z.number().min(0).max(1).optional(),
  qualityScore: z.number().min(0).max(100).default(0),
  licenseType: z.string().default('custom'),
  usageRestrictions: z.array(z.string()).default([])
})

export const DatasetSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: DataCategorySchema,
  size: z.number().min(0),
  format: z.string(),
  schema: DataSchemaSchema.optional(),
  metadata: DatasetMetadataSchema,
  privacy: PrivacySettingsSchema,
  compliance: ComplianceStatusSchema,
  pricing: PricingInfoSchema,
  status: DatasetStatusSchema,
  providerId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastAccessedAt: z.string().datetime().optional()
})

// File Upload Schemas
export const EncryptionOptionsSchema = z.object({
  algorithm: z.enum(['AES', 'RSA', 'MKFHE']).default('AES'),
  keySize: z.enum([128, 256, 512]).default(256),
  mode: z.enum(['CBC', 'GCM', 'ECB']).optional()
})

export const UploadMetadataSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: DataCategorySchema,
  tags: z.array(z.string()).default([]),
  privacy: PrivacySettingsSchema
})

export const FileUploadRequestSchema = z.object({
  metadata: UploadMetadataSchema,
  encryption: EncryptionOptionsSchema.optional()
})

// Computation Schemas
export const AlgorithmTypeSchema = z.enum([
  'federated_learning',
  'secure_aggregation',
  'privacy_preserving_analytics',
  'differential_privacy',
  'homomorphic_encryption',
  'secure_multiparty_computation'
])

export const ComputeRequirementsSchema = z.object({
  memory: z.number().min(128).max(32768), // 128MB to 32GB
  cpu: z.number().min(1).max(32), // 1 to 32 cores
  gpu: z.boolean().default(false),
  estimatedTime: z.number().min(1).max(86400) // 1 second to 24 hours
})

export const AlgorithmRequirementsSchema = z.object({
  minDatasets: z.number().min(1).default(1),
  maxDatasets: z.number().min(1).optional(),
  requiredDataTypes: z.array(DataCategorySchema).default([]),
  computeRequirements: ComputeRequirementsSchema
})

export const AlgorithmParameterSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  required: z.boolean().default(false),
  default: z.any().optional(),
  description: z.string(),
  constraints: FieldConstraintsSchema.optional()
})

export const AlgorithmSchema = z.object({
  type: AlgorithmTypeSchema,
  name: z.string().min(1),
  version: z.string().default('1.0.0'),
  description: z.string(),
  parameters: z.array(AlgorithmParameterSchema).default([]),
  requirements: AlgorithmRequirementsSchema
})

export const ComputationPrivacySchema = z.object({
  epsilon: z.number().min(0).optional(), // for differential privacy
  delta: z.number().min(0).optional(),
  noiseLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  resultAggregation: z.enum(['sum', 'average', 'count', 'custom']).default('average')
})

export const ComputationBudgetSchema = z.object({
  maxCost: z.number().min(0),
  currency: z.enum(['ETH', 'USD']).default('ETH'),
  gasLimit: z.number().min(0).optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal')
})

export const ComputationStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'computing',
  'completed',
  'failed',
  'cancelled'
])

export const ComputationRequestSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  datasets: z.array(z.string()).min(1),
  algorithm: AlgorithmSchema,
  parameters: z.record(z.any()).default({}),
  privacy: ComputationPrivacySchema,
  budget: ComputationBudgetSchema,
  status: ComputationStatusSchema,
  requesterId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional()
})

// Audit Schemas
export const AuditTypeSchema = z.enum([
  'privacy_compliance',
  'data_quality',
  'security_review',
  'regulatory_compliance',
  'algorithm_verification'
])

export const AuditStatusSchema = z.enum(['pending', 'in_progress', 'approved', 'rejected', 'requires_changes'])

export const AuditRequirementSchema = z.object({
  category: z.string(),
  description: z.string(),
  criteria: z.array(z.string()),
  mandatory: z.boolean()
})

export const AuditRequestSchema = z.object({
  id: z.string(),
  type: AuditTypeSchema,
  targetId: z.string(),
  targetType: z.enum(['dataset', 'computation']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  deadline: z.string().datetime(),
  description: z.string(),
  requirements: z.array(AuditRequirementSchema),
  status: AuditStatusSchema,
  assignedTo: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional()
})

// Validation Functions
export function validateDatasetUpload(data: unknown) {
  return FileUploadRequestSchema.safeParse(data)
}

export function validateComputationRequest(data: unknown) {
  const baseSchema = ComputationRequestSchema.omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true,
    requesterId: true,
    status: true
  })
  return baseSchema.safeParse(data)
}

export function validateUserProfile(data: unknown) {
  return UserProfileSchema.safeParse(data)
}

export function validateLoginRequest(data: unknown) {
  return LoginRequestSchema.safeParse(data)
}

export function validateDatasetUpdate(data: unknown) {
  const updateSchema = DatasetSchema.partial().omit({
    id: true,
    providerId: true,
    createdAt: true
  })
  return updateSchema.safeParse(data)
}

// Query Parameter Schemas
export const PaginationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20')
})

export const DatasetFilterSchema = z.object({
  category: DataCategorySchema.optional(),
  status: DatasetStatusSchema.optional(),
  providerId: z.string().optional(),
  search: z.string().optional()
}).merge(PaginationQuerySchema)

export const ComputationFilterSchema = z.object({
  status: ComputationStatusSchema.optional(),
  algorithm: AlgorithmTypeSchema.optional(),
  requesterId: z.string().optional()
}).merge(PaginationQuerySchema)

// Response Schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime()
})

export const PaginatedResponseSchema = ApiResponseSchema.extend({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number()
  }).optional()
})

// Validation helpers
export function createValidationError(error: z.ZodError) {
  return {
    field: error.errors[0]?.path.join('.') || 'unknown',
    message: error.errors[0]?.message || 'Validation failed',
    errors: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.received || undefined
    }))
  }
}

export function isValidEthereumAddress(address: string): boolean {
  return EthereumAddressSchema.safeParse(address).success
}

export function isValidUserRole(role: string): boolean {
  return UserRoleSchema.safeParse(role).success
}