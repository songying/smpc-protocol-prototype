// End-to-End Tests for SMPC Protocol Platform
// Using Playwright for comprehensive E2E testing

import { test, expect, Page, BrowserContext } from '@playwright/test'

// Test data
const testUsers = {
  dataProvider: {
    address: '0x1234567890123456789012345678901234567890',
    privateKey: 'test-private-key-provider',
    role: 'data_provider'
  },
  dataConsumer: {
    address: '0x9876543210987654321098765432109876543210',
    privateKey: 'test-private-key-consumer',
    role: 'data_consumer'
  },
  auditor: {
    address: '0x5555666677778888999900001111222233334444',
    privateKey: 'test-private-key-auditor',
    role: 'auditor'
  }
}

const testDataset = {
  name: 'E2E Test Medical Dataset',
  description: 'Synthetic medical data for end-to-end testing',
  type: 'medical',
  size: '50MB',
  compliance: ['GDPR', 'HIPAA'],
  price: '0.1'
}

const testComputationRequest = {
  title: 'E2E ML Model Training',
  description: 'Privacy-preserving machine learning model training',
  algorithm: 'federated_learning',
  expectedDuration: '2 hours'
}

// Helper functions
async function connectWallet(page: Page, userType: keyof typeof testUsers) {
  const user = testUsers[userType]
  
  // Mock wallet connection
  await page.evaluate((address) => {
    // Mock window.ethereum for testing
    window.ethereum = {
      request: async ({ method }) => {
        if (method === 'eth_requestAccounts') {
          return [address]
        }
        if (method === 'eth_accounts') {
          return [address]
        }
        return null
      },
      selectedAddress: address,
      networkVersion: '1',
      isMetaMask: true
    }
  }, user.address)

  await page.click('[data-testid="connect-wallet-button"]')
  await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible()
  await expect(page.locator('text=Connected')).toBeVisible()
}

async function navigateToRole(page: Page, role: string) {
  await page.click(`[data-testid="role-selector"]`)
  await page.click(`[data-testid="select-role-${role}"]`)
  await expect(page.locator(`[data-testid="active-role-${role}"]`)).toBeVisible()
}

async function waitForLoadingToComplete(page: Page) {
  // Wait for loading spinners to disappear
  await page.waitForSelector('[data-testid="loading-spinner"]', { state: 'detached' })
  
  // Wait for main content to be visible
  await page.waitForSelector('[data-testid="main-content"]', { state: 'visible' })
}

describe('SMPC Protocol Platform E2E Tests', () => {
  describe('User Authentication and Role Selection', () => {
    test('should connect wallet and select data provider role', async ({ page }) => {
      await page.goto('/')
      
      // Should show landing page
      await expect(page.locator('h1')).toContainText('SMPC Protocol')
      await expect(page.locator('[data-testid="connect-wallet-section"]')).toBeVisible()
      
      // Connect wallet
      await connectWallet(page, 'dataProvider')
      
      // Select data provider role
      await navigateToRole(page, 'data_provider')
      
      // Should navigate to data provider dashboard
      await expect(page.url()).toContain('/dashboard')
      await expect(page.locator('h1')).toContainText('Data Provider Dashboard')
    })

    test('should handle wallet connection failure gracefully', async ({ page }) => {
      await page.goto('/')
      
      // Mock wallet connection failure
      await page.evaluate(() => {
        window.ethereum = {
          request: async () => {
            throw new Error('User rejected the request')
          }
        }
      })
      
      await page.click('[data-testid="connect-wallet-button"]')
      
      // Should show error message
      await expect(page.locator('[data-testid="connection-error"]')).toBeVisible()
      await expect(page.locator('text=Failed to connect wallet')).toBeVisible()
    })
  })

  describe('Data Provider Workflow', () => {
    test('should complete full data upload workflow', async ({ page }) => {
      await page.goto('/')
      await connectWallet(page, 'dataProvider')
      await navigateToRole(page, 'data_provider')
      
      // Navigate to data upload
      await page.click('[data-testid="nav-data-upload"]')
      await expect(page.url()).toContain('/data/upload')
      
      // Fill upload form
      await page.fill('[data-testid="dataset-name-input"]', testDataset.name)
      await page.fill('[data-testid="dataset-description-input"]', testDataset.description)
      
      // Select dataset type
      await page.selectOption('[data-testid="dataset-type-select"]', testDataset.type)
      
      // Select compliance requirements
      await page.check(`[data-testid="compliance-gdpr"]`)
      await page.check(`[data-testid="compliance-hipaa"]`)
      
      // Upload file
      const fileInput = page.locator('[data-testid="file-upload-input"]')
      await fileInput.setInputFiles({
        name: 'test-dataset.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('patient_id,age,condition\n1,35,diabetes\n2,42,hypertension')
      })
      
      // Set pricing
      await page.fill('[data-testid="dataset-price-input"]', testDataset.price)
      
      // Submit upload
      await page.click('[data-testid="upload-dataset-button"]')
      
      // Should show upload progress
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()
      
      // Wait for upload completion
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 })
      await expect(page.locator('text=Dataset uploaded successfully')).toBeVisible()
      
      // Should redirect to dataset catalog
      await expect(page.url()).toContain('/data/catalog')
      await expect(page.locator(`text=${testDataset.name}`)).toBeVisible()
    })

    test('should validate dataset upload form', async ({ page }) => {
      await page.goto('/')
      await connectWallet(page, 'dataProvider')
      await navigateToRole(page, 'data_provider')
      await page.goto('/data/upload')
      
      // Try to submit without required fields
      await page.click('[data-testid="upload-dataset-button"]')
      
      // Should show validation errors
      await expect(page.locator('[data-testid="error-dataset-name"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-dataset-file"]')).toBeVisible()
      await expect(page.locator('text=Dataset name is required')).toBeVisible()
    })

    test('should manage dataset catalog', async ({ page }) => {
      await page.goto('/')
      await connectWallet(page, 'dataProvider')
      await navigateToRole(page, 'data_provider')
      
      // Navigate to catalog
      await page.click('[data-testid="nav-data-catalog"]')
      await expect(page.url()).toContain('/data/catalog')
      
      // Should show datasets list
      await waitForLoadingToComplete(page)
      await expect(page.locator('[data-testid="datasets-grid"]')).toBeVisible()
      
      // Search datasets
      await page.fill('[data-testid="dataset-search"]', 'medical')
      await page.keyboard.press('Enter')
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
      
      // Filter by type
      await page.selectOption('[data-testid="type-filter"]', 'medical')
      await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible()
      
      // View dataset details
      await page.click('[data-testid="dataset-item"]:first-child')
      await expect(page.locator('[data-testid="dataset-details-modal"]')).toBeVisible()
      
      // Close modal
      await page.click('[data-testid="close-modal"]')
      await expect(page.locator('[data-testid="dataset-details-modal"]')).not.toBeVisible()
    })
  })

  describe('Data Consumer Workflow', () => {
    test('should complete data discovery and computation request', async ({ page }) => {
      await page.goto('/')
      await connectWallet(page, 'dataConsumer')
      await navigateToRole(page, 'data_consumer')
      
      // Navigate to data discovery
      await page.click('[data-testid="nav-data-discovery"]')
      await expect(page.url()).toContain('/data/discovery')
      
      // Browse available datasets
      await waitForLoadingToComplete(page)
      await expect(page.locator('[data-testid="available-datasets"]')).toBeVisible()
      
      // Search for datasets
      await page.fill('[data-testid="search-datasets"]', 'medical')
      await page.keyboard.press('Enter')
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
      
      // Select datasets for computation
      await page.check('[data-testid="select-dataset-1"]')
      await page.check('[data-testid="select-dataset-2"]')
      
      // View selected datasets
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 datasets selected')
      
      // Navigate to request builder
      await page.click('[data-testid="create-computation-request"]')
      await expect(page.url()).toContain('/computation/create')
      
      // Configure computation request
      await page.fill('[data-testid="request-title"]', testComputationRequest.title)
      await page.fill('[data-testid="request-description"]', testComputationRequest.description)
      await page.selectOption('[data-testid="algorithm-select"]', testComputationRequest.algorithm)
      
      // Review and submit request
      await page.click('[data-testid="review-request"]')
      await expect(page.locator('[data-testid="request-preview"]')).toBeVisible()
      
      // Check fee estimation
      await expect(page.locator('[data-testid="estimated-fees"]')).toBeVisible()
      await expect(page.locator('[data-testid="total-fee"]')).toContainText('ETH')
      
      // Submit request
      await page.click('[data-testid="submit-request"]')
      
      // Should show success message
      await expect(page.locator('[data-testid="request-submitted"]')).toBeVisible()
      await expect(page.locator('text=Request submitted successfully')).toBeVisible()
      
      // Should redirect to requests page
      await expect(page.url()).toContain('/requests')
      await expect(page.locator(`text=${testComputationRequest.title}`)).toBeVisible()
    })

    test('should track computation request status', async ({ page }) => {
      await page.goto('/')
      await connectWallet(page, 'dataConsumer')
      await navigateToRole(page, 'data_consumer')
      
      // Navigate to requests
      await page.click('[data-testid="nav-requests"]')
      await expect(page.url()).toContain('/requests')
      
      // Should show requests list
      await waitForLoadingToComplete(page)
      await expect(page.locator('[data-testid="requests-list"]')).toBeVisible()
      
      // View request details
      await page.click('[data-testid="request-item"]:first-child')
      await expect(page.locator('[data-testid="request-details"]')).toBeVisible()
      
      // Check status updates
      await expect(page.locator('[data-testid="request-status"]')).toBeVisible()
      await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible()
      
      // Check real-time updates (mock WebSocket)
      await page.evaluate(() => {
        // Simulate WebSocket status update
        window.dispatchEvent(new CustomEvent('computation-update', {
          detail: { status: 'computing', progress: 45 }
        }))
      })
      
      await expect(page.locator('[data-testid="status-computing"]')).toBeVisible()
      await expect(page.locator('[data-testid="progress-45"]')).toBeVisible()
    })
  })

  describe('Auditor Workflow', () => {
    test('should complete audit review process', async ({ page }) => {
      await page.goto('/')
      await connectWallet(page, 'auditor')
      await navigateToRole(page, 'auditor')
      
      // Navigate to audit queue
      await page.click('[data-testid="nav-audit-queue"]')
      await expect(page.url()).toContain('/audit/queue')
      
      // Should show pending audits
      await waitForLoadingToComplete(page)
      await expect(page.locator('[data-testid="audit-queue"]')).toBeVisible()
      
      // Start reviewing an audit
      await page.click('[data-testid="review-audit"]:first-child')
      await expect(page.locator('[data-testid="audit-review-panel"]')).toBeVisible()
      
      // Perform compliance checks
      await page.click('[data-testid="run-compliance-checks"]')
      await expect(page.locator('[data-testid="compliance-results"]')).toBeVisible()
      
      // Review dataset details
      await page.click('[data-testid="view-dataset-details"]')
      await expect(page.locator('[data-testid="dataset-analysis"]')).toBeVisible()
      
      // Check privacy measures
      await expect(page.locator('[data-testid="privacy-score"]')).toBeVisible()
      await expect(page.locator('[data-testid="encryption-status"]')).toBeVisible()
      
      // Make audit decision
      await page.click('[data-testid="approve-request"]')
      
      // Add audit comments
      await page.fill('[data-testid="audit-comments"]', 'Dataset meets all compliance requirements')
      
      // Submit approval
      await page.click('[data-testid="submit-approval"]')
      
      // Should show success message
      await expect(page.locator('[data-testid="audit-submitted"]')).toBeVisible()
      await expect(page.locator('text=Audit completed successfully')).toBeVisible()
      
      // Should update audit queue
      await expect(page.locator('[data-testid="audit-queue-updated"]')).toBeVisible()
    })

    test('should handle audit rejection', async ({ page }) => {
      await page.goto('/')
      await connectWallet(page, 'auditor')
      await navigateToRole(page, 'auditor')
      await page.goto('/audit/queue')
      
      // Start audit review
      await page.click('[data-testid="review-audit"]:first-child')
      
      // Reject the request
      await page.click('[data-testid="reject-request"]')
      
      // Provide rejection reason
      await page.fill('[data-testid="rejection-reason"]', 'Data does not meet GDPR anonymization requirements')
      
      // Select violation categories
      await page.check('[data-testid="violation-gdpr"]')
      await page.check('[data-testid="violation-data-quality"]')
      
      // Submit rejection
      await page.click('[data-testid="submit-rejection"]')
      
      // Should confirm rejection
      await expect(page.locator('[data-testid="rejection-submitted"]')).toBeVisible()
      await expect(page.locator('text=Request rejected')).toBeVisible()
    })
  })

  describe('Real-time Monitoring and System Health', () => {
    test('should display system health dashboard', async ({ page }) => {
      await page.goto('/')
      await connectWallet(page, 'auditor')
      await navigateToRole(page, 'auditor')
      
      // Navigate to system monitoring
      await page.click('[data-testid="nav-monitoring"]')
      await expect(page.url()).toContain('/monitoring')
      
      // Should show system health overview
      await waitForLoadingToComplete(page)
      await expect(page.locator('[data-testid="system-health-overview"]')).toBeVisible()
      
      // Check component status
      await expect(page.locator('[data-testid="smpc-engine-status"]')).toBeVisible()
      await expect(page.locator('[data-testid="blockchain-status"]')).toBeVisible()
      await expect(page.locator('[data-testid="storage-status"]')).toBeVisible()
      
      // View active computations
      await expect(page.locator('[data-testid="active-computations"]')).toBeVisible()
      
      // Check real-time updates
      await expect(page.locator('[data-testid="last-updated"]')).toBeVisible()
      
      // Test WebSocket connection indicator
      await expect(page.locator('[data-testid="websocket-connected"]')).toBeVisible()
      await expect(page.locator('text=Connected')).toBeVisible()
    })

    test('should handle system alerts and notifications', async ({ page }) => {
      await page.goto('/')
      await connectWallet(page, 'auditor')
      await navigateToRole(page, 'auditor')
      await page.goto('/monitoring')
      
      // Simulate system alert
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('system-alert', {
          detail: {
            type: 'performance',
            severity: 'warning',
            message: 'High CPU usage detected',
            component: 'smpc-engine'
          }
        }))
      })
      
      // Should show alert notification
      await expect(page.locator('[data-testid="alert-notification"]')).toBeVisible()
      await expect(page.locator('text=High CPU usage detected')).toBeVisible()
      
      // Click on alert to view details
      await page.click('[data-testid="alert-notification"]')
      await expect(page.locator('[data-testid="alert-details-modal"]')).toBeVisible()
      
      // Acknowledge alert
      await page.click('[data-testid="acknowledge-alert"]')
      await expect(page.locator('[data-testid="alert-acknowledged"]')).toBeVisible()
    })
  })

  describe('Mobile Responsiveness', () => {
    test('should work properly on mobile devices', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 }, // iPhone SE
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
      })
      const page = await context.newPage()
      
      await page.goto('/')
      
      // Should show mobile-optimized layout
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible()
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible()
      
      // Connect wallet on mobile
      await connectWallet(page, 'dataProvider')
      
      // Should show mobile navigation drawer
      await page.click('[data-testid="mobile-menu-button"]')
      await expect(page.locator('[data-testid="mobile-drawer"]')).toBeVisible()
      
      // Navigate using mobile menu
      await page.click('[data-testid="mobile-nav-data-upload"]')
      await expect(page.url()).toContain('/data/upload')
      
      // Should show mobile-optimized forms
      await expect(page.locator('[data-testid="mobile-form"]')).toBeVisible()
      
      // Test touch-friendly inputs
      await page.tap('[data-testid="dataset-name-input"]')
      await expect(page.locator('[data-testid="dataset-name-input"]:focus')).toBeVisible()
      
      await context.close()
    })

    test('should support touch gestures', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 },
        hasTouch: true
      })
      const page = await context.newPage()
      
      await page.goto('/')
      await connectWallet(page, 'dataConsumer')
      await navigateToRole(page, 'data_consumer')
      
      // Test pull-to-refresh gesture
      const content = page.locator('[data-testid="main-content"]')
      
      await content.hover({ position: { x: 100, y: 50 } })
      await page.mouse.down()
      await page.mouse.move(100, 150)
      await page.mouse.up()
      
      // Should trigger refresh
      await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible()
      
      await context.close()
    })
  })

  describe('PWA Features', () => {
    test('should work offline', async ({ page, context }) => {
      await page.goto('/')
      await connectWallet(page, 'dataProvider')
      
      // Go offline
      await context.setOffline(true)
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
      
      // Should still allow viewing cached content
      await page.click('[data-testid="nav-data-catalog"]')
      await expect(page.locator('[data-testid="cached-datasets"]')).toBeVisible()
      
      // Should show offline message for network operations
      await page.click('[data-testid="upload-new-dataset"]')
      await expect(page.locator('[data-testid="offline-message"]')).toBeVisible()
      
      // Go back online
      await context.setOffline(false)
      await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible()
    })

    test('should support app installation', async ({ page }) => {
      await page.goto('/')
      
      // Mock beforeinstallprompt event
      await page.evaluate(() => {
        const event = new Event('beforeinstallprompt')
        event.prompt = () => Promise.resolve()
        event.userChoice = Promise.resolve({ outcome: 'accepted' })
        window.dispatchEvent(event)
      })
      
      // Should show install prompt
      await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeVisible()
      
      // Click install
      await page.click('[data-testid="install-app-button"]')
      
      // Should show installation success
      await expect(page.locator('[data-testid="app-installed"]')).toBeVisible()
    })
  })

  describe('Performance and Load Testing', () => {
    test('should handle multiple concurrent users', async ({ browser }) => {
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext()
      ])
      
      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()))
      
      // Simulate concurrent user actions
      await Promise.all([
        // Data Provider
        (async () => {
          await pages[0].goto('/')
          await connectWallet(pages[0], 'dataProvider')
          await navigateToRole(pages[0], 'data_provider')
          await pages[0].click('[data-testid="nav-data-upload"]')
        })(),
        
        // Data Consumer
        (async () => {
          await pages[1].goto('/')
          await connectWallet(pages[1], 'dataConsumer')
          await navigateToRole(pages[1], 'data_consumer')
          await pages[1].click('[data-testid="nav-data-discovery"]')
        })(),
        
        // Auditor
        (async () => {
          await pages[2].goto('/')
          await connectWallet(pages[2], 'auditor')
          await navigateToRole(pages[2], 'auditor')
          await pages[2].click('[data-testid="nav-audit-queue"]')
        })()
      ])
      
      // All pages should load successfully
      await Promise.all([
        expect(pages[0].url()).resolves.toContain('/data/upload'),
        expect(pages[1].url()).resolves.toContain('/data/discovery'),
        expect(pages[2].url()).resolves.toContain('/audit/queue')
      ])
      
      // Cleanup
      await Promise.all(contexts.map(ctx => ctx.close()))
    })

    test('should load pages within acceptable time limits', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/')
      await connectWallet(page, 'dataProvider')
      
      const loadTime = Date.now() - startTime
      
      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
      
      // Core Web Vitals check
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            resolve(entries.map(entry => ({
              name: entry.name,
              value: entry.value,
              rating: entry.value < 100 ? 'good' : entry.value < 300 ? 'needs-improvement' : 'poor'
            })))
          }).observe({ entryTypes: ['measure', 'navigation'] })
        })
      })
      
      expect(metrics).toBeTruthy()
    })
  })

  describe('Security Testing', () => {
    test('should protect against XSS attacks', async ({ page }) => {
      await page.goto('/')
      await connectWallet(page, 'dataProvider')
      
      // Try to inject malicious script in form fields
      const maliciousScript = '<script>alert("XSS")</script>'
      
      await page.goto('/data/upload')
      await page.fill('[data-testid="dataset-name-input"]', maliciousScript)
      await page.fill('[data-testid="dataset-description-input"]', maliciousScript)
      
      // Script should not execute
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null)
      await page.click('[data-testid="preview-dataset"]')
      
      const dialog = await dialogPromise
      expect(dialog).toBeNull() // No alert should appear
      
      // Check that content is properly escaped
      await expect(page.locator('[data-testid="dataset-preview"]')).toContainText('<script>')
    })

    test('should validate user permissions', async ({ page }) => {
      await page.goto('/')
      await connectWallet(page, 'dataConsumer')
      await navigateToRole(page, 'data_consumer')
      
      // Try to access data provider routes
      await page.goto('/data/upload')
      
      // Should be redirected or show access denied
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible()
      
      // Try to access auditor routes
      await page.goto('/audit/queue')
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible()
    })

    test('should handle CSP violations', async ({ page }) => {
      const cspViolations = []
      
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
          cspViolations.push(msg.text())
        }
      })
      
      await page.goto('/')
      await connectWallet(page, 'dataProvider')
      
      // Simulate trying to load external scripts
      await page.evaluate(() => {
        const script = document.createElement('script')
        script.src = 'https://malicious-site.com/evil.js'
        document.head.appendChild(script)
      })
      
      // Should block malicious scripts
      await page.waitForTimeout(1000)
      expect(cspViolations.length).toBeGreaterThan(0)
    })
  })
})