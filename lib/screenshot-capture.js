// Screenshot capture utility
class ScreenshotCapture {
  constructor() {
    this.settings = null;
  }

  async init() {
    this.settings = await chrome.storage.sync.get([
      'screenshotQuality',
      'waitTime',
      'captureFullPage',
      'excludeHiddenElements',
    ]);
  }

  async captureRoute(route) {
    await this.init();

    try {
      // Navigate to the route if needed
      const currentTab = await this.getCurrentTab();
      const targetUrl = this.buildFullUrl(route.url, currentTab.url);

      if (currentTab.url !== targetUrl) {
        await this.navigateToUrl(targetUrl, currentTab.id);
      }

      // Wait for page to load
      await this.waitForPageLoad();

      // Capture screenshot
      const screenshotData = await this.captureScreenshot(currentTab.id);

      // Get page metadata
      const metadata = await this.getPageMetadata(currentTab.id);

      return {
        route: route,
        screenshot: screenshotData,
        metadata: metadata,
        timestamp: Date.now(),
        success: true,
      };
    } catch (error) {
      console.error('Route capture failed:', error);
      return {
        route: route,
        error: error.message,
        timestamp: Date.now(),
        success: false,
      };
    }
  }

  async captureMultipleRoutes(routes, onProgress) {
    const results = [];
    const total = routes.length;

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];

      // Update progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: total,
          percentage: Math.round(((i + 1) / total) * 100),
          currentRoute: route.url,
        });
      }

      const result = await this.captureRoute(route);
      results.push(result);

      // Small delay between captures to avoid overwhelming the browser
      if (i < routes.length - 1) {
        await this.delay(1000);
      }
    }

    return results;
  }

  async getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      throw new Error('No active tab found');
    }
    return tabs[0];
  }

  buildFullUrl(routeUrl, currentUrl) {
    try {
      // If route is already a full URL, return as-is
      if (routeUrl.startsWith('http')) {
        return routeUrl;
      }

      // Build full URL from current tab's origin
      const currentUrlObj = new URL(currentUrl);
      return `${currentUrlObj.origin}${routeUrl}`;
    } catch (error) {
      throw new Error(`Invalid URL: ${routeUrl}`);
    }
  }

  async navigateToUrl(url, tabId) {
    return new Promise((resolve, reject) => {
      // Update the tab URL
      chrome.tabs.update(tabId, { url: url }, tab => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        // Listen for the tab to complete loading
        const onUpdated = (updatedTabId, changeInfo) => {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(onUpdated);
            resolve(tab);
          }
        };

        chrome.tabs.onUpdated.addListener(onUpdated);

        // Timeout after 30 seconds
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          reject(new Error('Navigation timeout'));
        }, 30000);
      });
    });
  }

  async waitForPageLoad() {
    // Wait for the configured amount of time to let dynamic content load
    await this.delay(this.settings.waitTime || 3000);

    // Additional wait for any animations or lazy loading
    await this.waitForStableDOM();
  }

  async waitForStableDOM() {
    // Execute script in the content page to wait for DOM stability
    const currentTab = await this.getCurrentTab();

    try {
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'waitForStableDOM',
      });
    } catch (error) {
      // If content script is not available, just continue
      console.warn('Could not communicate with content script:', error);
    }
  }

  async captureScreenshot(tabId) {
    try {
      const captureOptions = {
        format: 'png',
      };

      // Set quality based on settings
      switch (this.settings.screenshotQuality) {
        case 'high':
          captureOptions.quality = 100;
          break;
        case 'medium':
          captureOptions.quality = 80;
          break;
        case 'low':
          captureOptions.quality = 60;
          break;
        default:
          captureOptions.quality = 90;
      }

      if (this.settings.captureFullPage) {
        return await this.captureFullPageScreenshot(tabId, captureOptions);
      } else {
        return await chrome.tabs.captureVisibleTab(null, captureOptions);
      }
    } catch (error) {
      throw new Error(`Screenshot capture failed: ${error.message}`);
    }
  }

  async captureFullPageScreenshot(tabId, captureOptions) {
    try {
      // Get page dimensions
      const dimensions = await chrome.tabs.sendMessage(tabId, {
        action: 'getPageDimensions',
      });

      if (!dimensions) {
        // Fallback to visible area capture
        return await chrome.tabs.captureVisibleTab(null, captureOptions);
      }

      // Capture multiple screenshots and stitch them together
      const screenshots = [];
      const viewportHeight = dimensions.viewportHeight;
      const totalHeight = dimensions.pageHeight;
      const numberOfCaptures = Math.ceil(totalHeight / viewportHeight);

      for (let i = 0; i < numberOfCaptures; i++) {
        const scrollY = i * viewportHeight;

        // Scroll to position
        await chrome.tabs.sendMessage(tabId, {
          action: 'scrollToPosition',
          y: scrollY,
        });

        // Wait for scroll to complete
        await this.delay(500);

        // Capture this portion
        const screenshot = await chrome.tabs.captureVisibleTab(
          null,
          captureOptions
        );
        screenshots.push({
          data: screenshot,
          position: scrollY,
          isLast: i === numberOfCaptures - 1,
        });
      }

      // For now, return the first screenshot
      // In a full implementation, you would stitch these together
      return screenshots[0].data;
    } catch (error) {
      console.error(
        'Full page capture failed, falling back to visible area:',
        error
      );
      return await chrome.tabs.captureVisibleTab(null, captureOptions);
    }
  }

  async getPageMetadata(tabId) {
    try {
      const metadata = await chrome.tabs.sendMessage(tabId, {
        action: 'getPageMetadata',
      });

      return metadata || {};
    } catch (error) {
      console.warn('Could not get page metadata:', error);
      return {};
    }
  }

  async processScreenshot(screenshotData) {
    // Convert screenshot to different formats if needed
    return {
      original: screenshotData,
      thumbnail: await this.createThumbnail(screenshotData),
      dimensions: await this.getImageDimensions(screenshotData),
    };
  }

  async createThumbnail(screenshotData, maxWidth = 300, maxHeight = 200) {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate thumbnail dimensions
        const aspectRatio = img.width / img.height;
        let thumbWidth = maxWidth;
        let thumbHeight = maxHeight;

        if (aspectRatio > maxWidth / maxHeight) {
          thumbHeight = maxWidth / aspectRatio;
        } else {
          thumbWidth = maxHeight * aspectRatio;
        }

        canvas.width = thumbWidth;
        canvas.height = thumbHeight;

        // Draw thumbnail
        ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);

        resolve(canvas.toDataURL('image/png'));
      };

      img.src = screenshotData;
    });
  }

  async getImageDimensions(screenshotData) {
    return new Promise(resolve => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
        });
      };

      img.src = screenshotData;
    });
  }

  async saveScreenshot(screenshotData, filename) {
    try {
      // Convert data URL to blob
      const response = await fetch(screenshotData);
      const blob = await response.blob();

      // Create download URL
      const url = URL.createObjectURL(blob);

      // Trigger download
      await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false,
      });

      // Clean up
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Screenshot save failed:', error);
      return { success: false, error: error.message };
    }
  }

  async optimizeForAI(screenshotData) {
    // Optimize screenshot for AI analysis
    // This could include:
    // - Removing unnecessary elements
    // - Enhancing contrast
    // - Resizing to optimal dimensions

    if (!this.settings.excludeHiddenElements) {
      return screenshotData;
    }

    try {
      // Get current tab
      const currentTab = await this.getCurrentTab();

      // Hide elements that shouldn't be analyzed
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'hideElementsForAnalysis',
      });

      // Wait a moment for elements to be hidden
      await this.delay(500);

      // Capture optimized screenshot
      const optimizedScreenshot = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 90,
      });

      // Show elements again
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'showElementsAfterAnalysis',
      });

      return optimizedScreenshot;
    } catch (error) {
      console.warn('Screenshot optimization failed:', error);
      return screenshotData;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method to convert blob to base64
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Utility method to get file size
  getDataUrlSize(dataUrl) {
    // Rough calculation of data URL size
    const base64Data = dataUrl.split(',')[1];
    return Math.round((base64Data.length * 3) / 4);
  }

  // Format file size for display
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenshotCapture;
} else {
  window.ScreenshotCapture = ScreenshotCapture;
}
