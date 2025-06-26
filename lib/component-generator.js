// React component generator
class ComponentGenerator {
  constructor() {
    this.settings = null;
  }

  async init() {
    this.settings = await chrome.storage.sync.get([
      'componentFramework',
      'outputFormat',
      'stylingFramework',
      'namingConvention',
      'includeAccessibility',
      'includeTests',
      'includeStorybook',
    ]);
  }

  async generateComponent(sectionData) {
    await this.init();

    const componentName = this.generateComponentName(sectionData.type);
    const props = this.generatePropsInterface(sectionData);

    let component;

    switch (this.settings.componentFramework) {
      case 'react':
        component = this.generateReactComponent(
          componentName,
          props,
          sectionData
        );
        break;
      case 'vue':
        component = this.generateVueComponent(
          componentName,
          props,
          sectionData
        );
        break;
      case 'angular':
        component = this.generateAngularComponent(
          componentName,
          props,
          sectionData
        );
        break;
      case 'svelte':
        component = this.generateSvelteComponent(
          componentName,
          props,
          sectionData
        );
        break;
      default:
        throw new Error('Unsupported framework');
    }

    return {
      name: componentName,
      framework: this.settings.componentFramework,
      language: this.settings.outputFormat,
      styling: this.settings.stylingFramework,
      files: component,
    };
  }

  generateComponentName(type) {
    const name = type.replace(/[^a-zA-Z0-9]/g, '');

    switch (this.settings.namingConvention) {
      case 'pascalCase':
        return name.charAt(0).toUpperCase() + name.slice(1);
      case 'camelCase':
        return name.charAt(0).toLowerCase() + name.slice(1);
      case 'kebab-case':
        return name.replace(/([A-Z])/g, '-$1').toLowerCase();
      case 'snake_case':
        return name.replace(/([A-Z])/g, '_$1').toLowerCase();
      default:
        return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }

  generatePropsInterface(sectionData) {
    const props = new Map();

    // Analyze section content to infer props
    if (sectionData.content) {
      const content = sectionData.content.toLowerCase();

      if (content.includes('title') || content.includes('heading')) {
        props.set('title', 'string');
      }
      if (content.includes('text') || content.includes('description')) {
        props.set('text', 'string');
      }
      if (content.includes('image') || content.includes('img')) {
        props.set('imageUrl', 'string');
        props.set('imageAlt', 'string');
      }
      if (content.includes('link') || content.includes('href')) {
        props.set('href', 'string');
      }
      if (content.includes('button') || content.includes('click')) {
        props.set('onClick', '() => void');
      }
    }

    // Analyze elements
    if (sectionData.elements) {
      sectionData.elements.forEach(element => {
        const el = element.toLowerCase();
        if (el.includes('title')) props.set('title', 'string');
        if (el.includes('subtitle')) props.set('subtitle', 'string');
        if (el.includes('image')) {
          props.set('imageUrl', 'string');
          props.set('imageAlt', 'string');
        }
        if (el.includes('button')) props.set('onButtonClick', '() => void');
        if (el.includes('link')) props.set('linkUrl', 'string');
      });
    }

    // Add common props
    props.set('className', 'string');
    if (this.settings.includeAccessibility) {
      props.set('ariaLabel', 'string');
    }

    return props;
  }

  generateReactComponent(componentName, props, sectionData) {
    const files = [];
    const isTypeScript = this.settings.outputFormat === 'typescript';
    const fileExtension = isTypeScript ? 'tsx' : 'jsx';

    // Generate main component file
    const componentContent = this.generateReactComponentContent(
      componentName,
      props,
      sectionData,
      isTypeScript
    );
    files.push({
      filename: `${componentName}.${fileExtension}`,
      content: componentContent,
      type: 'component',
    });

    // Generate styles
    const styleContent = this.generateStyleContent(componentName, sectionData);
    const styleFile = this.getStyleFileName(componentName);
    files.push({
      filename: styleFile,
      content: styleContent,
      type: 'style',
    });

    // Generate index file
    const indexContent = this.generateIndexFile(componentName, _isTypeScript);
    files.push({
      filename: `index.${isTypeScript ? 'ts' : 'js'}`,
      content: indexContent,
      type: 'index',
    });

    // Generate types file (TypeScript only)
    if (isTypeScript) {
      const typesContent = this.generateTypesFile(componentName, props);
      files.push({
        filename: 'types.ts',
        content: typesContent,
        type: 'types',
      });
    }

    // Generate Storybook story
    if (this.settings.includeStorybook) {
      const storyContent = this.generateStoryFile(
        componentName,
        props,
        isTypeScript
      );
      files.push({
        filename: `${componentName}.stories.${fileExtension}`,
        content: storyContent,
        type: 'story',
      });
    }

    // Generate test file
    if (this.settings.includeTests) {
      const testContent = this.generateTestFile(
        componentName,
        props,
        isTypeScript
      );
      files.push({
        filename: `${componentName}.test.${fileExtension}`,
        content: testContent,
        type: 'test',
      });
    }

    return files;
  }

  generateReactComponentContent(
    componentName,
    props,
    sectionData,
    isTypeScript
  ) {
    const propsInterface = isTypeScript
      ? this.generatePropsInterfaceString(componentName, props)
      : '';
    const propsType = isTypeScript ? `: React.FC<${componentName}Props>` : '';

    let imports = "import React from 'react';\n";

    // Add style imports based on styling framework
    switch (this.settings.stylingFramework) {
      case 'css-modules':
        imports += `import styles from './${componentName}.module.css';\n`;
        break;
      case 'styled-components':
        imports += "import styled from 'styled-components';\n";
        break;
      case 'emotion':
        imports += "import { css } from '@emotion/react';\n";
        break;
      case 'tailwind':
        // No additional imports needed
        break;
      default:
        imports += `import './${componentName}.css';\n`;
    }

    const propsDestructuring = Array.from(props.keys()).join(', ');
    const className = this.generateClassName(componentName);
    const accessibilityProps = this.generateAccessibilityProps(props);
    const componentBody = this.generateComponentBody(sectionData, props);

    return `${imports}
${propsInterface}

export const ${componentName}${propsType} = ({ ${propsDestructuring} }) => {
  return (
    <div className={${className}}${accessibilityProps}>
      ${componentBody}
    </div>
  );
};

export default ${componentName};
`;
  }

  generatePropsInterfaceString(componentName, props) {
    if (this.settings.outputFormat !== 'typescript') return '';

    let interfaceStr = `interface ${componentName}Props {\n`;

    props.forEach((type, name) => {
      const optional = ['className', 'ariaLabel'].includes(name) ? '?' : '';
      interfaceStr += `  ${name}${optional}: ${type};\n`;
    });

    interfaceStr += '}\n';
    return interfaceStr;
  }

  generateClassName(componentName) {
    switch (this.settings.stylingFramework) {
      case 'css-modules':
        return `styles.${componentName.toLowerCase()}`;
      case 'tailwind':
        return `"${this.generateTailwindClasses(componentName)}"`;
      default:
        return `"${componentName.toLowerCase()}"`;
    }
  }

  generateTailwindClasses(componentName) {
    // Generate basic Tailwind classes based on component type
    const type = componentName.toLowerCase();

    if (type.includes('header')) {
      return 'w-full bg-white shadow-sm py-4 px-6';
    }
    if (type.includes('hero')) {
      return 'w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-20 px-6 text-center';
    }
    if (type.includes('card')) {
      return 'bg-white rounded-lg shadow-md p-6 border border-gray-200';
    }
    if (type.includes('button')) {
      return 'inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors';
    }
    if (type.includes('footer')) {
      return 'w-full bg-gray-800 text-white py-8 px-6';
    }

    return 'w-full p-4';
  }

  generateAccessibilityProps(props) {
    if (!this.settings.includeAccessibility) return '';

    let accessibilityProps = '';

    if (props.has('ariaLabel')) {
      accessibilityProps += ' aria-label={ariaLabel}';
    }

    return accessibilityProps;
  }

  generateComponentBody(sectionData, props) {
    let body = '';

    // Generate JSX based on detected elements
    if (props.has('title')) {
      body += '      <h2>{title}</h2>\n';
    }

    if (props.has('subtitle')) {
      body += '      <h3>{subtitle}</h3>\n';
    }

    if (props.has('imageUrl')) {
      body += '      <img src={imageUrl} alt={imageAlt || ""} />\n';
    }

    if (props.has('text')) {
      body += '      <p>{text}</p>\n';
    }

    if (props.has('onClick') || props.has('onButtonClick')) {
      body +=
        '      <button onClick={onClick || onButtonClick}>Click me</button>\n';
    }

    if (props.has('href') || props.has('linkUrl')) {
      body += '      <a href={href || linkUrl}>Learn more</a>\n';
    }

    // Fallback content
    if (!body.trim()) {
      body = '      <div>Component content goes here</div>\n';
    }

    return body;
  }

  generateStyleContent(componentName, _sectionData) {
    const className = componentName.toLowerCase();

    switch (this.settings.stylingFramework) {
      case 'css-modules':
        return this.generateCSSModules(className, _sectionData);
      case 'styled-components':
        return this.generateStyledComponents(componentName, _sectionData);
      case 'scss':
        return this.generateSCSS(className, _sectionData);
      default:
        return this.generateCSS(className, _sectionData);
    }
  }

  generateCSSModules(className, _sectionData) {
    return `.${className} {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.${className} h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.${className} h3 {
  font-size: 1.25rem;
  font-weight: 500;
  color: #4a5568;
  margin: 0;
}

.${className} p {
  color: #718096;
  line-height: 1.6;
  margin: 0;
}

.${className} img {
  width: 100%;
  height: auto;
  border-radius: 0.375rem;
}

.${className} button {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #3182ce;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.${className} button:hover {
  background: #2c5aa0;
}

.${className} a {
  color: #3182ce;
  text-decoration: none;
  font-weight: 500;
}

.${className} a:hover {
  text-decoration: underline;
}
`;
  }

  generateCSS(className, _sectionData) {
    return `.${className} {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.${className} h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.${className} h3 {
  font-size: 20px;
  font-weight: 500;
  color: #4a5568;
  margin: 0;
}

.${className} p {
  color: #718096;
  line-height: 1.6;
  margin: 0;
}

.${className} img {
  width: 100%;
  height: auto;
  border-radius: 6px;
}

.${className} button {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: #3182ce;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.${className} button:hover {
  background: #2c5aa0;
}

.${className} a {
  color: #3182ce;
  text-decoration: none;
  font-weight: 500;
}

.${className} a:hover {
  text-decoration: underline;
}
`;
  }

  generateStyledComponents(componentName, _sectionData) {
    return `import styled from 'styled-components';

export const ${componentName}Container = styled.div\`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
\`;

export const Title = styled.h2\`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
\`;

export const Subtitle = styled.h3\`
  font-size: 1.25rem;
  font-weight: 500;
  color: #4a5568;
  margin: 0;
\`;

export const Text = styled.p\`
  color: #718096;
  line-height: 1.6;
  margin: 0;
\`;

export const Image = styled.img\`
  width: 100%;
  height: auto;
  border-radius: 0.375rem;
\`;

export const Button = styled.button\`
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #3182ce;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #2c5aa0;
  }
\`;

export const Link = styled.a\`
  color: #3182ce;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
\`;
`;
  }

  generateSCSS(className, _sectionData) {
    return `$primary-color: #3182ce;
$primary-hover: #2c5aa0;
$text-primary: #1a202c;
$text-secondary: #4a5568;
$text-muted: #718096;
$background: #ffffff;
$border-radius: 8px;
$spacing: 16px;

.${className} {
  display: flex;
  flex-direction: column;
  gap: $spacing;
  padding: $spacing;
  border-radius: $border-radius;
  background: $background;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h2 {
    font-size: 24px;
    font-weight: 600;
    color: $text-primary;
    margin: 0;
  }

  h3 {
    font-size: 20px;
    font-weight: 500;
    color: $text-secondary;
    margin: 0;
  }

  p {
    color: $text-muted;
    line-height: 1.6;
    margin: 0;
  }

  img {
    width: 100%;
    height: auto;
    border-radius: 6px;
  }

  button {
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    background: $primary-color;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background: $primary-hover;
    }
  }

  a {
    color: $primary-color;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
}
`;
  }

  getStyleFileName(componentName) {
    switch (this.settings.stylingFramework) {
      case 'css-modules':
        return `${componentName}.module.css`;
      case 'styled-components':
        return `${componentName}.styles.${this.settings.outputFormat === 'typescript' ? 'ts' : 'js'}`;
      case 'scss':
        return `${componentName}.scss`;
      default:
        return `${componentName}.css`;
    }
  }

  generateIndexFile(componentName, _isTypeScript) {
    return `export { default } from './${componentName}';
export * from './${componentName}';
`;
  }

  generateTypesFile(componentName, props) {
    if (this.settings.outputFormat !== 'typescript') return '';

    let typesContent = `export interface ${componentName}Props {\n`;

    props.forEach((type, name) => {
      const optional = ['className', 'ariaLabel'].includes(name) ? '?' : '';
      typesContent += `  ${name}${optional}: ${type};\n`;
    });

    typesContent += '}\n\n';
    typesContent += `export default ${componentName}Props;\n`;

    return typesContent;
  }

  generateStoryFile(componentName, props, isTypeScript) {
    const typeAnnotation = isTypeScript
      ? `: Meta<typeof ${componentName}>`
      : '';

    return `import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from './${componentName}';

const meta${typeAnnotation} = {
  title: 'Components/${componentName}',
  component: ${componentName},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    ${this.generateArgTypes(props)}
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ${this.generateDefaultArgs(props)}
  },
};

export const WithAllProps: Story = {
  args: {
    ${this.generateAllPropsArgs(props)}
  },
};
`;
  }

  generateArgTypes(props) {
    let argTypes = '';

    props.forEach((type, name) => {
      if (name === 'onClick' || name === 'onButtonClick') {
        argTypes += `    ${name}: { action: 'clicked' },\n`;
      } else {
        argTypes += `    ${name}: { control: 'text' },\n`;
      }
    });

    return argTypes;
  }

  generateDefaultArgs(props) {
    let args = '';

    props.forEach((type, name) => {
      if (name === 'title') args += `    ${name}: 'Sample Title',\n`;
      else if (name === 'subtitle') args += `    ${name}: 'Sample Subtitle',\n`;
      else if (name === 'text') args += `    ${name}: 'Sample text content',\n`;
      else if (name === 'imageUrl')
        args += `    ${name}: 'https://via.placeholder.com/300x200',\n`;
      else if (name === 'imageAlt') args += `    ${name}: 'Sample image',\n`;
      else if (name === 'href' || name === 'linkUrl')
        args += `    ${name}: '#',\n`;
      else if (name === 'className') args += `    ${name}: '',\n`;
      else if (name === 'ariaLabel') args += `    ${name}: 'Component',\n`;
    });

    return args;
  }

  generateAllPropsArgs(props) {
    return this.generateDefaultArgs(props);
  }

  generateTestFile(componentName, props, _isTypeScript) {
    return `import React from 'react';
import { render, screen } from '@testing-library/react';
import { ${componentName} } from './${componentName}';

describe('${componentName}', () => {
  it('renders without crashing', () => {
    render(<${componentName} />);
  });

  ${
    props.has('title')
      ? `
  it('displays the title when provided', () => {
    const title = 'Test Title';
    render(<${componentName} title={title} />);
    expect(screen.getByText(title)).toBeInTheDocument();
  });
  `
      : ''
  }

  ${
    props.has('text')
      ? `
  it('displays the text when provided', () => {
    const text = 'Test text content';
    render(<${componentName} text={text} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });
  `
      : ''
  }

  ${
    props.has('onClick') || props.has('onButtonClick')
      ? `
  it('calls onClick when button is clicked', () => {
    const handleClick = jest.fn();
    render(<${componentName} onClick={handleClick} />);
    const button = screen.getByRole('button');
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  `
      : ''
  }
});
`;
  }

  async createComponentLibrary(allComponents) {
    await this.init();

    const library = {
      name: 'Generated Components',
      version: '1.0.0',
      framework: this.settings.componentFramework,
      language: this.settings.outputFormat,
      styling: this.settings.stylingFramework,
      components: allComponents,
      files: [],
    };

    // Generate package.json
    library.files.push({
      filename: 'package.json',
      content: this.generatePackageJson(),
      type: 'config',
    });

    // Generate README.md
    library.files.push({
      filename: 'README.md',
      content: this.generateReadme(allComponents),
      type: 'documentation',
    });

    // Generate main index file
    library.files.push({
      filename: `index.${this.settings.outputFormat === 'typescript' ? 'ts' : 'js'}`,
      content: this.generateMainIndex(allComponents),
      type: 'index',
    });

    return library;
  }

  generatePackageJson() {
    const dependencies = this.getFrameworkDependencies();

    return JSON.stringify(
      {
        name: 'generated-components',
        version: '1.0.0',
        description: 'Components generated from website routes',
        main: 'index.js',
        scripts: {
          build: 'tsc',
          test: 'jest',
          storybook: 'start-storybook -p 6006',
          'build-storybook': 'build-storybook',
        },
        dependencies: dependencies,
        devDependencies: this.getDevDependencies(),
        peerDependencies: this.getPeerDependencies(),
      },
      null,
      2
    );
  }

  getFrameworkDependencies() {
    const deps = {};

    switch (this.settings.componentFramework) {
      case 'react':
        deps.react = '^18.0.0';
        deps['react-dom'] = '^18.0.0';
        break;
      case 'vue':
        deps.vue = '^3.0.0';
        break;
      case 'angular':
        deps['@angular/core'] = '^16.0.0';
        deps['@angular/common'] = '^16.0.0';
        break;
      case 'svelte':
        deps.svelte = '^4.0.0';
        break;
    }

    switch (this.settings.stylingFramework) {
      case 'styled-components':
        deps['styled-components'] = '^6.0.0';
        break;
      case 'emotion':
        deps['@emotion/react'] = '^11.0.0';
        deps['@emotion/styled'] = '^11.0.0';
        break;
      case 'tailwind':
        deps.tailwindcss = '^3.0.0';
        break;
    }

    return deps;
  }

  getDevDependencies() {
    const devDeps = {};

    if (this.settings.outputFormat === 'typescript') {
      devDeps.typescript = '^5.0.0';
      devDeps['@types/react'] = '^18.0.0';
      devDeps['@types/react-dom'] = '^18.0.0';
    }

    if (this.settings.includeTests) {
      devDeps.jest = '^29.0.0';
      devDeps['@testing-library/react'] = '^13.0.0';
      devDeps['@testing-library/jest-dom'] = '^5.0.0';
    }

    if (this.settings.includeStorybook) {
      devDeps['@storybook/react'] = '^7.0.0';
      devDeps['@storybook/addon-essentials'] = '^7.0.0';
    }

    return devDeps;
  }

  getPeerDependencies() {
    return {
      react: '>=16.8.0',
      'react-dom': '>=16.8.0',
    };
  }

  generateReadme(allComponents) {
    return `# Generated Components

This component library was automatically generated from website routes.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`${this.settings.outputFormat === 'typescript' ? 'typescript' : 'javascript'}
import { ${allComponents.map(comp => comp.name).join(', ')} } from 'generated-components';

function App() {
  return (
    <div>
      ${allComponents.map(comp => `<${comp.name} />`).join('\n      ')}
    </div>
  );
}
\`\`\`

## Components

${allComponents
  .map(
    comp => `
### ${comp.name}

Generated from: ${comp.framework} component

Props:
${comp.files.find(f => f.type === 'types')?.content || 'No specific props defined'}

`
  )
  .join('')}

## Development

\`\`\`bash
# Run Storybook
npm run storybook

# Run tests
npm test

# Build components
npm run build
\`\`\`
`;
  }

  generateMainIndex(allComponents) {
    return (
      allComponents
        .map(
          comp =>
            `export { default as ${comp.name} } from './components/${comp.name}';`
        )
        .join('\n') + '\n'
    );
  }

  // Placeholder methods for other frameworks
  generateVueComponent(_componentName, _props, _sectionData) {
    // TODO: Implement Vue component generation
    throw new Error('Vue component generation not yet implemented');
  }

  generateAngularComponent(_componentName, _props, _sectionData) {
    // TODO: Implement Angular component generation
    throw new Error('Angular component generation not yet implemented');
  }

  generateSvelteComponent(_componentName, _props, _sectionData) {
    // TODO: Implement Svelte component generation
    throw new Error('Svelte component generation not yet implemented');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComponentGenerator;
} else {
  window.ComponentGenerator = ComponentGenerator;
}
