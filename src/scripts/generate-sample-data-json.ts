#!/usr/bin/env tsx

import syntheticDataGenerator from '@/lib/services/synthetic-data-generator'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

async function generateAndSaveDataAsJSON() {
  try {
    console.log('🔄 Generating 1000 synthetic health records...')
    const dataset = await syntheticDataGenerator.generateSyntheticDataset(1000)
    
    console.log('🔄 Selecting public sample...')
    const publicSample = syntheticDataGenerator.selectPublicSample(dataset)
    
    console.log('💾 Saving data to JSON files...')
    
    const dataDir = resolve('./data')
    
    // Create data directory if it doesn't exist
    try {
      const { mkdirSync } = await import('fs')
      mkdirSync(dataDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
    
    // Save full dataset
    writeFileSync(
      resolve(dataDir, 'synthetic-health-records.json'),
      JSON.stringify(dataset, null, 2),
      'utf8'
    )
    
    // Save public sample
    writeFileSync(
      resolve(dataDir, 'public-health-sample.json'),
      JSON.stringify(publicSample, null, 2),
      'utf8'
    )
    
    // Save schema documentation
    const schemaDoc = {
      schema_name: 'health_screening_v1',
      description: 'Comprehensive health screening data schema based on medical examination reports',
      version: '1.0.0',
      generated_from: 'DataSample.pdf - SONG YING Medical Report',
      total_records: dataset.length,
      owner_wallet: '0x9DC00F109AcfBA2622f0fE48a522558fA4f1D509',
      data_structure: {
        personalInfo: {
          name: 'string - Full name of patient',
          age: 'number - Age in years (18-85)',
          gender: 'enum - M or F',
          height: 'number - Height in cm (150-200)',
          weight: 'number - Weight in kg (45-120)',
          bmi: 'number - Body Mass Index calculated from height/weight'
        },
        vitalSigns: {
          systolicBP: 'number - Systolic blood pressure (90-180)',
          diastolicBP: 'number - Diastolic blood pressure (60-110)',
          heartRate: 'number - Heart rate in BPM (50-120)',
          temperature: 'number - Body temperature in °C (36.0-37.5)',
          waistCircumference: 'number - Waist measurement in cm',
          hipCircumference: 'number - Hip measurement in cm',
          waistHipRatio: 'number - Calculated waist-to-hip ratio'
        },
        bloodWork: {
          totalCholesterol: 'number - Total cholesterol mg/dL (150-300)',
          ldlCholesterol: 'number - LDL cholesterol mg/dL (70-200)',
          hdlCholesterol: 'number - HDL cholesterol mg/dL (30-80)',
          triglycerides: 'number - Triglycerides mg/dL (50-250)',
          glucose: 'number - Blood glucose mg/dL (70-140)',
          hba1c: 'number - Hemoglobin A1C % (4.5-7.5)',
          creatinine: 'number - Creatinine mg/dL (0.6-1.4)',
          bun: 'number - Blood urea nitrogen mg/dL (8-25)',
          uricAcid: 'number - Uric acid mg/dL (2.5-8.5)',
          totalProtein: 'number - Total protein g/dL (6.0-8.5)',
          albumin: 'number - Albumin g/dL (3.5-5.0)',
          globulin: 'number - Globulin g/dL (2.0-4.0)',
          agRatio: 'number - Albumin/Globulin ratio (1.0-2.5)'
        },
        liverFunction: {
          alt: 'number - ALT enzyme U/L (10-60)',
          ast: 'number - AST enzyme U/L (10-50)',
          ggt: 'number - GGT enzyme U/L (10-80)',
          alp: 'number - Alkaline phosphatase U/L (40-150)',
          totalBilirubin: 'number - Total bilirubin mg/dL (0.3-2.0)',
          directBilirubin: 'number - Direct bilirubin mg/dL (0.1-0.8)',
          indirectBilirubin: 'number - Indirect bilirubin mg/dL (0.2-1.2)'
        },
        thyroidFunction: {
          tsh: 'number - TSH mIU/L (0.5-5.0)',
          ft3: 'number - Free T3 pg/mL (2.3-4.2)',
          ft4: 'number - Free T4 ng/dL (0.8-1.8)'
        },
        tumorMarkers: {
          afp: 'number - Alpha-fetoprotein ng/mL (0.5-15.0)',
          cea: 'number - Carcinoembryonic antigen ng/mL (0.5-8.0)',
          ca125: 'number - Cancer antigen 125 U/mL (5-35)',
          ca199: 'number - Cancer antigen 19-9 U/mL (5-40)',
          psa: 'number - PSA ng/mL (0.5-4.0) - Males only'
        },
        urinalysis: {
          specificGravity: 'number - Specific gravity (1.005-1.030)',
          ph: 'number - pH level (4.5-8.0)',
          protein: 'enum - Positive or Negative',
          glucose: 'enum - Positive or Negative',
          ketones: 'enum - Positive or Negative',
          bloodCells: 'enum - Present or None',
          bacteria: 'enum - Present or None'
        },
        imagingResults: {
          chestXray: 'string - Chest X-ray findings',
          abdominalUltrasound: 'string - Abdominal ultrasound findings',
          thyroidUltrasound: 'string - Thyroid ultrasound findings',
          ecg: 'string - ECG findings'
        },
        riskAssessment: {
          cardiovascularRisk: 'enum - Low, Medium, High',
          diabetesRisk: 'enum - Low, Medium, High',
          overallHealthScore: 'number - Overall health score (1-10)'
        }
      },
      privacy_features: {
        privacy_level: 'enum - high, medium, low, public',
        computation_types: 'array - third_party, zk, fhe',
        tags: 'array - Searchable tags for data classification'
      }
    }
    
    writeFileSync(
      resolve(dataDir, 'health-schema-documentation.json'),
      JSON.stringify(schemaDoc, null, 2),
      'utf8'
    )
    
    console.log('📊 Data Generation Complete!')
    console.log(`✅ Generated and saved ${dataset.length} health records`)
    console.log(`✅ Created 1 public sample record`)
    console.log(`📋 All records assigned to wallet: 0x9DC00F109AcfBA2622f0fE48a522558fA4f1D509`)
    console.log(`💾 Files saved to: ${dataDir}`)
    
    console.log('\n📈 Dataset Statistics:')
    const genderStats = dataset.reduce((acc, sample) => {
      const gender = sample.data.personalInfo.gender
      acc[gender] = (acc[gender] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const ageRanges = dataset.reduce((acc, sample) => {
      const age = sample.data.personalInfo.age
      if (age < 30) acc.young++
      else if (age < 50) acc.middle++
      else acc.senior++
      return acc
    }, { young: 0, middle: 0, senior: 0 })
    
    const riskStats = dataset.reduce((acc, sample) => {
      acc[sample.data.riskAssessment.cardiovascularRisk]++
      return acc
    }, { Low: 0, Medium: 0, High: 0 })
    
    console.log(`   Gender Distribution: Male: ${genderStats.M || 0}, Female: ${genderStats.F || 0}`)
    console.log(`   Age Distribution: <30: ${ageRanges.young}, 30-50: ${ageRanges.middle}, >50: ${ageRanges.senior}`)
    console.log(`   CV Risk Distribution: Low: ${riskStats.Low}, Medium: ${riskStats.Medium}, High: ${riskStats.High}`)
    
    console.log('\n🔍 Sample Record Preview:')
    const sampleRecord = dataset[0]
    console.log(`   Name: ${sampleRecord.data.personalInfo.name}`)
    console.log(`   Age: ${sampleRecord.data.personalInfo.age}, Gender: ${sampleRecord.data.personalInfo.gender}`)
    console.log(`   BMI: ${sampleRecord.data.personalInfo.bmi}, BP: ${sampleRecord.data.vitalSigns.systolicBP}/${sampleRecord.data.vitalSigns.diastolicBP}`)
    console.log(`   Cholesterol: ${sampleRecord.data.bloodWork.totalCholesterol}, HbA1c: ${sampleRecord.data.bloodWork.hba1c}%`)
    console.log(`   Risk Assessment: CV: ${sampleRecord.data.riskAssessment.cardiovascularRisk}, Diabetes: ${sampleRecord.data.riskAssessment.diabetesRisk}`)
    console.log(`   Tags: ${sampleRecord.tags.join(', ')}`)
    
  } catch (error) {
    console.error('❌ Error generating sample data:', error)
  }
}

generateAndSaveDataAsJSON()

export default generateAndSaveDataAsJSON