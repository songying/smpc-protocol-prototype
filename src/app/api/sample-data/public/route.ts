import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { resolve } from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeSchema = searchParams.get('include_schema') === 'true'
    
    // Get public sample from JSON file
    try {
      const dataDir = resolve('./data')
      const publicSample = JSON.parse(
        readFileSync(resolve(dataDir, 'public-health-sample.json'), 'utf8')
      )
      
      let response = {
        sample: publicSample,
        documentation: {
          description: 'This is an anonymized health screening record provided as a public sample for algorithm development and testing.',
          usage: 'This data can be used to develop and test privacy-preserving algorithms before deploying them on real private health data.',
          privacy_notice: 'All personal information has been anonymized. This is synthetic data generated for demonstration purposes.',
          data_structure: 'The data follows the health_screening_v1 schema with comprehensive health metrics.',
          computation_types_supported: ['third_party', 'zk', 'fhe'],
          last_updated: new Date().toISOString()
        }
      }
      
      if (includeSchema) {
        const schemaDoc = JSON.parse(
          readFileSync(resolve(dataDir, 'health-schema-documentation.json'), 'utf8')
        )
        response = { ...response, schema: schemaDoc }
      }
      
      return NextResponse.json(response)
      
    } catch (fileError) {
      console.error('Error reading public sample file:', fileError)
      
      // Return a minimal mock sample if file is not available
      return NextResponse.json({
        sample: {
          id: 'public-sample-1',
          name: 'Public Health Sample - Anonymized',
          description: 'Sample health screening data for algorithm development and testing',
          schema: 'health_screening_v1',
          data: {
            personalInfo: {
              name: 'Anonymous Patient',
              age: 45,
              gender: 'F',
              height: 165,
              weight: 65,
              bmi: 23.9
            },
            vitalSigns: {
              systolicBP: 120,
              diastolicBP: 80,
              heartRate: 72,
              temperature: 36.8,
              waistCircumference: 80,
              hipCircumference: 95,
              waistHipRatio: 0.84
            },
            riskAssessment: {
              cardiovascularRisk: 'Low',
              diabetesRisk: 'Low',
              overallHealthScore: 8
            }
          },
          privacy_level: 'public',
          computation_types: ['third_party', 'zk', 'fhe'],
          tags: ['health', 'medical', 'screening', 'public', 'sample']
        },
        documentation: {
          description: 'This is a minimal sample provided when full synthetic data is not available.',
          usage: 'Run `npm run data:generate-json` to generate comprehensive synthetic health data.',
          privacy_notice: 'This is mock data for demonstration purposes only.',
          last_updated: new Date().toISOString()
        },
        message: 'Full synthetic data not available. This is a minimal sample. Run data generation script for complete dataset.'
      })
    }

  } catch (error) {
    console.error('GET /api/sample-data/public error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}