// AI-powered image segmentation service
class AISegmentation {
  constructor() {
    // API key should be configured through extension settings
    this.apiKey = null;
    this.settings = null;
    this.apiCache = new Map();
  }

  async init() {
    this.settings = await chrome.storage.sync.get([
      'segmentationThreshold',
      'enableCaching',
      'apiKey', // Get API key from settings
    ]);

    // Set default values if not found
    this.settings.segmentationThreshold =
      this.settings.segmentationThreshold || 0.7;
    this.settings.enableCaching = this.settings.enableCaching !== false;
    this.apiKey = this.settings.apiKey || null;

    if (!this.apiKey) {
      console.warn(
        'AI Segmentation: No API key configured. Please set up API key in extension settings.'
      );
    }
  }

  async segmentImage(imageData, route) {
    await this.init();

    const cacheKey = this.generateCacheKey(imageData, route);

    // Check cache first
    if (this.settings.enableCaching && this.apiCache.has(cacheKey)) {
      return this.apiCache.get(cacheKey);
    }

    try {
      // Always use OpenAI for segmentation
      const result = await this.segmentWithOpenAI(imageData, route);

      // Cache the result
      if (this.settings.enableCaching) {
        this.apiCache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('AI segmentation failed:', error);
      // Fallback to DOM-based analysis
      return this.fallbackSegmentation(route);
    }
  }

  async segmentWithOpenAI(imageData, route) {
    // Check if API key is configured
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured, skipping AI segmentation');
      return this.fallbackSegmentation(route);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this website screenshot and identify distinct UI components and sections. 
                      Return a JSON object with sections array containing:
                      - type: component type (header, navigation, hero, card, form, footer, etc.)
                      - bounds: approximate pixel coordinates {x, y, width, height}
                      - elements: array of sub-elements found
                      - content: description of content
                      
                      Focus on reusable components that could be converted to React components.
                      URL: ${route.url}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      return JSON.parse(content);
    } catch {
      // If JSON parsing fails, create a structured response
      return this.parseUnstructuredResponse(content);
    }
  }

  async segmentWithGoogleVision(imageData, route) {
    // Convert base64 to just the data part
    const base64Data = imageData.split(',')[1];

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${this.settings.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Data,
              },
              features: [
                { type: 'TEXT_DETECTION' },
                { type: 'OBJECT_LOCALIZATION' },
                { type: 'LOGO_DETECTION' },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status}`);
    }

    const data = await response.json();
    return this.processGoogleVisionResponse(data, route);
  }

  async segmentWithAWS(_imageData, _route) {
    // Note: This would require AWS SDK setup
    // For now, return a mock implementation
    throw new Error('AWS Rekognition integration not yet implemented');
  }

  async segmentWithCustomAPI(_imageData, _route) {
    const response = await fetch(this.settings.customApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        image: imageData,
        route: route,
        threshold: this.settings.segmentationThreshold,
      }),
    });

    if (!response.ok) {
      throw new Error(`Custom API error: ${response.status}`);
    }

    return await response.json();
  }

  fallbackSegmentation(_route) {
    // Basic fallback using DOM analysis
    return {
      sections: [
        {
          type: 'header',
          bounds: { x: 0, y: 0, width: 1200, height: 80 },
          elements: ['logo', 'navigation'],
          content: 'Site header with navigation',
        },
        {
          type: 'main',
          bounds: { x: 0, y: 80, width: 1200, height: 600 },
          elements: ['content'],
          content: 'Main content area',
        },
        {
          type: 'footer',
          bounds: { x: 0, y: 680, width: 1200, height: 120 },
          elements: ['links', 'copyright'],
          content: 'Site footer',
        },
      ],
      confidence: 0.3,
      source: 'fallback',
    };
  }

  processGoogleVisionResponse(data, route) {
    const response = data.responses[0];
    const sections = [];

    // Process text annotations
    if (response.textAnnotations) {
      response.textAnnotations.forEach((annotation, index) => {
        if (index === 0) return; // Skip full text annotation

        const vertices = annotation.boundingPoly.vertices;
        const bounds = this.calculateBounds(vertices);

        sections.push({
          type: 'text',
          bounds: bounds,
          content: annotation.description,
          confidence: annotation.confidence || 0.8,
        });
      });
    }

    // Process object localizations
    if (response.localizedObjectAnnotations) {
      response.localizedObjectAnnotations.forEach(obj => {
        const vertices = obj.boundingPoly.normalizedVertices;
        const bounds = this.calculateNormalizedBounds(vertices);

        sections.push({
          type: obj.name.toLowerCase(),
          bounds: bounds,
          content: `${obj.name} (${Math.round(obj.score * 100)}% confidence)`,
          confidence: obj.score,
        });
      });
    }

    return {
      sections: sections,
      route: route.url,
      timestamp: Date.now(),
      source: 'google-vision',
    };
  }

  parseUnstructuredResponse(content) {
    // Try to extract structured information from unstructured text
    const sections = [];
    const lines = content.split('\n');

    let currentSection = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Look for section headers
      if (trimmed.match(/^(header|navigation|hero|main|footer|sidebar)/i)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          type: trimmed.toLowerCase().split(/[\s:]/)[0],
          elements: [],
          content: trimmed,
        };
      } else if (currentSection && trimmed.match(/^[-*]/)) {
        // List items
        currentSection.elements.push(trimmed.replace(/^[-*]\s*/, ''));
      }
    });

    if (currentSection) {
      sections.push(currentSection);
    }

    return {
      sections: sections,
      confidence: 0.6,
      source: 'text-parsing',
    };
  }

  calculateBounds(vertices) {
    const xs = vertices.map(v => v.x || 0);
    const ys = vertices.map(v => v.y || 0);

    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  calculateNormalizedBounds(vertices, imageWidth = 1200, imageHeight = 800) {
    const xs = vertices.map(v => v.x * imageWidth);
    const ys = vertices.map(v => v.y * imageHeight);

    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  generateCacheKey(imageData, route) {
    // Create a hash of the image data and route for caching
    const dataToHash = imageData.substring(0, 1000) + route.url;
    return btoa(dataToHash).substring(0, 16);
  }

  async analyzeComponents(segments) {
    // Identify reusable component patterns
    const components = [];
    const componentTypes = new Map();

    segments.sections.forEach(section => {
      const componentType = this.inferComponentType(section);

      if (!componentTypes.has(componentType)) {
        componentTypes.set(componentType, []);
      }

      componentTypes.get(componentType).push(section);
    });

    // Generate component specifications
    componentTypes.forEach((instances, type) => {
      const component = {
        type: type,
        instances: instances.length,
        commonElements: this.findCommonElements(instances),
        variations: this.identifyVariations(instances),
        props: this.inferProps(instances),
      };

      components.push(component);
    });

    return components;
  }

  inferComponentType(section) {
    const type = section.type.toLowerCase();

    // Map generic types to more specific component types
    const typeMapping = {
      header: 'Header',
      navigation: 'Navigation',
      nav: 'Navigation',
      hero: 'HeroSection',
      banner: 'Banner',
      card: 'Card',
      button: 'Button',
      form: 'Form',
      footer: 'Footer',
      sidebar: 'Sidebar',
      main: 'MainContent',
      text: 'TextBlock',
    };

    return typeMapping[type] || 'GenericComponent';
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

  identifyVariations(instances) {
    // Identify different variations of the same component type
    const variations = [];

    instances.forEach((instance, index) => {
      variations.push({
        id: index + 1,
        elements: instance.elements || [],
        bounds: instance.bounds,
        content: instance.content,
      });
    });

    return variations;
  }

  inferProps(instances) {
    // Infer React component props based on variations
    const props = new Set();

    instances.forEach(instance => {
      if (instance.content && instance.content.includes('title')) {
        props.add('title');
      }
      if (instance.content && instance.content.includes('image')) {
        props.add('imageUrl');
      }
      if (instance.elements) {
        instance.elements.forEach(element => {
          if (element.includes('button')) props.add('onButtonClick');
          if (element.includes('link')) props.add('href');
          if (element.includes('text')) props.add('text');
        });
      }
    });

    return Array.from(props);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AISegmentation;
} else if (typeof globalThis !== 'undefined') {
  globalThis.AISegmentation = AISegmentation;
}
