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
