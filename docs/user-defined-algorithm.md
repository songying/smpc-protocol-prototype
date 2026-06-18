# User difined algoritm
## Allow Data consumer to upload an algorithm source code file
## create a Algorithm list pannel for Data consumer.
## before upload the altorithm, Data consumer have to choose a type of  the computation: 3rd party,ZK,FHE
## When request data from the platform, the data consumer can choose the algorithm from their algorithm list

## When the request is submited, the auditor should audit the source code, and give one of: Approve,Request Changes, Reject

## Data provider should also have a panel to view what algorithm has been in use of their data.

# Create Sample Data
## if there is a file named DataSample.pdf in docs folder, read this pdf file and generate a structured Json file under data folder.
## if this data is about the health, then study and create 1000 sample data with the same structure of the sample data, but change some name and value and text result of the data. 
## after created the 1000 sample data, delete the original DataSample.pdf file and the json file that generated from the pdf file
## save the data to the system, the data belong to the user who loged in with the address 0x9DC00F109AcfBA2622f0fE48a522558fA4f1D509
## each set of data should have a sample data that can be showed publicly, and also a structure document. so that everybody can get the sample data.
## choose 1 of the 1000 generated data as the sample data and create the structure document for the default user

# answer the questions
  1. Algorithm Security: How should we sandbox/validate uploaded algorithms to prevent malicious code execution?
    - we use sandbox, the auditor can only view the code, but the code can be encoded that won't be executed at this time. 
  2. Algorithm Storage: Should algorithms be stored on-chain, IPFS, or traditional database? What's the preferred approach for this SMPC platform?       
    - we use traditional database, but should be mention on the page, we will use IPFS on published environment
  3. Audit Workflow: Should the audit process be automated (static analysis) or purely manual? Do we need workflow management (assignments,notifications)?
    - yes, we need workflow management, include assignment and notifications.
  4. Computation Types Integration: How do the computation types (3rd party, ZK, FHE) integrate with the existing SMPC infrastructure?
    - I don't know yet, can you give me a suggestion?
  5. Data Privacy: How should we handle the generated health data to ensure privacy compliance while maintaining realistic test data?
    - now just save to database for the sample data, and should mention on page Will encrypted and saved on IPFS in published environment
  6. User Authentication: Should algorithm upload/management be tied to the existing wallet-based authentication system?
    - yes
  7. Algorithm Versioning: Do we need version control for algorithms (updates, rollbacks)?
    - yes

# Clarifications needed:

  1. Sample Data Structure Document: When you mention "create the structure document for the default user" - do you want this as a JSON schema filethat describes the data structure, or a readable documentation file explaining the fields?
    - a readable documentation file explaining the fields
  2. Public Sample Data: Should the publicly viewable sample data be anonymized/pseudonymized, or can it contain the realistic but fake data we generate?
    - it can contain the realistic but fake data we generate
  3. Algorithm Encoding: You mentioned "the code can be encoded that won't be executed at this time" - do you want algorithms stored in encoded/encrypted format in the database for security?
    - yes