import { NextRequest, NextResponse } from 'next/server'
import algorithmExecutor, { ComputationRequest } from '@/lib/execution/algorithm-executor'
import algorithmService from '@/lib/services/algorithm-service'
import { verifyAuth } from '@/lib/api/middleware'
import { z } from 'zod'
import crypto from 'crypto'

const ExecutionRequestSchema = z.object({
  algorithmId: z.string().min(1, 'Algorithm ID is required'),
  algorithmVersion: z.string().optional(),
  computationType: z.enum(['third_party', 'zk', 'fhe']),
  inputDataIds: z.array(z.string()).min(1, 'At least one input data ID is required'),
  parameters: z.record(z.any()).optional(),
  privacyLevel: z.enum(['high', 'medium', 'low']).default('high'),
  maxExecutionTime: z.number().min(1000).max(300000).optional(), // 1s to 5min
  estimatedCost: z.number().min(0).optional()
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
    const validationResult = ExecutionRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Check if algorithm exists and is approved
    const algorithm = await algorithmService.getAlgorithmById(data.algorithmId)
    if (!algorithm.success || !algorithm.algorithm) {
      return NextResponse.json(
        { error: 'Algorithm not found' },
        { status: 404 }
      )
    }

    if (algorithm.algorithm.status !== 'approved') {
      return NextResponse.json(
        { error: 'Algorithm must be approved before execution' },
        { status: 403 }
      )
    }

    // Check if the computation type is supported by the algorithm
    if (!algorithm.algorithm.computation_type || 
        algorithm.algorithm.computation_type !== data.computationType) {
      return NextResponse.json(
        { 
          error: `Algorithm does not support ${data.computationType} computation type`,
          supportedType: algorithm.algorithm.computation_type
        },
        { status: 400 }
      )
    }

    // Create execution request
    const executionRequest: ComputationRequest = {
      id: crypto.randomUUID(),
      algorithmId: data.algorithmId,
      algorithmVersion: data.algorithmVersion,
      computationType: data.computationType,
      inputDataIds: data.inputDataIds,
      requesterAddress: authResult.user.address,
      parameters: data.parameters,
      privacyLevel: data.privacyLevel,
      maxExecutionTime: data.maxExecutionTime,
      estimatedCost: data.estimatedCost
    }

    // Initialize executor if not already done
    try {
      await algorithmExecutor.initialize()
    } catch (error) {
      console.log('Executor already initialized or initialization failed:', error)
    }

    // Queue the computation
    const requestId = await algorithmExecutor.queueComputation(executionRequest)

    return NextResponse.json({
      requestId,
      status: 'queued',
      message: 'Computation request submitted successfully',
      estimatedTime: data.maxExecutionTime || 30000,
      computationType: data.computationType
    }, { status: 202 })

  } catch (error) {
    console.error('POST /api/execute error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (requestId) {
      // Get specific computation status
      const result = algorithmExecutor.getComputationStatus(requestId)
      if (!result) {
        return NextResponse.json(
          { error: 'Computation request not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(result)
    } else {
      // List computations
      let computations = algorithmExecutor.listActiveComputations()
      
      if (status) {
        computations = computations.filter(comp => comp.status === status)
      }
      
      // Filter by requester (users can only see their own computations unless admin)
      const isAdmin = authResult.user.roles?.includes('admin')
      if (!isAdmin) {
        // For demo purposes, we'll show all computations
        // In production, you'd filter by requester address
      }

      // Apply pagination
      const paginatedResults = computations.slice(0, limit)

      return NextResponse.json({
        computations: paginatedResults,
        total: computations.length,
        active: computations.filter(c => c.status === 'running').length,
        queued: computations.filter(c => c.status === 'queued').length,
        completed: computations.filter(c => c.status === 'completed').length,
        failed: computations.filter(c => c.status === 'failed').length
      })
    }

  } catch (error) {
    console.error('GET /api/execute error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}