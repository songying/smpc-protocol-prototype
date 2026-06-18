import { SampleData } from '@/lib/database/algorithm-schemas'
import crypto from 'crypto'

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
    protein: string
    glucose: string
    ketones: string
    bloodCells: string
    bacteria: string
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

class SyntheticDataGenerator {
  private readonly FIXED_WALLET = '0x9DC00F109AcfBA2622f0fE48a522558fA4f1D509'
  
  generateRandomInRange(min: number, max: number, decimals: number = 1): number {
    const value = Math.random() * (max - min) + min
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  generateNormalDistribution(mean: number, stdDev: number, decimals: number = 1): number {
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const value = mean + stdDev * z0
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  generateName(gender: 'M' | 'F'): string {
    const maleNames = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher']
    const femaleNames = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
    
    const firstNames = gender === 'M' ? maleNames : femaleNames
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    
    return `${firstName} ${lastName}`
  }

  calculateBMI(weight: number, height: number): number {
    const heightInMeters = height / 100
    return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10
  }

  generateCorrelatedVitals(age: number, bmi: number) {
    let baseSystolic = 110 + (age * 0.5) + (bmi > 25 ? (bmi - 25) * 2 : 0)
    let baseDiastolic = 70 + (age * 0.3) + (bmi > 25 ? (bmi - 25) * 1.2 : 0)
    
    baseSystolic = Math.max(90, Math.min(180, baseSystolic))
    baseDiastolic = Math.max(60, Math.min(110, baseDiastolic))
    
    return {
      systolic: Math.round(this.generateNormalDistribution(baseSystolic, 8)),
      diastolic: Math.round(this.generateNormalDistribution(baseDiastolic, 5)),
      heartRate: Math.round(this.generateNormalDistribution(72, 8))
    }
  }

  assessRisks(record: HealthRecord): HealthRecord['riskAssessment'] {
    let cvRiskScore = 0
    let diabetesRiskScore = 0
    
    if (record.personalInfo.age > 45) cvRiskScore += 1
    if (record.personalInfo.bmi > 25) cvRiskScore += 1
    if (record.vitalSigns.systolicBP > 140 || record.vitalSigns.diastolicBP > 90) cvRiskScore += 2
    if (record.bloodWork.totalCholesterol > 240) cvRiskScore += 1
    if (record.bloodWork.hdlCholesterol < 40) cvRiskScore += 1
    
    if (record.personalInfo.age > 45) diabetesRiskScore += 1
    if (record.personalInfo.bmi > 30) diabetesRiskScore += 2
    if (record.bloodWork.glucose > 125) diabetesRiskScore += 2
    if (record.bloodWork.hba1c > 6.0) diabetesRiskScore += 2
    
    const cardiovascularRisk = cvRiskScore <= 2 ? 'Low' : cvRiskScore <= 4 ? 'Medium' : 'High'
    const diabetesRisk = diabetesRiskScore <= 2 ? 'Low' : diabetesRiskScore <= 4 ? 'Medium' : 'High'
    
    const overallHealthScore = Math.max(1, Math.min(10, 10 - (cvRiskScore + diabetesRiskScore)))
    
    return { cardiovascularRisk, diabetesRisk, overallHealthScore }
  }

  generateHealthRecord(index: number): HealthRecord {
    const gender = Math.random() > 0.5 ? 'M' : 'F'
    const age = Math.round(this.generateNormalDistribution(45, 15))
    const height = gender === 'M' 
      ? Math.round(this.generateNormalDistribution(175, 8))
      : Math.round(this.generateNormalDistribution(162, 7))
    const weight = Math.round(this.generateNormalDistribution(70, 12))
    const bmi = this.calculateBMI(weight, height)
    
    const vitals = this.generateCorrelatedVitals(age, bmi)
    const waist = Math.round(this.generateNormalDistribution(85, 10))
    const hip = Math.round(this.generateNormalDistribution(95, 8))
    
    const record: HealthRecord = {
      personalInfo: {
        name: this.generateName(gender),
        age: Math.max(18, Math.min(85, age)),
        gender,
        height: Math.max(150, Math.min(200, height)),
        weight: Math.max(45, Math.min(120, weight)),
        bmi
      },
      vitalSigns: {
        systolicBP: vitals.systolic,
        diastolicBP: vitals.diastolic,
        heartRate: Math.max(50, Math.min(120, vitals.heartRate)),
        temperature: this.generateRandomInRange(36.0, 37.5, 1),
        waistCircumference: Math.max(60, waist),
        hipCircumference: Math.max(70, hip),
        waistHipRatio: Math.round((waist / hip) * 100) / 100
      },
      bloodWork: {
        totalCholesterol: this.generateRandomInRange(150, 300, 1),
        ldlCholesterol: this.generateRandomInRange(70, 200, 1),
        hdlCholesterol: this.generateRandomInRange(30, 80, 1),
        triglycerides: this.generateRandomInRange(50, 250, 1),
        glucose: this.generateRandomInRange(70, 140, 1),
        hba1c: this.generateRandomInRange(4.5, 7.5, 1),
        creatinine: this.generateRandomInRange(0.6, 1.4, 2),
        bun: this.generateRandomInRange(8, 25, 1),
        uricAcid: this.generateRandomInRange(2.5, 8.5, 1),
        totalProtein: this.generateRandomInRange(6.0, 8.5, 1),
        albumin: this.generateRandomInRange(3.5, 5.0, 1),
        globulin: this.generateRandomInRange(2.0, 4.0, 1),
        agRatio: this.generateRandomInRange(1.0, 2.5, 1)
      },
      liverFunction: {
        alt: Math.round(this.generateRandomInRange(10, 60)),
        ast: Math.round(this.generateRandomInRange(10, 50)),
        ggt: Math.round(this.generateRandomInRange(10, 80)),
        alp: Math.round(this.generateRandomInRange(40, 150)),
        totalBilirubin: this.generateRandomInRange(0.3, 2.0, 1),
        directBilirubin: this.generateRandomInRange(0.1, 0.8, 1),
        indirectBilirubin: this.generateRandomInRange(0.2, 1.2, 1)
      },
      thyroidFunction: {
        tsh: this.generateRandomInRange(0.5, 5.0, 2),
        ft3: this.generateRandomInRange(2.3, 4.2, 1),
        ft4: this.generateRandomInRange(0.8, 1.8, 1)
      },
      tumorMarkers: {
        afp: this.generateRandomInRange(0.5, 15.0, 1),
        cea: this.generateRandomInRange(0.5, 8.0, 1),
        ca125: this.generateRandomInRange(5, 35, 1),
        ca199: this.generateRandomInRange(5, 40, 1),
        ...(gender === 'M' && { psa: this.generateRandomInRange(0.5, 4.0, 1) })
      },
      urinalysis: {
        specificGravity: this.generateRandomInRange(1.005, 1.030, 3),
        ph: this.generateRandomInRange(4.5, 8.0, 1),
        protein: Math.random() > 0.9 ? 'Positive' : 'Negative',
        glucose: Math.random() > 0.95 ? 'Positive' : 'Negative',
        ketones: Math.random() > 0.98 ? 'Positive' : 'Negative',
        bloodCells: Math.random() > 0.85 ? 'Present' : 'None',
        bacteria: Math.random() > 0.8 ? 'Present' : 'None'
      },
      imagingResults: {
        chestXray: Math.random() > 0.9 ? 'Abnormal findings noted' : 'Normal chest structure',
        abdominalUltrasound: Math.random() > 0.85 ? 'Minor irregularities' : 'Normal abdominal organs',
        thyroidUltrasound: Math.random() > 0.9 ? 'Nodules detected' : 'Normal thyroid structure',
        ecg: Math.random() > 0.8 ? 'Minor rhythm variations' : 'Normal sinus rhythm'
      },
      riskAssessment: { cardiovascularRisk: 'Low', diabetesRisk: 'Low', overallHealthScore: 5 }
    }
    
    record.riskAssessment = this.assessRisks(record)
    
    return record
  }

  async generateSyntheticDataset(count: number = 1000): Promise<SampleData[]> {
    const dataset: SampleData[] = []
    
    for (let i = 0; i < count; i++) {
      const healthRecord = this.generateHealthRecord(i)
      const recordId = crypto.randomUUID()
      
      const sampleData: SampleData = {
        id: recordId,
        name: `Health Record ${i + 1}`,
        description: `Synthetic health record for ${healthRecord.personalInfo.name}`,
        schema: 'health_screening_v1',
        data: healthRecord,
        owner_address: this.FIXED_WALLET,
        privacy_level: 'high',
        computation_types: ['third_party', 'zk', 'fhe'],
        tags: this.generateTags(healthRecord),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      dataset.push(sampleData)
    }
    
    return dataset
  }

  private generateTags(record: HealthRecord): string[] {
    const tags = ['health', 'medical', 'screening']
    
    if (record.personalInfo.age > 60) tags.push('elderly')
    if (record.personalInfo.age < 30) tags.push('young_adult')
    if (record.personalInfo.bmi > 30) tags.push('obesity')
    if (record.personalInfo.bmi < 18.5) tags.push('underweight')
    if (record.vitalSigns.systolicBP > 140) tags.push('hypertension')
    if (record.bloodWork.glucose > 125) tags.push('diabetes_risk')
    if (record.bloodWork.totalCholesterol > 240) tags.push('high_cholesterol')
    if (record.riskAssessment.cardiovascularRisk === 'High') tags.push('cv_risk')
    if (record.personalInfo.gender === 'M') tags.push('male')
    if (record.personalInfo.gender === 'F') tags.push('female')
    
    return tags
  }

  selectPublicSample(dataset: SampleData[]): SampleData {
    const publicSample = dataset[Math.floor(Math.random() * dataset.length)]
    
    return {
      ...publicSample,
      name: 'Public Health Sample - Anonymized',
      description: 'Sample health screening data for algorithm development and testing',
      privacy_level: 'public' as const,
      owner_address: 'public'
    }
  }
}

export const syntheticDataGenerator = new SyntheticDataGenerator()
export default syntheticDataGenerator