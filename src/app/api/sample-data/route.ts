import { NextRequest, NextResponse } from 'next/server'
import algorithmDatabase from '@/lib/database/algorithm-schemas'
import { verifyAuth } from '@/lib/api/middleware'
import { readFileSync } from 'fs'
import { resolve } from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const computationType = searchParams.get('computation_type')
    const privacyLevel = searchParams.get('privacy_level')
    const schema = searchParams.get('schema')

    // Try to get data from Redis first
    try {
      const authResult = await verifyAuth(request)
      if (authResult.success) {
        const sampleData = await algorithmDatabase.getSampleData({
          limit,
          offset,
          tags,
          computationType,
          privacyLevel,
          schema
        })
        
        if (sampleData.length > 0) {
          return NextResponse.json({
            data: sampleData,
            total: sampleData.length,
            limit,
            offset,
            source: 'redis'
          })
        }
      }
    } catch (redisError) {
      console.log('Redis not available, falling back to JSON files')
    }

    // Fallback to JSON files if Redis is not available
    try {
      const dataDir = resolve('./data')
      const syntheticData = JSON.parse(
        readFileSync(resolve(dataDir, 'synthetic-health-records.json'), 'utf8')
      )
      
      // Apply filters
      let filteredData = syntheticData
      
      if (tags.length > 0) {
        filteredData = filteredData.filter((sample: any) =>
          tags.some(tag => sample.tags.includes(tag))
        )
      }
      
      if (computationType) {
        filteredData = filteredData.filter((sample: any) =>
          sample.computation_types.includes(computationType)
        )
      }
      
      if (privacyLevel) {
        filteredData = filteredData.filter((sample: any) =>
          sample.privacy_level === privacyLevel
        )
      }
      
      if (schema) {
        filteredData = filteredData.filter((sample: any) =>
          sample.schema === schema
        )
      }
      
      // Apply pagination
      const paginatedData = filteredData.slice(offset, offset + limit)
      
      return NextResponse.json({
        data: paginatedData,
        total: filteredData.length,
        limit,
        offset,
        source: 'json_fallback'
      })
      
    } catch (fileError) {
      console.error('Error reading JSON files:', fileError)
      
      // Return mock data if files are not available
      return NextResponse.json({
        data: [],
        total: 0,
        limit,
        offset,
        source: 'mock',
        message: 'Sample data not available. Run `npm run data:generate-json` to generate synthetic data.'
      })
    }

  } catch (error) {
    console.error('GET /api/sample-data error:', error)
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

    // Check data provider permission
    if (!authResult.user.roles?.includes('provider') && !authResult.user.roles?.includes('admin')) {
      return NextResponse.json(
        { error: 'Data provider or admin role required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, schema, data, privacy_level, computation_types, tags } = body

    if (!name || !description || !schema || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, schema, data' },
        { status: 400 }
      )
    }

    const sampleData = {
      id: crypto.randomUUID(),
      name,
      description,
      schema,
      data,
      owner_address: authResult.user.address,
      privacy_level: privacy_level || 'high',
      computation_types: computation_types || ['third_party'],
      tags: tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const result = await algorithmDatabase.createSampleData(sampleData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      sampleData: result.sampleData,
      message: 'Sample data created successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('POST /api/sample-data error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}