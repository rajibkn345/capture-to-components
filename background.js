// Background script for Route Capture Extension
class BackgroundService {
  constructor() {
    this.init();
  }

  init() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));

    // Listen for messages from content script and popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Listen for tab updates
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
  }

  handleInstalled(details) {
    if (details.reason === 'install') {
      // Set default options
      chrome.storage.sync.set({
        screenshotQuality: 'high',
        waitTime: 3000,
        captureFullPage: true,
        excludeHiddenElements: true,
        documentationFormat: 'markdown',
        includeAccessibility: true,
        maxRoutes: 20,
        segmentationThreshold: 0.7,
        enableBatchProcessing: true,
        enableCaching: true,
      });

      // Open options page
      chrome.runtime.openOptionsPage();
    }
  }

  async handleMessage(request, _sender, _sendResponse) {
    try {
      console.log('Background: received message:', request.action);

      switch (request.action) {
        case 'captureScreenshot':
          return await this.captureScreenshot(request.tabId);

        case 'downloadFiles':
          console.log('Background: handling downloadFiles');
          return await this.downloadFiles(request.files);

        case 'processRoutes':
          console.log('Background: handling processRoutes');
          return await this.processRoutes(request.routes);

        case 'getSettings':
          return await this.getSettings();

        default:
          console.warn('Unknown action:', request.action);
          return { success: false, error: 'Unknown action' };
      }
    } catch (error) {
      console.error('Message handling error:', error);
      return { success: false, error: error.message };
    }
  }

  async captureScreenshot(_tabId) {
    try {
      // Add longer delay to avoid quota limits and ensure page is ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 90, // Reduced quality to avoid quota issues
      });

      return { success: true, dataUrl };
    } catch (error) {
      console.error('Screenshot capture failed:', error);

      // Handle specific quota error
      if (
        error.message.includes('quota') ||
        error.message.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND')
      ) {
        console.warn(
          'Screenshot quota exceeded, continuing without screenshot'
        );
        return {
          success: false,
          error:
            'Screenshot quota exceeded - continuing analysis without screenshots',
          continue: true,
          quotaExceeded: true,
        };
      }

      // Handle permission error
      if (
        error.message.includes('activeTab') ||
        error.message.includes('not in effect')
      ) {
        console.warn(
          'Screenshot permission not available, continuing without screenshot'
        );
        return {
          success: false,
          error:
            'Screenshot permission not available - please interact with the page first',
          continue: true,
          permissionError: true,
        };
      }

      // Don't fail the entire process if screenshot fails
      return { success: false, error: error.message, continue: true };
    }
  }

  async downloadFiles(files) {
    try {
      for (const file of files) {
        // Create data URL for the file content
        const dataUrl = `data:${file.mimeType};charset=utf-8,${encodeURIComponent(file.content)}`;

        await chrome.downloads.download({
          url: dataUrl,
          filename: file.filename,
          saveAs: false,
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Download failed:', error);
      return { success: false, error: error.message };
    }
  }

  async processRoutes(routes) {
    try {
      // Validate routes parameter
      if (!routes || !Array.isArray(routes)) {
        throw new Error('Invalid routes: expected array, got ' + typeof routes);
      }

      if (routes.length === 0) {
        throw new Error('No routes provided for processing');
      }

      console.log('Processing routes:', routes.length, 'routes');

      // Store routes for processing
      await chrome.storage.local.set({
        pendingRoutes: routes,
        processingStatus: 'pending',
      });

      // Start processing in background
      this.startRouteProcessing(routes);

      return { success: true, message: 'Processing started' };
    } catch (error) {
      console.error('Route processing failed:', error);
      return { success: false, error: error.message };
    }
  }

  async startRouteProcessing(routes) {
    console.log('startRouteProcessing called with:', typeof routes, routes);

    // Additional validation to prevent iteration errors
    if (!Array.isArray(routes)) {
      console.error('Routes is not an array:', routes);
      await chrome.storage.local.set({
        processingStatus: 'error',
        processingError: 'Invalid routes data: not an array',
      });
      return;
    }

    if (routes.length === 0) {
      console.error('Routes array is empty');
      await chrome.storage.local.set({
        processingStatus: 'error',
        processingError: 'No routes to process',
      });
      return;
    }

    await chrome.storage.local.set({ processingStatus: 'in-progress' });

    try {
      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        console.log(`Processing route ${i + 1}/${routes.length}:`, route);

        // Update progress
        await chrome.storage.local.set({
          processingProgress: Math.round((i / routes.length) * 100),
        });

        // Process individual route
        await this.processIndividualRoute(route);
      }

      await chrome.storage.local.set({
        processingStatus: 'completed',
        processingProgress: 100,
      });

      // Notify popup of completion
      try {
        chrome.runtime.sendMessage({
          action: 'processingComplete',
          success: true,
        });
      } catch (error) {
        console.log('Could not notify popup (likely closed):', error.message);
      }
    } catch (error) {
      await chrome.storage.local.set({
        processingStatus: 'error',
        processingError: error.message,
      });

      try {
        chrome.runtime.sendMessage({
          action: 'processingComplete',
          success: false,
          error: error.message,
        });
      } catch (msgError) {
        console.log(
          'Could not notify popup of error (likely closed):',
          msgError.message
        );
      }
    }
  }

  async processIndividualRoute(route) {
    try {
      console.log('Processing route:', route);

      // Get the active tab to analyze the DOM
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];

      if (!activeTab) {
        throw new Error('No active tab found');
      }

      // For current page analysis, skip navigation to avoid modal interference
      const isCurrentPage =
        route.url === 'current-page' ||
        activeTab.url.includes(route.url) ||
        route.url === window.location?.pathname;

      if (!isCurrentPage && route.fullUrl) {
        console.log(`Navigating to route: ${route.fullUrl}`);
        try {
          await chrome.tabs.update(activeTab.id, {
            url: route.fullUrl,
          });
          // Wait for page to load completely
          await new Promise(resolve => setTimeout(resolve, 4000));
        } catch (navError) {
          console.warn(
            'Navigation failed, analyzing current page instead:',
            navError
          );
        }
      }

      // Allow page to settle and load dynamic content, handle modals
      console.log('Waiting for page to fully load and settle...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Ensure content script is available after any navigation
      let contentScriptReady = false;
      try {
        await chrome.tabs.sendMessage(activeTab.id, { action: 'getRoutes' });
        contentScriptReady = true;
      } catch (error) {
        console.log('Content script not responding, attempting injection...');
        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content-script.js'],
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
          contentScriptReady = true;
        } catch (injectionError) {
          console.error('Content script injection failed:', injectionError);
          contentScriptReady = false;
        }
      }

      // Capture screenshot with rate limiting - only if content script is ready
      console.log('Attempting screenshot capture...');
      // Add significant delay to avoid quota issues
      await new Promise(resolve => setTimeout(resolve, 2000));

      const screenshotResult = await this.captureScreenshot();
      if (!screenshotResult.success) {
        console.warn(
          'Screenshot capture failed, continuing with DOM analysis:',
          screenshotResult.error
        );

        // If permission error, it means popup was closed or activeTab expired
        if (screenshotResult.permissionError) {
          console.log(
            'ActiveTab permission expired - continuing without screenshots'
          );
        }
      }

      // Only proceed with DOM analysis if content script is ready
      if (!contentScriptReady) {
        console.warn('Content script not available, using fallback analysis');
        return this.createFallbackAnalysis();
      }

      // Wait before DOM analysis to ensure all elements are rendered
      console.log('Allowing time for dynamic content to load...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Perform detailed DOM analysis
      console.log('Starting comprehensive DOM structure analysis...');
      let domAnalysis;
      try {
        domAnalysis = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'analyzePageStructure',
        });
        console.log('DOM analysis result:', domAnalysis);

        // Validate the response
        if (!domAnalysis || typeof domAnalysis !== 'object') {
          throw new Error('Invalid DOM analysis response');
        }
      } catch (error) {
        console.error('DOM analysis failed:', error);

        // Try to inject content script and retry
        if (error.message.includes('Could not establish connection')) {
          console.log('Attempting to inject content script...');
          try {
            await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['content-script.js'],
            });

            // Wait for initialization
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Retry DOM analysis
            domAnalysis = await chrome.tabs.sendMessage(activeTab.id, {
              action: 'analyzePageStructure',
            });
            console.log(
              'DOM analysis successful after injection:',
              domAnalysis
            );
          } catch (retryError) {
            console.error('Content script injection/retry failed:', retryError);
            domAnalysis = this.createFallbackAnalysis();
          }
        } else {
          domAnalysis = this.createFallbackAnalysis();
        }
      }

      if (!domAnalysis || typeof domAnalysis !== 'object') {
        domAnalysis = this.createFallbackAnalysis();
      }

      // Allow time for thorough processing
      console.log('Processing analysis results in detail...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Process the analysis into detailed sections and components
      const detailedAnalysis = this.processDetailedAnalysis(domAnalysis, route);

      await chrome.storage.local.set({
        [`processed_${route.id}`]: detailedAnalysis,
      });

      console.log('Route processed and stored:', route.id);
      return detailedAnalysis;
    } catch (error) {
      console.error('Route processing failed:', error);
      // Store error state with fallback analysis
      const fallbackData = this.generateFallbackAnalysis(route, error.message);

      await chrome.storage.local.set({
        [`processed_${route.id}`]: fallbackData,
      });

      throw error;
    }
  }

  processDetailedAnalysis(domAnalysis, route) {
    if (!domAnalysis || domAnalysis.error) {
      return this.generateFallbackAnalysis(
        route,
        domAnalysis?.error || 'DOM analysis failed'
      );
    }

    // Ensure sections is an array
    const sectionsArray = Array.isArray(domAnalysis.sections)
      ? domAnalysis.sections
      : [];

    // Process the DOM analysis into detailed sections and components
    const sections = sectionsArray.map((section, index) => ({
      id: `section-${index}`,
      type: section.type || 'unknown',
      tagName: section.tagName || 'div',
      bounds: section.bounds || { x: 0, y: 0, width: 0, height: 0 },
      elements: section.elements || [],
      content: section.content || section.textContent || '',
      attributes: section.attributes || {},
      styles: section.computedStyles || {},
      children: section.children || [],
      depth: section.depth || 0,
    }));

    const components = this.extractComponents(domAnalysis);

    return {
      route: route.url,
      title: route.title || route.url,
      sections: sections,
      components: components,
      domStructure: domAnalysis.domStructure || {},
      layout: domAnalysis.layout || {},
      forms: domAnalysis.forms || [],
      media: domAnalysis.media || {},
      interactive: domAnalysis.interactive || {},
      navigation: domAnalysis.navigation || {},
      meta: domAnalysis.meta || {},
      performance: domAnalysis.performance || {},
      analysis: {
        confidence: 0.9,
        source: 'dom-analysis',
        elementsAnalyzed: domAnalysis.domStructure?.totalElements || 0,
        sectionsFound: sections.length,
        componentsIdentified: components.length,
      },
      timestamp: Date.now(),
    };
  }

  extractComponents(domAnalysis) {
    const components = [];
    const componentPatterns = new Map();

    // Ensure sections exists and is iterable
    const sectionsArray = Array.isArray(domAnalysis?.sections)
      ? domAnalysis.sections
      : [];

    // Analyze sections to identify reusable components
    sectionsArray.forEach(section => {
      const componentType = this.identifyComponentType(section);

      if (!componentPatterns.has(componentType)) {
        componentPatterns.set(componentType, []);
      }

      componentPatterns.get(componentType).push(section);
    });

    // Generate component specifications
    componentPatterns.forEach((instances, type) => {
      if (instances.length > 0) {
        const component = {
          type: type,
          instances: instances.length,
          commonElements: this.findCommonElements(instances),
          variations: instances.map((instance, index) => ({
            id: index + 1,
            elements: instance.elements || [],
            bounds: instance.bounds || {},
            content: instance.content || instance.textContent || '',
            attributes: instance.attributes || {},
          })),
          props: this.inferProps(instances, type),
          cssClasses: this.extractCssClasses(instances),
          complexity: this.calculateComplexity(instances),
        };

        components.push(component);
      }
    });

    return components;
  }

  identifyComponentType(section) {
    const tagName = section.tagName?.toLowerCase() || '';
    const classes = section.attributes?.class || '';

    // Enhanced component type detection
    if (
      tagName === 'header' ||
      classes.includes('header') ||
      section.type === 'header'
    ) {
      return 'Header';
    }
    if (
      tagName === 'nav' ||
      classes.includes('nav') ||
      section.type === 'navigation'
    ) {
      return 'Navigation';
    }
    if (
      tagName === 'footer' ||
      classes.includes('footer') ||
      section.type === 'footer'
    ) {
      return 'Footer';
    }
    if (classes.includes('card') || classes.includes('item')) {
      return 'Card';
    }
    if (tagName === 'button' || classes.includes('btn')) {
      return 'Button';
    }
    if (tagName === 'form' || classes.includes('form')) {
      return 'Form';
    }
    if (classes.includes('hero') || classes.includes('banner')) {
      return 'Hero';
    }
    if (tagName === 'aside' || classes.includes('sidebar')) {
      return 'Sidebar';
    }
    if (
      tagName === 'main' ||
      classes.includes('main') ||
      section.type === 'main'
    ) {
      return 'MainContent';
    }

    return 'GenericComponent';
  }

  findCommonElements(instances) {
    if (instances.length === 0) return [];

    const elementSets = instances.map(
      instance => new Set(instance.elements || [])
    );
    const firstSet = elementSets[0];
    const commonElements = [];

    firstSet.forEach(element => {
      if (elementSets.every(set => set.has(element))) {
        commonElements.push(element);
      }
    });

    return commonElements;
  }

  inferProps(instances, componentType) {
    const props = new Set();

    instances.forEach(instance => {
      const attributes = instance.attributes || {};
      const content = instance.content || instance.textContent || '';

      // Add common props based on component type
      if (componentType === 'Button') {
        props.add('onClick');
        props.add('disabled');
        props.add('variant');
        if (content) props.add('text');
      } else if (componentType === 'Header') {
        props.add('title');
        props.add('logo');
        props.add('navigationItems');
      } else if (componentType === 'Card') {
        props.add('title');
        props.add('content');
        props.add('imageUrl');
        props.add('href');
      }

      // Infer props from attributes
      Object.keys(attributes).forEach(attr => {
        if (attr === 'id') props.add('id');
        if (attr === 'class') props.add('className');
        if (attr === 'href') props.add('href');
        if (attr === 'src') props.add('src');
        if (attr === 'alt') props.add('alt');
        if (attr === 'title') props.add('title');
      });
    });

    return Array.from(props);
  }

  extractCssClasses(instances) {
    const allClasses = new Set();

    instances.forEach(instance => {
      const classes = instance.attributes?.class || '';
      if (classes) {
        classes.split(' ').forEach(cls => {
          if (cls.trim()) allClasses.add(cls.trim());
        });
      }
    });

    return Array.from(allClasses);
  }

  calculateComplexity(instances) {
    let totalComplexity = 0;

    instances.forEach(instance => {
      let complexity = 1; // Base complexity
      complexity += (instance.children || []).length * 0.5;
      complexity += Object.keys(instance.attributes || {}).length * 0.2;
      complexity += (instance.elements || []).length * 0.3;
      totalComplexity += complexity;
    });

    const avgComplexity = totalComplexity / instances.length;

    if (avgComplexity < 2) return 'simple';
    if (avgComplexity < 5) return 'moderate';
    return 'complex';
  }

  generateFallbackAnalysis(route, errorMessage) {
    return {
      route: route.url,
      title: route.title || route.url,
      error: errorMessage,
      sections: [
        {
          type: 'error',
          content: `Analysis failed: ${errorMessage}`,
          bounds: { x: 0, y: 0, width: 0, height: 0 },
        },
      ],
      components: [],
      analysis: {
        confidence: 0.1,
        source: 'fallback',
        error: errorMessage,
      },
      timestamp: Date.now(),
    };
  }

  createFallbackAnalysis() {
    return {
      sections: [],
      domStructure: {
        totalElements: 0,
        depth: 0,
        pageWidth: 0,
        pageHeight: 0,
        viewport: { width: 0, height: 0 },
        hasScrollableContent: false,
      },
      layout: {},
      forms: [],
      media: { images: [], videos: [], audio: [] },
      interactive: { buttons: [], links: [], inputs: [], selects: [] },
      navigation: {
        primary: [],
        secondary: [],
        breadcrumbs: [],
        pagination: [],
      },
      meta: {},
      performance: {
        analysisTime: Date.now(),
        scriptsLoaded: 0,
        stylesheetsLoaded: 0,
      },
      error: 'Content script communication failed',
    };
  }

  async getSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get(
        [
          'screenshotQuality',
          'waitTime',
          'captureFullPage',
          'excludeHiddenElements',
          'documentationFormat',
          'includeAccessibility',
          'maxRoutes',
          'segmentationThreshold',
          'enableBatchProcessing',
          'enableCaching',
        ],
        result => {
          resolve(result);
        }
      );
    });
  }

  handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      // Notify content script that page is ready
      chrome.tabs
        .sendMessage(tabId, {
          action: 'pageReady',
          url: tab.url,
        })
        .catch(() => {
          // Ignore errors for tabs without content script
        });
    }
  }
}

// Initialize background service
new BackgroundService();
