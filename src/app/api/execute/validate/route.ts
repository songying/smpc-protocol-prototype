import { NextRequest, NextResponse } from 'next/server'
import algorithmExecutor from '@/lib/execution/algorithm-executor'
import { verifyAuth } from '@/lib/api/middleware'
import { z } from 'zod'

const ValidationRequestSchema = z.object({
  algorithmCode: z.string().min(1, 'Algorithm code is required'),
  computationType: z.enum(['third_party', 'zk', 'fhe'])
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = ValidationRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const { algorithmCode, computationType } = validationResult.data

    // Initialize executor if not already done
    try {
      await algorithmExecutor.initialize()
    } catch (error) {
      console.log('Executor already initialized or initialization failed:', error)
    }

    // Validate algorithm code
    const validationReport = await algorithmExecutor.validateAlgorithmCode(
      algorithmCode,
      computationType
    )

    // Return validation results
    return NextResponse.json({
      validation: validationReport,
      recommendations: generateRecommendations(validationReport),
      computabilityReport: generateComputabilityReport(validationReport, computationType)
    })

  } catch (error) {
    console.error('POST /api/execute/validate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateRecommendations(validation: any): string[] {
  const recommendations: string[] = []

  if (validation.securityScore < 80) {
    recommendations.push('Consider reviewing code for security best practices')
  }

  if (validation.estimatedComplexity === 'high') {
    recommendations.push('High complexity algorithms may have longer execution times')
    recommendations.push('Consider optimizing algorithm for better performance')
  }

  if (validation.warnings.length > 0) {
    recommendations.push('Address warnings to improve algorithm reliability')
  }

  if (!validation.supportedComputationTypes.includes('zk')) {
    recommendations.push('To enable ZK computation, remove non-deterministic operations')
  }

  if (!validation.supportedComputationTypes.includes('fhe')) {
    recommendations.push('To enable FHE computation, limit to arithmetic operations only')
  }

  if (validation.supportedComputationTypes.length === 1) {
    recommendations.push('Consider making algorithm compatible with multiple computation types')
  }

  return recommendations
}

function generateComputabilityReport(validation: any, requestedType: string): any {
  const report = {
    requestedType,
    isCompatible: validation.supportedComputationTypes.includes(requestedType),
    supportedTypes: validation.supportedComputationTypes,
    limitations: [],
    optimizations: [],
    estimatedPerformance: {
      executionTime: 'unknown',
      memoryUsage: 'unknown',
      computationalComplexity: validation.estimatedComplexity
    }
  }

  // Add type-specific analysis
  switch (requestedType) {
    case 'third_party':
      report.limitations.push('Code executed in sandboxed environment')
      report.limitations.push('Limited access to external libraries')
      report.optimizations.push('Use efficient algorithms and data structures')
      report.estimatedPerformance.executionTime = 
        validation.estimatedComplexity === 'high' ? '10-30 seconds' :
        validation.estimatedComplexity === 'medium' ? '3-10 seconds' : '1-3 seconds'
      break

    case 'zk':
      if (report.isCompatible) {
        report.limitations.push('No random number generation allowed')
        report.limitations.push('Deterministic operations only')
        report.optimizations.push('Minimize conditional branches')
        report.optimizations.push('Use arithmetic operations when possible')
      } else {
        report.limitations.push('Algorithm contains non-deterministic operations')
        report.limitations.push('Random numbers, timestamps not supported')
      }
      report.estimatedPerformance.executionTime = 
        validation.estimatedComplexity === 'high' ? '30-120 seconds' :
        validation.estimatedComplexity === 'medium' ? '10-30 seconds' : '3-10 seconds'
      break

    case 'fhe':
      if (report.isCompatible) {
        report.limitations.push('Only arithmetic operations supported')
        report.limitations.push('No string operations or complex data types')
        report.optimizations.push('Minimize multiplication operations')
        report.optimizations.push('Use addition when possible')
      } else {
        report.limitations.push('Algorithm contains non-arithmetic operations')
        report.limitations.push('Complex data types not supported')
      }
      report.estimatedPerformance.executionTime = 
        validation.estimatedComplexity === 'high' ? '60-300 seconds' :
        validation.estimatedComplexity === 'medium' ? '20-60 seconds' : '5-20 seconds'
      break
  }

  return report
}