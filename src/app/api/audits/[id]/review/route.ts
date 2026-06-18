import { NextRequest, NextResponse } from 'next/server'
import algorithmService from '@/lib/services/algorithm-service'
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

    // Check auditor permission
    if (!authResult.user.roles?.includes('auditor')) {
      return NextResponse.json(
        { error: 'Auditor role required to review algorithms' },
        { status: 403 }
      )
    }

    const algorithmId = params.id
    const auditorAddress = authResult.user.address

    // Get algorithm for audit (this will decrypt the code)
    const result = await algorithmService.getAlgorithmForAudit(
      algorithmId,
      auditorAddress
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.includes('not found') ? 404 : 403 }
      )
    }

    // Return algorithm data with decrypted code for audit
    return NextResponse.json({
      algorithm: {
        id: result.algorithm!.id,
        name: result.algorithm!.name,
        description: result.algorithm!.description,
        computation_type: result.algorithm!.computation_type,
        version: result.algorithm!.version,
        status: result.algorithm!.status,
        user_address: result.algorithm!.user_address,
        created_at: result.algorithm!.created_at,
        updated_at: result.algorithm!.updated_at
      },
      sourceCode: result.decryptedCode,
      sandboxConfig: result.sandboxConfig
    })

  } catch (error) {
    console.error(`GET /api/audits/${params.id}/review error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}