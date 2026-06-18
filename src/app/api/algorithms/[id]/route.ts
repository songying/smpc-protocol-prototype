import { NextRequest, NextResponse } from 'next/server'
import algorithmService from '@/lib/services/algorithm-service'
import algorithmDatabase from '@/lib/database/algorithm-schemas'
import { verifyAuth } from '@/lib/api/middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const algorithmId = params.id

    // Get algorithm
    const algorithm = await algorithmDatabase.getAlgorithm(algorithmId)
    if (!algorithm) {
      return NextResponse.json(
        { error: 'Algorithm not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const userAddress = authResult.user.address
    const isOwner = algorithm.user_address === userAddress
    const isAdmin = authResult.user.roles?.includes('admin')
    const isAuditor = authResult.user.roles?.includes('auditor')

    if (!isOwner && !isAdmin && !isAuditor) {
      return NextResponse.json(
        { error: 'Unauthorized to access this algorithm' },
        { status: 403 }
      )
    }

    // Get additional data
    const [versions, audits] = await Promise.all([
      algorithmService.getAlgorithmVersions(algorithmId),
      algorithmDatabase.getAuditsByAlgorithm(algorithmId)
    ])

    // Remove sensitive data for non-owners
    const response: any = {
      algorithm: {
        ...algorithm,
        encrypted_code: undefined, // Never expose encrypted code
        encryption_key: undefined,
        iv: undefined,
        hmac: undefined
      },
      versions: versions.map(v => ({
        ...v,
        encrypted_code: undefined,
        encryption_key: undefined,
        iv: undefined,
        hmac: undefined
      })),
      audits: isOwner || isAdmin ? audits : audits.filter(audit => 
        audit.auditor_address === userAddress
      )
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error(`GET /api/algorithms/${params.id} error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const algorithmId = params.id

    // Get algorithm to verify ownership
    const algorithm = await algorithmDatabase.getAlgorithm(algorithmId)
    if (!algorithm) {
      return NextResponse.json(
        { error: 'Algorithm not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const userAddress = authResult.user.address
    const isOwner = algorithm.user_address === userAddress
    const isAdmin = authResult.user.roles?.includes('admin')

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this algorithm' },
        { status: 403 }
      )
    }

    // Check if algorithm is being used in active computations
    // TODO: Add check for active computations when computation system is implemented

    // Delete algorithm
    const deleted = await algorithmDatabase.deleteAlgorithm(algorithmId)
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete algorithm' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error(`DELETE /api/algorithms/${params.id} error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}