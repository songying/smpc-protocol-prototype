# Sample Data Documentation

## Overview

This document provides comprehensive documentation for the synthetic health screening data generated for the SMPC protocol. The data is based on a real medical examination report and has been synthesized to create 1000 realistic health records for algorithm development and testing.

## Recent Updates (December 2024)
- ✅ **Enhanced Data Consumer Integration**: Personal datasets now appear in data consumer dashboard
- ✅ **Realistic Patient Records**: Joseph Jones (62, Male) and Linda Rodriguez (37, Female) profiles
- ✅ **Personal vs Marketplace**: Clear distinction between user's own data (free) and purchasable datasets
- ✅ **Rich Metadata**: Enhanced tagging with demographics, risk assessments, and medical characteristics
- ✅ **Multi-Provider Support**: Mix of personal datasets and marketplace offerings from various providers

## Current Dataset Integration

### Data Consumer Dashboard Datasets

#### Personal Datasets (Free Access)
1. **My Health Schema Documentation**
   - 1000 records, Health screening schema
   - Provider: current_user (personal data)
   - Price: Free (0 ETH)
   - Tags: health, screening, medical, comprehensive, personal

2. **My Public Health Sample - Joseph Jones**
   - Single record: Male, Age 62
   - Health profile: Diabetes risk, normal cardiovascular profile
   - Provider: current_user (personal data)
   - Price: Free (0 ETH)
   - Tags: health, public, sample, personal, joseph-jones, male, elderly, diabetes-risk

3. **My Synthetic Health Records Collection**
   - 100 records including Linda Rodriguez (Female, Age 37)
   - Provider: current_user (personal data)
   - Price: Free (0 ETH)
   - Size: ~2.3MB
   - Tags: health, synthetic, anonymized, personal, research, linda-rodriguez, female

#### Marketplace Datasets (Paid Access)
1. **Premium Health Screening Schema** - 0.5 ETH (5000 records)
2. **Large Scale Synthetic Health Dataset** - 1.5 ETH (10000 records)
3. **Community Health Sample Dataset** - 0.2 ETH (50 records)

## Data Generation

### Source Document
- **Original Report**: DataSample.pdf - Medical examination report for patient "SONG YING"
- **Report Date**: Comprehensive health screening including 42 pages of detailed medical data
- **Data Points**: Physical measurements, laboratory results, imaging reports, and risk assessments

### Synthetic Dataset
- **Total Records**: 1000 synthetic health records
- **Wallet Assignment**: All records assigned to `0x9DC00F109AcfBA2622f0fE48a522558fA4f1D509`
- **Schema Version**: `health_screening_v1`
- **Privacy Level**: High (with one public sample for testing)

## Data Structure

### Personal Information
```typescript
personalInfo: {
  name: string        // Full patient name
  age: number         // Age in years (18-85)
  gender: 'M' | 'F'   // Gender
  height: number      // Height in cm (150-200)
  weight: number      // Weight in kg (45-120)
  bmi: number         // Calculated BMI
}
```

### Vital Signs
```typescript
vitalSigns: {
  systolicBP: number         // Systolic blood pressure (90-180)
  diastolicBP: number        // Diastolic blood pressure (60-110)
  heartRate: number          // Heart rate in BPM (50-120)
  temperature: number        // Body temperature in °C (36.0-37.5)
  waistCircumference: number // Waist measurement in cm
  hipCircumference: number   // Hip measurement in cm
  waistHipRatio: number      // Calculated ratio
}
```

### Laboratory Results
```typescript
bloodWork: {
  totalCholesterol: number   // mg/dL (150-300)
  ldlCholesterol: number     // mg/dL (70-200)
  hdlCholesterol: number     // mg/dL (30-80)
  triglycerides: number      // mg/dL (50-250)
  glucose: number            // mg/dL (70-140)
  hba1c: number             // % (4.5-7.5)
  creatinine: number        // mg/dL (0.6-1.4)
  bun: number               // mg/dL (8-25)
  uricAcid: number          // mg/dL (2.5-8.5)
  totalProtein: number      // g/dL (6.0-8.5)
  albumin: number           // g/dL (3.5-5.0)
  globulin: number          // g/dL (2.0-4.0)
  agRatio: number           // Albumin/Globulin ratio (1.0-2.5)
}
```

### Liver Function Tests
```typescript
liverFunction: {
  alt: number               // ALT enzyme U/L (10-60)
  ast: number               // AST enzyme U/L (10-50)
  ggt: number               // GGT enzyme U/L (10-80)
  alp: number               // Alkaline phosphatase U/L (40-150)
  totalBilirubin: number    // mg/dL (0.3-2.0)
  directBilirubin: number   // mg/dL (0.1-0.8)
  indirectBilirubin: number // mg/dL (0.2-1.2)
}
```

### Thyroid Function
```typescript
thyroidFunction: {
  tsh: number  // TSH mIU/L (0.5-5.0)
  ft3: number  // Free T3 pg/mL (2.3-4.2)
  ft4: number  // Free T4 ng/dL (0.8-1.8)
}
```

### Tumor Markers
```typescript
tumorMarkers: {
  afp: number      // Alpha-fetoprotein ng/mL (0.5-15.0)
  cea: number      // Carcinoembryonic antigen ng/mL (0.5-8.0)
  ca125: number    // Cancer antigen 125 U/mL (5-35)
  ca199: number    // Cancer antigen 19-9 U/mL (5-40)
  psa?: number     // PSA ng/mL (0.5-4.0) - Males only
}
```

### Urinalysis
```typescript
urinalysis: {
  specificGravity: number           // (1.005-1.030)
  ph: number                        // pH level (4.5-8.0)
  protein: 'Positive' | 'Negative'  // Protein presence
  glucose: 'Positive' | 'Negative'  // Glucose presence
  ketones: 'Positive' | 'Negative'  // Ketones presence
  bloodCells: 'Present' | 'None'    // Blood cells
  bacteria: 'Present' | 'None'      // Bacteria
}
```

### Imaging Results
```typescript
imagingResults: {
  chestXray: string           // Chest X-ray findings
  abdominalUltrasound: string // Abdominal ultrasound findings
  thyroidUltrasound: string   // Thyroid ultrasound findings
  ecg: string                 // ECG findings
}
```

### Risk Assessment
```typescript
riskAssessment: {
  cardiovascularRisk: 'Low' | 'Medium' | 'High' // Calculated CV risk
  diabetesRisk: 'Low' | 'Medium' | 'High'       // Calculated diabetes risk
  overallHealthScore: number                    // Score 1-10
}
```

## Data Characteristics

### Statistical Distribution
- **Gender**: ~50% male, 50% female
- **Age**: Normal distribution centered around 45 years
- **BMI**: Realistic distribution with correlation to blood pressure
- **Blood Pressure**: Age and BMI correlated values
- **Risk Factors**: Medically realistic correlations

### Medical Realism
- **Correlated Values**: BMI correlates with blood pressure and cardiovascular risk
- **Age Dependencies**: Older patients have higher baseline blood pressure
- **Gender Differences**: PSA markers only for males
- **Risk Calculations**: Multi-factor risk assessment based on multiple parameters

### Privacy Features
- **Anonymization**: All names are randomly generated
- **Synthetic Data**: No real patient data is used
- **Privacy Levels**: Support for different privacy classifications
- **Computation Types**: Compatible with third-party, ZK, and FHE computations

## API Endpoints

### Get Sample Data
```
GET /api/sample-data
Query Parameters:
- limit: number (default: 10)
- offset: number (default: 0)
- tags: comma-separated string
- computation_type: 'third_party' | 'zk' | 'fhe'
- privacy_level: 'high' | 'medium' | 'low' | 'public'
- schema: string
```

### Get Public Sample
```
GET /api/sample-data/public
Query Parameters:
- include_schema: boolean (default: false)
```

### Get Schema Documentation
```
GET /api/sample-data/schema
Query Parameters:
- name: string (default: 'health_screening_v1')
- format: 'json' | 'typescript' | 'json-schema'
```

## Files Structure

### Generated Files
```
data/
├── synthetic-health-records.json      # Full dataset (1000 records)
├── public-health-sample.json          # Public sample record
└── health-schema-documentation.json   # Schema documentation
```

### Scripts
```
npm run data:generate-json    # Generate synthetic data as JSON files
npm run data:generate         # Generate and store in Redis (requires Redis)
```

## Usage Examples

### Algorithm Development
```typescript
import { HealthRecord } from './types/health-record'

function analyzeCardiovascularRisk(record: HealthRecord): string {
  const { personalInfo, vitalSigns, bloodWork } = record
  
  let riskScore = 0
  
  // Age factor
  if (personalInfo.age > 45) riskScore += 1
  
  // BMI factor
  if (personalInfo.bmi > 25) riskScore += 1
  
  // Blood pressure
  if (vitalSigns.systolicBP > 140 || vitalSigns.diastolicBP > 90) riskScore += 2
  
  // Cholesterol
  if (bloodWork.totalCholesterol > 240) riskScore += 1
  if (bloodWork.hdlCholesterol < 40) riskScore += 1
  
  return riskScore <= 2 ? 'Low' : riskScore <= 4 ? 'Medium' : 'High'
}
```

### Data Analysis
```typescript
// Calculate population statistics
function analyzePopulation(records: HealthRecord[]) {
  return {
    averageAge: records.reduce((sum, r) => sum + r.personalInfo.age, 0) / records.length,
    averageBMI: records.reduce((sum, r) => sum + r.personalInfo.bmi, 0) / records.length,
    hypertensionRate: records.filter(r => 
      r.vitalSigns.systolicBP > 140 || r.vitalSigns.diastolicBP > 90
    ).length / records.length,
    diabetesRiskRate: records.filter(r => 
      r.riskAssessment.diabetesRisk !== 'Low'
    ).length / records.length
  }
}
```

## Privacy and Security

### Data Protection
- **No Real Data**: All records are synthetically generated
- **Anonymization**: Names and identifiers are randomized
- **Encryption**: Supports encrypted storage and computation
- **Access Control**: Role-based access to different privacy levels

### Computation Types
- **Third Party**: Traditional secure computation on external nodes
- **Zero Knowledge (ZK)**: Prove properties without revealing data
- **Fully Homomorphic Encryption (FHE)**: Compute on encrypted data

### Compliance
- **HIPAA-Style**: Designed with healthcare privacy principles
- **Research Use**: Appropriate for algorithm development and testing
- **No Patient Risk**: Synthetic data eliminates patient privacy risks

## Future Enhancements

### Planned Features
- **Additional Schema Types**: Support for genomic, imaging, and time-series data
- **Real-time Generation**: On-demand synthetic data generation
- **Advanced Correlations**: More sophisticated medical correlations
- **Population Variants**: Different demographic and geographic populations

### Integration Points
- **Algorithm Registry**: Integration with algorithm upload and review system
- **Computation Engine**: Direct integration with SMPC computation infrastructure
- **Analytics Dashboard**: Real-time analytics on algorithm performance with sample data

## Support and Maintenance

### Data Updates
- **Version Control**: Schema versioning for backward compatibility
- **Regular Updates**: Periodic enhancement of data realism
- **User Feedback**: Incorporation of developer feedback for improved utility

### Technical Support
- **Documentation**: Comprehensive API and usage documentation
- **Examples**: Sample algorithms and analysis code
- **Community**: Developer community support and contributions

---

For technical questions or contributions, please refer to the project repository and documentation.