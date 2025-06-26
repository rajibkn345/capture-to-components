// Content script for route detection and page analysis
// Guard against multiple injections using IIFE
(function () {
  'use strict';

  if (window.CaptureToComponentDetector) {
    console.log('Content script already loaded, skipping re-initialization');
    return;
  }

  class RouteDetector {
    constructor() {
      this.routes = new Set();
      this.isAnalyzing = false;
      this.init();
    }

    init() {
      console.log('Content script initializing on:', window.location.href);

      // Listen for messages from background and popup
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

      // Start route detection when page is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () =>
          this.detectRoutes()
        );
      } else {
        this.detectRoutes();
      }

      console.log('Content script initialized successfully');
    }

    async handleMessage(request, sender, sendResponse) {
      try {
        switch (request.action) {
          case 'getRoutes': {
            console.log('Content script: getRoutes request received');
            const routes = Array.from(this.routes);
            console.log('Content script: sending routes:', routes);
            sendResponse({ routes: routes });
            break;
          }

          case 'analyzePageStructure': {
            console.log('Content script: analyzing page structure');
            const analysis = this.analyzePageStructure();
            console.log('Content script: page analysis complete');
            sendResponse(analysis);
            break;
          }

          case 'analyzeRoute':
            return this.analyzeCurrentRoute();

          case 'pageReady':
            this.detectRoutes();
            break;

          case 'refreshRoutes':
            this.routes.clear();
            this.detectRoutes();
            sendResponse({ success: true });
            break;

          default:
            console.log('Content script: unknown action:', request.action);
            sendResponse({ error: 'Unknown action' });
        }
      } catch (error) {
        console.error('Content script message handling error:', error);
        sendResponse({ error: error.message });
      }
    }

    detectRoutes() {
      if (this.isAnalyzing) return;

      this.isAnalyzing = true;

      try {
        // Find static routes from anchor tags
        this.findStaticRoutes();

        // Detect SPA routes
        this.findSPARoutes();

        // Parse sitemap if available
        this.analyzeSitemap();

        // Detect navigation patterns
        this.findNavigationRoutes();
      } catch (error) {
        console.error('Route detection failed:', error);
      } finally {
        this.isAnalyzing = false;
      }
    }

    findStaticRoutes() {
      const links = document.querySelectorAll('a[href]');
      const currentOrigin = window.location.origin;

      links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        try {
          let url;

          // Handle relative URLs
          if (href.startsWith('/')) {
            url = new URL(href, currentOrigin);
          } else if (href.startsWith('http')) {
            url = new URL(href);
            // Only include same-origin URLs
            if (url.origin !== currentOrigin) return;
          } else if (
            !href.startsWith('#') &&
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:')
          ) {
            url = new URL(href, window.location.href);
            if (url.origin !== currentOrigin) return;
          } else {
            return; // Skip anchors, mailto, tel links
          }

          const route = {
            id: this.generateRouteId(url.pathname),
            url: url.pathname + url.search,
            fullUrl: url.href,
            title: link.textContent?.trim() || url.pathname,
            type: 'static',
            element: this.getElementInfo(link),
            context: this.getRouteContext(link),
          };

          this.routes.add(JSON.stringify(route));
        } catch (error) {
          // Invalid URL, skip
        }
      });
    }

    findSPARoutes() {
      // Check for common SPA routing patterns
      const scripts = document.querySelectorAll('script');

      scripts.forEach(script => {
        const content = script.textContent || '';

        // Look for React Router patterns
        const reactRouterMatches = content.match(/path:\s*["']([^"']+)["']/g);
        if (reactRouterMatches) {
          reactRouterMatches.forEach(match => {
            const path = match.match(/["']([^"']+)["']/)[1];
            this.addSPARoute(path, 'react-router');
          });
        }

        // Look for Vue Router patterns
        const vueRouterMatches = content.match(/path:\s*["']([^"']+)["']/g);
        if (vueRouterMatches) {
          vueRouterMatches.forEach(match => {
            const path = match.match(/["']([^"']+)["']/)[1];
            this.addSPARoute(path, 'vue-router');
          });
        }

        // Look for Angular routes
        const angularMatches = content.match(/{\s*path:\s*["']([^"']+)["']/g);
        if (angularMatches) {
          angularMatches.forEach(match => {
            const path = match.match(/["']([^"']+)["']/)[1];
            this.addSPARoute(path, 'angular');
          });
        }
      });
    }

    addSPARoute(path, framework) {
      const route = {
        id: this.generateRouteId(path),
        url: path,
        fullUrl: window.location.origin + path,
        title: this.formatRouteTitle(path),
        type: 'spa',
        framework: framework,
        isDynamic: path.includes(':') || path.includes('*'),
      };

      this.routes.add(JSON.stringify(route));
    }

    async analyzeSitemap() {
      try {
        const sitemapUrls = [
          '/sitemap.xml',
          '/sitemap_index.xml',
          '/robots.txt',
        ];

        for (const sitemapUrl of sitemapUrls) {
          try {
            const response = await fetch(sitemapUrl);
            if (response.ok) {
              const content = await response.text();
              this.parseSitemap(content);
              break;
            }
          } catch (error) {
            // Continue to next sitemap URL
          }
        }
      } catch (error) {
        console.warn('Sitemap analysis failed:', error);
      }
    }

    parseSitemap(content) {
      // Parse XML sitemap
      if (content.includes('<urlset') || content.includes('<sitemapindex')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, 'text/xml');

        const urls = xmlDoc.querySelectorAll('url > loc');
        urls.forEach(loc => {
          const url = loc.textContent;
          try {
            const urlObj = new URL(url);
            const route = {
              id: this.generateRouteId(urlObj.pathname),
              url: urlObj.pathname + urlObj.search,
              fullUrl: url,
              title: this.formatRouteTitle(urlObj.pathname),
              type: 'sitemap',
            };

            this.routes.add(JSON.stringify(route));
          } catch (error) {
            // Invalid URL
          }
        });
      }

      // Parse robots.txt for sitemap references
      if (content.includes('Sitemap:')) {
        const sitemapLines = content
          .split('\n')
          .filter(line => line.toLowerCase().startsWith('sitemap:'));

        sitemapLines.forEach(line => {
          const sitemapUrl = line.split(':').slice(1).join(':').trim();
          // Recursively analyze referenced sitemaps
          fetch(sitemapUrl)
            .then(response => response.text())
            .then(content => this.parseSitemap(content))
            .catch(() => {});
        });
      }
    }

    findNavigationRoutes() {
      // Look for navigation menus
      const navSelectors = [
        'nav',
        '[role="navigation"]',
        '.nav',
        '.navigation',
        '.menu',
        '.navbar',
        'header nav',
        'footer nav',
      ];

      navSelectors.forEach(selector => {
        const navElements = document.querySelectorAll(selector);
        navElements.forEach(nav => {
          const links = nav.querySelectorAll('a[href]');
          links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/')) {
              const route = {
                id: this.generateRouteId(href),
                url: href,
                fullUrl: window.location.origin + href,
                title: link.textContent?.trim() || href,
                type: 'navigation',
                navContext: this.getNavigationContext(nav),
              };

              this.routes.add(JSON.stringify(route));
            }
          });
        });
      });
    }

    analyzeCurrentRoute() {
      const sections = this.detectPageSections();
      const components = this.detectComponents();

      return {
        url: window.location.pathname,
        title: document.title,
        sections: sections,
        components: components,
        meta: this.getPageMeta(),
      };
    }

    detectPageSections() {
      const sections = [];

      // Common section selectors
      const sectionSelectors = [
        'header',
        'nav',
        'main',
        'section',
        'article',
        'aside',
        'footer',
        '[role="banner"]',
        '[role="navigation"]',
        '[role="main"]',
        '[role="complementary"]',
        '[role="contentinfo"]',
      ];

      sectionSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
          const rect = element.getBoundingClientRect();

          sections.push({
            id: `${selector.replace(/[[\]"'=:]/g, '_')}_${index}`,
            selector: selector,
            type: this.inferSectionType(element),
            position: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            },
            content: this.extractSectionContent(element),
          });
        });
      });

      return sections;
    }

    detectComponents() {
      const components = [];

      // Common component patterns
      const componentSelectors = [
        '.card',
        '.button',
        '.btn',
        '.form',
        '.modal',
        '.dropdown',
        '.carousel',
        '.slider',
        '.tab',
        '.accordion',
        '.hero',
        '.banner',
        '.widget',
      ];

      componentSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
          components.push({
            id: `${selector.substring(1)}_${index}`,
            type: selector.substring(1),
            classes: Array.from(element.classList),
            attributes: this.getElementAttributes(element),
            content: this.extractComponentContent(element),
          });
        });
      });

      return components;
    }

    analyzePageStructure() {
      console.log('Starting comprehensive page structure analysis...');

      try {
        // Check for modals or overlays that might interfere
        const modals = this.detectModals();
        if (modals.length > 0) {
          console.log('Detected modals/overlays:', modals.length);
        }

        // Get page dimensions safely
        const pageHeight = Math.max(
          document.body?.scrollHeight || 0,
          document.body?.offsetHeight || 0,
          document.documentElement?.clientHeight || 0,
          document.documentElement?.scrollHeight || 0,
          document.documentElement?.offsetHeight || 0
        );
        const pageWidth = Math.max(
          document.body?.scrollWidth || 0,
          document.body?.offsetWidth || 0,
          document.documentElement?.clientWidth || 0,
          document.documentElement?.scrollWidth || 0,
          document.documentElement?.offsetWidth || 0
        );

        // Perform detailed section analysis
        const sections = this.analyzeSectionsInDetail();

        // Extract form elements
        const forms = this.analyzeForms();

        // Extract media elements
        const media = this.analyzeMedia();

        // Extract interactive elements
        const interactive = this.analyzeInteractiveElements();

        // Analyze navigation patterns
        const navigation = this.analyzeNavigation();

        // Extract layout information
        const layout = this.analyzeLayout();

        // Count total elements
        const totalElements = document.querySelectorAll('*').length;

        const analysis = {
          sections: sections,
          forms: forms,
          media: media,
          interactive: interactive,
          navigation: navigation,
          layout: layout,
          domStructure: {
            totalElements: totalElements,
            depth: this.calculateDOMDepth(),
            pageHeight: pageHeight,
            pageWidth: pageWidth,
            hasScrollableContent: pageHeight > window.innerHeight,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
          },
          meta: this.getPageMeta(),
          performance: {
            analysisTime: Date.now(),
            scriptsLoaded: document.scripts.length,
            stylesheetsLoaded: document.styleSheets.length,
          },
        };

        console.log('Page structure analysis complete:', analysis);
        return analysis;
      } catch (error) {
        console.error('Page structure analysis failed:', error);
        return {
          sections: [],
          forms: [],
          media: { images: [], videos: [], audio: [] },
          interactive: { buttons: [], links: [], inputs: [], selects: [] },
          navigation: {
            primary: [],
            secondary: [],
            breadcrumbs: [],
            pagination: [],
          },
          layout: {},
          domStructure: {
            totalElements: 0,
            depth: 0,
            pageHeight: 0,
            pageWidth: 0,
            hasScrollableContent: false,
            viewport: { width: 0, height: 0 },
          },
          meta: {},
          performance: {
            analysisTime: Date.now(),
            scriptsLoaded: 0,
            stylesheetsLoaded: 0,
          },
          error: error.message,
        };
      }
    }

    analyzeSectionsInDetail() {
      const sections = [];

      // Semantic sections
      const semanticSelectors = [
        'header',
        'nav',
        'main',
        'section',
        'article',
        'aside',
        'footer',
        '[role="banner"]',
        '[role="navigation"]',
        '[role="main"]',
        '[role="complementary"]',
        '[role="contentinfo"]',
      ];

      // Layout sections
      const layoutSelectors = [
        '.container',
        '.wrapper',
        '.content',
        '.sidebar',
        '.hero',
        '.banner',
        '.header',
        '.footer',
        '.navbar',
        '.menu',
        '.widget',
        '.panel',
      ];

      // Component sections
      const componentSelectors = [
        '.card',
        '.modal',
        '.popup',
        '.dropdown',
        '.carousel',
        '.slider',
        '.tabs',
        '.accordion',
        '.gallery',
        '.grid',
        '.list',
      ];

      const allSelectors = [
        ...semanticSelectors,
        ...layoutSelectors,
        ...componentSelectors,
      ];

      allSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
          if (this.isElementVisible(element)) {
            const rect = element.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(element);

            const section = {
              id: `${selector.replace(/[[\]"'=:.\s]/g, '_')}_${index}`,
              selector: selector,
              tagName: element.tagName.toLowerCase(),
              type: this.classifyElementType(element, selector),
              bounds: {
                x: rect.x + window.scrollX,
                y: rect.y + window.scrollY,
                width: rect.width,
                height: rect.height,
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                right: rect.right + window.scrollX,
                bottom: rect.bottom + window.scrollY,
              },
              content: this.extractDetailedContent(element),
              attributes: this.getElementAttributes(element),
              computedStyles: this.getRelevantStyles(computedStyle),
              children: this.analyzeChildren(element),
              depth: this.getElementDepth(element),
              elements: this.countChildElements(element),
              textContent: element.textContent?.trim().substring(0, 500) || '',
              isEmpty: this.isElementEmpty(element),
              hasInteractiveElements: this.hasInteractiveChildren(element),
              accessibility: this.analyzeAccessibility(element),
            };

            sections.push(section);
          }
        });
      });

      return sections;
    }

    analyzeForms() {
      const forms = [];
      const formElements = document.querySelectorAll('form');

      formElements.forEach((form, index) => {
        const inputs = form.querySelectorAll('input, textarea, select');
        const buttons = form.querySelectorAll('button, input[type="submit"]');

        forms.push({
          id: `form_${index}`,
          action: form.action || '',
          method: form.method || 'get',
          inputs: Array.from(inputs).map(input => ({
            type: input.type || input.tagName.toLowerCase(),
            name: input.name || '',
            placeholder: input.placeholder || '',
            required: input.required,
            id: input.id || '',
          })),
          buttons: Array.from(buttons).map(button => ({
            type: button.type || 'button',
            text: button.textContent?.trim() || '',
            value: button.value || '',
          })),
          fieldCount: inputs.length,
          validation: form.noValidate === false,
        });
      });

      return forms;
    }

    analyzeMedia() {
      const media = {
        images: [],
        videos: [],
        audio: [],
      };

      // Analyze images
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (this.isElementVisible(img)) {
          media.images.push({
            id: `img_${index}`,
            src: img.src || '',
            alt: img.alt || '',
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            loading: img.loading || 'eager',
            isLazy: img.hasAttribute('loading') && img.loading === 'lazy',
          });
        }
      });

      // Analyze videos
      const videos = document.querySelectorAll('video');
      videos.forEach((video, index) => {
        media.videos.push({
          id: `video_${index}`,
          src: video.src || video.currentSrc || '',
          controls: video.controls,
          autoplay: video.autoplay,
          loop: video.loop,
          muted: video.muted,
          duration: video.duration || 0,
        });
      });

      // Analyze audio
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach((audio, index) => {
        media.audio.push({
          id: `audio_${index}`,
          src: audio.src || audio.currentSrc || '',
          controls: audio.controls,
          autoplay: audio.autoplay,
          loop: audio.loop,
        });
      });

      return media;
    }

    analyzeInteractiveElements() {
      const interactive = {
        buttons: [],
        links: [],
        inputs: [],
        selects: [],
      };

      // Buttons
      const buttons = document.querySelectorAll(
        'button, input[type="button"], input[type="submit"]'
      );
      buttons.forEach((button, index) => {
        if (this.isElementVisible(button)) {
          interactive.buttons.push({
            id: `btn_${index}`,
            text: button.textContent?.trim() || button.value || '',
            type: button.type || 'button',
            disabled: button.disabled,
            classes: Array.from(button.classList),
          });
        }
      });

      // Links
      const links = document.querySelectorAll('a[href]');
      links.forEach((link, index) => {
        if (this.isElementVisible(link)) {
          interactive.links.push({
            id: `link_${index}`,
            href: link.href,
            text: link.textContent?.trim() || '',
            isExternal: !link.href.startsWith(window.location.origin),
            target: link.target || '',
          });
        }
      });

      return interactive;
    }

    analyzeNavigation() {
      const navigation = {
        primary: [],
        secondary: [],
        breadcrumbs: [],
        pagination: [],
      };

      // Primary navigation
      const primaryNav = document.querySelectorAll(
        'nav, [role="navigation"], .navbar, .main-nav'
      );
      primaryNav.forEach((nav, index) => {
        const links = nav.querySelectorAll('a');
        navigation.primary.push({
          id: `nav_${index}`,
          location: this.getNavigationLocation(nav),
          linkCount: links.length,
          links: Array.from(links)
            .slice(0, 10)
            .map(link => ({
              text: link.textContent?.trim() || '',
              href: link.href || '',
            })),
        });
      });

      // Breadcrumbs
      const breadcrumbSelectors = [
        '.breadcrumb',
        '.breadcrumbs',
        '[aria-label*="breadcrumb"]',
      ];
      breadcrumbSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
          const links = element.querySelectorAll('a');
          navigation.breadcrumbs.push({
            id: `breadcrumb_${index}`,
            steps: Array.from(links).map(link => ({
              text: link.textContent?.trim() || '',
              href: link.href || '',
            })),
          });
        });
      });

      return navigation;
    }

    analyzeLayout() {
      const layout = {
        structure: 'unknown',
        columns: 1,
        hasHeader: !!document.querySelector('header, [role="banner"]'),
        hasFooter: !!document.querySelector('footer, [role="contentinfo"]'),
        hasSidebar: !!document.querySelector(
          'aside, .sidebar, [role="complementary"]'
        ),
        isResponsive: this.checkResponsiveDesign(),
        gridAreas: this.detectGridAreas(),
      };

      // Detect layout structure
      const main = document.querySelector('main, [role="main"], .main-content');
      if (main) {
        const computedStyle = window.getComputedStyle(main);
        if (computedStyle.display.includes('grid')) {
          layout.structure = 'grid';
        } else if (computedStyle.display.includes('flex')) {
          layout.structure = 'flexbox';
        } else {
          layout.structure = 'traditional';
        }
      }

      return layout;
    }

    // Helper methods for detailed analysis
    isElementVisible(element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      );
    }

    classifyElementType(element, _selector) {
      const tagName = element.tagName.toLowerCase();
      const className = element.className.toLowerCase();

      // Semantic classification
      if (tagName === 'header' || className.includes('header')) return 'header';
      if (tagName === 'nav' || className.includes('nav')) return 'navigation';
      if (tagName === 'main' || className.includes('main'))
        return 'main-content';
      if (tagName === 'footer' || className.includes('footer')) return 'footer';
      if (tagName === 'aside' || className.includes('sidebar'))
        return 'sidebar';

      // Component classification
      if (className.includes('hero') || className.includes('banner'))
        return 'hero-section';
      if (className.includes('card')) return 'card-component';
      if (className.includes('modal')) return 'modal-component';
      if (className.includes('carousel') || className.includes('slider'))
        return 'carousel-component';
      if (className.includes('form')) return 'form-component';
      if (className.includes('button') || className.includes('btn'))
        return 'button-component';

      return 'content-section';
    }

    extractDetailedContent(element) {
      return {
        text: element.textContent?.trim().substring(0, 300) || '',
        headings: element.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        paragraphs: element.querySelectorAll('p').length,
        images: element.querySelectorAll('img').length,
        links: element.querySelectorAll('a').length,
        lists: element.querySelectorAll('ul, ol').length,
        tables: element.querySelectorAll('table').length,
        forms: element.querySelectorAll('form').length,
        buttons: element.querySelectorAll(
          'button, input[type="button"], input[type="submit"]'
        ).length,
        inputs: element.querySelectorAll('input, textarea, select').length,
      };
    }

    getRelevantStyles(computedStyle) {
      return {
        display: computedStyle.display,
        position: computedStyle.position,
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        fontSize: computedStyle.fontSize,
        fontFamily: computedStyle.fontFamily,
        margin: computedStyle.margin,
        padding: computedStyle.padding,
        border: computedStyle.border,
        borderRadius: computedStyle.borderRadius,
        boxShadow: computedStyle.boxShadow,
        gridTemplateColumns: computedStyle.gridTemplateColumns,
        flexDirection: computedStyle.flexDirection,
        justifyContent: computedStyle.justifyContent,
        alignItems: computedStyle.alignItems,
      };
    }

    analyzeChildren(element) {
      const children = Array.from(element.children);
      return children.map(child => ({
        tagName: child.tagName.toLowerCase(),
        className: child.className,
        id: child.id,
        hasChildren: child.children.length > 0,
        textLength: child.textContent?.length || 0,
      }));
    }

    getElementDepth(element) {
      let depth = 0;
      let current = element;
      while (current.parentElement) {
        depth++;
        current = current.parentElement;
      }
      return depth;
    }

    calculateDOMDepth() {
      const allElements = document.querySelectorAll('*');
      let maxDepth = 0;

      allElements.forEach(element => {
        const depth = this.getElementDepth(element);
        if (depth > maxDepth) {
          maxDepth = depth;
        }
      });

      return maxDepth;
    }

    countChildElements(element) {
      return {
        direct: element.children.length,
        all: element.querySelectorAll('*').length,
      };
    }

    isElementEmpty(element) {
      return (
        !element.textContent?.trim() &&
        element.children.length === 0 &&
        !element.querySelector('img, video, audio, svg, canvas')
      );
    }

    hasInteractiveChildren(element) {
      return !!element.querySelector(
        'button, input, textarea, select, a, [tabindex], [onclick]'
      );
    }

    analyzeAccessibility(element) {
      return {
        hasAriaLabel: !!element.getAttribute('aria-label'),
        hasAriaLabelledBy: !!element.getAttribute('aria-labelledby'),
        hasRole: !!element.getAttribute('role'),
        hasTabIndex: !!element.getAttribute('tabindex'),
        isHeading: /^h[1-6]$/i.test(element.tagName),
        hasAltText:
          element.tagName.toLowerCase() === 'img' ? !!element.alt : null,
      };
    }

    getNavigationLocation(nav) {
      if (nav.closest('header')) return 'header';
      if (nav.closest('footer')) return 'footer';
      if (nav.closest('aside')) return 'sidebar';
      return 'main';
    }

    checkResponsiveDesign() {
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      const hasMediaQueries = Array.from(document.styleSheets).some(sheet => {
        try {
          return Array.from(sheet.cssRules || []).some(
            rule => rule.media && rule.media.mediaText.includes('max-width')
          );
        } catch (e) {
          return false;
        }
      });

      return !!viewportMeta || hasMediaQueries;
    }

    detectGridAreas() {
      const gridContainers = document.querySelectorAll('*');
      const areas = [];

      gridContainers.forEach(element => {
        const style = window.getComputedStyle(element);
        if (style.display === 'grid' && style.gridTemplateAreas !== 'none') {
          areas.push({
            element: element.tagName.toLowerCase(),
            areas: style.gridTemplateAreas,
          });
        }
      });

      return areas;
    }

    detectModals() {
      const modals = [];

      // Common modal selectors
      const modalSelectors = [
        '.modal',
        '.popup',
        '.overlay',
        '.dialog',
        '[role="dialog"]',
        '[role="alertdialog"]',
        '.lightbox',
        '.fancybox',
        '.modal-dialog',
        '.popup-container',
        '[data-modal]',
        '[aria-modal="true"]',
      ];

      modalSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (this.isElementVisible(element)) {
            const rect = element.getBoundingClientRect();
            modals.push({
              selector: selector,
              id: element.id || '',
              classes: Array.from(element.classList),
              bounds: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              },
              zIndex: window.getComputedStyle(element).zIndex,
              isOverlay:
                rect.width > window.innerWidth * 0.8 ||
                rect.height > window.innerHeight * 0.8,
            });
          }
        });
      });

      return modals;
    }

    // Utility methods
    generateRouteId(path) {
      return btoa(path)
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 10);
    }

    formatRouteTitle(path) {
      return (
        path
          .split('/')
          .filter(segment => segment)
          .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(' > ') || 'Home'
      );
    }

    getElementInfo(element) {
      return {
        tagName: element.tagName.toLowerCase(),
        className: element.className,
        id: element.id,
        textContent: element.textContent?.trim().substring(0, 100),
      };
    }

    getRouteContext(element) {
      const parent = element.closest('nav, .nav, .menu, header, footer');
      return parent ? parent.tagName.toLowerCase() : 'content';
    }

    getNavigationContext(nav) {
      return {
        tagName: nav.tagName.toLowerCase(),
        className: nav.className,
        position: nav.closest('header')
          ? 'header'
          : nav.closest('footer')
            ? 'footer'
            : 'content',
      };
    }

    inferSectionType(element) {
      const tagName = element.tagName.toLowerCase();
      const className = element.className.toLowerCase();

      if (tagName === 'header' || className.includes('header')) return 'header';
      if (tagName === 'nav' || className.includes('nav')) return 'navigation';
      if (tagName === 'footer' || className.includes('footer')) return 'footer';
      if (className.includes('hero') || className.includes('banner'))
        return 'hero';
      if (tagName === 'main' || className.includes('main')) return 'main';
      if (tagName === 'aside' || className.includes('sidebar'))
        return 'sidebar';

      return 'content';
    }

    extractSectionContent(element) {
      return {
        text: element.textContent?.trim().substring(0, 200),
        images: element.querySelectorAll('img').length,
        links: element.querySelectorAll('a').length,
        forms: element.querySelectorAll('form').length,
      };
    }

    extractComponentContent(element) {
      return {
        text: element.textContent?.trim().substring(0, 100),
        hasImage: !!element.querySelector('img'),
        hasButton: !!element.querySelector('button, .btn'),
        hasForm: !!element.querySelector('form, input, textarea'),
      };
    }

    getElementAttributes(element) {
      const attrs = {};
      for (const attr of element.attributes) {
        attrs[attr.name] = attr.value;
      }
      return attrs;
    }

    getPageMeta() {
      return {
        title: document.title,
        description: document
          .querySelector('meta[name="description"]')
          ?.getAttribute('content'),
        keywords: document
          .querySelector('meta[name="keywords"]')
          ?.getAttribute('content'),
        viewport: document
          .querySelector('meta[name="viewport"]')
          ?.getAttribute('content'),
        charset: document.characterSet,
      };
    }
  }

  // Initialize route detector and mark as loaded
  window.CaptureToComponentDetector = new RouteDetector();
})(); // End IIFE guard against multiple injections
