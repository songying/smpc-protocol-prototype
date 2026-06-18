# Healthcare Demo Specification
# SMPC Privacy Data Trading Protocol

## Demo Overview

**Demo Title**: "Privacy-Preserving Population Health Analysis"  
**Scenario**: Insurance company requests statistical analysis of health screening data from multiple healthcare providers  
**Participants**: 2 Data Providers (clinics) + 1 Data Consumer (insurance company)  
**Duration**: ~15 minutes live demo + Q&A  

## Demo Narrative

### Business Context
*"A health insurance company wants to understand population health trends to develop better policies and pricing models. However, healthcare providers cannot share individual patient data due to privacy regulations. Our SMPC protocol enables statistical analysis across multiple datasets without revealing any individual patient information."*

### Value Proposition Demonstration
1. **Privacy Preservation**: Raw patient data never leaves each provider's control
2. **Regulatory Compliance**: GDPR/HIPAA-friendly data collaboration  
3. **Economic Fairness**: Healthcare providers earn 70% of computation fees
4. **Actionable Insights**: Meaningful population statistics for business decisions

## Technical Demo Scenario

### 3-Party Computation Setup

**Data Provider A (City General Hospital)**
- 150 patient health screening records
- Demographics: Urban population, ages 25-65
- Location: Central Hong Kong
- Data quality: High (complete records)

**Data Provider B (Wellness Clinic Network)**  
- 200 patient health screening records
- Demographics: Suburban population, ages 30-70
- Location: New Territories
- Data quality: Medium (some missing fields)

**Data Consumer (HK Life Insurance Co.)**
- Requests: Population health statistics
- Budget: $50 USD equivalent in ETH
- Analysis goal: Risk assessment for new product line

### Computation Requirements

**Statistical Analysis Tasks:**
1. **Population Demographics**
   - Average age by gender
   - BMI distribution across age groups
   - Geographic health variations

2. **Risk Factor Analysis**
   - Prevalence of hypertension (>140/90)
   - Cholesterol risk levels (>200 mg/dL)
   - Diabetes indicators (glucose >126 mg/dL)
   - Smoking rates by demographics

3. **Correlation Analysis**
   - BMI vs blood pressure correlation
   - Age vs cholesterol correlation
   - Lifestyle factors vs health outcomes

**Privacy Requirements:**
- No individual records visible to any party
- Minimum group sizes of 10+ for any statistic
- Differential privacy for additional protection
- Results only show aggregated insights

## Demo Flow Walkthrough

### Phase 1: Setup & Data Upload (3 minutes)

**Data Provider A Actions:**
1. **Connect Wallet**: MetaMask connection to Sepolia testnet
2. **Upload Data**: Health screening CSV (synthetic data)
   ```csv
   patient_id,age_group,gender,bmi,bp_systolic,bp_diastolic,cholesterol,glucose,smoker,location
   hash_001,30-35,M,24.2,118,78,185,92,false,central
   hash_002,40-45,F,26.8,125,82,195,88,false,central
   ...
   ```
3. **Set Pricing**: Minimum bid $20, preferred bid $35
4. **Configure Privacy**: Maximum privacy level, require 3-party minimum

**Data Provider B Actions:**
1. **Connect Wallet**: Different MetaMask account
2. **Upload Data**: Similar format with different demographics
3. **Set Pricing**: Minimum bid $15, preferred bid $30  
4. **Configure Privacy**: Same privacy settings

**System Display:**
- Live data upload progress
- Data validation and anonymization status
- Estimated computation fees and distribution

### Phase 2: Computation Request & Auction (4 minutes)

**Data Consumer Actions:**
1. **Browse Available Data**: View data categories without seeing raw data
   - "Health Screening Data - Central HK - 150 records"
   - "Health Screening Data - New Territories - 200 records"
2. **Request Analysis**: Select statistical analysis package
3. **Submit Bid**: Bid $50 for combined 2-provider analysis
4. **Review Terms**: Confirm privacy guarantees and result access

**Auction Process:**
```
Job Created: "Population Health Analysis - 2 Providers"
Reserve Price: $35 (combined minimum from both providers)
Current Bid: $50 (Data Consumer)
Status: Bid Accepted (above preferred price)
Estimated Completion: 5 minutes
```

**Real-time Display:**
- Auction status and bidding interface
- Fee distribution preview (70% to providers, 25% compute, 4% validators, 1% protocol)
- Smart contract transaction confirmations

### Phase 3: SMPC Computation (5 minutes)

**Computation Orchestration:**
1. **Job Initialization**
   - Smart contract escrows $50 payment
   - SMPC coordinator contacts all parties
   - Computation parameters distributed

2. **Multi-Party Setup**  
   - Each provider confirms participation
   - Cryptographic keys exchanged
   - Data preprocessing and secret sharing

3. **Secure Computation**
   - Live progress tracking: "Preprocessing... 20%"
   - "Computing statistics... 60%"  
   - "Generating proofs... 80%"
   - "Finalizing results... 100%"

**Technical Visualization:**
```
[Provider A] ──┐
              ├──► [SMPC Nodes] ──► [Results + ZK Proof]
[Provider B] ──┘
```

**Live Monitoring:**
- Computation node status
- Network communication logs (anonymized)
- Security verification checkpoints
- Estimated completion time

### Phase 4: Results & Payment (3 minutes)

**Results Delivery:**
```json
{
  "population_demographics": {
    "total_participants": 350,
    "age_distribution": {
      "25-35": 28.5,
      "36-45": 35.2, 
      "46-55": 22.8,
      "56-65": 10.1,
      "65+": 3.4
    },
    "gender_split": {"male": 52.1, "female": 47.9}
  },
  "health_metrics": {
    "average_bmi": 25.3,
    "hypertension_rate": 18.2,
    "high_cholesterol_rate": 24.6,
    "diabetes_indicators": 12.1,
    "smoking_rate": 15.7
  },
  "risk_correlations": {
    "bmi_bp_correlation": 0.64,
    "age_cholesterol_correlation": 0.52,
    "smoking_risk_multiplier": 2.3
  },
  "geographic_insights": {
    "urban_vs_suburban_health": "Urban population shows 12% higher stress indicators",
    "location_based_risk": "Central HK: lower smoking rates, higher BMI averages"
  }
}
```

**Automated Payment Distribution:**
- **City General Hospital**: $35.00 (70% × $50)  
- **Wellness Clinic Network**: $35.00 (70% × $50)
- **Compute Providers**: $12.50 (25% × $50)
- **Validators**: $2.00 (4% × $50)
- **Protocol Treasury**: $0.50 (1% × $50)

**Verification & Privacy Proof:**
- Zero-knowledge proof verification
- Privacy guarantees confirmation  
- Individual data protection validation
- Audit trail generation

## Demo Data Specifications

### Synthetic Healthcare Dataset

**Data Generation Parameters:**
```python
# Synthetic data generation script
participants = 350
age_range = (25, 70)
locations = ["Central", "Admiralty", "Causeway Bay", "Tsim Sha Tsui", "Mong Kok"]

health_metrics = {
    "bmi": normal_distribution(mean=25.3, std=4.2),
    "bp_systolic": normal_distribution(mean=125, std=15),
    "bp_diastolic": normal_distribution(mean=80, std=10),
    "cholesterol": normal_distribution(mean=195, std=25),
    "glucose": normal_distribution(mean=95, std=12)
}

# Realistic correlations
correlations = {
    ("age", "cholesterol"): 0.52,
    ("bmi", "bp_systolic"): 0.64,
    ("smoking", "bp_systolic"): 0.38
}
```

**Data Validation Rules:**
- All BMI values between 15-50
- Blood pressure within medically realistic ranges
- Age groups properly distributed
- Geographic representation matches Hong Kong demographics
- No personally identifiable information

### Expected Analysis Results

**Population Insights:**
- **Average BMI**: 25.3 (slightly overweight population)
- **Hypertension Rate**: 18.2% (consistent with Hong Kong averages)
- **High Cholesterol**: 24.6% (moderate risk population)
- **Smoking Rate**: 15.7% (below global average, matches HK trends)

**Business Value for Insurance:**
- Risk assessment data for policy pricing
- Geographic risk variations for location-based premiums
- Lifestyle factor impact quantification
- Population health trends for product development

## Demo Environment Setup

### Technical Requirements

**Hardware:**
- 3 laptops/devices for role-playing different parties
- 1 projection screen for audience view
- Stable internet connection for testnet access
- Backup mobile hotspot for redundancy

**Software Configuration:**
```bash
# Local development setup
npm run dev          # Start Next.js application
redis-server         # Start Redis for session management
mongod              # Start MongoDB for data persistence
npx hardhat node    # Local blockchain for backup

# Demo-specific configuration
export NEXT_PUBLIC_DEMO_MODE=true
export NEXT_PUBLIC_AUTO_ACCEPT_BIDS=true
export NEXT_PUBLIC_FAST_COMPUTATION=true
```

**Pre-loaded Demo Data:**
- 3 MetaMask wallets with testnet ETH
- Pre-uploaded synthetic health datasets
- Pre-configured privacy settings
- Demo script with realistic timing

### Demo Script & Timing

**Minute 0-3: Context Setting**
- Business problem explanation
- Privacy challenges in healthcare
- Traditional vs SMPC approach overview

**Minute 3-6: Data Provider Setup**  
- Live wallet connection demonstrations
- Data upload and validation process
- Privacy configuration walkthrough

**Minute 6-10: Auction & Computation**
- Real-time bidding demonstration
- SMPC computation progress tracking
- Technical architecture explanation

**Minute 10-13: Results & Analysis**
- Statistical results presentation
- Payment distribution demonstration
- Privacy verification proof

**Minute 13-15: Business Impact**
- Value proposition summary
- Economic model explanation
- Competitive advantage discussion

### Backup Plans

**Technical Failures:**
1. **Network Issues**: Pre-recorded video walkthrough
2. **SMPC Timeout**: Simulated computation with realistic timing
3. **Smart Contract Issues**: Local blockchain fallback
4. **UI Problems**: Command-line interface demonstration

**Presentation Adjustments:**
- **Shorter Version (10 min)**: Focus on results, skip setup details
- **Longer Version (20 min)**: Include technical deep-dive
- **Non-technical Audience**: Emphasize business value over technical details

## Success Metrics for Demo

### Technical Success
- [ ] All 3 parties successfully connect and participate
- [ ] SMPC computation completes without errors
- [ ] Statistical results are mathematically accurate
- [ ] Payment distribution executes correctly
- [ ] Privacy guarantees are demonstrably maintained

### Business Success  
- [ ] Value proposition is clearly communicated
- [ ] Audience understands the privacy benefits
- [ ] Economic model appears sustainable
- [ ] Use case resonates with potential customers
- [ ] Competitive advantages are evident

### Audience Engagement
- [ ] Questions indicate understanding of concept
- [ ] Interest in specific implementation details
- [ ] Requests for additional use cases
- [ ] Discussion of potential partnerships
- [ ] Follow-up meeting requests

This healthcare demo specification creates a compelling, realistic demonstration of privacy-preserving data trading that showcases both technical capabilities and clear business value for all participants in the ecosystem.