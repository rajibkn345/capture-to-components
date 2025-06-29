// Background script for Route Capture Extension
importScripts('lib/db.js');



// Helper to capture full-page screenshot by scrolling and stitching segments
async function captureFullPageScreenshot(tab) {
  const dims = await chrome.scripting.executeScript({
    target: { tabId: tab.id, world: 'MAIN' },
    func: () => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    }),
  });
  const { width, height, viewportHeight } = dims[0].result;
  const segments = [];
  const count = Math.ceil(height / viewportHeight);
  for (let i = 0; i < count; i++) {
    const scrollY = i * viewportHeight;
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, world: 'MAIN' },
      func: y => window.scrollTo(0, y),
      args: [scrollY],
    });
    await new Promise(res => setTimeout(res, 300));
    segments.push(await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }));
  }
  const stitched = await chrome.scripting.executeScript({
    target: { tabId: tab.id, world: 'MAIN' },
    func: (dataUrls, w, h, vh) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      return new Promise(resolve => {
        let loaded = 0;
        dataUrls.forEach((dataUrl, idx) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, idx * vh);
            if (++loaded === dataUrls.length) resolve(canvas.toDataURL());
          };
          img.src = dataUrl;
        });
      });
    },
    args: [segments, width, height, viewportHeight],
  });
  return stitched[0].result;
}

class BackgroundService {
  constructor() {
    this.db = new ImageDB();
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

  async handleMessage(request, _sender, sendResponse) {
    try {
      console.log('Background: received message:', request.action);

      let result;
      switch (request.action) {
        case 'downloadFiles':
          console.log('Background: handling downloadFiles');
          result = await this.downloadFiles(request.files);
          break;

        case 'downloadScreenshots':
          console.log('Background: handling downloadScreenshots');
          result = await this.downloadScreenshots();
          break;

        case 'exportAllData':
          console.log('Background: handling exportAllData');
          result = await this.exportAllData(request.includeScreenshots);
          break;

        case 'processRoutes':
          console.log('Background: handling processRoutes');
          result = await this.processRoutes(request.routes);
          break;

        case 'processAndCaptureRoute':
          console.log('Background: handling processAndCaptureRoute');
          result = await this.processSingleRoute(request.route);
          break;

        case 'getSettings':
          result = await this.getSettings();
          break;

        default:
          console.warn('Unknown action:', request.action);
          result = { success: false, error: 'Unknown action' };
      }
      
      console.log('Background: sending response:', result);
      return result;
    } catch (error) {
      console.error('Message handling error:', error);
      const errorResult = { success: false, error: error.message };
      console.log('Background: sending error response:', errorResult);
      return errorResult;
    }
  }

  async downloadFiles(files) {
    console.log('=== DOWNLOAD FILES STARTED ===');
    console.log('Files to download:', files.length);
    
    const results = {
      success: true,
      downloaded: [],
      failed: [],
      totalFiles: files.length
    };

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Downloading file ${i + 1}/${files.length}: ${file.filename}`);
        
        try {
          // Validate file object
          if (!file.filename || !file.content) {
            throw new Error(`Invalid file object: missing filename or content`);
          }

          // Sanitize filename to prevent download errors
          const sanitizedFilename = this.sanitizeFilename(file.filename);
          console.log(`Sanitized filename: ${sanitizedFilename}`);

          // Create data URL for the file content
          const mimeType = file.mimeType || 'text/plain';
          const dataUrl = `data:${mimeType};charset=utf-8,${encodeURIComponent(file.content)}`;

          // Use chrome.downloads.download with error handling
          const downloadId = await chrome.downloads.download({
            url: dataUrl,
            filename: sanitizedFilename,
            conflictAction: 'uniquify' // Auto-rename if file exists
          });

          console.log(`Successfully downloaded: ${sanitizedFilename} (ID: ${downloadId})`);
          results.downloaded.push({
            filename: sanitizedFilename,
            originalFilename: file.filename,
            downloadId: downloadId,
            size: file.content.length
          });

          // Small delay between downloads to prevent issues
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (fileError) {
          console.error(`Failed to download file ${file.filename}:`, fileError);
          results.failed.push({
            filename: file.filename,
            error: fileError.message
          });
          results.success = false;
        }
      }

      console.log('Download results:', results);
      return results;

    } catch (error) {
      console.error('Download operation failed:', error);
      return { 
        success: false, 
        error: error.message,
        downloaded: results.downloaded,
        failed: results.failed
      };
    }
  }

  sanitizeFilename(filename) {
    // Remove or replace invalid characters for file download
    let sanitized = (filename || 'file')
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid chars with underscore
      .replace(/\s+/g, '_') // Replace spaces with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 255); // Limit length
    if (!sanitized) sanitized = 'file_' + Date.now();
    return sanitized;
  }

  async downloadScreenshots() {
    console.log('=== DOWNLOAD SCREENSHOTS STARTED ===');
    
    try {
      // Get all screenshots from database
      const screenshots = await this.db.getAllScreenshots();
      console.log(`Found ${screenshots.length} screenshots to download`);

      if (screenshots.length === 0) {
        return {
          success: true,
          message: 'No screenshots found to download',
          downloaded: 0
        };
      }

      const results = {
        success: true,
        downloaded: [],
        failed: [],
        totalScreenshots: screenshots.length
      };

      for (let i = 0; i < screenshots.length; i++) {
        const screenshot = screenshots[i];
        console.log(`Downloading screenshot ${i + 1}/${screenshots.length}: ${screenshot.id}`);

        try {
          if (!screenshot.dataUrl) {
            throw new Error('Screenshot data URL is missing');
          }

          // Generate filename for screenshot
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const routeUrl = screenshot.routeUrl || screenshot.url || 'unknown';
          const sanitizedUrl = this.sanitizeFilename(routeUrl.replace(/https?:\/\//, '').replace(/\//g, '_'));
          const filename = `screenshot_${sanitizedUrl}_${timestamp}.png`;

          console.log(`Screenshot filename: ${filename}`);

          // Download screenshot
          const downloadId = await chrome.downloads.download({
            url: screenshot.dataUrl,
            filename: filename,
            conflictAction: 'uniquify'
          });

          console.log(`Successfully downloaded screenshot: ${filename} (ID: ${downloadId})`);
          results.downloaded.push({
            filename: filename,
            downloadId: downloadId,
            screenshotId: screenshot.id,
            routeUrl: screenshot.routeUrl
          });

          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (screenshotError) {
          console.error(`Failed to download screenshot ${screenshot.id}:`, screenshotError);
          results.failed.push({
            screenshotId: screenshot.id,
            error: screenshotError.message
          });
          results.success = false;
        }
      }

      console.log('Screenshot download results:', results);
      return results;

    } catch (error) {
      console.error('Screenshot download operation failed:', error);
      return {
        success: false,
        error: error.message
      };
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

      // Clear old screenshots before starting a new capture session
      await this.db.clearScreenshots();

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
    await chrome.storage.local.set({ processingStatus: 'in-progress' });

    const originalTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

    try {
      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        console.log(`Processing route ${i + 1}/${routes.length}:`, route);

        // Update progress
        const progress = Math.round(((i + 1) / routes.length) * 100);
        await chrome.storage.local.set({ processingProgress: progress });
        chrome.runtime.sendMessage({ action: 'processingProgress', progress });

        // Navigate, capture, and save
        await this.processAndCaptureRoute(route);
      }

      await chrome.storage.local.set({
        processingStatus: 'completed',
        processingProgress: 100,
      });

      // Notify popup of completion
      chrome.runtime.sendMessage({ action: 'processingComplete', success: true });
    } catch (error) {
      console.error('Route processing failed:', error);
      await chrome.storage.local.set({
        processingStatus: 'error',
        processingError: error.message,
      });
      chrome.runtime.sendMessage({ action: 'processingComplete', success: false, error: error.message });
    } finally {
      // Restore focus to the original tab
      if (originalTab) {
        await chrome.tabs.update(originalTab.id, { active: true }).catch(e => console.warn('Failed to restore original tab:', e));
      }
    }
  }

  /**
   * Capture full-page screenshot by scrolling and stitching segments.
   */
  async captureFullPageScreenshot(tab) {
    // Get page and viewport dimensions in the page context
    const dims = await chrome.scripting.executeScript({
      target: { tabId: tab.id, world: 'MAIN' },
      func: () => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
      }),
    });
    const { width, height, viewportHeight } = dims[0].result;

    const segments = [];
    const count = Math.ceil(height / viewportHeight);
    for (let i = 0; i < count; i++) {
      const scrollY = i * viewportHeight;
      // Scroll within the page context
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, world: 'MAIN' },
        func: y => window.scrollTo(0, y),
        args: [scrollY],
      });
      await new Promise(res => setTimeout(res, 300));
      // Capture visible viewport of the window containing the tab
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      segments.push({ y: scrollY, dataUrl });
    }

    // Stitch segments in page context
    const stitch = await chrome.scripting.executeScript({
      target: { tabId: tab.id, world: 'MAIN' },
      func: (segs, w, h) => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        return new Promise(resolve => {
          let loaded = 0;
          segs.forEach(seg => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, seg.y);
              if (++loaded === segs.length) resolve(canvas.toDataURL());
            };
            img.src = seg.dataUrl;
          });
        });
      },
      args: [segments, width, height],
    });

    return stitch[0].result;
  }

  async processAndCaptureRoute(route) {
    try {
      const tab = await chrome.tabs.create({ url: route.fullUrl, active: true });

      // Wait for the tab to be completely loaded
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          reject(new Error(`Timeout waiting for route to load: ${route.fullUrl}`));
        }, 30000); // 30-second timeout

        const listener = (tabId, changeInfo) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
              // Additional wait for dynamic content to render
              setTimeout(() => {
                clearTimeout(timeout);
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
              }, 3000); // 3-second grace period
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });

      // Capture full page screenshot
      const dataUrl = await captureFullPageScreenshot(tab);

      // Save screenshot to the database
      await this.db.saveScreenshot({ id: route.id, routeUrl: route.url, dataUrl });
      console.log('Saved screenshot:', { id: route.id, routeUrl: route.url, dataUrl: dataUrl?.slice(0, 30) });

      // Close the processed tab
      await chrome.tabs.remove(tab.id);
    } catch (error) {
      console.error('Error capturing/saving screenshot for route:', route, error);
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
        activeTab.url.includes(route.url);

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

    // Enhanced component analysis with reusability factors
    sectionsArray.forEach(section => {
      const componentType = this.identifyComponentType(section);

      if (!componentPatterns.has(componentType)) {
        componentPatterns.set(componentType, []);
      }

      componentPatterns.get(componentType).push(section);
    });

    // Generate enhanced component specifications with reusability analysis
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
            reusabilityScore: instance.reusabilityFactors?.reusabilityScore || 0,
            abstractionLevel: instance.reusabilityFactors?.abstractionLevel || 'unknown',
          })),
          props: this.inferProps(instances, type),
          cssClasses: this.extractCssClasses(instances),
          complexity: this.calculateComplexity(instances),
          // Enhanced reusability analysis
          reusabilityAnalysis: this.analyzeComponentReusability(instances, type),
          refactoringOpportunities: this.identifyRefactoringOpportunities(instances, type),
          layoutPatterns: this.extractLayoutPatterns(instances),
          nestedComponents: this.analyzeNestedComponents(instances),
          designTokens: this.extractDesignTokens(instances),
        };

        components.push(component);
      }
    });

    // Add cross-component analysis
    const crossComponentAnalysis = this.performCrossComponentAnalysis(components);
    
    return {
      components: components,
      crossComponentAnalysis: crossComponentAnalysis,
      totalComponents: components.length,
      reusabilityScore: this.calculateOverallReusabilityScore(components),
      refactoringPriority: this.prioritizeRefactoringOpportunities(components),
    };
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

  // Enhanced component reusability analysis methods
  analyzeComponentReusability(instances, componentType) {
    const avgReusabilityScore = this.calculateAverageReusabilityScore(instances);
    const consistencyScore = this.calculateConsistencyScore(instances);
    const abstractionPotential = this.assessAbstractionPotential(instances);
    
    return {
      reusabilityScore: avgReusabilityScore,
      consistencyScore: consistencyScore,
      abstractionPotential: abstractionPotential,
      recommendedAbstraction: this.recommendAbstractionLevel(instances, componentType),
      reusabilityFactors: this.identifyReusabilityFactors(instances),
      barriers: this.identifyReusabilityBarriers(instances),
    };
  }

  identifyRefactoringOpportunities(instances, componentType) {
    const opportunities = [];
    
    // Identify duplicate code patterns
    const duplicatePatterns = this.findDuplicatePatterns(instances);
    if (duplicatePatterns.length > 0) {
      opportunities.push({
        type: 'duplicate-elimination',
        priority: 'high',
        description: `Found ${duplicatePatterns.length} duplicate patterns that can be abstracted`,
        patterns: duplicatePatterns,
        estimatedEffort: 'medium',
        impact: 'high',
      });
    }
    
    // Identify inconsistent styling
    const stylingInconsistencies = this.findStylingInconsistencies(instances);
    if (stylingInconsistencies.length > 0) {
      opportunities.push({
        type: 'styling-standardization',
        priority: 'medium',
        description: 'Inconsistent styling patterns detected',
        inconsistencies: stylingInconsistencies,
        estimatedEffort: 'low',
        impact: 'medium',
      });
    }
    
    // Identify prop extraction opportunities
    const propOpportunities = this.identifyPropExtractionOpportunities(instances);
    if (propOpportunities.length > 0) {
      opportunities.push({
        type: 'prop-extraction',
        priority: 'medium',
        description: 'Hardcoded values that can be made configurable',
        opportunities: propOpportunities,
        estimatedEffort: 'low',
        impact: 'high',
      });
    }
    
    // Identify composition opportunities
    const compositionOpportunities = this.identifyCompositionOpportunities(instances);
    if (compositionOpportunities.length > 0) {
      opportunities.push({
        type: 'composition-pattern',
        priority: 'low',
        description: 'Components can be broken down into smaller, composable parts',
        opportunities: compositionOpportunities,
        estimatedEffort: 'high',
        impact: 'high',
      });
    }
    
    return opportunities;
  }

  extractLayoutPatterns(instances) {
    const patterns = new Map();
    
    instances.forEach(instance => {
      if (instance.layoutPattern) {
        const key = `${instance.layoutPattern.displayType}-${instance.layoutPattern.layoutMethod}`;
        if (!patterns.has(key)) {
          patterns.set(key, {
            pattern: instance.layoutPattern,
            count: 0,
            variations: [],
          });
        }
        patterns.get(key).count++;
        patterns.get(key).variations.push(instance.layoutPattern);
      }
    });
    
    return Array.from(patterns.entries()).map(([key, data]) => ({
      patternType: key,
      frequency: data.count,
      variations: data.variations,
      dominantPattern: this.findDominantPattern(data.variations),
    }));
  }

  analyzeNestedComponents(instances) {
    const nestedAnalysis = {
      maxNestingDepth: 0,
      commonNestedPatterns: [],
      componentHierarchies: [],
      compositionComplexity: 0,
    };
    
    instances.forEach(instance => {
      if (instance.nestedStructure) {
        const nestingDepth = instance.nestedStructure.nestingLevel || 0;
        nestedAnalysis.maxNestingDepth = Math.max(nestedAnalysis.maxNestingDepth, nestingDepth);
        
        if (instance.nestedStructure.componentHierarchy) {
          nestedAnalysis.componentHierarchies.push(instance.nestedStructure.componentHierarchy);
        }
      }
    });
    
    // Find common nested patterns
    nestedAnalysis.commonNestedPatterns = this.findCommonNestedPatterns(instances);
    nestedAnalysis.compositionComplexity = this.calculateCompositionComplexity(instances);
    
    return nestedAnalysis;
  }

  extractDesignTokens(instances) {
    const designTokens = {
      colors: new Set(),
      typography: new Set(),
      spacing: new Set(),
      borders: new Set(),
      shadows: new Set(),
    };
    
    instances.forEach(instance => {
      if (instance.computedStyles) {
        // Extract colors
        if (instance.computedStyles.color) designTokens.colors.add(instance.computedStyles.color);
        if (instance.computedStyles.backgroundColor) designTokens.colors.add(instance.computedStyles.backgroundColor);
        
        // Extract typography
        if (instance.computedStyles.fontSize) designTokens.typography.add(instance.computedStyles.fontSize);
        if (instance.computedStyles.fontFamily) designTokens.typography.add(instance.computedStyles.fontFamily);
        
        // Extract spacing
        if (instance.computedStyles.padding) designTokens.spacing.add(instance.computedStyles.padding);
        if (instance.computedStyles.margin) designTokens.spacing.add(instance.computedStyles.margin);
        
        // Extract borders
        if (instance.computedStyles.border) designTokens.borders.add(instance.computedStyles.border);
        if (instance.computedStyles.borderRadius) designTokens.borders.add(instance.computedStyles.borderRadius);
        
        // Extract shadows
        if (instance.computedStyles.boxShadow) designTokens.shadows.add(instance.computedStyles.boxShadow);
      }
    });
    
    return {
      colors: Array.from(designTokens.colors),
      typography: Array.from(designTokens.typography),
      spacing: Array.from(designTokens.spacing),
      borders: Array.from(designTokens.borders),
      shadows: Array.from(designTokens.shadows),
    };
  }

  performCrossComponentAnalysis(components) {
    return {
      sharedPatterns: this.findSharedPatterns(components),
      componentRelationships: this.analyzeComponentRelationships(components),
      designSystemOpportunities: this.identifyDesignSystemOpportunities(components),
      architecturalRecommendations: this.generateArchitecturalRecommendations(components),
    };
  }

  calculateOverallReusabilityScore(components) {
    if (components.length === 0) return 0;
    
    const totalScore = components.reduce((sum, component) => {
      return sum + (component.reusabilityAnalysis?.reusabilityScore || 0);
    }, 0);
    
    return Math.round(totalScore / components.length);
  }

  prioritizeRefactoringOpportunities(components) {
    const allOpportunities = [];
    
    components.forEach((component, index) => {
      if (component.refactoringOpportunities) {
        component.refactoringOpportunities.forEach(opportunity => {
          allOpportunities.push({
            ...opportunity,
            componentType: component.type,
            componentIndex: index,
          });
        });
      }
    });
    
    // Sort by priority and impact
    return allOpportunities.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const impactWeight = { high: 3, medium: 2, low: 1 };
      
      const scoreA = priorityWeight[a.priority] + impactWeight[a.impact];
      const scoreB = priorityWeight[b.priority] + impactWeight[b.impact];
      
      return scoreB - scoreA;
    });
  }

  // Helper methods for enhanced analysis
  calculateAverageReusabilityScore(instances) {
    if (instances.length === 0) return 0;
    
    const scores = instances
      .map(instance => instance.reusabilityFactors?.reusabilityScore || 0)
      .filter(score => score > 0);
    
    if (scores.length === 0) return 0;
    
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  calculateConsistencyScore(instances) {
    if (instances.length < 2) return 100;
    
    let consistencyScore = 100;
    const firstInstance = instances[0];
    
    instances.slice(1).forEach(instance => {
      // Check structural consistency
      if (this.getStructureSignature(instance) !== this.getStructureSignature(firstInstance)) {
        consistencyScore -= 20;
      }
      
      // Check styling consistency
      if (this.getStyleSignature(instance) !== this.getStyleSignature(firstInstance)) {
        consistencyScore -= 15;
      }
    });
    
    return Math.max(0, consistencyScore);
  }

  assessAbstractionPotential(instances) {
    const variations = this.analyzeVariations(instances);
    const complexity = this.calculateAverageComplexity(instances);
    
    let potential = 'low';
    if (variations.count > 3 && complexity < 5) potential = 'high';
    else if (variations.count > 1 || complexity < 3) potential = 'medium';
    
    return potential;
  }

  recommendAbstractionLevel(instances, componentType) {
    const avgComplexity = this.calculateAverageComplexity(instances);
    const variations = this.analyzeVariations(instances);
    
    if (avgComplexity < 2) return 'atomic';
    if (avgComplexity < 5 && variations.count <= 2) return 'molecular';
    if (avgComplexity < 8) return 'organism';
    return 'template';
  }

  identifyReusabilityFactors(instances) {
    const factors = [];
    
    // Consistent structure
    const structuralConsistency = this.calculateConsistencyScore(instances);
    if (structuralConsistency > 80) {
      factors.push({ type: 'structural-consistency', score: structuralConsistency });
    }
    
    // Multiple instances
    if (instances.length > 2) {
      factors.push({ type: 'multiple-instances', count: instances.length });
    }
    
    // Clear boundaries
    const boundaryClarity = this.assessBoundaryClarity(instances);
    if (boundaryClarity > 70) {
      factors.push({ type: 'clear-boundaries', score: boundaryClarity });
    }
    
    return factors;
  }

  identifyReusabilityBarriers(instances) {
    const barriers = [];
    
    // Hardcoded content
    const hasHardcodedContent = instances.some(instance => 
      instance.textContent && instance.textContent.length > 20
    );
    if (hasHardcodedContent) {
      barriers.push({ type: 'hardcoded-content', severity: 'medium' });
    }
    
    // Inconsistent structure
    const consistencyScore = this.calculateConsistencyScore(instances);
    if (consistencyScore < 60) {
      barriers.push({ type: 'inconsistent-structure', severity: 'high' });
    }
    
    // Complex dependencies
    const hasDependencies = instances.some(instance => 
      instance.reusabilityFactors?.dependencyAnalysis?.externalStylesheets?.length > 0
    );
    if (hasDependencies) {
      barriers.push({ type: 'external-dependencies', severity: 'low' });
    }
    
    return barriers;
  }

  findDuplicatePatterns(instances) {
    const patterns = new Map();
    
    instances.forEach((instance, index) => {
      const signature = this.createInstanceSignature(instance);
      if (!patterns.has(signature)) {
        patterns.set(signature, []);
      }
      patterns.get(signature).push(index);
    });
    
    return Array.from(patterns.entries())
      .filter(([_, indices]) => indices.length > 1)
      .map(([signature, indices]) => ({ signature, instances: indices }));
  }

  findStylingInconsistencies(instances) {
    const inconsistencies = [];
    const styleProperties = ['color', 'backgroundColor', 'fontSize', 'padding', 'margin'];
    
    styleProperties.forEach(property => {
      const values = new Set();
      instances.forEach(instance => {
        if (instance.computedStyles && instance.computedStyles[property]) {
          values.add(instance.computedStyles[property]);
        }
      });
      
      if (values.size > 1) {
        inconsistencies.push({
          property: property,
          values: Array.from(values),
          instanceCount: instances.length,
        });
      }
    });
    
    return inconsistencies;
  }

  identifyPropExtractionOpportunities(instances) {
    const opportunities = [];
    
    // Check for varying text content
    const textVariations = new Set();
    instances.forEach(instance => {
      if (instance.textContent) {
        textVariations.add(instance.textContent.substring(0, 50));
      }
    });
    
    if (textVariations.size > 1 && textVariations.size === instances.length) {
      opportunities.push({
        type: 'text-content',
        variations: Array.from(textVariations),
        proposedProp: 'text',
      });
    }
    
    // Check for varying attributes
    const commonAttributes = this.findCommonAttributes(instances);
    commonAttributes.forEach(attr => {
      const values = new Set();
      instances.forEach(instance => {
        if (instance.attributes && instance.attributes[attr]) {
          values.add(instance.attributes[attr]);
        }
      });
      
      if (values.size > 1) {
        opportunities.push({
          type: 'attribute-variation',
          attribute: attr,
          variations: Array.from(values),
          proposedProp: attr,
        });
      }
    });
    
    return opportunities;
  }

  identifyCompositionOpportunities(instances) {
    const opportunities = [];
    
    instances.forEach((instance, index) => {
      if (instance.nestedStructure && instance.nestedStructure.repeatingPatterns) {
        instance.nestedStructure.repeatingPatterns.forEach(pattern => {
          if (pattern.instances > 2) {
            opportunities.push({
              instanceIndex: index,
              pattern: pattern,
              recommendation: `Extract ${pattern.pattern} as a separate component`,
            });
          }
        });
      }
    });
    
    return opportunities;
  }

  findCommonNestedPatterns(instances) {
    const patterns = new Map();
    
    instances.forEach(instance => {
      if (instance.nestedStructure && instance.nestedStructure.repeatingPatterns) {
        instance.nestedStructure.repeatingPatterns.forEach(pattern => {
          const key = pattern.pattern;
          if (!patterns.has(key)) {
            patterns.set(key, 0);
          }
          patterns.set(key, patterns.get(key) + 1);
        });
      }
    });
    
    return Array.from(patterns.entries())
      .filter(([_, count]) => count > 1)
      .map(([pattern, count]) => ({ pattern, frequency: count }));
  }

  calculateCompositionComplexity(instances) {
    return instances.reduce((sum, instance) => {
      const nestingDepth = instance.nestedStructure?.nestingLevel || 0;
      const childCount = instance.elements?.all || 0;
      return sum + (nestingDepth * 0.5 + childCount * 0.1);
    }, 0) / instances.length;
  }

  findSharedPatterns(components) {
    const sharedPatterns = [];
    
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const commonElements = this.findCommonElementsBetweenComponents(
          components[i], 
          components[j]
        );
        
        if (commonElements.length > 0) {
          sharedPatterns.push({
            component1: components[i].type,
            component2: components[j].type,
            sharedElements: commonElements,
          });
        }
      }
    }
    
    return sharedPatterns;
  }

  analyzeComponentRelationships(components) {
    const relationships = [];
    
    components.forEach((component, index) => {
      components.forEach((otherComponent, otherIndex) => {
        if (index !== otherIndex) {
          const relationship = this.determineRelationship(component, otherComponent);
          if (relationship) {
            relationships.push(relationship);
          }
        }
      });
    });
    
    return relationships;
  }

  identifyDesignSystemOpportunities(components) {
    const opportunities = [];
    
    // Identify potential design tokens
    const allDesignTokens = components
      .filter(component => component.designTokens)
      .map(component => component.designTokens);
    
    if (allDesignTokens.length > 0) {
      opportunities.push({
        type: 'design-tokens',
        description: 'Standardize colors, typography, and spacing across components',
        tokens: this.consolidateDesignTokens(allDesignTokens),
      });
    }
    
    // Identify component library structure
    const componentHierarchy = this.buildComponentHierarchy(components);
    if (componentHierarchy.depth > 2) {
      opportunities.push({
        type: 'component-library',
        description: 'Organize components into a structured design system',
        hierarchy: componentHierarchy,
      });
    }
    
    return opportunities;
  }

  generateArchitecturalRecommendations(components) {
    const recommendations = [];
    
    // Analyze overall complexity
    const avgComplexity = components.reduce((sum, comp) => sum + comp.complexity, 0) / components.length;
    
    if (avgComplexity > 5) {
      recommendations.push({
        type: 'complexity-reduction',
        priority: 'high',
        description: 'Consider breaking down complex components into smaller, more manageable pieces',
      });
    }
    
    // Analyze reusability
    const reusableComponents = components.filter(comp => comp.instances > 1);
    const reusabilityRatio = reusableComponents.length / components.length;
    
    if (reusabilityRatio < 0.3) {
      recommendations.push({
        type: 'increase-reusability',
        priority: 'medium',
        description: 'Focus on creating more reusable components to reduce code duplication',
      });
    }
    
    return recommendations;
  }

  // Utility helper methods
  getStructureSignature(instance) {
    const tagName = instance.tagName || '';
    const childCount = instance.elements?.direct || 0;
    const depth = instance.depth || 0;
    return `${tagName}-${childCount}-${depth}`;
  }

  getStyleSignature(instance) {
    const styles = instance.computedStyles || {};
    const key = `${styles.display || ''}-${styles.position || ''}-${styles.color || ''}`;
    return key;
  }

  analyzeVariations(instances) {
    const signatures = new Set();
    instances.forEach(instance => {
      signatures.add(this.getStructureSignature(instance));
    });
    
    return {
      count: signatures.size,
      signatures: Array.from(signatures),
    };
  }

  calculateAverageComplexity(instances) {
    if (instances.length === 0) return 0;
    
    const complexities = instances.map(instance => {
      const elementCount = instance.elements?.all || 0;
      const depth = instance.depth || 0;
      return elementCount * 0.1 + depth * 0.5;
    });
    
    return complexities.reduce((sum, complexity) => sum + complexity, 0) / complexities.length;
  }

  assessBoundaryClarity(instances) {
    // Simple heuristic for boundary clarity
    let clarity = 100;
    
    instances.forEach(instance => {
      // Penalize inline styles
      if (instance.computedStyles && Object.keys(instance.computedStyles).length > 10) {
        clarity -= 10;
      }
      
      // Penalize deep nesting
      if (instance.depth > 5) {
        clarity -= 15;
      }
    });
    
    return Math.max(0, clarity);
  }

  createInstanceSignature(instance) {
    const structure = this.getStructureSignature(instance);
    const style = this.getStyleSignature(instance);
    const content = instance.textContent ? instance.textContent.substring(0, 20) : '';
    
    return `${structure}|${style}|${content}`;
  }

  findCommonAttributes(instances) {
    if (instances.length === 0) return [];
    
    const firstAttributes = Object.keys(instances[0].attributes || {});
    
    return firstAttributes.filter(attr => 
      instances.every(instance => 
        instance.attributes && instance.attributes.hasOwnProperty(attr)
      )
    );
  }

  findCommonElementsBetweenComponents(component1, component2) {
    const elements1 = new Set(component1.commonElements || []);
    const elements2 = new Set(component2.commonElements || []);
    
    return Array.from(elements1).filter(element => elements2.has(element));
  }

  determineRelationship(component1, component2) {
    const sharedElements = this.findCommonElementsBetweenComponents(component1, component2);
    
    if (sharedElements.length > 0) {
      return {
        type: 'shared-elements',
        component1: component1.type,
        component2: component2.type,
        sharedElements: sharedElements,
        strength: sharedElements.length / Math.max(component1.commonElements?.length || 1, component2.commonElements?.length || 1),
      };
    }
    
    return null;
  }

  consolidateDesignTokens(allTokens) {
    const consolidated = {
      colors: new Set(),
      typography: new Set(),
      spacing: new Set(),
      borders: new Set(),
      shadows: new Set(),
    };
    
    allTokens.forEach(tokens => {
      if (tokens.colors) tokens.colors.forEach(color => consolidated.colors.add(color));
      if (tokens.typography) tokens.typography.forEach(typo => consolidated.typography.add(typo));
      if (tokens.spacing) tokens.spacing.forEach(space => consolidated.spacing.add(space));
      if (tokens.borders) tokens.borders.forEach(border => consolidated.borders.add(border));
      if (tokens.shadows) tokens.shadows.forEach(shadow => consolidated.shadows.add(shadow));
    });
    
    return {
      colors: Array.from(consolidated.colors),
      typography: Array.from(consolidated.typography),
      spacing: Array.from(consolidated.spacing),
      borders: Array.from(consolidated.borders),
      shadows: Array.from(consolidated.shadows),
    };
  }

  buildComponentHierarchy(components) {
    const hierarchy = {
      atomic: [],
      molecular: [],
      organism: [],
      template: [],
      depth: 0,
    };
    
    components.forEach(component => {
      const level = component.reusabilityAnalysis?.recommendedAbstraction || 'atomic';
      if (hierarchy[level]) {
        hierarchy[level].push(component.type);
      }
    });
    
    hierarchy.depth = Object.keys(hierarchy).filter(key => 
      key !== 'depth' && hierarchy[key].length > 0
    ).length;
    
    return hierarchy;
  }

  findDominantPattern(variations) {
    if (variations.length === 0) return null;
    
    const patterns = new Map();
    variations.forEach(variation => {
      const key = `${variation.displayType}-${variation.layoutMethod}`;
      patterns.set(key, (patterns.get(key) || 0) + 1);
    });
    
    let dominantPattern = null;
    let maxCount = 0;
    patterns.forEach((count, pattern) => {
      if (count > maxCount) {
        maxCount = count;
        dominantPattern = pattern;
      }
    });
    
    return dominantPattern;
  }

  async processSingleRoute(route) {
    try {
      console.log('Processing single route:', route);

      // Validate route parameter
      if (!route || typeof route !== 'object' || !route.url) {
        throw new Error('Invalid route: missing url property');
      }

      // Process the route and capture screenshot
      const routeData = await this.processIndividualRoute(route);

      // If we have an enhanced analysis, use it; otherwise create basic data
      const processedData = {
        route: route.url,
        title: route.title || 'Unknown Page',
        fullUrl: route.fullUrl || route.url,
        id: route.id,
        timestamp: new Date().toISOString(),
        ...routeData
      };

      console.log('Single route processed successfully:', processedData);
      return { 
        success: true, 
        data: processedData 
      };

    } catch (error) {
      console.error('Error processing single route:', error);
      return { 
        success: false, 
        error: error.message,
        data: {
          route: route?.url || 'unknown',
          title: route?.title || 'Unknown Page',
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async captureScreenshot() {
    try {
      // Get active tab
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      
      if (!tabs || tabs.length === 0) {
        return { success: false, error: 'No active tab found', permissionError: true };
      }

      const activeTab = tabs[0];
      
      // Capture screenshot with rate limiting protection
      const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, { 
        format: 'png',
        quality: 90
      });

      if (dataUrl) {
        // Save screenshot to database
        await this.db.saveScreenshot({ 
          id: `screenshot_${Date.now()}`, 
          tabId: activeTab.id,
          url: activeTab.url,
          dataUrl 
        });
        
        return { success: true, dataUrl };
      } else {
        return { success: false, error: 'Failed to capture screenshot' };
      }
    } catch (error) {
      console.error('Screenshot capture error:', error);
      
      // Check if it's a permission error
      const isPermissionError = error.message.includes('activeTab') || 
                               error.message.includes('permission') ||
                               error.message.includes('The tab was closed');
      
      return { 
        success: false, 
        error: error.message,
        permissionError: isPermissionError
      };
    }
  }

  async exportAllData(includeScreenshots = true) {
    console.log('=== EXPORT ALL DATA STARTED ===');
    console.log('Include screenshots:', includeScreenshots);
    
    try {
      const exportResults = {
        success: true,
        files: {
          downloaded: [],
          failed: []
        },
        screenshots: {
          downloaded: [],
          failed: []
        },
        summary: {}
      };

      // Get processed routes from storage
      const storageData = await chrome.storage.local.get(['processedRoutes']);
      const processedRoutes = storageData.processedRoutes || [];

      console.log(`Found ${processedRoutes.length} processed routes`);

      if (processedRoutes.length === 0) {
        return {
          success: false,
          error: 'No processed routes found. Please capture routes first.'
        };
      }

      // Generate and download markdown files
      console.log('Generating markdown files...');
      try {
        // Create file export request
        const filesResponse = await this.generateAndDownloadFiles(processedRoutes);
        exportResults.files = filesResponse;
        
        if (!filesResponse.success) {
          exportResults.success = false;
        }
      } catch (fileError) {
        console.error('File generation failed:', fileError);
        exportResults.files.failed.push({
          type: 'markdown_generation',
          error: fileError.message
        });
        exportResults.success = false;
      }

      // Download screenshots if requested
      if (includeScreenshots) {
        console.log('Downloading screenshots...');
        try {
          let screenshotResponse = await this.downloadScreenshots();
          // Ensure screenshotResponse always has downloaded/failed arrays
          if (!screenshotResponse.downloaded) screenshotResponse.downloaded = [];
          if (!screenshotResponse.failed) screenshotResponse.failed = [];
          exportResults.screenshots = screenshotResponse;
          if (!screenshotResponse.success) {
            exportResults.success = false;
          }
        } catch (screenshotError) {
          console.error('Screenshot download failed:', screenshotError);
          exportResults.screenshots.failed = exportResults.screenshots.failed || [];
          exportResults.screenshots.failed.push({
            type: 'screenshot_download',
            error: screenshotError.message
          });
          exportResults.success = false;
        }
      }

      // Generate summary
      exportResults.summary = {
        totalFiles: exportResults.files.downloaded.length,
        failedFiles: exportResults.files.failed.length,
        totalScreenshots: includeScreenshots ? exportResults.screenshots.downloaded.length : 0,
        failedScreenshots: includeScreenshots ? exportResults.screenshots.failed.length : 0,
        timestamp: new Date().toISOString()
      };

      console.log('Export all data results:', exportResults);
      return exportResults;

    } catch (error) {
      console.error('Export all data operation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateAndDownloadFiles(processedRoutes) {
    // This method would generate the markdown files and call downloadFiles
    // For now, we'll return a placeholder - this should be integrated with the existing markdown generation
    console.log('generateAndDownloadFiles called with', processedRoutes.length, 'routes');
    
    try {
      // Basic file structure - in a real implementation, this would generate actual content
      const files = [
        {
          filename: 'export_summary.md',
          content: this.generateExportSummary(processedRoutes),
          mimeType: 'text/markdown'
        }
      ];

      return await this.downloadFiles(files);
    } catch (error) {
      console.error('generateAndDownloadFiles failed:', error);
      return {
        success: false,
        error: error.message,
        downloaded: [],
        failed: []
      };
    }
  }

  generateExportSummary(processedRoutes) {
    const timestamp = new Date().toISOString();
    let summary = `# Export Summary\n\n`;
    summary += `**Export Date:** ${timestamp}\n`;
    summary += `**Total Routes Processed:** ${processedRoutes.length}\n\n`;
    
    summary += `## Processed Routes\n\n`;
    processedRoutes.forEach((route, index) => {
      summary += `${index + 1}. **${route.title || 'Unknown Page'}**\n`;
      summary += `   - URL: \`${route.route || 'N/A'}\`\n`;
      summary += `   - Sections: ${route.sections?.length || 0}\n`;
      summary += `   - Components: ${route.components?.length || 0}\n`;
      if (route.error) {
        summary += `   - Error: ${route.error}\n`;
      }
      summary += `\n`;
    });

    summary += `## Export Status\n\n`;
    summary += `This export was generated automatically by the Route Capture Extension.\n`;
    summary += `All files and screenshots have been downloaded to your default download folder.\n\n`;

    return summary;
  }

  // ...existing code...
}

// Initialize the background service when the script loads
new BackgroundService();
