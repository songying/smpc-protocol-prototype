#!/usr/bin/env tsx

import algorithmDatabase from '@/lib/database/algorithm-schemas'
import syntheticDataGenerator from '@/lib/services/synthetic-data-generator'
import redisClient from '@/lib/database/redis-client'

async function generateAndStoreSampleData() {
  try {
    console.log('🔄 Connecting to Redis...')
    await redisClient.connect()
    
    console.log('🔄 Generating 1000 synthetic health records...')
    const dataset = await syntheticDataGenerator.generateSyntheticDataset(1000)
    
    console.log('🔄 Storing sample data in Redis...')
    let storedCount = 0
    
    for (const sample of dataset) {
      try {
        await algorithmDatabase.createSampleData(sample)
        storedCount++
        
        if (storedCount % 100 === 0) {
          console.log(`✅ Stored ${storedCount}/1000 records`)
        }
      } catch (error) {
        console.error(`❌ Failed to store record ${sample.id}:`, error)
      }
    }
    
    console.log('🔄 Selecting and storing public sample...')
    const publicSample = syntheticDataGenerator.selectPublicSample(dataset)
    await algorithmDatabase.createPublicSample(publicSample)
    
    console.log('📊 Sample Data Generation Complete!')
    console.log(`✅ Generated and stored ${storedCount}/1000 health records`)
    console.log(`✅ Created 1 public sample record`)
    console.log(`📋 All records assigned to wallet: 0x9DC00F109AcfBA2622f0fE48a522558fA4f1D509`)
    
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
    
    console.log(`   Gender Distribution: Male: ${genderStats.M || 0}, Female: ${genderStats.F || 0}`)
    console.log(`   Age Distribution: <30: ${ageRanges.young}, 30-50: ${ageRanges.middle}, >50: ${ageRanges.senior}`)
    
    console.log('\n🔍 Sample Record Preview:')
    const sampleRecord = dataset[0]
    console.log(`   Name: ${sampleRecord.data.personalInfo.name}`)
    console.log(`   Age: ${sampleRecord.data.personalInfo.age}, Gender: ${sampleRecord.data.personalInfo.gender}`)
    console.log(`   BMI: ${sampleRecord.data.personalInfo.bmi}, BP: ${sampleRecord.data.vitalSigns.systolicBP}/${sampleRecord.data.vitalSigns.diastolicBP}`)
    console.log(`   Risk Assessment: CV: ${sampleRecord.data.riskAssessment.cardiovascularRisk}, Diabetes: ${sampleRecord.data.riskAssessment.diabetesRisk}`)
    
  } catch (error) {
    console.error('❌ Error generating sample data:', error)
  } finally {
    await redisClient.disconnect()
    console.log('🔌 Disconnected from Redis')
  }
}

generateAndStoreSampleData()

export default generateAndStoreSampleData