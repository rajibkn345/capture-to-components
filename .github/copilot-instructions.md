Objective:

1. Build an AI-powered tool that enables users to clone and reconstruct any website efficiently.
2. Systematically analyze the website's structure and content to identify pages, sections, and reusable UI components.
3. Generate comprehensive documentation and starter code to accelerate web development and ensure maintainable, modular site architectures.

Step-by-Step Plan:

1. Route Scanning:
   - Automatically scan and list all selected routes (pages) of the target website.
2. Page & Section Analysis:
   - For each selected route, analyze the page section by section, identifying logical groupings and nested structures.
3. Component Extraction & Reusability:
   - Detect and extract unique, reusable UI components from each section.
   - Group similar components and suggest refactoring opportunities to maximize reusability.
   - Support nested components and common layout patterns (e.g., grids, navbars).
4. Documentation Generation:
   - Generate a `page.md` file that lists all analyzed pages, their sections, and the components used, including a usage summary or component map for each page.
   - Generate a `components.md` file that contains definitions and descriptions of all unique components, groups similar components, and highlights opportunities for further abstraction.
5. Code Stub Generation (Optional):
   - Output starter code files (e.g., React/Vue components) for each unique component to accelerate development.
6. Export & Error Handling:
   - Provide robust export options for all generated files and images.
   - Implement clear error handling and user feedback for any failed steps.
7. Extensibility & Performance:
   - Design the tool to be extensible (e.g., support for plugins, different frameworks, or export formats).
   - Optimize for performance by batching or parallelizing analysis for large sites and caching intermediate results.



## Common Tasks & Patterns

-ensure consistent naming convention
-follow existing prompt structure
-use optimized code
-use clean code
-follow best practice always

Ultimate Goal:

- Enable rapid, accurate, and maintainable website cloning by leveraging AI to automate the extraction, documentation, and code generation of reusable components, ensuring the resulting site is modular, scalable, and easy to maintain.


NB: Dont modify @copilot-instructions.md file without my permission ,and you must follow this file instruction when executing a prompt.
