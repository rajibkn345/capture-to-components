// Popup controller for Route Capture Extension
class PopupController {
  constructor() {
    this.routes = [];
    this.selectedRoutes = new Set();
    this.isProcessing = false;
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadSettings();
    this.updateUI();
  }

  bindEvents() {
    // Action buttons
    document
      .getElementById('scanBtn')
      .addEventListener('click', () => this.scanRoutes());
    document
      .getElementById('refreshBtn')
      .addEventListener('click', () => this.refreshRoutes());
    document
      .getElementById('captureBtn')
      .addEventListener('click', () => this.captureRoutes());
    document
      .getElementById('exportBtn')
      .addEventListener('click', () => this.exportComponents());
    document
      .getElementById('exportImagesBtn')
      .addEventListener('click', () => this.exportImages());
    document
      .getElementById('settingsBtn')
      .addEventListener('click', () => this.openSettings());

    // Route controls
    document
      .getElementById('selectAllBtn')
      .addEventListener('click', () => this.selectAllRoutes());
    document
      .getElementById('deselectAllBtn')
      .addEventListener('click', () => this.deselectAllRoutes());

    // Search and filter
    document
      .getElementById('searchInput')
      .addEventListener('input', e => this.filterRoutes(e.target.value));
    document
      .getElementById('filterSelect')
      .addEventListener('change', e => this.filterByType(e.target.value));

    // Listen for background messages
    chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
      this.handleBackgroundMessage(request);
    });
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
        document.getElementById('refreshBtn').disabled = false;
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
    // Validate selected routes before processing
    const selectedRoutes = Array.from(this.selectedRoutes)
      .map(id => this.routes.find(route => route.id === id))
      .filter(route => route !== undefined); // Remove any undefined routes

    console.log('Selected routes for capture:', selectedRoutes);

    if (selectedRoutes.length === 0) {
      alert('Please select at least one route to capture');
      return;
    }

    // Ensure we have valid route objects
    const validRoutes = selectedRoutes.filter(
      route => route && typeof route === 'object' && route.url
    );

    if (validRoutes.length === 0) {
      alert('No valid routes selected. Please refresh and try again.');
      return;
    }

    console.log('Valid routes for processing:', validRoutes);

    // Ensure we have an active tab and the extension is properly invoked
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];

      if (!activeTab) {
        throw new Error('No active tab found');
      }

      // Ensure content script is available before starting processing
      try {
        await chrome.tabs.sendMessage(activeTab.id, { action: 'getRoutes' });
      } catch (error) {
        console.log('Content script not available, injecting...');
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content-script.js'],
        });
        // Wait for content script to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('Failed to ensure extension invocation:', error);
      this.setStatus(
        'Extension setup failed. Please refresh and try again.',
        'error'
      );
      return;
    }

    this.startProcessing();

    try {
      // Process routes directly in popup context to maintain activeTab permission
      console.log('Processing routes in popup context...');
      const processedData = await this.processRoutesInPopup(validRoutes);

      if (processedData && processedData.length > 0) {
        // Store processed data for export
        await chrome.storage.local.set({
          processedRoutes: processedData,
          processingStatus: 'completed',
          processingProgress: 100,
        });

        this.setStatus('Analysis complete! Ready to export.', 'success');
        document.getElementById('exportBtn').disabled = false;
      } else {
        throw new Error('No data was processed');
      }
    } catch (error) {
      console.error('Route capture failed:', error);
      this.setStatus('Failed to capture routes: ' + error.message, 'error');
    } finally {
      this.stopProcessing();
    }
  }

  async processRoutesInPopup(routes) {
    const processedData = [];

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      console.log(`Processing route ${i + 1}/${routes.length}:`, route);

      // Update progress
      this.updateProgress(Math.round(((i + 1) / routes.length) * 100));

      try {
        // Get current tab
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const activeTab = tabs[0];

        if (!activeTab) {
          console.warn('No active tab found, skipping route:', route);
          continue;
        }

        let analysis;
        try {
          analysis = await chrome.tabs.sendMessage(activeTab.id, {
            action: 'analyzePageStructure',
          });
        } catch (error) {
          console.warn('DOM analysis failed for route:', route, error);
          analysis = {
            sections: [],
            components: [],
            domStructure: {},
            layout: {},
            accessibility: {},
            performance: {},
            metadata: {},
            error: error.message,
          };
        }

        // Capture screenshot while we have permission
        let screenshot = null;
        try {
          const screenshotResponse = await chrome.runtime.sendMessage({
            action: 'captureScreenshot',
          });
          if (screenshotResponse && screenshotResponse.success) {
            screenshot = screenshotResponse.dataUrl;
          }
        } catch (error) {
          console.warn('Screenshot failed for route:', route, error);
        }

        // Create properly structured data for markdown generator
        const processedRoute = {
          route: route.url || route.fullUrl || route, // Extract URL string
          title: route.title || route.url || route,
          routeData: route, // Keep full route object for reference
          sections: analysis?.sections || [],
          components: analysis?.components || [],
          domStructure: analysis?.domStructure || {},
          layout: analysis?.layout || {},
          accessibility: analysis?.accessibility || {},
          performance: analysis?.performance || {},
          metadata: analysis?.metadata || {},
          screenshot: screenshot,
          timestamp: Date.now(),
        };

        processedData.push(processedRoute);

        // Small delay between routes
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Error processing route:', route, error);
        processedData.push({
          route: route.url || route.fullUrl || route,
          title: route.title || route.url || route,
          routeData: route,
          sections: [],
          components: [],
          error: error.message,
          timestamp: Date.now(),
        });
      }
    }

    return processedData;
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
        alert('No processed routes found. Please capture routes first.');
        return;
      }

      console.log('Processed routes found:', result.processedRoutes.length);

      this.setStatus('Generating documentation...', 'loading');

      // Generate component files
      console.log('Calling generateComponentFiles...');
      const files = await this.generateComponentFiles(result.processedRoutes);
      console.log('Generated files:', files);

      if (!files || files.length === 0) {
        throw new Error('No files generated');
      }

      // Download files
      console.log('Sending downloadFiles message to background');
      const response = await chrome.runtime.sendMessage({
        action: 'downloadFiles',
        files: files,
      });

      console.log('Download response:', response);

      if (response && response.success) {
        this.setStatus('Components exported successfully', 'success');
        document.getElementById('exportBtn').disabled = false;
      } else {
        throw new Error(response?.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      this.setStatus('Failed to export components: ' + error.message, 'error');
    }
  }

  async exportImages() {
    this.setStatus('Exporting images...', 'loading');
    this.setButtonState('exportImagesBtn', true);

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'exportAllScreenshots',
      });

      if (response && response.success) {
        this.setStatus('Images exported successfully', 'success');
      } else {
        if (response && response.error && response.error.includes('No screenshots found')) {
          this.setStatus('No screenshots found. Please capture routes first.', 'error');
        } else {
          throw new Error(response?.error || 'Image export failed');
        }
      }
    } catch (error) {
      console.error('Image export failed:', error);
      this.setStatus(`Failed to export images: ${error.message}`, 'error');
    } finally {
      this.setButtonState('exportImagesBtn', false);
    }
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  selectAllRoutes() {
    const visibleRoutes = this.getVisibleRoutes();
    visibleRoutes.forEach(route => this.selectedRoutes.add(route.id));
    this.updateRouteSelection();
    this.updateCaptureButton();
  }

  deselectAllRoutes() {
    this.selectedRoutes.clear();
    this.updateRouteSelection();
    this.updateCaptureButton();
  }

  filterRoutes(searchTerm) {
    const filterType = document.getElementById('filterSelect').value;
    this.renderRoutes(searchTerm, filterType);
  }

  filterByType(type) {
    const searchTerm = document.getElementById('searchInput').value;
    this.renderRoutes(searchTerm, type);
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
      </div>
    `
      )
      .join('');

    // Bind checkbox events
    routeList.querySelectorAll('.route-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', e => {
        const routeId = e.target.dataset.routeId;
        if (e.target.checked) {
          this.selectedRoutes.add(routeId);
        } else {
          this.selectedRoutes.delete(routeId);
        }
        this.updateCaptureButton();
      });
    });
  }

  updateRouteSelection() {
    document.querySelectorAll('.route-checkbox').forEach(checkbox => {
      const routeId = checkbox.dataset.routeId;
      checkbox.checked = this.selectedRoutes.has(routeId);
    });
  }

  updateCaptureButton() {
    const selectedCount = this.selectedRoutes.size;
    const captureBtn = document.getElementById('captureBtn');
    const exportBtn = document.getElementById('exportBtn');
    const exportImagesBtn = document.getElementById('exportImagesBtn');

    if (captureBtn) {
      captureBtn.disabled = selectedCount === 0;
      captureBtn.textContent =
        selectedCount > 0 ? `Capture ${selectedCount} Routes` : 'Capture Routes';
    }
    if (exportBtn) {
      exportBtn.disabled = this.isProcessing || this.routes.length === 0;
    }
    if (exportImagesBtn) {
      exportImagesBtn.disabled = this.isProcessing || this.routes.length === 0;
    }
  }

  showEmptyState() {
    document.getElementById('emptyState').style.display = 'block';
  }

  startProcessing() {
    this.isProcessing = true;
    document.getElementById('progressSection').style.display = 'block';
    document.getElementById('captureBtn').disabled = true;
    document.getElementById('exportBtn').disabled = true;
    document.getElementById('exportImagesBtn').disabled = true;
    this.updateProgress(0);
  }

  stopProcessing() {
    this.isProcessing = false;
    document.getElementById('progressSection').style.display = 'none';
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
          document.getElementById('exportBtn').disabled = false;
          document.getElementById('exportImagesBtn').disabled = false;
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

      console.log('Generating sections markdown...');
      const sectionsContent =
        await markdownGenerator.generateSectionsMarkdown(processedRoutes);
      console.log(
        'Sections content preview:',
        sectionsContent.substring(0, 500)
      );

      console.log('Generating components markdown...');
      const componentsContent =
        await markdownGenerator.generateComponentsMarkdown(processedRoutes);
      console.log(
        'Components content preview:',
        componentsContent.substring(0, 500)
      );

      const files = [];
      files.push({
        filename: 'sections.md',
        content: sectionsContent,
        mimeType: 'text/markdown',
      });

      files.push({
        filename: 'components.md',
        content: componentsContent,
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
      const fallbackSections = this.generateFallbackSections(processedRoutes);
      const fallbackComponents =
        this.generateFallbackComponents(processedRoutes);

      return [
        {
          filename: 'sections.md',
          content: fallbackSections,
          mimeType: 'text/markdown',
        },
        {
          filename: 'components.md',
          content: fallbackComponents,
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

  getVisibleRoutes() {
    const searchTerm = document.getElementById('searchInput').value;
    const filterType = document.getElementById('filterSelect').value;

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

    return filteredRoutes;
  }

  setStatus(message, type = 'default') {
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');

    statusText.textContent = message;
    statusIndicator.className = `status-indicator ${type}`;
  }

  setButtonState(buttonId, disabled) {
    const button = document.getElementById(buttonId);
    button.disabled = disabled;

    if (disabled) {
      button.classList.add('loading');
    } else {
      button.classList.remove('loading');
    }
  }

  updateUI() {
    this.updateCaptureButton();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
