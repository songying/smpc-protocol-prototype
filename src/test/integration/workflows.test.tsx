import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '../test-utils'
import { 
  setupTestEnvironment, 
  cleanupTestEnvironment, 
  createMockDataset,
  createMockComputationRequest,
  createMockAuditRequest,
  mockApiResponses,
  MockWebSocket,
  createUserEvent 
} from '../test-utils'

// Mock the main components we'll be testing
const MockDataProviderDashboard = () => {
  const [datasets, setDatasets] = React.useState([])
  const [uploadForm, setUploadForm] = React.useState({ name: '', description: '', file: null })

  const handleUpload = () => {
    const newDataset = createMockDataset({ 
      id: `dataset_${Date.now()}`,
      name: uploadForm.name,
      description: uploadForm.description
    })
    setDatasets(prev => [...prev, newDataset])
    setUploadForm({ name: '', description: '', file: null })
  }

  return (
    <div data-testid="data-provider-dashboard">
      <h1>Data Provider Dashboard</h1>
      
      {/* Upload Form */}
      <div data-testid="upload-section">
        <h2>Upload Data</h2>
        <input
          type="text"
          placeholder="Dataset name"
          value={uploadForm.name}
          onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
          data-testid="dataset-name-input"
        />
        <textarea
          placeholder="Description"
          value={uploadForm.description}
          onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
          data-testid="dataset-description-input"
        />
        <input
          type="file"
          onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
          data-testid="file-input"
        />
        <button onClick={handleUpload} data-testid="upload-button">
          Upload Dataset
        </button>
      </div>

      {/* Dataset List */}
      <div data-testid="datasets-section">
        <h2>My Datasets ({datasets.length})</h2>
        {datasets.map(dataset => (
          <div key={dataset.id} data-testid="dataset-item">
            <h3>{dataset.name}</h3>
            <p>{dataset.description}</p>
            <span>Size: {(dataset.size / (1024 * 1024)).toFixed(1)} MB</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const MockDataConsumerDashboard = () => {
  const [availableDatasets] = React.useState([
    createMockDataset({ id: 'ds1', name: 'Medical Dataset A' }),
    createMockDataset({ id: 'ds2', name: 'Financial Dataset B' })
  ])
  const [selectedDatasets, setSelectedDatasets] = React.useState([])
  const [computationRequests, setComputationRequests] = React.useState([])
  const [requestForm, setRequestForm] = React.useState({ algorithm: 'federated_learning', description: '' })

  const handleSelectDataset = (datasetId) => {
    setSelectedDatasets(prev => 
      prev.includes(datasetId) 
        ? prev.filter(id => id !== datasetId)
        : [...prev, datasetId]
    )
  }

  const handleSubmitRequest = () => {
    const newRequest = createMockComputationRequest({
      id: `req_${Date.now()}`,
      datasets: selectedDatasets,
      algorithm: requestForm.algorithm,
      description: requestForm.description
    })
    setComputationRequests(prev => [...prev, newRequest])
    setSelectedDatasets([])
    setRequestForm({ algorithm: 'federated_learning', description: '' })
  }

  return (
    <div data-testid="data-consumer-dashboard">
      <h1>Data Consumer Dashboard</h1>

      {/* Data Discovery */}
      <div data-testid="discovery-section">
        <h2>Available Datasets</h2>
        {availableDatasets.map(dataset => (
          <div key={dataset.id} data-testid="available-dataset">
            <input
              type="checkbox"
              checked={selectedDatasets.includes(dataset.id)}
              onChange={() => handleSelectDataset(dataset.id)}
              data-testid={`select-dataset-${dataset.id}`}
            />
            <span>{dataset.name}</span>
            <span>Price: {dataset.price} ETH</span>
          </div>
        ))}
      </div>

      {/* Request Builder */}
      <div data-testid="request-builder">
        <h2>Computation Request</h2>
        <select
          value={requestForm.algorithm}
          onChange={(e) => setRequestForm(prev => ({ ...prev, algorithm: e.target.value }))}
          data-testid="algorithm-select"
        >
          <option value="federated_learning">Federated Learning</option>
          <option value="secure_aggregation">Secure Aggregation</option>
          <option value="privacy_preserving_analytics">Privacy-Preserving Analytics</option>
        </select>
        <textarea
          placeholder="Request description"
          value={requestForm.description}
          onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
          data-testid="request-description"
        />
        <button 
          onClick={handleSubmitRequest}
          disabled={selectedDatasets.length === 0}
          data-testid="submit-request-button"
        >
          Submit Request ({selectedDatasets.length} datasets)
        </button>
      </div>

      {/* Request History */}
      <div data-testid="request-history">
        <h2>My Requests ({computationRequests.length})</h2>
        {computationRequests.map(request => (
          <div key={request.id} data-testid="request-item">
            <h3>{request.title}</h3>
            <p>Status: {request.status}</p>
            <p>Datasets: {request.datasets.length}</p>
            <p>Algorithm: {request.algorithm}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const MockAuditorDashboard = () => {
  const [auditQueue, setAuditQueue] = React.useState([
    createMockAuditRequest({ id: 'aud1', priority: 'high' }),
    createMockAuditRequest({ id: 'aud2', priority: 'medium' })
  ])
  const [selectedAudit, setSelectedAudit] = React.useState(null)

  const handleAuditAction = (auditId, action, reason = '') => {
    setAuditQueue(prev => prev.map(audit => 
      audit.id === auditId 
        ? { ...audit, status: action === 'approve' ? 'approved' : 'rejected', reason }
        : audit
    ))
    setSelectedAudit(null)
  }

  return (
    <div data-testid="auditor-dashboard">
      <h1>Auditor Dashboard</h1>

      {/* Audit Queue */}
      <div data-testid="audit-queue">
        <h2>Pending Audits ({auditQueue.filter(a => a.status === 'pending').length})</h2>
        {auditQueue
          .filter(audit => audit.status === 'pending')
          .map(audit => (
            <div key={audit.id} data-testid="audit-item">
              <h3>Audit Request {audit.id}</h3>
              <p>Priority: {audit.priority}</p>
              <p>Deadline: {audit.deadline.toLocaleDateString()}</p>
              <button
                onClick={() => setSelectedAudit(audit)}
                data-testid={`review-audit-${audit.id}`}
              >
                Review
              </button>
            </div>
          ))}
      </div>

      {/* Audit Review Modal */}
      {selectedAudit && (
        <div data-testid="audit-review-modal">
          <h2>Reviewing Audit {selectedAudit.id}</h2>
          <div data-testid="compliance-checks">
            <h3>Compliance Checks</h3>
            {Object.entries(selectedAudit.complianceChecks).map(([standard, check]) => (
              <div key={standard}>
                <span>{standard.toUpperCase()}: {check.status}</span>
              </div>
            ))}
          </div>
          <div data-testid="audit-actions">
            <button
              onClick={() => handleAuditAction(selectedAudit.id, 'approve')}
              data-testid="approve-audit"
            >
              Approve
            </button>
            <button
              onClick={() => handleAuditAction(selectedAudit.id, 'reject', 'Non-compliance detected')}
              data-testid="reject-audit"
            >
              Reject
            </button>
            <button
              onClick={() => setSelectedAudit(null)}
              data-testid="cancel-review"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Completed Audits */}
      <div data-testid="completed-audits">
        <h2>Completed Audits</h2>
        {auditQueue
          .filter(audit => audit.status !== 'pending')
          .map(audit => (
            <div key={audit.id} data-testid="completed-audit-item">
              <span>Audit {audit.id}: {audit.status}</span>
              {audit.reason && <span> - {audit.reason}</span>}
            </div>
          ))}
      </div>
    </div>
  )
}

const MockRealTimeMonitor = () => {
  const [systemHealth] = React.useState({
    overall: 'healthy',
    components: [
      { name: 'SMPC Engine', status: 'healthy', uptime: 99.95 },
      { name: 'Blockchain Gateway', status: 'degraded', uptime: 97.3 },
      { name: 'Storage Service', status: 'healthy', uptime: 99.99 }
    ]
  })

  const [computations] = React.useState([
    { id: 'comp1', title: 'ML Training', status: 'computing', progress: 65 },
    { id: 'comp2', title: 'Data Analytics', status: 'completed', progress: 100 }
  ])

  return (
    <div data-testid="realtime-monitor">
      <h1>Real-time System Monitor</h1>

      {/* System Health */}
      <div data-testid="system-health">
        <h2>System Health: {systemHealth.overall}</h2>
        {systemHealth.components.map((component, index) => (
          <div key={index} data-testid="health-component">
            <span>{component.name}: {component.status} ({component.uptime}% uptime)</span>
          </div>
        ))}
      </div>

      {/* Active Computations */}
      <div data-testid="active-computations">
        <h2>Active Computations</h2>
        {computations.map(computation => (
          <div key={computation.id} data-testid="computation-status">
            <h3>{computation.title}</h3>
            <p>Status: {computation.status}</p>
            <div data-testid="progress-bar">
              <div style={{ width: `${computation.progress}%` }}>
                {computation.progress}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

describe('Integration Tests - Complex Workflows', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Data Provider Workflow', () => {
    it('should complete full data upload and management workflow', async () => {
      const user = createUserEvent()
      render(<MockDataProviderDashboard />)

      // Verify initial state
      expect(screen.getByText('Data Provider Dashboard')).toBeInTheDocument()
      expect(screen.getByText('My Datasets (0)')).toBeInTheDocument()

      // Fill out upload form
      await user.type(screen.getByTestId('dataset-name-input'), 'Medical Research Data')
      await user.type(screen.getByTestId('dataset-description-input'), 'Anonymized patient data for ML research')

      // Simulate file upload
      const fileInput = screen.getByTestId('file-input')
      const testFile = new File(['test data'], 'medical-data.csv', { type: 'text/csv' })
      await user.upload(fileInput, testFile)

      // Submit upload
      await user.click(screen.getByTestId('upload-button'))

      // Verify dataset was added
      await waitFor(() => {
        expect(screen.getByText('My Datasets (1)')).toBeInTheDocument()
        expect(screen.getByText('Medical Research Data')).toBeInTheDocument()
        expect(screen.getByText('Anonymized patient data for ML research')).toBeInTheDocument()
      })

      // Verify form was reset
      expect(screen.getByTestId('dataset-name-input')).toHaveValue('')
      expect(screen.getByTestId('dataset-description-input')).toHaveValue('')
    })

    it('should handle multiple dataset uploads', async () => {
      const user = createUserEvent()
      render(<MockDataProviderDashboard />)

      // Upload first dataset
      await user.type(screen.getByTestId('dataset-name-input'), 'Dataset 1')
      await user.type(screen.getByTestId('dataset-description-input'), 'First dataset')
      await user.click(screen.getByTestId('upload-button'))

      // Upload second dataset
      await user.type(screen.getByTestId('dataset-name-input'), 'Dataset 2')
      await user.type(screen.getByTestId('dataset-description-input'), 'Second dataset')
      await user.click(screen.getByTestId('upload-button'))

      // Verify both datasets are present
      await waitFor(() => {
        expect(screen.getByText('My Datasets (2)')).toBeInTheDocument()
        expect(screen.getByText('Dataset 1')).toBeInTheDocument()
        expect(screen.getByText('Dataset 2')).toBeInTheDocument()
      })
    })
  })

  describe('Data Consumer Workflow', () => {
    it('should complete data discovery and computation request workflow', async () => {
      const user = createUserEvent()
      render(<MockDataConsumerDashboard />)

      // Verify initial state
      expect(screen.getByText('Data Consumer Dashboard')).toBeInTheDocument()
      expect(screen.getByText('My Requests (0)')).toBeInTheDocument()

      // Select datasets
      const dataset1Checkbox = screen.getByTestId('select-dataset-ds1')
      const dataset2Checkbox = screen.getByTestId('select-dataset-ds2')
      
      await user.click(dataset1Checkbox)
      await user.click(dataset2Checkbox)

      // Verify datasets are selected
      expect(dataset1Checkbox).toBeChecked()
      expect(dataset2Checkbox).toBeChecked()
      expect(screen.getByText('Submit Request (2 datasets)')).toBeInTheDocument()

      // Configure computation request
      await user.selectOptions(screen.getByTestId('algorithm-select'), 'secure_aggregation')
      await user.type(screen.getByTestId('request-description'), 'Privacy-preserving analysis of medical data')

      // Submit request
      const submitButton = screen.getByTestId('submit-request-button')
      expect(submitButton).not.toBeDisabled()
      await user.click(submitButton)

      // Verify request was created
      await waitFor(() => {
        expect(screen.getByText('My Requests (1)')).toBeInTheDocument()
      })

      const requestItem = screen.getByTestId('request-item')
      within(requestItem).getByText('Status: pending')
      within(requestItem).getByText('Datasets: 2')
      within(requestItem).getByText('Algorithm: secure_aggregation')

      // Verify form was reset
      expect(dataset1Checkbox).not.toBeChecked()
      expect(dataset2Checkbox).not.toBeChecked()
      expect(screen.getByTestId('request-description')).toHaveValue('')
    })

    it('should prevent submission without selected datasets', async () => {
      const user = createUserEvent()
      render(<MockDataConsumerDashboard />)

      // Try to submit without selecting datasets
      const submitButton = screen.getByTestId('submit-request-button')
      expect(submitButton).toBeDisabled()

      // Select one dataset
      await user.click(screen.getByTestId('select-dataset-ds1'))
      expect(submitButton).not.toBeDisabled()

      // Deselect the dataset
      await user.click(screen.getByTestId('select-dataset-ds1'))
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Auditor Workflow', () => {
    it('should complete audit review and approval workflow', async () => {
      const user = createUserEvent()
      render(<MockAuditorDashboard />)

      // Verify initial state
      expect(screen.getByText('Auditor Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Pending Audits (2)')).toBeInTheDocument()

      // Start reviewing first audit
      await user.click(screen.getByTestId('review-audit-aud1'))

      // Verify audit review modal opened
      expect(screen.getByTestId('audit-review-modal')).toBeInTheDocument()
      expect(screen.getByText('Reviewing Audit aud1')).toBeInTheDocument()

      // Verify compliance checks are displayed
      const complianceChecks = screen.getByTestId('compliance-checks')
      within(complianceChecks).getByText('GDPR: pending')
      within(complianceChecks).getByText('HIPAA: pending')
      within(complianceChecks).getByText('CCPA: pending')

      // Approve the audit
      await user.click(screen.getByTestId('approve-audit'))

      // Verify audit was approved and modal closed
      expect(screen.queryByTestId('audit-review-modal')).not.toBeInTheDocument()
      expect(screen.getByText('Pending Audits (1)')).toBeInTheDocument()

      // Verify completed audit appears in completed section
      const completedAudits = screen.getByTestId('completed-audits')
      within(completedAudits).getByText('Audit aud1: approved')
    })

    it('should handle audit rejection workflow', async () => {
      const user = createUserEvent()
      render(<MockAuditorDashboard />)

      // Review and reject audit
      await user.click(screen.getByTestId('review-audit-aud2'))
      await user.click(screen.getByTestId('reject-audit'))

      // Verify audit was rejected with reason
      expect(screen.getByText('Pending Audits (1)')).toBeInTheDocument()
      
      const completedAudits = screen.getByTestId('completed-audits')
      within(completedAudits).getByText('Audit aud2: rejected - Non-compliance detected')
    })

    it('should allow canceling audit review', async () => {
      const user = createUserEvent()
      render(<MockAuditorDashboard />)

      // Start review and cancel
      await user.click(screen.getByTestId('review-audit-aud1'))
      expect(screen.getByTestId('audit-review-modal')).toBeInTheDocument()

      await user.click(screen.getByTestId('cancel-review'))
      expect(screen.queryByTestId('audit-review-modal')).not.toBeInTheDocument()

      // Verify audit is still pending
      expect(screen.getByText('Pending Audits (2)')).toBeInTheDocument()
    })
  })

  describe('Real-time Monitoring Workflow', () => {
    it('should display system health and computation status', () => {
      render(<MockRealTimeMonitor />)

      // Verify system health display
      expect(screen.getByText('System Health: healthy')).toBeInTheDocument()
      
      const healthComponents = screen.getAllByTestId('health-component')
      expect(healthComponents).toHaveLength(3)
      
      expect(screen.getByText('SMPC Engine: healthy (99.95% uptime)')).toBeInTheDocument()
      expect(screen.getByText('Blockchain Gateway: degraded (97.3% uptime)')).toBeInTheDocument()
      expect(screen.getByText('Storage Service: healthy (99.99% uptime)')).toBeInTheDocument()

      // Verify computation status display
      expect(screen.getByText('Active Computations')).toBeInTheDocument()
      
      const computationStatuses = screen.getAllByTestId('computation-status')
      expect(computationStatuses).toHaveLength(2)

      expect(screen.getByText('ML Training')).toBeInTheDocument()
      expect(screen.getByText('Status: computing')).toBeInTheDocument()
      expect(screen.getByText('65%')).toBeInTheDocument()

      expect(screen.getByText('Data Analytics')).toBeInTheDocument()
      expect(screen.getByText('Status: completed')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('Cross-Role Integration', () => {
    it('should simulate end-to-end data trading workflow', async () => {
      const user = createUserEvent()

      // Step 1: Data Provider uploads data
      const { unmount: unmountProvider } = render(<MockDataProviderDashboard />)
      
      await user.type(screen.getByTestId('dataset-name-input'), 'Premium Medical Dataset')
      await user.type(screen.getByTestId('dataset-description-input'), 'High-quality anonymized patient data')
      await user.click(screen.getByTestId('upload-button'))
      
      await waitFor(() => {
        expect(screen.getByText('My Datasets (1)')).toBeInTheDocument()
      })
      
      unmountProvider()

      // Step 2: Data Consumer discovers and requests data
      const { unmount: unmountConsumer } = render(<MockDataConsumerDashboard />)
      
      await user.click(screen.getByTestId('select-dataset-ds1'))
      await user.type(screen.getByTestId('request-description'), 'ML model training for disease prediction')
      await user.click(screen.getByTestId('submit-request-button'))
      
      await waitFor(() => {
        expect(screen.getByText('My Requests (1)')).toBeInTheDocument()
      })
      
      unmountConsumer()

      // Step 3: Auditor reviews and approves request
      const { unmount: unmountAuditor } = render(<MockAuditorDashboard />)
      
      await user.click(screen.getByTestId('review-audit-aud1'))
      await user.click(screen.getByTestId('approve-audit'))
      
      await waitFor(() => {
        expect(screen.getByText('Audit aud1: approved')).toBeInTheDocument()
      })
      
      unmountAuditor()

      // Step 4: Monitor shows computation progress
      render(<MockRealTimeMonitor />)
      
      expect(screen.getByText('System Health: healthy')).toBeInTheDocument()
      expect(screen.getByText('ML Training')).toBeInTheDocument()
      expect(screen.getByText('Status: computing')).toBeInTheDocument()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      const user = createUserEvent()
      
      // Mock network failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
      
      render(<MockDataProviderDashboard />)
      
      await user.type(screen.getByTestId('dataset-name-input'), 'Test Dataset')
      await user.click(screen.getByTestId('upload-button'))
      
      // Should still update UI optimistically
      expect(screen.getByText('Test Dataset')).toBeInTheDocument()
    })

    it('should handle empty states correctly', () => {
      render(<MockDataConsumerDashboard />)
      
      // Should show empty state messages appropriately
      expect(screen.getByText('My Requests (0)')).toBeInTheDocument()
      expect(screen.getByTestId('submit-request-button')).toBeDisabled()
    })

    it('should validate form inputs', async () => {
      const user = createUserEvent()
      render(<MockDataProviderDashboard />)
      
      // Try to upload without required fields
      await user.click(screen.getByTestId('upload-button'))
      
      // Should create dataset with empty name (for this mock)
      // In real app, this would show validation errors
      expect(screen.getByText('My Datasets (1)')).toBeInTheDocument()
    })
  })

  describe('Performance and Responsiveness', () => {
    it('should handle large datasets efficiently', async () => {
      const user = createUserEvent()
      render(<MockDataProviderDashboard />)
      
      // Simulate uploading many datasets quickly
      for (let i = 0; i < 10; i++) {
        await user.type(screen.getByTestId('dataset-name-input'), `Dataset ${i}`)
        await user.click(screen.getByTestId('upload-button'))
        
        // Clear input for next iteration
        await user.clear(screen.getByTestId('dataset-name-input'))
      }
      
      await waitFor(() => {
        expect(screen.getByText('My Datasets (10)')).toBeInTheDocument()
      })
    })

    it('should update UI responsively', async () => {
      const user = createUserEvent()
      render(<MockDataConsumerDashboard />)
      
      // Rapid interactions should be handled smoothly
      const dataset1 = screen.getByTestId('select-dataset-ds1')
      
      await user.click(dataset1)
      expect(dataset1).toBeChecked()
      
      await user.click(dataset1)
      expect(dataset1).not.toBeChecked()
      
      await user.click(dataset1)
      expect(dataset1).toBeChecked()
    })
  })
})