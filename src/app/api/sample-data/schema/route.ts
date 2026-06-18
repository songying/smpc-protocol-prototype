import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { resolve } from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schemaName = searchParams.get('name') || 'health_screening_v1'
    const format = searchParams.get('format') || 'json'
    
    try {
      const dataDir = resolve('./data')
      const schemaDoc = JSON.parse(
        readFileSync(resolve(dataDir, 'health-schema-documentation.json'), 'utf8')
      )
      
      if (format === 'typescript') {
        // Generate TypeScript interfaces
        const tsInterface = generateTypeScriptInterface(schemaDoc)
        
        return new NextResponse(tsInterface, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': 'attachment; filename="health-record-types.ts"'
          }
        })
      }
      
      if (format === 'json-schema') {
        // Generate JSON Schema format
        const jsonSchema = generateJSONSchema(schemaDoc)
        return NextResponse.json(jsonSchema)
      }
      
      // Default: return documentation format
      return NextResponse.json(schemaDoc)
      
    } catch (fileError) {
      console.error('Error reading schema documentation:', fileError)
      
      // Return minimal schema if file is not available
      return NextResponse.json({
        schema_name: 'health_screening_v1',
        description: 'Health screening data schema',
        version: '1.0.0',
        message: 'Complete schema documentation not available. Run `npm run data:generate-json` to generate full documentation.'
      })
    }

  } catch (error) {
    console.error('GET /api/sample-data/schema error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateTypeScriptInterface(schemaDoc: any): string {
  return `// Generated TypeScript interfaces for ${schemaDoc.schema_name}
// Version: ${schemaDoc.version}
// Generated on: ${new Date().toISOString()}

export interface HealthRecord {
  personalInfo: {
    name: string
    age: number
    gender: 'M' | 'F'
    height: number // cm
    weight: number // kg
    bmi: number
  }
  vitalSigns: {
    systolicBP: number
    diastolicBP: number
    heartRate: number
    temperature: number
    waistCircumference: number
    hipCircumference: number
    waistHipRatio: number
  }
  bloodWork: {
    totalCholesterol: number
    ldlCholesterol: number
    hdlCholesterol: number
    triglycerides: number
    glucose: number
    hba1c: number
    creatinine: number
    bun: number
    uricAcid: number
    totalProtein: number
    albumin: number
    globulin: number
    agRatio: number
  }
  liverFunction: {
    alt: number
    ast: number
    ggt: number
    alp: number
    totalBilirubin: number
    directBilirubin: number
    indirectBilirubin: number
  }
  thyroidFunction: {
    tsh: number
    ft3: number
    ft4: number
  }
  tumorMarkers: {
    afp: number
    cea: number
    ca125: number
    ca199: number
    psa?: number // Only for males
  }
  urinalysis: {
    specificGravity: number
    ph: number
    protein: 'Positive' | 'Negative'
    glucose: 'Positive' | 'Negative'
    ketones: 'Positive' | 'Negative'
    bloodCells: 'Present' | 'None'
    bacteria: 'Present' | 'None'
  }
  imagingResults: {
    chestXray: string
    abdominalUltrasound: string
    thyroidUltrasound: string
    ecg: string
  }
  riskAssessment: {
    cardiovascularRisk: 'Low' | 'Medium' | 'High'
    diabetesRisk: 'Low' | 'Medium' | 'High'
    overallHealthScore: number
  }
}

export interface SampleHealthData {
  id: string
  name: string
  description: string
  schema: string
  data: HealthRecord
  owner_address: string
  privacy_level: 'high' | 'medium' | 'low' | 'public'
  computation_types: Array<'third_party' | 'zk' | 'fhe'>
  tags: string[]
  created_at: string
  updated_at: string
}

export type ComputationType = 'third_party' | 'zk' | 'fhe'
export type PrivacyLevel = 'high' | 'medium' | 'low' | 'public'
export type RiskLevel = 'Low' | 'Medium' | 'High'
`
}

function generateJSONSchema(schemaDoc: any): object {
  return {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": schemaDoc.schema_name,
    "description": schemaDoc.description,
    "version": schemaDoc.version,
    "type": "object",
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "name": { "type": "string" },
      "description": { "type": "string" },
      "schema": { "type": "string" },
      "data": {
        "type": "object",
        "properties": {
          "personalInfo": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "age": { "type": "integer", "minimum": 18, "maximum": 85 },
              "gender": { "type": "string", "enum": ["M", "F"] },
              "height": { "type": "number", "minimum": 150, "maximum": 200 },
              "weight": { "type": "number", "minimum": 45, "maximum": 120 },
              "bmi": { "type": "number", "minimum": 15, "maximum": 50 }
            },
            "required": ["name", "age", "gender", "height", "weight", "bmi"]
          },
          "vitalSigns": {
            "type": "object",
            "properties": {
              "systolicBP": { "type": "integer", "minimum": 90, "maximum": 180 },
              "diastolicBP": { "type": "integer", "minimum": 60, "maximum": 110 },
              "heartRate": { "type": "integer", "minimum": 50, "maximum": 120 },
              "temperature": { "type": "number", "minimum": 36.0, "maximum": 37.5 },
              "waistCircumference": { "type": "number" },
              "hipCircumference": { "type": "number" },
              "waistHipRatio": { "type": "number" }
            },
            "required": ["systolicBP", "diastolicBP", "heartRate", "temperature"]
          },
          "riskAssessment": {
            "type": "object",
            "properties": {
              "cardiovascularRisk": { "type": "string", "enum": ["Low", "Medium", "High"] },
              "diabetesRisk": { "type": "string", "enum": ["Low", "Medium", "High"] },
              "overallHealthScore": { "type": "integer", "minimum": 1, "maximum": 10 }
            },
            "required": ["cardiovascularRisk", "diabetesRisk", "overallHealthScore"]
          }
        },
        "required": ["personalInfo", "vitalSigns", "riskAssessment"]
      },
      "privacy_level": { 
        "type": "string", 
        "enum": ["high", "medium", "low", "public"] 
      },
      "computation_types": {
        "type": "array",
        "items": { "type": "string", "enum": ["third_party", "zk", "fhe"] }
      },
      "tags": {
        "type": "array",
        "items": { "type": "string" }
      }
    },
    "required": ["id", "name", "description", "schema", "data", "privacy_level", "computation_types"]
  }
}