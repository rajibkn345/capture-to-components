// Popup controller for Route Capture Extension
class PopupController {
  constructor() {
    this.routes = [];
    this.selectedRoutes = new Set();
    this.isProcessing = false;
    this.init();
  }

  async init() {
    try {
      console.log('Initializing PopupController...');
      this.bindEvents();
      await this.loadSettings();
      this.updateUI();
      console.log('PopupController initialization complete');
    } catch (error) {
      console.error('PopupController initialization failed:', error);
    }
  }

  bindEvents() {
    console.log('Binding events...');
    
    try {
      // Action buttons
      const scanBtn = document.getElementById('scanBtn');
      const refreshBtn = document.getElementById('refreshBtn');
      const captureBtn = document.getElementById('captureBtn');
      const exportBtn = document.getElementById('exportBtn');
      const settingsBtn = document.getElementById('settingsBtn');
      
      if (!scanBtn) console.error('scanBtn not found');
      if (!refreshBtn) console.error('refreshBtn not found');
      if (!captureBtn) console.error('captureBtn not found');
      if (!exportBtn) console.error('exportBtn not found');
      if (!settingsBtn) console.error('settingsBtn not found');
      
      if (scanBtn) {
        scanBtn.addEventListener('click', () => {
          console.log('Scan button clicked');
          this.scanRoutes();
        });
      }
      
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          console.log('Refresh button clicked');
          this.refreshRoutes();
        });
      }
      
      if (captureBtn) {
        captureBtn.addEventListener('click', () => {
          console.log('Capture button clicked');
          this.captureRoutes();
        });
      }
      
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          console.log('Export button clicked');
          this.exportComponents();
        });
      }
      
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
          console.log('Settings button clicked');
          this.openSettings();
        });
      }

      // Route controls
      const selectAllBtn = document.getElementById('selectAllBtn');
      const deselectAllBtn = document.getElementById('deselectAllBtn');
      
      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
          console.log('Select All button clicked');
          this.selectAllRoutes();
        });
      }
      
      if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
          console.log('Deselect All button clicked');
          this.deselectAllRoutes();
        });
      }

      // Search and filter
      const searchInput = document.getElementById('searchInput');
      const filterSelect = document.getElementById('filterSelect');
      
      if (searchInput) {
        searchInput.addEventListener('input', e => {
          console.log('Search input changed');
          this.filterRoutes(e.target.value);
        });
      }
      
      if (filterSelect) {
        filterSelect.addEventListener('change', e => {
          console.log('Filter select changed');
          this.filterByType(e.target.value);
        });
      }

      // Listen for background messages
      chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
        this.handleBackgroundMessage(request);
      });
      
      console.log('Event binding complete');
    } catch (error) {
      console.error('Error binding events:', error);
    }
  }

  async loadSettings() {
    try {
      this.settings = await chrome.runtime.sendMessage({
        action: 'getSettings',
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = {
        aiProvider: 'openai',
        componentFramework: 'react',
        stylingFramework: 'css-modules',
        outputFormat: 'typescript',
      };
    }
  }

  async scanRoutes() {
    console.log('=== SCAN ROUTES STARTED ===');
    this.setStatus('Scanning routes...', 'loading');
    this.setButtonState('scanBtn', true);

    try {
      // Get active tab
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];

      if (!activeTab) {
        throw new Error('No active tab found');
      }

      console.log('Active tab found:', activeTab.url);
      console.log('Requesting routes from tab:', activeTab.id);

      let response;
      try {
        // First, try to communicate with existing content script
        response = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'getRoutes',
        });
        console.log('Content script response:', response);
      } catch (error) {
        console.warn('Content script communication failed:', error.message);

        // Only inject if communication failed
        try {
          console.log('Injecting content script...');
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content-script.js'],
          });

          // Wait for the script to initialize
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Try again to request routes from content script
          response = await chrome.tabs.sendMessage(activeTab.id, {
            action: 'getRoutes',
          });
          console.log('Content script response after injection:', response);
        } catch (injectionError) {
          console.error('Content script injection failed:', injectionError);
          response = null;
        }
      }

      if (response && response.routes) {
        // Parse routes if they're JSON strings, otherwise use directly
        this.routes = response.routes.map(route => {
          if (typeof route === 'string') {
            try {
              return JSON.parse(route);
            } catch (parseError) {
              console.warn('Failed to parse route:', route, parseError);
              return {
                id: 'parse-error-' + Date.now(),
                url: route,
                fullUrl: route,
                title: route,
                type: 'unknown',
              };
            }
          }
          return route;
        });

        console.log('Parsed routes:', this.routes);

        this.renderRoutes();
        this.setStatus(`Found ${this.routes.length} routes`, 'success');
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn && refreshBtn instanceof HTMLButtonElement) {
          refreshBtn.disabled = false;
        }
      } else {
        // If no routes found, try to add the current page as a route
        this.routes = [
          {
            id: 'current-page-' + Date.now(),
            url: activeTab.url,
            fullUrl: activeTab.url,
            title: activeTab.title || 'Current Page',
            type: 'current',
          },
        ];
        this.renderRoutes();
        this.setStatus(`No routes detected, added current page`, 'warning');
      }
    } catch (error) {
      console.error('Route scanning failed:', error);
      this.setStatus('Failed to scan routes', 'error');
      this.showEmptyState();
    } finally {
      this.setButtonState('scanBtn', false);
    }
  }

  async refreshRoutes() {
    this.setStatus('Refreshing routes...', 'loading');
    this.setButtonState('refreshBtn', true);

    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];

      if (!activeTab) {
        throw new Error('No active tab found');
      }

      try {
        // Try to refresh routes on existing content script first
        try {
          await chrome.tabs.sendMessage(activeTab.id, {
            action: 'refreshRoutes',
          });
          console.log('Routes refreshed on existing content script');
        } catch (error) {
          console.warn('Failed to send refresh message:', error);
          // If message fails, re-inject content script
          console.log('Re-injecting content script for refresh...');
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content-script.js'],
          });

          // Wait for initialization
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Wait a moment for the content script to re-scan
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Re-scan routes
        await this.scanRoutes();
      } catch (refreshError) {
        console.error('Route refresh failed:', refreshError);
        throw refreshError;
      }
    } catch (error) {
      console.error('Route refresh failed:', error);
      this.setStatus('Failed to refresh routes', 'error');
    } finally {
      this.setButtonState('refreshBtn', false);
    }
  }

  async captureRoutes() {
    console.log('=== CAPTURE ROUTES STARTED ===');
    console.log('Selected route IDs:', Array.from(this.selectedRoutes));
    console.log('Available routes:', this.routes);

    // Validate selected routes before processing
    const selectedRoutes = Array.from(this.selectedRoutes)
      .map(id => {
        const route = this.routes.find(route => route.id === id);
        console.log(`Looking for route with ID ${id}:`, route);
        return route;
      })
      .filter(route => route !== undefined); // Remove any undefined routes

    console.log('Selected routes for capture:', selectedRoutes);

    if (selectedRoutes.length === 0) {
      alert('Please select at least one route to capture');
      console.error('No routes selected for capture');
      return;
    }

    // Ensure we have valid route objects
    const validRoutes = selectedRoutes.filter(
      route => route && typeof route === 'object' && route.url
    );

    console.log('Valid routes after filtering:', validRoutes);

    if (validRoutes.length === 0) {
      alert('No valid routes selected. Please refresh and try again.');
      console.error('No valid routes found after filtering');
      return;
    }

    this.startProcessing();

    try {
      // Process all selected routes
      const processedData = [];
      for (let i = 0; i < validRoutes.length; i++) {
        const route = validRoutes[i];
        console.log(`Processing route ${i + 1}/${validRoutes.length}:`, route);
        
        // Navigate and capture screenshot for each route
        try {
          // Send message to background and await promise response
          const result = await chrome.runtime.sendMessage({
            action: 'processAndCaptureRoute',
            route: route
          });
          
          console.log('Received result from background:', result);
          
          if (result && result.success) {
            processedData.push(result.data);
            console.log('Route processed successfully:', result.data);
          } else {
            const errorMsg = result?.error || 'Unknown error';
            console.error('Route processing failed:', errorMsg);
            processedData.push({ 
              route: route.url, 
              title: route.title,
              error: errorMsg,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error sending message to background:', error);
          processedData.push({ 
            route: route.url, 
            title: route.title,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
        // Small delay between routes
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('All routes processed. Final data:', processedData);
      
      // Store processed data for export
      await chrome.storage.local.set({
        processedRoutes: processedData,
        processingStatus: 'completed',
        processingProgress: 100,
      });
      
      console.log('Processed data stored in chrome.storage.local');
      
      this.setStatus('Analysis complete! Ready to export.', 'success');
      const exportBtn = document.getElementById('exportBtn');
      if (exportBtn && exportBtn instanceof HTMLButtonElement) {
        exportBtn.disabled = false;
      }
    } catch (error) {
      console.error('Route capture failed:', error);
      this.setStatus('Failed to capture routes: ' + error.message, 'error');
    } finally {
      this.stopProcessing();
    }
  }

  async exportComponents() {
    try {
      console.log('=== EXPORT COMPONENTS STARTED ===');

      // Get processed data from storage (new format)
      const result = await chrome.storage.local.get([
        'processedRoutes',
        'processingStatus',
      ]);
      console.log('Storage data:', result);

      if (!result.processedRoutes || result.processedRoutes.length === 0) {
        console.error('No processed routes found in storage');
        this.showExportError('No processed routes found. Please capture routes first.');
        return;
      }

      console.log('Processed routes found:', result.processedRoutes.length);

      // Show export options dialog
      const exportOptions = await this.showExportOptionsDialog();
      if (!exportOptions) {
        console.log('Export cancelled by user');
        return;
      }

      this.setStatus('Preparing export...', 'loading');

      try {
        if (exportOptions.exportType === 'files_only') {
          await this.exportFilesOnly(result.processedRoutes);
        } else if (exportOptions.exportType === 'screenshots_only') {
          await this.exportScreenshotsOnly();
        } else if (exportOptions.exportType === 'everything') {
          await this.exportEverything(result.processedRoutes);
        }
      } catch (exportError) {
        console.error('Export operation failed:', exportError);
        this.showExportError('Export failed: ' + exportError.message);
        return;
      }

    } catch (error) {
      console.error('Export initialization failed:', error);
      this.showExportError('Failed to initialize export: ' + error.message);
    }
  }

  async showExportOptionsDialog() {
    return new Promise((resolve) => {
      // Create export options modal
      const modal = document.createElement('div');
      modal.className = 'export-modal';
      modal.innerHTML = `
        <div class="export-modal-content">
          <h3>Export Options</h3>
          <p>Choose what you'd like to export:</p>
          
          <div class="export-options">
            <label class="export-option">
              <input type="radio" name="exportType" value="files_only" checked>
              <span>📄 Documentation Files Only</span>
              <small>Export page.md, components.md, sections.md, and draft.md</small>
            </label>
            
            <label class="export-option">
              <input type="radio" name="exportType" value="screenshots_only">
              <span>📸 Screenshots Only</span>
              <small>Export all captured page screenshots</small>
            </label>
            
            <label class="export-option">
              <input type="radio" name="exportType" value="everything">
              <span>📦 Everything</span>
              <small>Export both documentation files and screenshots</small>
            </label>
          </div>
          
          <div class="export-modal-buttons">
            <button class="btn btn-secondary" id="cancelExport">Cancel</button>
            <button class="btn btn-primary" id="startExport">Start Export</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Handle button clicks
      document.getElementById('cancelExport').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(null);
      });

      document.getElementById('startExport').addEventListener('click', () => {
        const selectedRadio = document.querySelector('input[name="exportType"]:checked');
        let selectedType = null;
        if (selectedRadio && selectedRadio instanceof HTMLInputElement) {
          selectedType = selectedRadio.value;
        }
        document.body.removeChild(modal);
        resolve({ exportType: selectedType });
      });
    });
  }

  async exportFilesOnly(processedRoutes) {
    console.log('Exporting files only...');
    this.setStatus('Generating documentation files...', 'loading');

    try {
      // Generate component files
      const files = await this.generateComponentFiles(processedRoutes);
      
      if (!files || files.length === 0) {
        throw new Error('No files generated');
      }

      // Download files with enhanced error handling
      const response = await chrome.runtime.sendMessage({
        action: 'downloadFiles',
        files: files,
      });

      this.handleExportResponse(response, 'documentation files');

    } catch (error) {
      throw new Error('File generation failed: ' + error.message);
    }
  }

  async exportScreenshotsOnly() {
    console.log('Exporting screenshots only...');
    this.setStatus('Downloading screenshots...', 'loading');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'downloadScreenshots'
      });

      this.handleExportResponse(response, 'screenshots');

    } catch (error) {
      throw new Error('Screenshot export failed: ' + error.message);
    }
  }

  async exportEverything(processedRoutes) {
    console.log('Exporting everything...');
    this.setStatus('Preparing comprehensive export...', 'loading');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'exportAllData',
        includeScreenshots: true
      });

      this.handleComprehensiveExportResponse(response);

    } catch (error) {
      throw new Error('Comprehensive export failed: ' + error.message);
    }
  }

  handleExportResponse(response, exportType) {
    console.log(`${exportType} export response:`, response);

    if (response && response.success) {
      const downloadCount = response.downloaded?.length || response.downloaded || 0;
      const failedCount = response.failed?.length || 0;
      
      if (failedCount > 0) {
        this.setStatus(`${exportType} exported with ${failedCount} failures (${downloadCount} successful)`, 'warning');
        this.showExportWarning(response);
      } else {
        this.setStatus(`${exportType} exported successfully (${downloadCount} files)`, 'success');
      }
    } else {
      throw new Error(response?.error || `${exportType} export failed`);
    }
  }

  handleComprehensiveExportResponse(response) {
    console.log('Comprehensive export response:', response);

    if (response && response.success) {
      const summary = response.summary || {};
      const totalFiles = summary.totalFiles || 0;
      const totalScreenshots = summary.totalScreenshots || 0;
      const failedFiles = summary.failedFiles || 0;
      const failedScreenshots = summary.failedScreenshots || 0;

      let message = `Export complete! Downloaded ${totalFiles} files`;
      if (totalScreenshots > 0) {
        message += ` and ${totalScreenshots} screenshots`;
      }

      const totalFailed = failedFiles + failedScreenshots;
      if (totalFailed > 0) {
        message += ` (${totalFailed} failures)`;
        this.setStatus(message, 'warning');
        this.showExportWarning(response);
      } else {
        this.setStatus(message, 'success');
      }
    } else {
      throw new Error(response?.error || 'Comprehensive export failed');
    }
  }

  showExportError(message) {
    this.setStatus(message, 'error');
    // Remove any existing error modal
    const oldModal = document.querySelector('.error-modal');
    if (oldModal) oldModal.remove();
    // Show detailed error modal
    const errorModal = document.createElement('div');
    errorModal.className = 'error-modal';
    errorModal.tabIndex = 0;
    errorModal.innerHTML = `
      <div class="error-modal-content" role="alertdialog" aria-modal="true">
        <h3>❌ Export Failed</h3>
        <p>${message}</p>
        <div class="error-modal-buttons">
          <button class="btn btn-primary" id="closeError" autofocus>Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(errorModal);
    errorModal.focus();
    document.getElementById('closeError').addEventListener('click', () => {
      document.body.removeChild(errorModal);
    });
    errorModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(errorModal);
      }
    });
  }

  showExportWarning(response) {
    const failed = [...(response.failed || []), ...(response.files?.failed || []), ...(response.screenshots?.failed || [])];
    if (failed.length === 0) return;
    // Remove any existing warning modal
    const oldModal = document.querySelector('.warning-modal');
    if (oldModal) oldModal.remove();
    const warningModal = document.createElement('div');
    warningModal.className = 'warning-modal';
    warningModal.tabIndex = 0;
    warningModal.innerHTML = `
      <div class="warning-modal-content" role="alertdialog" aria-modal="true">
        <h3>⚠️ Export Completed with Warnings</h3>
        <p>Some files failed to export:</p>
        <ul>
          ${failed.map(f => `<li>${f.filename || f.screenshotId || 'Unknown'}: ${f.error}</li>`).join('')}
        </ul>
        <div class="warning-modal-buttons">
          <button class="btn btn-primary" id="closeWarning" autofocus>Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(warningModal);
    warningModal.focus();
    document.getElementById('closeWarning').addEventListener('click', () => {
      document.body.removeChild(warningModal);
    });
    warningModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(warningModal);
      }
    });
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  updateUI() {
    console.log('updateUI called');
    console.log('Routes available:', this.routes.length);
    console.log('Selected routes:', this.selectedRoutes.size);
    
    // Check if critical DOM elements exist
    const captureBtn = document.getElementById('captureBtn');
    const exportBtn = document.getElementById('exportBtn');
    const routeList = document.getElementById('routeList');
    
    console.log('DOM elements check:');
    console.log('- captureBtn:', !!captureBtn);
    console.log('- exportBtn:', !!exportBtn);
    console.log('- routeList:', !!routeList);
    
    this.renderRoutes();
    this.updateCaptureButton();
  }

  setStatus(message, type = 'info') {
    // Update both statusText and statusIndicator for better feedback
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');
    if (statusText) {
      statusText.textContent = message;
      statusText.className = `status-text ${type}`;
    }
    if (statusIndicator) {
      statusIndicator.className = `status-indicator ${type}`;
      statusIndicator.title = type.charAt(0).toUpperCase() + type.slice(1);
    }
    // Fallback for legacy status bar
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `status ${type}`;
      statusDiv.style.display = 'block';
    }
    console.log(`Status [${type}]: ${message}`);
  }

  setButtonState(buttonId, disabled) {
    const button = document.getElementById(buttonId);
    if (button && button instanceof HTMLButtonElement) {
      button.disabled = disabled;
    }
  }

  updateCheckboxes() {
    const checkboxes = document.querySelectorAll('.route-checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      if (checkbox instanceof HTMLInputElement && checkbox.dataset) {
        const routeId = checkbox.dataset.routeId;
        if (routeId) {
          checkbox.checked = this.selectedRoutes.has(routeId);
        }
      }
    });
  }

  openRouteInNewTab(url) {
    if (url && typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: url });
    } else {
      // Fallback for testing
      window.open(url, '_blank');
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  filterRoutes(searchTerm) {
    this.renderRoutes();
  }

  filterByType(filterType) {
    this.renderRoutes();
  }

  selectAllRoutes() {
    this.selectedRoutes.clear();
    this.routes.forEach(route => {
      if (route.id) {
        this.selectedRoutes.add(route.id);
      }
    });
    this.updateCheckboxes();
    this.updateCaptureButton();
  }

  deselectAllRoutes() {
    this.selectedRoutes.clear();
    this.updateCheckboxes();
    this.updateCaptureButton();
  }

  renderRoutes(searchTerm = '', filterType = 'all') {
    const routeList = document.getElementById('routeList');
    const emptyState = document.getElementById('emptyState');

    if (!emptyState || !routeList) {
      console.warn('Missing emptyState or routeList element in DOM');
      return;
    }

    // Filter routes
    let filteredRoutes = this.routes;

    if (searchTerm) {
      filteredRoutes = filteredRoutes.filter(
        route =>
          route.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          route.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filteredRoutes = filteredRoutes.filter(
        route => route.type === filterType
      );
    }

    if (filteredRoutes.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    // Render route items
    routeList.innerHTML = filteredRoutes
      .map(
        route => `
      <div class="route-item">
        <input type="checkbox" class="route-checkbox"
               data-route-id="${route.id}"
               ${this.selectedRoutes.has(route.id) ? 'checked' : ''}>
        <div class="route-info">
          <div class="route-title">${this.escapeHtml(route.title)}</div>
          <div class="route-url">${this.escapeHtml(route.url)}</div>
          <div class="route-meta">
            <span class="route-type ${route.type}">${route.type}</span>
            ${route.framework ? `<span class="route-framework">${route.framework}</span>` : ''}
            ${route.isDynamic ? '<span class="route-dynamic">Dynamic</span>' : ''}
          </div>
        </div>
        <button class="btn btn-view-route" data-route-url="${this.escapeHtml(route.fullUrl || route.url)}" title="View route in new tab">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15,3 21,3 21,9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </button>
      </div>
    `
      )
      .join('');

    // Bind checkbox events
    routeList.querySelectorAll('.route-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', e => {
        const target = e.target;
        if (target instanceof HTMLInputElement && target.dataset) {
          const routeId = target.dataset.routeId;
          if (target.checked) {
            this.selectedRoutes.add(routeId);
          } else {
            this.selectedRoutes.delete(routeId);
          }
          this.updateCaptureButton();
        }
      });
    });

    // Bind view route button events
    routeList.querySelectorAll('.btn-view-route').forEach(button => {
      button.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const currentTarget = e.currentTarget;
        let routeUrl = null;
        if (currentTarget && currentTarget instanceof HTMLElement && currentTarget.dataset) {
          routeUrl = currentTarget.dataset.routeUrl;
        }
        this.openRouteInNewTab(routeUrl);
      });
    });
  }

  updateRouteSelection() {
    document.querySelectorAll('.route-checkbox').forEach(checkbox => {
      if (checkbox instanceof HTMLInputElement && checkbox.dataset) {
        const routeId = checkbox.dataset.routeId;
        checkbox.checked = this.selectedRoutes.has(routeId);
      }
    });
  }

  updateCaptureButton() {
    const selectedCount = this.selectedRoutes.size;
    const captureBtn = document.getElementById('captureBtn');
    const exportBtn = document.getElementById('exportBtn');

    console.log('updateCaptureButton called:');
    console.log('- selectedCount:', selectedCount);
    console.log('- captureBtn found:', !!captureBtn);
    console.log('- exportBtn found:', !!exportBtn);
    console.log('- isProcessing:', this.isProcessing);
    console.log('- routes.length:', this.routes.length);

    if (captureBtn && captureBtn instanceof HTMLButtonElement) {
      const shouldDisable = selectedCount === 0;
      captureBtn.disabled = shouldDisable;
      captureBtn.textContent =
        selectedCount > 0 ? `Capture ${selectedCount} Routes` : 'Capture Routes';
      console.log('- captureBtn disabled set to:', shouldDisable);
    } else {
      console.error('captureBtn not found in DOM!');
    }
    
    if (exportBtn && exportBtn instanceof HTMLButtonElement) {
      const shouldDisableExport = this.isProcessing || this.routes.length === 0;
      exportBtn.disabled = shouldDisableExport;
      console.log('- exportBtn disabled set to:', shouldDisableExport);
    } else {
      console.error('exportBtn not found in DOM!');
    }
  }

  showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.style.display = 'block';
  }

  startProcessing() {
    this.isProcessing = true;
    const progressSection = document.getElementById('progressSection');
    if (progressSection) progressSection.style.display = 'block';
    const captureBtn = document.getElementById('captureBtn');
    const exportBtn = document.getElementById('exportBtn');
    if (captureBtn && captureBtn instanceof HTMLButtonElement) captureBtn.disabled = true;
    if (exportBtn && exportBtn instanceof HTMLButtonElement) exportBtn.disabled = true;
    this.updateProgress(0);
  }

  stopProcessing() {
    this.isProcessing = false;
    const progressSection = document.getElementById('progressSection');
    if (progressSection) progressSection.style.display = 'none';
    this.updateCaptureButton();
  }

  updateProgress(percentage) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    if (progressFill && progressText) {
      progressFill.style.width = `${percentage}%`;
      progressText.textContent = `${percentage}% complete`;
    }
  }

  handleBackgroundMessage(request) {
    console.log('Popup received message:', request);

    switch (request.action) {
      case 'processingProgress':
        this.updateProgress(request.progress);
        this.setStatus(`Processing route... ${request.progress}%`, 'loading');
        break;

      case 'processingComplete':
        this.stopProcessing();
        if (request.success) {
          this.setStatus('Processing complete!', 'success');
          // Re-enable export buttons now that processing is done
          const exportBtn = document.getElementById('exportBtn');
          if (exportBtn && exportBtn instanceof HTMLButtonElement) {
            exportBtn.disabled = false;
          }
        } else {
          this.setStatus(`Error: ${request.error}`, 'error');
        }
        break;

      case 'updateRoutes':
        this.routes = request.routes;
        this.renderRoutes();
        break;
    }
  }

  async generateComponentFiles(processedRoutes) {
    console.log('=== GENERATING COMPONENT FILES ===');
    console.log('processedRoutes:', JSON.stringify(processedRoutes, null, 2));

    try {
      // Use the already loaded MarkdownGenerator from the script tag
      if (!window.MarkdownGenerator) {
        throw new Error('MarkdownGenerator not loaded');
      }

      const markdownGenerator = new window.MarkdownGenerator();

      console.log('Generating enhanced page markdown...');
      const pageContent =
        await markdownGenerator.generatePageMarkdown(processedRoutes);
      console.log(
        'Page content preview:',
        pageContent.substring(0, 500)
      );

      console.log('Generating enhanced components markdown...');
      const componentsContent =
        await markdownGenerator.generateEnhancedComponentsMarkdown(processedRoutes);
      console.log(
        'Components content preview:',
        componentsContent.substring(0, 500)
      );

      console.log('Generating detailed sections markdown...');
      const sectionsContent =
        await markdownGenerator.generateSectionsMarkdown(processedRoutes);
      console.log(
        'Sections content preview:',
        sectionsContent.substring(0, 500)
      );

      const files = [];
      
      // Enhanced page.md with comprehensive page analysis
      files.push({
        filename: 'page.md',
        content: pageContent,
        mimeType: 'text/markdown',
      });

      // Enhanced components.md with detailed component specifications
      files.push({
        filename: 'components.md',
        content: componentsContent,
        mimeType: 'text/markdown',
      });

      // Detailed sections.md for reference
      files.push({
        filename: 'sections.md',
        content: sectionsContent,
        mimeType: 'text/markdown',
      });

      // Optionally generate draft.md for reference
      const draftContent =
        await markdownGenerator.generateDraftMarkdown(processedRoutes);
      files.push({
        filename: 'draft.md',
        content: draftContent,
        mimeType: 'text/markdown',
      });

      return files;
    } catch (error) {
      console.error('Failed to generate component files:', error);

      // Generate fallback simple markdown files
      const fallbackPage = this.generateFallbackPage(processedRoutes);
      const fallbackComponents = this.generateFallbackComponents(processedRoutes);
      const fallbackSections = this.generateFallbackSections(processedRoutes);

      return [
        {
          filename: 'page.md',
          content: fallbackPage,
          mimeType: 'text/markdown',
        },
        {
          filename: 'components.md',
          content: fallbackComponents,
          mimeType: 'text/markdown',
        },
        {
          filename: 'sections.md',
          content: fallbackSections,
          mimeType: 'text/markdown',
        },
      ];
    }
  }

  generateFallbackSections(processedRoutes) {
    let content = '# Page Sections Analysis\n\n';
    content += `*Generated on: ${new Date().toISOString()}*\n\n`;
    content += `**Total Routes Analyzed: ${processedRoutes.length}**\n\n`;

    processedRoutes.forEach((routeData, index) => {
      content += `## ${index + 1}. ${routeData.title || 'Unknown Page'}\n\n`;
      content += `**URL**: \`${routeData.route || 'N/A'}\`\n\n`;

      if (routeData.sections && routeData.sections.length > 0) {
        content += `**Sections Found**: ${routeData.sections.length}\n\n`;
        routeData.sections.forEach((section, sectionIndex) => {
          content += `### Section ${sectionIndex + 1}: ${section.type || 'Unknown'}\n`;
          content += `- **Tag**: \`${section.tagName || 'div'}\`\n`;

          // Safely handle content property
          let sectionContent = 'No content';
          if (section.content) {
            if (typeof section.content === 'string') {
              sectionContent =
                section.content.substring(0, 100) +
                (section.content.length > 100 ? '...' : '');
            } else if (typeof section.content === 'object') {
              sectionContent =
                JSON.stringify(section.content).substring(0, 100) + '...';
            } else {
              sectionContent =
                String(section.content).substring(0, 100) + '...';
            }
          }

          content += `- **Content**: ${sectionContent}\n\n`;
        });
      } else {
        content += '**No sections found**\n\n';
      }

      if (routeData.error) {
        content += `**Error**: ${routeData.error}\n\n`;
      }

      content += '---\n\n';
    });

    return content;
  }

  generateFallbackComponents(processedRoutes) {
    let content = '# Components Analysis\n\n';
    content += `*Generated on: ${new Date().toISOString()}*\n\n`;
    content += `**Total Routes Analyzed: ${processedRoutes.length}**\n\n`;

    processedRoutes.forEach((routeData, index) => {
      content += `## ${index + 1}. ${routeData.title || 'Unknown Page'}\n\n`;
      content += `**URL**: \`${routeData.route || 'N/A'}\`\n\n`;

      if (routeData.components && routeData.components.length > 0) {
        content += `**Components Found**: ${routeData.components.length}\n\n`;
        routeData.components.forEach((component, componentIndex) => {
          content += `### Component ${componentIndex + 1}: ${component.type || 'Unknown'}\n`;
          content += `- **Instances**: ${component.instances || 1}\n`;
          content += `- **Complexity**: ${component.complexity || 'Simple'}\n\n`;
        });
      } else {
        content += '**No components found**\n\n';
      }

      if (routeData.error) {
        content += `**Error**: ${routeData.error}\n\n`;
      }

      content += '---\n\n';
    });

    return content;
  }

  generateFallbackPage(processedRoutes) {
    let content = '# Page Analysis Documentation\n\n';
    content += `*Generated on: ${new Date().toISOString()}*\n\n`;
    content += `**Total Pages Analyzed: ${processedRoutes.length}**\n\n`;

    // Overview table
    content += '## Page Overview\n\n';
    content += '| Page | URL | Sections | Components |\n';
    content += '|------|-----|----------|------------|\n';
    
    processedRoutes.forEach((routeData, index) => {
      const title = routeData.title || `Page ${index + 1}`;
      const sectionCount = routeData.sections?.length || 0;
      const componentCount = routeData.components?.length || 0;
      content += `| ${title} | \`${routeData.route || 'N/A'}\` | ${sectionCount} | ${componentCount} |\n`;
    });
    content += '\n';

    // Detailed analysis for each page
    processedRoutes.forEach((routeData, index) => {
      content += `## ${index + 1}. ${routeData.title || 'Unknown Page'}\n\n`;
      content += `**URL**: \`${routeData.route || 'N/A'}\`\n\n`;

      // Page overview
      content += '### 📋 Page Overview\n\n';
      content += `- **Total Sections**: ${routeData.sections?.length || 0}\n`;
      content += `- **Total Components**: ${routeData.components?.length || 0}\n`;
      
      if (routeData.meta?.title) {
        content += `- **Page Title**: ${routeData.meta.title}\n`;
      }
      
      content += '\n';

      // Sections breakdown
      if (routeData.sections && routeData.sections.length > 0) {
        content += '### 🧩 Section Breakdown\n\n';
        routeData.sections.forEach((section, sectionIndex) => {
          content += `#### ${sectionIndex + 1}. ${section.type || 'Unknown Section'}\n\n`;
          content += `- **Tag**: \`${section.tagName || 'div'}\`\n`;


          if (section.bounds) {
            content += `- **Size**: ${Math.round(section.bounds.width || 0)} × ${Math.round(section.bounds.height || 0)} px\n`;
          }
          
          // Safe content handling
          if (section.textContent) {
            const truncatedText = section.textContent.substring(0, 100);
            const ellipsis = section.textContent.length > 100 ? '...' : '';
            content += `- **Content**: "${truncatedText}${ellipsis}"\n`;
          }
          
          content += '\n';
        });
      }

      // Components map
      if (routeData.components && routeData.components.length > 0) {
        content += '### 🎯 Component Map\n\n';
        routeData.components.forEach((component, componentIndex) => {
          content += `${componentIndex + 1}. **${component.type}**\n`;
          content += `   - Instances: ${component.instances || 1}\n`;
          if (component.complexity) {
            content += `   - Complexity: ${component.complexity}\n`;
          }
          content += '\n';
        });
      }

      // Usage summary
      content += '### 📊 Usage Summary\n\n';
      content += `- **Sections**: ${routeData.sections?.length || 0} identified\n`;
      content += `- **Components**: ${routeData.components?.length || 0} reusable components\n`;
      
      if (routeData.interactive) {
        const buttons = routeData.interactive.buttons?.length || 0;
        const links = routeData.interactive.links?.length || 0;
        content += `- **Interactive Elements**: ${buttons + links} total\n`;
      }
      
      content += '\n';

      if (routeData.error) {
        content += `**Analysis Error**: ${routeData.error}\n\n`;
      }

      content += '---\n\n';
    });

    // Simple recommendations
    content += '## 🏗️ Basic Recommendations\n\n';
    content += '1. **Priority Development**: Focus on components that appear multiple times\n';
    content += '2. **Consistency**: Standardize similar sections across pages\n';
    content += '3. **Reusability**: Extract common patterns into reusable components\n';
    content += '4. **Structure**: Maintain consistent section hierarchies\n\n';

    return content;
  }

  getVisibleRoutes() {
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');
    const searchTerm = searchInput && 'value' in searchInput && typeof searchInput.value === 'string' ? searchInput.value.trim() : '';
    const filterType = filterSelect && 'value' in filterSelect ? filterSelect.value : 'all';
    let filteredRoutes = [...this.routes];
    if (searchTerm) {
      filteredRoutes = filteredRoutes.filter(route =>
        route.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterType !== 'all') {
      filteredRoutes = filteredRoutes.filter(
        route => route.type === filterType
      );
    }
    return filteredRoutes;
  }

  // ...existing remaining methods
}

// Initialize the popup controller when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing PopupController...');
  const popupController = new PopupController();
  
  // Make it globally accessible for debugging
  window['popupController'] = popupController;
  
  console.log('PopupController initialized successfully');
});
