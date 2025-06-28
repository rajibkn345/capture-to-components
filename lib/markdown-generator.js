// Markdown documentation generator
class MarkdownGenerator {
  constructor() {
    this.settings = null;
  }

  async init() {
    this.settings = await chrome.storage.sync.get([
      'documentationFormat',
      'includeStorybook',
      'includeTests',
      'componentFramework',
      'stylingFramework',
    ]);
  }

  async generateDraftMarkdown(processedRoutes) {
    await this.init();

    let content = '';

    // Header
    content += '# Route Analysis Draft\n\n';
    content += `*Generated on: ${new Date().toISOString()}*\n\n`;
    content += `**Total Routes Analyzed: ${processedRoutes.length}**\n\n`;

    // Table of Contents
    content += '## Table of Contents\n\n';
    processedRoutes.forEach((route, index) => {
      const routeName = this.getRouteName(route.route);
      content += `${index + 1}. [${routeName}](#${this.generateAnchor(routeName)})\n`;
    });
    content += '\n';

    // Route Analysis
    processedRoutes.forEach((route, index) => {
      content += this.generateRouteSection(route, index + 1);
    });

    // Summary
    content += this.generateSummary(processedRoutes);

    return content;
  }

  generateRouteSection(routeData, index) {
    const routeName = this.getRouteName(routeData.route);
    let section = '';

    section += `## ${index}. ${routeName}\n\n`;

    // Route Overview
    section += '### Overview\n\n';
    section += `- **URL**: \`${routeData.route}\`\n`;
    section += `- **Captured**: ${new Date(routeData.timestamp).toLocaleString()}\n`;
    section += `- **Sections Detected**: ${routeData.sections?.length || 0}\n`;
    section += `- **Components Identified**: ${routeData.components?.length || 0}\n`;

    if (routeData.metadata) {
      section += `- **Page Title**: ${routeData.metadata.title || 'N/A'}\n`;
      section += `- **Meta Description**: ${routeData.metadata.description || 'N/A'}\n`;
    }

    section += '\n';

    // Sections Analysis
    if (routeData.sections && routeData.sections.length > 0) {
      section += '### Sections Detected\n\n';

      routeData.sections.forEach((sectionData, sectionIndex) => {
        section += `#### ${sectionIndex + 1}. ${this.formatSectionName(sectionData.type)}\n\n`;
        section += `- **Type**: ${sectionData.type}\n`;

        if (sectionData.bounds) {
          section += `- **Position**: x: ${sectionData.bounds.x}px, y: ${sectionData.bounds.y}px\n`;
          section += `- **Dimensions**: ${sectionData.bounds.width}px × ${sectionData.bounds.height}px\n`;
        }

        if (sectionData.confidence) {
          section += `- **Confidence**: ${Math.round(sectionData.confidence * 100)}%\n`;
        }

        if (sectionData.elements && sectionData.elements.length > 0) {
          section += '- **Elements**:\n';
          sectionData.elements.forEach(element => {
            section += `  - ${element}\n`;
          });
        }

        if (sectionData.content) {
          section += `- **Content**: ${sectionData.content}\n`;
        }

        section += '\n';
      });
    }

    // Components Analysis
    if (routeData.components && routeData.components.length > 0) {
      section += '### Components Identified\n\n';

      routeData.components.forEach((component, componentIndex) => {
        section += `#### ${componentIndex + 1}. ${component.type || 'Unknown Component'}\n\n`;

        if (component.instances) {
          section += `- **Instances Found**: ${component.instances}\n`;
        }

        if (component.commonElements && component.commonElements.length > 0) {
          section += '- **Common Elements**:\n';
          component.commonElements.forEach(element => {
            section += `  - ${element}\n`;
          });
        }

        if (component.props && component.props.length > 0) {
          section += '- **Suggested Props**:\n';
          component.props.forEach(prop => {
            section += `  - \`${prop}\`\n`;
          });
        }

        section += '\n';
      });
    }

    // Screenshots section
    section += '### Screenshots\n\n';
    section += `*Screenshot captured for route: \`${routeData.route}\`*\n\n`;

    if (routeData.screenshot) {
      section += '> Screenshot data available for AI analysis\n\n';
    } else {
      section += '> No screenshot data available\n\n';
    }

    section += '---\n\n';

    return section;
  }

  async generateSectionsMarkdown(processedRoutes) {
    await this.init();

    let content = '';

    // Header
    content += '# Detailed Sections Analysis\n\n';
    content += `*Generated on: ${new Date().toISOString()}*\n\n`;
    content += `**Total Routes Analyzed: ${processedRoutes.length}**\n\n`;

    // Overview Statistics
    content += '## Analysis Overview\n\n';
    const totalSections = processedRoutes.reduce(
      (total, route) => total + (route.sections?.length || 0),
      0
    );
    const totalElements = processedRoutes.reduce(
      (total, route) => total + (route.domStructure?.totalElements || 0),
      0
    );

    content += `- **Total Sections Found**: ${totalSections}\n`;
    content += `- **Total Elements Analyzed**: ${totalElements}\n`;
    content += `- **Average DOM Depth**: ${Math.round(
      processedRoutes.reduce(
        (total, route) => total + (route.domStructure?.depth || 0),
        0
      ) / processedRoutes.length
    )}\n`;
    content += `- **Routes with Responsive Design**: ${
      processedRoutes.filter(route => route.layout?.isResponsive).length
    }\n\n`;

    // Table of Contents
    content += '## Table of Contents\n\n';
    processedRoutes.forEach((route, index) => {
      const routeName = this.getRouteName(route.route);
      content += `${index + 1}. [${routeName}](#${this.generateAnchor(routeName)})\n`;
    });
    content += '\n';

    // Detailed Route Analysis
    processedRoutes.forEach((route, index) => {
      content += this.generateDetailedSectionAnalysis(route, index + 1);
    });

    // Cross-Route Analysis
    content += this.generateCrossRouteAnalysis(processedRoutes);

    return content;
  }

  generateDetailedSectionAnalysis(routeData, index) {
    const routeName = this.getRouteName(routeData.route);
    let section = '';

    section += `## ${index}. ${routeName}\n\n`;
    section += `**URL**: \`${routeData.route}\`\n\n`;

    // Page Meta Information
    if (routeData.meta) {
      section += '### Page Information\n\n';
      section += `- **Title**: ${routeData.meta.title || 'Not specified'}\n`;
      if (routeData.meta.description) {
        section += `- **Description**: ${routeData.meta.description}\n`;
      }
      if (routeData.meta.keywords) {
        section += `- **Keywords**: ${routeData.meta.keywords}\n`;
      }
      section += `- **Charset**: ${routeData.meta.charset || 'Unknown'}\n`;
      section += `- **Viewport**: ${routeData.meta.viewport || 'Not specified'}\n\n`;
    }

    // DOM Structure Overview
    if (routeData.domStructure) {
      section += '### DOM Structure Overview\n\n';
      section += `- **Total Elements**: ${routeData.domStructure.totalElements}\n`;
      section += `- **DOM Depth**: ${routeData.domStructure.depth} levels\n`;
      section += `- **Page Dimensions**: ${routeData.domStructure.pageWidth} × ${routeData.domStructure.pageHeight} px\n`;
      section += `- **Viewport**: ${routeData.domStructure.viewport?.width || 'Unknown'} × ${routeData.domStructure.viewport?.height || 'Unknown'} px\n`;
      section += `- **Scrollable Content**: ${routeData.domStructure.hasScrollableContent ? 'Yes' : 'No'}\n\n`;
    }

    // Layout Analysis
    if (routeData.layout) {
      section += '### Layout Analysis\n\n';
      section += `- **Structure Type**: ${routeData.layout.structure || 'Unknown'}\n`;
      section += `- **Columns**: ${routeData.layout.columns || 1}\n`;
      section += `- **Has Header**: ${routeData.layout.hasHeader ? 'Yes' : 'No'}\n`;
      section += `- **Has Footer**: ${routeData.layout.hasFooter ? 'Yes' : 'No'}\n`;
      section += `- **Has Sidebar**: ${routeData.layout.hasSidebar ? 'Yes' : 'No'}\n`;
      section += `- **Responsive Design**: ${routeData.layout.isResponsive ? 'Yes' : 'No'}\n`;

      if (routeData.layout.gridAreas && routeData.layout.gridAreas.length > 0) {
        section += '- **Grid Areas**:\n';
        routeData.layout.gridAreas.forEach(grid => {
          section += `  - ${grid.element}: \`${grid.areas}\`\n`;
        });
      }
      section += '\n';
    }

    // Detailed Sections Analysis
    if (routeData.sections && routeData.sections.length > 0) {
      section += '### Page Sections\n\n';

      const sectionsByType = this.groupSectionsByType(routeData.sections);

      Object.entries(sectionsByType).forEach(([type, sections]) => {
        section += `#### ${this.formatSectionType(type)} (${sections.length} found)\n\n`;

        sections.forEach((sectionData, sectionIndex) => {
          section += `##### ${sectionIndex + 1}. ${sectionData.tagName?.toUpperCase() || 'Element'}\n\n`;

          // Basic Information
          section += `- **Selector**: \`${sectionData.selector}\`\n`;
          section += `- **Type**: ${sectionData.type}\n`;
          section += `- **Position**: ${Math.round(sectionData.bounds?.x || 0)}, ${Math.round(sectionData.bounds?.y || 0)}\n`;
          section += `- **Dimensions**: ${Math.round(sectionData.bounds?.width || 0)} × ${Math.round(sectionData.bounds?.height || 0)} px\n`;
          section += `- **DOM Depth**: ${sectionData.depth || 0}\n`;
          section += `- **Empty Section**: ${sectionData.isEmpty ? 'Yes' : 'No'}\n`;
          section += `- **Interactive Elements**: ${sectionData.hasInteractiveElements ? 'Yes' : 'No'}\n`;

          // Content Analysis
          if (sectionData.content) {
            section += '- **Content Analysis**:\n';
            section += `  - Headings: ${sectionData.content.headings || 0}\n`;
            section += `  - Paragraphs: ${sectionData.content.paragraphs || 0}\n`;
            section += `  - Images: ${sectionData.content.images || 0}\n`;
            section += `  - Links: ${sectionData.content.links || 0}\n`;
            section += `  - Forms: ${sectionData.content.forms || 0}\n`;
            section += `  - Buttons: ${sectionData.content.buttons || 0}\n`;
            section += `  - Input Fields: ${sectionData.content.inputs || 0}\n`;
          }

          // Accessibility Information
          if (sectionData.accessibility) {
            section += '- **Accessibility**:\n';
            section += `  - Has ARIA Label: ${sectionData.accessibility.hasAriaLabel ? 'Yes' : 'No'}\n`;
            section += `  - Has Role: ${sectionData.accessibility.hasRole ? 'Yes' : 'No'}\n`;
            section += `  - Has Tab Index: ${sectionData.accessibility.hasTabIndex ? 'Yes' : 'No'}\n`;
            section += `  - Is Heading: ${sectionData.accessibility.isHeading ? 'Yes' : 'No'}\n`;
          }

          // Element Children
          if (sectionData.elements) {
            section += `- **Child Elements**: ${sectionData.elements.direct || 0} direct, ${sectionData.elements.all || 0} total\n`;
          }

          // Styling Information
          if (sectionData.computedStyles) {
            section += '- **Key Styles**:\n';
            if (sectionData.computedStyles.display) {
              section += `  - Display: \`${sectionData.computedStyles.display}\`\n`;
            }
            if (sectionData.computedStyles.position) {
              section += `  - Position: \`${sectionData.computedStyles.position}\`\n`;
            }
            if (
              sectionData.computedStyles.backgroundColor &&
              sectionData.computedStyles.backgroundColor !== 'rgba(0, 0, 0, 0)'
            ) {
              section += `  - Background: \`${sectionData.computedStyles.backgroundColor}\`\n`;
            }
            if (sectionData.computedStyles.gridTemplateColumns) {
              section += `  - Grid Columns: \`${sectionData.computedStyles.gridTemplateColumns}\`\n`;
            }
            if (sectionData.computedStyles.flexDirection) {
              section += `  - Flex Direction: \`${sectionData.computedStyles.flexDirection}\`\n`;
            }
          }

          // Text Content Preview
          if (sectionData.textContent && sectionData.textContent.length > 0) {
            const truncatedText = sectionData.textContent.substring(0, 150);
            const ellipsis = sectionData.textContent.length > 150 ? '...' : '';
            section += `- **Text Content**: "${truncatedText}${ellipsis}"\n`;
          }

          section += '\n';
        });
      });
    }

    // Forms Analysis
    if (routeData.forms && routeData.forms.length > 0) {
      section += '### Forms Analysis\n\n';
      routeData.forms.forEach((form, formIndex) => {
        section += `#### Form ${formIndex + 1}\n\n`;
        section += `- **Action**: \`${form.action || 'Not specified'}\`\n`;
        section += `- **Method**: \`${form.method?.toUpperCase() || 'GET'}\`\n`;
        section += `- **Field Count**: ${form.fieldCount || 0}\n`;
        section += `- **Validation**: ${form.validation ? 'Enabled' : 'Disabled'}\n`;

        if (form.inputs && form.inputs.length > 0) {
          section += '- **Input Fields**:\n';
          form.inputs.forEach(input => {
            section += `  - \`${input.type}\`: ${input.name || input.id || 'unnamed'}${input.required ? ' (required)' : ''}\n`;
          });
        }

        if (form.buttons && form.buttons.length > 0) {
          section += '- **Buttons**:\n';
          form.buttons.forEach(button => {
            section += `  - \`${button.type}\`: "${button.text || button.value || 'No text'}"\n`;
          });
        }

        section += '\n';
      });
    }

    // Media Analysis
    if (routeData.media) {
      section += '### Media Analysis\n\n';

      if (routeData.media.images && routeData.media.images.length > 0) {
        section += `#### Images (${routeData.media.images.length} found)\n\n`;
        routeData.media.images.forEach((img, imgIndex) => {
          section += `- **Image ${imgIndex + 1}**: ${img.width || 'Unknown'} × ${img.height || 'Unknown'} px\n`;
          section += `  - Alt Text: "${img.alt || 'None'}"\n`;
          section += `  - Loading: ${img.loading || 'eager'}\n`;
          section += `  - Lazy Loading: ${img.isLazy ? 'Yes' : 'No'}\n\n`;
        });
      }

      if (routeData.media.videos && routeData.media.videos.length > 0) {
        section += `#### Videos (${routeData.media.videos.length} found)\n\n`;
        routeData.media.videos.forEach((video, videoIndex) => {
          section += `- **Video ${videoIndex + 1}**:\n`;
          section += `  - Controls: ${video.controls ? 'Yes' : 'No'}\n`;
          section += `  - Autoplay: ${video.autoplay ? 'Yes' : 'No'}\n`;
          section += `  - Loop: ${video.loop ? 'Yes' : 'No'}\n`;
          section += `  - Muted: ${video.muted ? 'Yes' : 'No'}\n\n`;
        });
      }
    }

    // Navigation Analysis
    if (routeData.navigation) {
      section += '### Navigation Analysis\n\n';

      if (
        routeData.navigation.primary &&
        routeData.navigation.primary.length > 0
      ) {
        section += '#### Primary Navigation\n\n';
        routeData.navigation.primary.forEach((nav, navIndex) => {
          section += `- **Navigation ${navIndex + 1}** (${nav.location}): ${nav.linkCount} links\n`;
          if (nav.links && nav.links.length > 0) {
            nav.links.forEach(link => {
              section += `  - "${link.text}"\n`;
            });
          }
          section += '\n';
        });
      }

      if (
        routeData.navigation.breadcrumbs &&
        routeData.navigation.breadcrumbs.length > 0
      ) {
        section += '#### Breadcrumbs\n\n';
        routeData.navigation.breadcrumbs.forEach((breadcrumb, bcIndex) => {
          section += `- **Breadcrumb ${bcIndex + 1}**: `;
          section += breadcrumb.steps.map(step => step.text).join(' > ');
          section += '\n';
        });
        section += '\n';
      }
    }

    // Interactive Elements
    if (routeData.interactive) {
      section += '### Interactive Elements\n\n';

      if (
        routeData.interactive.buttons &&
        routeData.interactive.buttons.length > 0
      ) {
        section += `- **Buttons**: ${routeData.interactive.buttons.length} found\n`;
        const buttonTypes = routeData.interactive.buttons.reduce((acc, btn) => {
          acc[btn.type] = (acc[btn.type] || 0) + 1;
          return acc;
        }, {});
        Object.entries(buttonTypes).forEach(([type, count]) => {
          section += `  - ${type}: ${count}\n`;
        });
      }

      if (
        routeData.interactive.links &&
        routeData.interactive.links.length > 0
      ) {
        const externalLinks = routeData.interactive.links.filter(
          link => link.isExternal
        ).length;
        const internalLinks =
          routeData.interactive.links.length - externalLinks;
        section += `- **Links**: ${routeData.interactive.links.length} total (${internalLinks} internal, ${externalLinks} external)\n`;
      }

      section += '\n';
    }

    // Performance Information
    if (routeData.performance) {
      section += '### Performance Information\n\n';
      section += `- **Scripts Loaded**: ${routeData.performance.scriptsLoaded || 0}\n`;
      section += `- **Stylesheets Loaded**: ${routeData.performance.stylesheetsLoaded || 0}\n`;
      section += `- **Analysis Time**: ${new Date(routeData.performance.analysisTime).toLocaleString()}\n\n`;
    }

    section += '---\n\n';
    return section;
  }

  generateCrossRouteAnalysis(processedRoutes) {
    let content = '';

    content += '## Cross-Route Analysis\n\n';
    content +=
      'This section analyzes common patterns and differences across all routes.\n\n';

    // Analyze common sections
    const sectionTypes = new Map();
    processedRoutes.forEach(route => {
      if (route.sections) {
        route.sections.forEach(section => {
          const type = section.type;
          if (!sectionTypes.has(type)) {
            sectionTypes.set(type, []);
          }
          sectionTypes.get(type).push(section);
        });
      }
    });

    content += '### Common Section Types\n\n';
    Array.from(sectionTypes.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([type, sections]) => {
        content += `- **${this.formatSectionType(type)}**: Found in ${sections.length} instances across routes\n`;
      });

    return content;
  }

  groupSectionsByType(sections) {
    return sections.reduce((acc, section) => {
      const type = section.type || 'unknown';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(section);
      return acc;
    }, {});
  }

  formatSectionType(type) {
    return type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  generateRouteWithSections(routeData) {
    let content = '';
    const routeName = this.getRouteName(routeData.route);

    content += `## ${routeName}\n\n`;
    content += `**URL**: \`${routeData.route}\`\n\n`;

    if (routeData.sections && routeData.sections.length > 0) {
      content += `**Total Sections**: ${routeData.sections.length}\n\n`;

      const sectionsByType = this.groupSectionsByType(routeData.sections);

      Object.entries(sectionsByType).forEach(([type, sections]) => {
        content += `### ${this.formatSectionType(type)} (${sections.length})\n\n`;
        sections.forEach((section, index) => {
          content += `${index + 1}. **${section.tagName?.toUpperCase() || 'Element'}**\n`;
          content += `   - Selector: \`${section.selector}\`\n`;
          content += `   - Dimensions: ${Math.round(section.bounds?.width || 0)} × ${Math.round(section.bounds?.height || 0)} px\n`;
          if (section.textContent) {
            content += `   - Content: "${section.textContent.substring(0, 100)}${section.textContent.length > 100 ? '...' : ''}"\n`;
          }
          content += '\n';
        });
      });
    }

    content += '---\n\n';
    return content;
  }

  extractComponentsFromSection(sectionData) {
    const components = [];

    // Extract button components
    if (sectionData.content?.buttons > 0) {
      components.push({
        type: 'Button',
        name: 'Button',
        count: sectionData.content.buttons,
        context: sectionData.type,
      });
    }

    // Extract form components
    if (sectionData.content?.forms > 0) {
      components.push({
        type: 'Form',
        name: 'Form',
        count: sectionData.content.forms,
        context: sectionData.type,
      });
    }

    // Extract image components
    if (sectionData.content?.images > 0) {
      components.push({
        type: 'Image',
        name: 'Image',
        count: sectionData.content.images,
        context: sectionData.type,
      });
    }

    // Extract navigation components
    if (sectionData.type === 'navigation') {
      components.push({
        type: 'Navigation',
        name: 'Navigation',
        count: 1,
        context: sectionData.type,
        linkCount: sectionData.content?.links || 0,
      });
    }

    // Ensure every component has a name
    components.forEach(component => {
      if (!component.name) {
        component.name = component.type || 'UnknownComponent';
        console.warn('Component missing name, using fallback:', component);
      }
    });
    console.log('Extracted components from section:', sectionData, components);
    return components;
  }

  generateSectionTypeAnalysis(type, instances) {
    let content = '';

    content += `### ${this.formatSectionType(type)} Analysis\n\n`;
    content += `**Total Instances**: ${instances.length}\n\n`;

    // Calculate averages
    const avgWidth =
      instances.reduce((sum, inst) => sum + (inst.bounds?.width || 0), 0) /
      instances.length;
    const avgHeight =
      instances.reduce((sum, inst) => sum + (inst.bounds?.height || 0), 0) /
      instances.length;

    content += `**Average Dimensions**: ${Math.round(avgWidth)} × ${Math.round(avgHeight)} px\n\n`;

    // Common attributes
    const commonClasses = new Map();
    instances.forEach(instance => {
      if (instance.attributes?.class) {
        instance.attributes.class.split(' ').forEach(cls => {
          commonClasses.set(cls, (commonClasses.get(cls) || 0) + 1);
        });
      }
    });

    if (commonClasses.size > 0) {
      content += '**Common CSS Classes**:\n';
      Array.from(commonClasses.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([cls, count]) => {
          content += `- \`${cls}\`: used ${count} times\n`;
        });
      content += '\n';
    }

    return content;
  }

  async generateComponentsMarkdown(processedRoutes, _generatedComponents = []) {
    await this.init();

    let content = '';

    // Header
    content += '# Components\n\n';
    content += `*Generated on: ${new Date().toISOString()}*\n\n`;

    // Extract all unique components from all routes
    const uniqueComponents = this.extractUniqueComponents(processedRoutes);

    // List all unique components first
    uniqueComponents.forEach((component, index) => {
      content += `## ${index + 1}. ${component.name}\n`;
      if (component.elements && component.elements.length > 0) {
        component.elements.forEach(element => {
          content += `- ${element}\n`;
        });
      }
      content += '\n';
    });

    content += '---\n\n';

    // Then show route-wise breakdown
    processedRoutes.forEach(route => {
      const routeName = this.getRouteName(route.route);
      content += `## ${routeName}\n`;

      if (route.sections && route.sections.length > 0) {
        route.sections.forEach(sectionData => {
          const sectionName = this.formatSectionName(sectionData.type);
          content += `- **${sectionName}**:\n`;

          const components = this.extractComponentsFromSection(sectionData);
          components.forEach(component => {
            content += `  - ${component.name.toLowerCase()}:\n`;
            if (component.elements && component.elements.length > 0) {
              component.elements.forEach(element => {
                content += `    - ${element}\n`;
              });
            }
          });
        });
      }
      content += '\n';
    });

    return content;
  }

  extractUniqueComponents(processedRoutes) {
    const componentsMap = new Map();

    processedRoutes.forEach(route => {
      if (route.sections) {
        route.sections.forEach(sectionData => {
          const components = this.extractComponentsFromSection(sectionData);
          components.forEach(component => {
            if (!component.name || typeof component.name !== 'string') {
              console.warn('Skipping component with invalid name:', component);
              return;
            }
            const key = component.name.toLowerCase();
            if (!componentsMap.has(key)) {
              componentsMap.set(key, {
                name: component.name,
                elements: component.elements || [],
                usageCount: 1,
              });
            } else {
              const existing = componentsMap.get(key);
              existing.usageCount++;
              // Merge unique elements
              const allElements = new Set([
                ...existing.elements,
                ...component.elements,
              ]);
              existing.elements = Array.from(allElements);
            }
          });
        });
      }
    });

    // Sort by usage count (most used first)
    return Array.from(componentsMap.values()).sort(
      (a, b) => b.usageCount - a.usageCount
    );
  }

  generateComponentDocumentation(component, index, generatedComponents) {
    let section = '';

    section += `## ${index}. ${component.type}\n\n`;

    // Basic info
    section += `**Type**: ${component.type}\n`;
    section += `**Instances Found**: ${component.instances || 1}\n`;

    const generatedComponent = generatedComponents.find(
      gc => gc.name === component.type
    );
    if (generatedComponent) {
      section += `**Status**: ✅ Generated\n`;
      section += `**Framework**: ${generatedComponent.framework}\n`;
      section += `**Language**: ${generatedComponent.language}\n`;
    } else {
      section += `**Status**: ⏳ Pending Generation\n`;
    }

    section += '\n';

    // Props
    if (component.props && component.props.length > 0) {
      section += '### Props\n\n';
      section += '| Prop | Type | Required | Description |\n';
      section += '|------|------|----------|-------------|\n';

      component.props.forEach(prop => {
        const propInfo = this.getDetailedPropInfo(prop);
        section += `| \`${prop}\` | \`${propInfo.type}\` | ${propInfo.required} | ${propInfo.description} |\n`;
      });

      section += '\n';
    }

    // Common Elements
    if (component.commonElements && component.commonElements.length > 0) {
      section += '### Common Elements\n\n';
      component.commonElements.forEach(element => {
        section += `- ${element}\n`;
      });
      section += '\n';
    }

    // Variations
    if (component.variations && component.variations.length > 0) {
      section += '### Variations\n\n';
      component.variations.forEach((variation, varIndex) => {
        section += `#### Variation ${varIndex + 1}\n\n`;
        if (variation.elements && variation.elements.length > 0) {
          section += '**Elements**:\n';
          variation.elements.forEach(element => {
            section += `- ${element}\n`;
          });
        }
        if (variation.content) {
          section += `**Content**: ${variation.content}\n`;
        }
        section += '\n';
      });
    }

    // Usage Example
    section += '### Usage Example\n\n';
    if (generatedComponent) {
      section += '```jsx\n';
      section += this.generateUsageExample(component);
      section += '```\n\n';
    } else {
      section +=
        '*Usage example will be available after component generation.*\n\n';
    }

    section += '---\n\n';

    return section;
  }

  generateUsageExample(component) {
    const componentName = this.generateComponentName(component.type);
    let example = `import { ${componentName} } from './components/${componentName}';\n\n`;
    example += `function Example() {\n`;
    example += `  return (\n`;
    example += `    <${componentName}\n`;

    if (component.props) {
      component.props.forEach(prop => {
        const exampleValue = this.getExampleValue(prop);
        example += `      ${prop}=${exampleValue}\n`;
      });
    }

    example += `    />\n`;
    example += `  );\n`;
    example += `}\n`;

    return example;
  }

  generateUsageExamples(allComponents) {
    let section = '';

    section += '## Usage Examples\n\n';
    section +=
      'Here are complete examples of how to use the generated components:\n\n';

    // App component example
    section += '### Complete App Example\n\n';
    section += '```jsx\n';
    section += `import React from 'react';\n`;

    allComponents.forEach(component => {
      const componentName = this.generateComponentName(component.type);
      section += `import { ${componentName} } from './components/${componentName}';\n`;
    });

    section += '\n';
    section += 'function App() {\n';
    section += '  return (\n';
    section += '    <div className="app">\n';

    allComponents.forEach(component => {
      const componentName = this.generateComponentName(component.type);
      section += `      <${componentName} />\n`;
    });

    section += '    </div>\n';
    section += '  );\n';
    section += '}\n\n';
    section += 'export default App;\n';
    section += '```\n\n';

    return section;
  }

  generateRouteComponentMapping(processedRoutes) {
    let section = '';

    section += '## Route-Component Mapping\n\n';
    section +=
      'This section shows which components are used in each route:\n\n';

    processedRoutes.forEach(route => {
      const routeName = this.getRouteName(route.route);
      section += `### ${routeName}\n\n`;
      section += `**URL**: \`${route.route}\`\n\n`;

      if (route.sections && route.sections.length > 0) {
        section += '**Sections**:\n';
        route.sections.forEach(sectionData => {
          const componentName = this.generateComponentName(sectionData.type);
          section += `- ${componentName}\n`;
        });
      }

      if (route.components && route.components.length > 0) {
        section += '\n**Components**:\n';
        route.components.forEach(component => {
          section += `- ${component.type}\n`;
        });
      }

      section += '\n';
    });

    return section;
  }

  generateSummary(processedRoutes) {
    let summary = '';

    summary += '## Analysis Summary\n\n';

    // Route statistics
    const totalRoutes = processedRoutes.length;
    const totalSections = processedRoutes.reduce(
      (sum, route) => sum + (route.sections?.length || 0),
      0
    );
    const totalComponents = processedRoutes.reduce(
      (sum, route) => sum + (route.components?.length || 0),
      0
    );

    summary += '### Statistics\n\n';
    summary += `- **Total Routes Analyzed**: ${totalRoutes}\n`;
    summary += `- **Total Sections Found**: ${totalSections}\n`;
    summary += `- **Total Components Identified**: ${totalComponents}\n`;
    summary += `- **Average Sections per Route**: ${(totalSections / totalRoutes).toFixed(1)}\n`;
    summary += `- **Average Components per Route**: ${(totalComponents / totalRoutes).toFixed(1)}\n\n`;

    // Most common section types
    const sectionTypeCounts = new Map();
    processedRoutes.forEach(route => {
      if (route.sections) {
        route.sections.forEach(section => {
          const count = sectionTypeCounts.get(section.type) || 0;
          sectionTypeCounts.set(section.type, count + 1);
        });
      }
    });

    summary += '### Most Common Section Types\n\n';
    const sortedSectionTypes = Array.from(sectionTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    sortedSectionTypes.forEach(([type, count]) => {
      summary += `- **${this.formatSectionName(type)}**: ${count} instances\n`;
    });

    summary += '\n';

    // Recommendations
    summary += '### Recommendations\n\n';
    summary +=
      '1. **Priority Components**: Focus on generating the most common section types first\n';
    summary +=
      '2. **Reusability**: Components with multiple instances offer the highest reusability value\n';
    summary +=
      '3. **Consistency**: Standardize similar components across routes for better maintainability\n';
    summary +=
      '4. **Testing**: Implement comprehensive tests for components with high usage frequency\n\n';

    return summary;
  }

  // Enhanced page.md and components.md generation methods

  // Enhanced page.md generation with comprehensive page analysis
  async generatePageMarkdown(processedRoutes) {
    await this.init();

    let content = '';

    // Header
    content += '# Page Analysis Documentation\n\n';
    content += `*Generated on: ${new Date().toISOString()}*\n\n`;
    content += `**Total Pages Analyzed: ${processedRoutes.length}**\n\n`;

    // Executive Summary
    content += '## Executive Summary\n\n';
    const totalSections = processedRoutes.reduce(
      (total, route) => total + (route.sections?.length || 0),
      0
    );
    const totalComponents = this.extractAllComponents(processedRoutes).length;
    
    content += `This document provides a comprehensive analysis of ${processedRoutes.length} pages, identifying ${totalSections} distinct sections and ${totalComponents} unique reusable components. Each page has been systematically analyzed for its structure, content patterns, and component architecture.\n\n`;

    // Quick Reference Table
    content += '## Page Overview\n\n';
    content += '| Page | URL | Sections | Components | Layout Type |\n';
    content += '|------|-----|----------|------------|-------------|\n';
    
    processedRoutes.forEach(route => {
      const routeName = this.getRouteName(route.route);
      const sectionCount = route.sections?.length || 0;
      const componentCount = route.components?.length || 0;
      const layoutType = route.layout?.structure || 'Unknown';
      content += `| ${routeName} | \`${route.route}\` | ${sectionCount} | ${componentCount} | ${layoutType} |\n`;
    });
    content += '\n';

    // Table of Contents
    content += '## Table of Contents\n\n';
    processedRoutes.forEach((route, index) => {
      const routeName = this.getRouteName(route.route);
      content += `${index + 1}. [${routeName}](#${this.generateAnchor(routeName)})\n`;
    });
    content += '\n';

    // Detailed Page Analysis
    processedRoutes.forEach((route, index) => {
      content += this.generateDetailedPageAnalysis(route, index + 1);
    });

    // Component Usage Summary
    content += this.generateComponentUsageSummary(processedRoutes);

    // Architecture Recommendations
    content += this.generateArchitectureRecommendations(processedRoutes);

    return content;
  }

  generateDetailedPageAnalysis(routeData, index) {
    const routeName = this.getRouteName(routeData.route);
    let section = '';

    section += `## ${index}. ${routeName}\n\n`;
    section += `**URL**: \`${routeData.route}\`\n\n`;

    // Page Overview
    section += '### 📋 Page Overview\n\n';
    if (routeData.meta) {
      section += `- **Title**: ${routeData.meta.title || 'Not specified'}\n`;
      if (routeData.meta.description) {
        section += `- **Description**: ${routeData.meta.description}\n`;
      }
    }
    section += `- **Total Sections**: ${routeData.sections?.length || 0}\n`;
    section += `- **Total Components**: ${routeData.components?.length || 0}\n`;
    section += `- **Layout Type**: ${routeData.layout?.structure || 'Unknown'}\n`;
    section += `- **Responsive Design**: ${routeData.layout?.isResponsive ? '✅ Yes' : '❌ No'}\n\n`;

    // Section Breakdown
    if (routeData.sections && routeData.sections.length > 0) {
      section += '### 🧩 Section Breakdown\n\n';
      
      const sectionsByType = this.groupSectionsByType(routeData.sections);
      Object.entries(sectionsByType).forEach(([type, sections]) => {
        section += `#### ${this.formatSectionType(type)} (${sections.length} instances)\n\n`;
        
        sections.forEach((sectionData, sectionIndex) => {
          section += `##### ${sectionIndex + 1}. ${sectionData.tagName?.toUpperCase() || 'Element'}\n\n`;
          section += `- **Location**: (${Math.round(sectionData.bounds?.x || 0)}, ${Math.round(sectionData.bounds?.y || 0)})\n`;
          section += `- **Size**: ${Math.round(sectionData.bounds?.width || 0)} × ${Math.round(sectionData.bounds?.height || 0)} px\n`;
          
          // Enhanced logical grouping analysis
          if (sectionData.logicalGrouping) {
            section += `- **Semantic Group**: ${sectionData.logicalGrouping.semanticGroup || 'unknown'}\n`;
            section += `- **Functional Group**: ${sectionData.logicalGrouping.functionalGroup || 'unknown'}\n`;
          }
          
          // Nested structure analysis
          if (sectionData.nestedStructure) {
            section += `- **Nesting Level**: ${sectionData.nestedStructure.nestingLevel || 0}\n`;
            if (sectionData.nestedStructure.nestedSections?.length > 0) {
              section += `- **Contains**: ${sectionData.nestedStructure.nestedSections.length} nested sections\n`;
            }
          }
          
          // Layout pattern analysis
          if (sectionData.layoutPattern) {
            section += `- **Layout Method**: ${sectionData.layoutPattern.layoutMethod || 'unknown'}\n`;
            section += `- **Display Type**: ${sectionData.layoutPattern.displayType || 'unknown'}\n`;
          }
          
          // Component instances within section
          if (sectionData.componentInstances?.reusableComponents?.length > 0) {
            section += `- **Reusable Components**: ${sectionData.componentInstances.reusableComponents.length} found\n`;
          }
          
          // Reusability score
          if (sectionData.reusabilityFactors?.reusabilityScore) {
            section += `- **Reusability Score**: ${sectionData.reusabilityFactors.reusabilityScore}/100\n`;
          }
          
          section += '\n';
        });
      });
    }

    // Component Map for this page
    section += '### 🎯 Component Map\n\n';
    if (routeData.components && routeData.components.length > 0) {
      section += 'Components identified on this page:\n\n';
      routeData.components.forEach((component, componentIndex) => {
        section += `${componentIndex + 1}. **${component.type}**\n`;
        section += `   - Instances: ${component.instances || 1}\n`;
        
        if (component.reusabilityAnalysis?.reusabilityScore) {
          section += `   - Reusability Score: ${component.reusabilityAnalysis.reusabilityScore}/100\n`;
        }
        
        if (component.refactoringOpportunities?.priority) {
          section += `   - Refactoring Priority: ${component.refactoringOpportunities.priority}\n`;
        }
        
        if (component.layoutPatterns?.dominantPattern) {
          section += `   - Layout Pattern: ${component.layoutPatterns.dominantPattern}\n`;
        }
        
        section += '\n';
      });
    } else {
      section += '*No reusable components identified on this page.*\n\n';
    }

    // Usage Summary
    section += '### 📊 Usage Summary\n\n';
    section += this.generatePageUsageSummary(routeData);

    section += '---\n\n';
    return section;
  }

  generatePageUsageSummary(routeData) {
    let summary = '';
    
    // Interactive elements summary
    if (routeData.interactive) {
      const totalButtons = routeData.interactive.buttons?.length || 0;
      const totalLinks = routeData.interactive.links?.length || 0;
      
      summary += `- **Interactive Elements**: ${totalButtons + totalLinks} total\n`;
      if (totalButtons > 0) {
        summary += `  - Buttons: ${totalButtons}\n`;
      }
      if (totalLinks > 0) {
        const externalLinks = routeData.interactive.links?.filter(link => link.isExternal).length || 0;
        summary += `  - Links: ${totalLinks} (${totalLinks - externalLinks} internal, ${externalLinks} external)\n`;
      }
    }
    
    // Media summary
    if (routeData.media) {
      const totalImages = routeData.media.images?.length || 0;
      const totalVideos = routeData.media.videos?.length || 0;
      
      if (totalImages > 0 || totalVideos > 0) {
        summary += `- **Media Elements**: ${totalImages + totalVideos} total\n`;
        if (totalImages > 0) {
          summary += `  - Images: ${totalImages}\n`;
        }
        if (totalVideos > 0) {
          summary += `  - Videos: ${totalVideos}\n`;
        }
      }
    }
    
    // Form summary
    if (routeData.forms && routeData.forms.length > 0) {
      const totalInputs = routeData.forms.reduce((sum, form) => sum + (form.fieldCount || 0), 0);
      summary += `- **Forms**: ${routeData.forms.length} forms with ${totalInputs} total inputs\n`;
    }
    
    summary += '\n';
    return summary;
  }

  generateComponentUsageSummary(processedRoutes) {
    let section = '';
    
    section += '## 🔄 Component Usage Across Pages\n\n';
    section += 'This section shows how components are distributed across all analyzed pages.\n\n';
    
    const componentUsage = new Map();
    
    processedRoutes.forEach(route => {
      const routeName = this.getRouteName(route.route);
      if (route.components) {
        route.components.forEach(component => {
          const key = component.type;
          if (!componentUsage.has(key)) {
            componentUsage.set(key, {
              totalInstances: 0,
              pages: [],
              reusabilityScore: component.reusabilityAnalysis?.reusabilityScore || 0,
            });
          }
          
          const usage = componentUsage.get(key);
          usage.totalInstances += component.instances || 1;
          usage.pages.push({
            page: routeName,
            instances: component.instances || 1,
          });
        });
      }
    });
    
    // Sort by total instances (most used first)
    const sortedComponents = Array.from(componentUsage.entries())
      .sort((a, b) => b[1].totalInstances - a[1].totalInstances);
    
    section += '### Most Reused Components\n\n';
    section += '| Component | Total Instances | Pages Used | Reusability Score |\n';
    section += '|-----------|-----------------|------------|-------------------|\n';
    
    sortedComponents.forEach(([componentType, usage]) => {
      const pageList = usage.pages.map(p => `${p.page} (${p.instances})`).join(', ');
      section += `| ${componentType} | ${usage.totalInstances} | ${pageList} | ${usage.reusabilityScore}/100 |\n`;
    });
    
    section += '\n';
    return section;
  }

  generateArchitectureRecommendations(processedRoutes) {
    let section = '';
    
    section += '## 🏗️ Architecture Recommendations\n\n';
    section += 'Based on the analysis, here are recommendations for component architecture:\n\n';
    
    // Analyze common patterns
    const componentFrequency = new Map();
    const layoutPatterns = new Map();
    
    processedRoutes.forEach(route => {
      if (route.components) {
        route.components.forEach(component => {
          componentFrequency.set(component.type, (componentFrequency.get(component.type) || 0) + 1);
          
          if (component.layoutPatterns?.dominantPattern) {
            const pattern = component.layoutPatterns.dominantPattern;
            layoutPatterns.set(pattern, (layoutPatterns.get(pattern) || 0) + 1);
          }
        });
      }
    });
    
    section += '### Priority Component Development\n\n';
    section += 'Develop these components first based on usage frequency:\n\n';
    
    const sortedByFrequency = Array.from(componentFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    sortedByFrequency.forEach(([componentType, frequency], index) => {
      section += `${index + 1}. **${componentType}** - Used in ${frequency} pages\n`;
    });
    
    section += '\n### Layout Pattern Recommendations\n\n';
    
    const sortedPatterns = Array.from(layoutPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    sortedPatterns.forEach(([pattern, frequency]) => {
      section += `- **${pattern}**: Standardize this pattern (used ${frequency} times)\n`;
    });
    
    section += '\n### Design System Opportunities\n\n';
    section += '- **Color Tokens**: Extract consistent color schemes from common components\n';
    section += '- **Spacing System**: Standardize margins and padding based on layout patterns\n';
    section += '- **Typography Scale**: Create consistent text styling across components\n';
    section += '- **Responsive Breakpoints**: Implement consistent responsive behavior\n\n';
    
    return section;
  }

  // Enhanced components.md generation with comprehensive component analysis
  async generateEnhancedComponentsMarkdown(processedRoutes) {
    await this.init();

    let content = '';

    // Header
    content += '# Component Library Documentation\n\n';
    content += `*Generated on: ${new Date().toISOString()}*\n\n`;

    // Extract and analyze all unique components
    const uniqueComponents = this.extractUniqueComponents(processedRoutes);
    const componentAnalysis = this.performDetailedComponentAnalysis(processedRoutes);

    content += `**Total Unique Components: ${uniqueComponents.length}**\n\n`;

    // Executive Summary
    content += '## Executive Summary\n\n';
    content += `This component library contains ${uniqueComponents.length} unique, reusable UI components identified across ${processedRoutes.length} pages. Each component has been analyzed for reusability, consistency, and refactoring opportunities to maximize development efficiency and maintainability.\n\n`;

    // Component Overview Table
    content += '## Component Overview\n\n';
    content += '| # | Component | Usage Count | Reusability Score | Priority | Design Notes |\n';
    content += '|---|-----------|-------------|-------------------|----------|-------------|\n';
    
    uniqueComponents.forEach((component, index) => {
      const analysis = componentAnalysis.get(component.name) || {};
      const usageCount = component.usageCount || 1;
      const reusabilityScore = analysis.reusabilityScore || 0;
      const priority = analysis.priority || 'Medium';
      const designNotes = this.generateDesignNotes(component, analysis);
      
      content += `| ${index + 1} | [${component.name}](#${this.generateAnchor(component.name)}) | ${usageCount} | ${reusabilityScore}/100 | ${priority} | ${designNotes} |\n`;
    });
    content += '\n';

    // Detailed Component Specifications
    content += '## Detailed Component Specifications\n\n';
    
    uniqueComponents.forEach((component, index) => {
      content += this.generateDetailedComponentSpec(component, index + 1, componentAnalysis);
    });

    // Refactoring Opportunities
    content += this.generateRefactoringOpportunities(componentAnalysis);

    // Design Patterns
    content += this.generateDesignPatterns(componentAnalysis);

    // Implementation Guide
    content += this.generateImplementationGuide(uniqueComponents, componentAnalysis);

    return content;
  }

  performDetailedComponentAnalysis(processedRoutes) {
    const componentAnalysis = new Map();
    
    processedRoutes.forEach(route => {
      if (route.components) {
        route.components.forEach(component => {
          const key = component.type;
          
          if (!componentAnalysis.has(key)) {
            componentAnalysis.set(key, {
              reusabilityScore: 0,
              consistency: 0,
              complexity: 0,
              priority: 'Medium',
              variations: [],
              layoutPatterns: [],
              designTokens: new Set(),
              refactoringOpportunities: [],
              props: new Set(),
              instances: [],
            });
          }
          
          const analysis = componentAnalysis.get(key);
          
          // Aggregate reusability data
          if (component.reusabilityAnalysis) {
            analysis.reusabilityScore = Math.max(analysis.reusabilityScore, component.reusabilityAnalysis.reusabilityScore || 0);
            analysis.consistency = Math.max(analysis.consistency, component.reusabilityAnalysis.consistency || 0);
          }
          
          // Collect variations
          if (component.variations) {
            analysis.variations.push(...component.variations);
          }
          
          // Collect layout patterns
          if (component.layoutPatterns) {
            analysis.layoutPatterns.push(component.layoutPatterns);
          }
          
          // Collect design tokens
          if (component.designTokens) {
            if (component.designTokens.colors) {
              component.designTokens.colors.forEach(color => analysis.designTokens.add(`color:${color}`));
            }
            if (component.designTokens.spacing) {
              component.designTokens.spacing.forEach(space => analysis.designTokens.add(`spacing:${space}`));
            }
            if (component.designTokens.typography) {
              component.designTokens.typography.forEach(typo => analysis.designTokens.add(`typography:${typo.fontSize}`));
            }
          }
          
          // Collect refactoring opportunities
          if (component.refactoringOpportunities) {
            analysis.refactoringOpportunities.push(component.refactoringOpportunities);
          }
          
          // Collect props
          if (component.props) {
            component.props.forEach(prop => analysis.props.add(prop));
          }
          
          // Store instance data
          analysis.instances.push({
            route: route.route,
            count: component.instances || 1,
          });
        });
      }
    });
    
    // Calculate priority based on usage and reusability
    componentAnalysis.forEach((analysis, componentType) => {
      const totalUsage = analysis.instances.reduce((sum, inst) => sum + inst.count, 0);
      const pageCount = analysis.instances.length;
      
      if (totalUsage >= 5 && analysis.reusabilityScore >= 70) {
        analysis.priority = 'High';
      } else if (totalUsage >= 3 && analysis.reusabilityScore >= 50) {
        analysis.priority = 'Medium';
      } else {
        analysis.priority = 'Low';
      }
      
      // Convert sets to arrays
      analysis.designTokens = Array.from(analysis.designTokens);
      analysis.props = Array.from(analysis.props);
    });
    
    return componentAnalysis;
  }

  generateDetailedComponentSpec(component, index, componentAnalysis) {
    let section = '';
    const analysis = componentAnalysis.get(component.name) || {};
    
    section += `### ${index}. ${component.name}\n\n`;
    
    // Component overview
    section += '#### 📋 Overview\n\n';
    section += `- **Usage Count**: ${component.usageCount} instances across pages\n`;
    section += `- **Reusability Score**: ${analysis.reusabilityScore}/100\n`;
    section += `- **Consistency Score**: ${analysis.consistency}/100\n`;
    section += `- **Development Priority**: ${analysis.priority}\n`;
    section += `- **Complexity**: ${this.getComplexityLevel(analysis)}\n\n`;
    
    // Component elements
    if (component.elements && component.elements.length > 0) {
      section += '#### 🧩 Component Elements\n\n';
      component.elements.forEach(element => {
        section += `- ${element}\n`;
      });
      section += '\n';
    }
    
    // Props (if available)
    if (analysis.props.length > 0) {
      section += '#### ⚙️ Suggested Props\n\n';
      section += '| Prop | Type | Description | Example |\n';
      section += '|------|------|-------------|----------|\n';
      
      analysis.props.forEach(prop => {
        const propInfo = this.getDetailedPropInfo(prop);
        section += `| \`${prop}\` | \`${propInfo.type}\` | ${propInfo.description} | \`${propInfo.example}\` |\n`;
      });
      section += '\n';
    }
    
    // Usage examples
    section += '#### 💡 Usage Examples\n\n';
    section += this.generateComponentUsageExample(component, analysis);
    
    // Design specifications
    if (analysis.designTokens.length > 0) {
      section += '#### 🎨 Design Specifications\n\n';
      
      const colors = analysis.designTokens.filter(token => token.startsWith('color:'));
      const spacing = analysis.designTokens.filter(token => token.startsWith('spacing:'));
      const typography = analysis.designTokens.filter(token => token.startsWith('typography:'));
      
      if (colors.length > 0) {
        section += '**Colors:**\n';
        colors.forEach(color => {
          section += `- ${color.replace('color:', '')}\n`;
        });
        section += '\n';
      }
      
      if (spacing.length > 0) {
        section += '**Spacing:**\n';
        spacing.forEach(space => {
          section += `- ${space.replace('spacing:', '')}\n`;
        });
        section += '\n';
      }
      
      if (typography.length > 0) {
        section += '**Typography:**\n';
        typography.forEach(typo => {
          section += `- ${typo.replace('typography:', '')}\n`;
        });
        section += '\n';
      }
    }
    
    // Variations
    if (analysis.variations.length > 0) {
      section += '#### 🔄 Variations\n\n';
      const uniqueVariations = this.deduplicateVariations(analysis.variations);
      uniqueVariations.forEach((variation, varIndex) => {
        section += `**Variation ${varIndex + 1}:**\n`;
        if (typeof variation === 'object') {
          Object.entries(variation).forEach(([key, value]) => {
            section += `- ${key}: ${value}\n`;
          });
        } else {
          section += `- ${variation}\n`;
        }
        section += '\n';
      });
    }
    
    // Refactoring opportunities
    if (analysis.refactoringOpportunities.length > 0) {
      section += '#### 🔧 Refactoring Opportunities\n\n';
      const opportunities = this.aggregateRefactoringOpportunities(analysis.refactoringOpportunities);
      opportunities.forEach(opportunity => {
        section += `- **${opportunity.type}**: ${opportunity.description}\n`;
      });
      section += '\n';
    }
    
    // Related components
    section += '#### 🔗 Related Components\n\n';
    const relatedComponents = this.findRelatedComponents(component, componentAnalysis);
    if (relatedComponents.length > 0) {
      relatedComponents.forEach(related => {
        section += `- [${related.name}](#${this.generateAnchor(related.name)}) - ${related.relationship}\n`;
      });
    } else {
      section += '*No closely related components identified.*\n';
    }
    section += '\n';
    
    section += '---\n\n';
    return section;
  }

  generateComponentUsageExample(component, analysis) {
    let example = '';
    
    example += '**Basic Usage:**\n\n';
    example += '```html\n';
    example += `<!-- ${component.name} component -->\n`;
    example += `<div class="${component.name.toLowerCase()}">\n`;
    
    if (component.elements && component.elements.length > 0) {
      component.elements.forEach(element => {
        const elementTag = this.inferElementTag(element);
        example += `  <${elementTag}>${element}</${elementTag}>\n`;
      });
    }
    
    example += '</div>\n';
    example += '```\n\n';
    
    // Advanced usage with props
    if (analysis.props.length > 0) {
      example += '**Advanced Usage with Props:**\n\n';
      example += '```jsx\n';
      const componentName = this.generateComponentName(component.name);
      example += `<${componentName}\n`;
      
      analysis.props.slice(0, 3).forEach(prop => {
        const propInfo = this.getDetailedPropInfo(prop);
        example += `  ${prop}={${propInfo.example}}\n`;
      });
      
      example += `/>\n`;
      example += '```\n\n';
    }
    
    return example;
  }

  generateDesignNotes(component, analysis) {
    const notes = [];
    
    if (analysis.reusabilityScore >= 80) {
      notes.push('High reusability');
    }
    
    if (analysis.consistency >= 70) {
      notes.push('Consistent design');
    }
    
    if (analysis.variations && analysis.variations.length > 3) {
      notes.push('Multiple variations');
    }
    
    if (analysis.designTokens && analysis.designTokens.length > 5) {
      notes.push('Rich design tokens');
    }
    
    return notes.length > 0 ? notes.join(', ') : 'Standard component';
  }

  getComplexityLevel(analysis) {
    const score = (analysis.reusabilityScore || 0) + (analysis.consistency || 0);
    
    if (score >= 150) return 'Low';
    if (score >= 100) return 'Medium';
    return 'High';
  }

  deduplicateVariations(variations) {
    const seen = new Set();
    const unique = [];
    
    variations.forEach(variation => {
      const key = JSON.stringify(variation);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(variation);
      }
    });
    
    return unique.slice(0, 5); // Limit to 5 variations
  }

  aggregateRefactoringOpportunities(opportunities) {
    const aggregated = new Map();
    
    opportunities.forEach(opp => {
      if (opp && opp.suggestions) {
        opp.suggestions.forEach(suggestion => {
          if (!aggregated.has(suggestion.type)) {
            aggregated.set(suggestion.type, {
              type: suggestion.type,
              description: suggestion.description,
              count: 0,
            });
          }
          aggregated.get(suggestion.type).count++;
        });
      }
    });
    
    return Array.from(aggregated.values()).sort((a, b) => b.count - a.count);
  }

  findRelatedComponents(component, componentAnalysis) {
    const related = [];
    const componentName = component.name.toLowerCase();
    
    componentAnalysis.forEach((analysis, name) => {
      if (name !== component.name) {
        const otherName = name.toLowerCase();
        
        // Check for naming similarity
        if (componentName.includes(otherName) || otherName.includes(componentName)) {
          related.push({
            name: name,
            relationship: 'Similar naming pattern',
          });
        }
        
        // Check for shared design tokens
        if (analysis.designTokens && component.elements) {
          const sharedTokens = analysis.designTokens.filter(token =>
            component.elements.some(element => 
              element.toLowerCase().includes(token.split(':')[1]?.toLowerCase() || '')
            )
          );
          
          if (sharedTokens.length > 0) {
            related.push({
              name: name,
              relationship: 'Shared design tokens',
            });
          }
        }
      }
    });
    
    return related.slice(0, 3); // Limit to 3 related components
  }

  inferElementTag(elementName) {
    const lowerName = elementName.toLowerCase();
    
    if (lowerName.includes('button')) return 'button';
    if (lowerName.includes('link')) return 'a';
    if (lowerName.includes('heading') || lowerName.includes('title')) return 'h2';
    if (lowerName.includes('image')) return 'img';
    if (lowerName.includes('text') || lowerName.includes('paragraph')) return 'p';
    if (lowerName.includes('list')) return 'ul';
    if (lowerName.includes('item')) return 'li';
    
    return 'div';
  }

  generateRefactoringOpportunities(componentAnalysis) {
    let section = '';
    
    section += '## 🔧 Refactoring Opportunities\n\n';
    section += 'Based on the analysis, here are the top refactoring opportunities to improve component consistency and reusability:\n\n';
    
    const allOpportunities = [];
    
    componentAnalysis.forEach((analysis, componentName) => {
      if (analysis.refactoringOpportunities) {
        analysis.refactoringOpportunities.forEach(opp => {
          if (opp.suggestions) {
            opp.suggestions.forEach(suggestion => {
              allOpportunities.push({
                component: componentName,
                type: suggestion.type,
                description: suggestion.description,
                impact: suggestion.impact || 'medium',
                effort: suggestion.effort || 'medium',
              });
            });
          }
        });
      }
    });
    
    // Group by type and priority
    const groupedOpportunities = new Map();
    allOpportunities.forEach(opp => {
      if (!groupedOpportunities.has(opp.type)) {
        groupedOpportunities.set(opp.type, []);
      }
      groupedOpportunities.get(opp.type).push(opp);
    });
    
    // Display top opportunities
    const sortedTypes = Array.from(groupedOpportunities.entries())
      .sort((a, b) => b[1].length - a[1].length);
    
    sortedTypes.slice(0, 5).forEach(([type, opportunities]) => {
      section += `### ${type}\n\n`;
      section += `**Impact**: High (affects ${opportunities.length} components)\n\n`;
      
      const uniqueComponents = [...new Set(opportunities.map(o => o.component))];
      section += `**Affected Components**: ${uniqueComponents.join(', ')}\n\n`;
      
      section += `**Description**: ${opportunities[0].description}\n\n`;
      
      section += '**Recommended Actions**:\n';
      opportunities.slice(0, 3).forEach((opp, index) => {
        section += `${index + 1}. ${opp.component}: ${opp.description}\n`;
      });
      section += '\n';
    });
    
    return section;
  }

  generateDesignPatterns(componentAnalysis) {
    let section = '';
    
    section += '## 🎨 Design Patterns\n\n';
    section += 'Common design patterns identified across components:\n\n';
    
    const patterns = new Map();
    
    componentAnalysis.forEach((analysis, componentName) => {
      if (analysis.layoutPatterns) {
        analysis.layoutPatterns.forEach(pattern => {
          if (pattern.dominantPattern) {
            if (!patterns.has(pattern.dominantPattern)) {
              patterns.set(pattern.dominantPattern, []);
            }
            patterns.get(pattern.dominantPattern).push(componentName);
          }
        });
      }
    });
    
    Array.from(patterns.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([pattern, components]) => {
        section += `### ${pattern}\n\n`;
        section += `**Usage**: ${components.length} components\n`;
        section += `**Components**: ${components.join(', ')}\n\n`;
      });
    
    return section;
  }

  generateImplementationGuide(uniqueComponents, componentAnalysis) {
    let section = '';
    
    section += '## 🚀 Implementation Guide\n\n';
    section += 'Recommended implementation order and development strategy:\n\n';
    
    // Sort components by priority and usage
    const prioritizedComponents = uniqueComponents
      .map(component => {
        const analysis = componentAnalysis.get(component.name) || {};
        return {
          ...component,
          analysis,
          priorityScore: this.calculatePriorityScore(component, analysis),
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
    
    section += '### Phase 1: High Priority Components\n\n';
    const highPriority = prioritizedComponents.filter(c => c.analysis.priority === 'High');
    highPriority.forEach((component, index) => {
      section += `${index + 1}. **${component.name}** (Score: ${component.priorityScore})\n`;
      section += `   - Usage: ${component.usageCount} instances\n`;
      section += `   - Reusability: ${component.analysis.reusabilityScore}/100\n\n`;
    });
    
    section += '### Phase 2: Medium Priority Components\n\n';
    const mediumPriority = prioritizedComponents.filter(c => c.analysis.priority === 'Medium');
    mediumPriority.slice(0, 5).forEach((component, index) => {
      section += `${index + 1}. **${component.name}** (Score: ${component.priorityScore})\n`;
    });
    section += '\n';
    
    section += '### Development Guidelines\n\n';
    section += '1. **Start with atomic components** (buttons, inputs, text elements)\n';
    section += '2. **Build molecular components** (forms, cards, navigation items)\n';
    section += '3. **Develop organism components** (headers, footers, sections)\n';
    section += '4. **Create template components** (page layouts, grids)\n\n';
    
    section += '### Quality Checklist\n\n';
    section += '- [ ] Component follows naming conventions\n';
    section += '- [ ] Props are properly typed and documented\n';
    section += '- [ ] Component includes usage examples\n';
    section += '- [ ] Design tokens are extracted and consistent\n';
    section += '- [ ] Component is responsive and accessible\n';
    section += '- [ ] Unit tests are implemented\n';
    section += '- [ ] Storybook stories are created\n\n';
    
    return section;
  }

  calculatePriorityScore(component, analysis) {
    let score = 0;
    
    // Usage frequency weight (40%)
    score += (component.usageCount || 1) * 10;
    
    // Reusability score weight (30%)
    score += (analysis.reusabilityScore || 0) * 0.3;
    
    // Consistency score weight (20%)
    score += (analysis.consistency || 0) * 0.2;
    
    // Priority multiplier (10%)
    const priorityMultiplier = {
      'High': 1.5,
      'Medium': 1.0,
      'Low': 0.5,
    };
    score *= priorityMultiplier[analysis.priority] || 1.0;
    
    return Math.round(score);
  }

  // Utility methods
  getRouteName(routeUrl) {
    // Handle case where routeUrl might be an object
    if (typeof routeUrl === 'object') {
      routeUrl =
        routeUrl?.url || routeUrl?.fullUrl || routeUrl?.href || 'Unknown';
    }

    if (!routeUrl || routeUrl === '/' || routeUrl === '') return 'Home';

    return routeUrl
      .split('/')
      .filter(segment => segment)
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' > ');
  }

  formatSectionName(type) {
    return type
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  generateComponentName(type) {
    return type
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^./, char => char.toUpperCase());
  }

  generateAnchor(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  extractAllComponents(processedRoutes) {
    const componentMap = new Map();

    processedRoutes.forEach(route => {
      if (route.components) {
        route.components.forEach(component => {
          const key = component.type;
          if (componentMap.has(key)) {
            const existing = componentMap.get(key);
            existing.instances =
              (existing.instances || 0) + (component.instances || 1);
          } else {
            componentMap.set(key, { ...component });
          }
        });
      }
    });

    return Array.from(componentMap.values());
  }

  findCommonElementsInSections(instances) {
    if (instances.length === 0) return [];

    const elementSets = instances
      .map(instance => instance.section.elements || [])
      .map(elements => new Set(elements));

    if (elementSets.length === 0) return [];

    const firstSet = elementSets[0];
    const commonElements = [];

    firstSet.forEach(element => {
      if (elementSets.every(set => set.has(element))) {
        commonElements.push(element);
      }
    });

    return commonElements;
  }

  suggestPropsForSection(instances) {
    const props = [];

    // Analyze all instances to suggest props
    const allElements = instances.reduce((acc, instance) => {
      return acc.concat(instance.section.elements || []);
    }, []);

    const elementCounts = new Map();
    allElements.forEach(element => {
      const count = elementCounts.get(element) || 0;
      elementCounts.set(element, count + 1);
    });

    // Generate props based on common elements
    elementCounts.forEach((count, element) => {
      if (count > instances.length * 0.5) {
        // Present in more than 50% of instances
        const propInfo = this.elementToProp(element);
        if (propInfo) {
          props.push(propInfo);
        }
      }
    });

    return props;
  }

  elementToProp(element) {
    const el = element.toLowerCase();

    if (el.includes('title')) {
      return { name: 'title', type: 'string', description: 'The title text' };
    }
    if (el.includes('image') || el.includes('img')) {
      return {
        name: 'imageUrl',
        type: 'string',
        description: 'URL of the image',
      };
    }
    if (el.includes('button')) {
      return {
        name: 'onClick',
        type: '() => void',
        description: 'Button click handler',
      };
    }
    if (el.includes('link')) {
      return {
        name: 'href',
        type: 'string',
        description: 'Link destination URL',
      };
    }
    if (el.includes('text') || el.includes('content')) {
      return { name: 'text', type: 'string', description: 'Text content' };
    }

    return null;
  }

  getDetailedPropInfo(prop) {
    const propLower = prop.toLowerCase();

    if (propLower.includes('title')) {
      return {
        type: 'string',
        required: 'Yes',
        description: 'The title text to display',
      };
    }
    if (propLower.includes('image')) {
      return {
        type: 'string',
        required: 'Yes',
        description: 'URL of the image to display',
      };
    }
    if (propLower.includes('click')) {
      return {
        type: '() => void',
        required: 'No',
        description: 'Function to call when clicked',
      };
    }
    if (propLower.includes('href') || propLower.includes('url')) {
      return {
        type: 'string',
        required: 'Yes',
        description: 'URL for navigation',
      };
    }
    if (propLower.includes('text') || propLower.includes('content')) {
      return {
        type: 'string',
        required: 'No',
        description: 'Text content to display',
      };
    }
    if (propLower === 'classname') {
      return {
        type: 'string',
        required: 'No',
        description: 'Additional CSS classes',
      };
    }
    if (propLower.includes('aria')) {
      return {
        type: 'string',
        required: 'No',
        description: 'Accessibility label',
      };
    }

    return { type: 'any', required: 'No', description: 'Component property' };
  }

  getExampleValue(prop) {
    const propLower = prop.toLowerCase();

    if (propLower.includes('title')) return '"Sample Title"';
    if (propLower.includes('image'))
      return '"https://via.placeholder.com/300x200"';
    if (propLower.includes('text')) return '"Sample text content"';
    if (propLower.includes('href') || propLower.includes('url')) return '"#"';
    if (propLower.includes('click')) return '{() => console.log("clicked")}';
    if (propLower.includes('classname')) return '"custom-class"';
    if (propLower.includes('aria')) return '"Component description"';

    return '"value"';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownGenerator;
} else {
  // For ES6 module support
  window.MarkdownGenerator = MarkdownGenerator;
}
