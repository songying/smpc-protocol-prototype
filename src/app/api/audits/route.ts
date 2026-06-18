import { NextRequest, NextResponse } from 'next/server'
import algorithmService from '@/lib/services/algorithm-service'
import algorithmDatabase from '@/lib/database/algorithm-schemas'
import { verifyAuth } from '@/lib/api/middleware'
import { z } from 'zod'

const assignAuditSchema = z.object({
  algorithmId: z.string().uuid(),
  auditorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  priority: z.enum(['low', 'medium', 'high']).optional()
})

const auditDecisionSchema = z.object({
  auditId: z.string().uuid(),
  decision: z.enum(['approved', 'request_changes', 'rejected']),
  comments: z.string().min(1),
  auditChecklist: z.record(z.boolean()).optional()
})

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
    const auditorAddress = searchParams.get('auditor')
    const algorithmId = searchParams.get('algorithm')
    const status = searchParams.get('status')

    const userAddress = authResult.user.address
    const isAdmin = authResult.user.roles?.includes('admin')
    const isAuditor = authResult.user.roles?.includes('auditor')

    // Get audits by auditor
    if (auditorAddress) {
      // Verify permission to view auditor's audits
      if (auditorAddress !== userAddress && !isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized to view other auditor\'s audits' },
          { status: 403 }
        )
      }

      const audits = await algorithmDatabase.getAuditsByAuditor(auditorAddress)
      return NextResponse.json({ audits })
    }

    // Get audits for specific algorithm
    if (algorithmId) {
      const audits = await algorithmDatabase.getAuditsByAlgorithm(algorithmId)
      
      // Filter based on permissions
      let filteredAudits = audits
      if (!isAdmin) {
        // Algorithm owner can see all audits for their algorithms
        const algorithm = await algorithmDatabase.getAlgorithm(algorithmId)
        if (algorithm?.user_address === userAddress) {
          filteredAudits = audits
        } else if (isAuditor) {
          // Auditors can only see their own audits
          filteredAudits = audits.filter(audit => audit.auditor_address === userAddress)
        } else {
          return NextResponse.json(
            { error: 'Unauthorized to view these audits' },
            { status: 403 }
          )
        }
      }

      return NextResponse.json({ audits: filteredAudits })
    }

    // Get pending audits (for auditors)
    if (status === 'pending' && isAuditor) {
      const pendingAudits = await algorithmService.getAuditorPendingAudits(userAddress)
      return NextResponse.json({ audits: pendingAudits })
    }

    // Get all pending audits (admin only)
    if (status === 'pending' && isAdmin) {
      const allPendingAudits = await algorithmDatabase.getPendingAudits()
      return NextResponse.json({ audits: allPendingAudits })
    }

    // Default: get user's audits if they're an auditor
    if (isAuditor) {
      const audits = await algorithmDatabase.getAuditsByAuditor(userAddress)
      return NextResponse.json({ audits })
    }

    return NextResponse.json({ audits: [] })

  } catch (error) {
    console.error('GET /api/audits error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Check admin permission for audit assignment
    if (!authResult.user.roles?.includes('admin')) {
      return NextResponse.json(
        { error: 'Admin role required to assign audits' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = assignAuditSchema.parse(body)

    // Assign audit
    const result = await algorithmService.assignAudit(validatedData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      audit: result.audit
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/audits error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
        { error: 'Auditor role required to submit audit decisions' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = auditDecisionSchema.parse(body)

    // Verify auditor is assigned to this audit
    const audit = await algorithmDatabase.getAudit(validatedData.auditId)
    if (!audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      )
    }

    if (audit.auditor_address !== authResult.user.address) {
      return NextResponse.json(
        { error: 'Unauthorized: You are not assigned to this audit' },
        { status: 403 }
      )
    }

    // Submit audit decision
    const result = await algorithmService.submitAuditDecision(validatedData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      audit: result.audit
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('PUT /api/audits error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}