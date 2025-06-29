@workspace
following funcitonality are not working:
-when click on the capture the route button, it is not capturing the route
-when click on the export analysis button, it is not work

@copilot-instructions.md
-when capture generation is completed there will be an option to export the captured image also if skip then proceed for the next step

---

@instructions.md
-when click on export image not downlaoded
instead following issues encouterd
Download failed: Error: Invalid filename
Context
background.js
Stack Trace
background.js:169 (anonymous function)

---

@instructions.md
-when click on export image downlaoded only the opened section of a page not all selected pages of the website
-i need all the pages screenshots
---
@workspace
-route scanning is workqing fine but i want to show a view route button at the list of routes so that user can view the route in a new tab if want 

--
@workspace
DO THE FOLLOWING TASKS IN ORDER:
1. Page & Section Analysis:
   - For each selected route, analyze the page section by section, identifying logical groupings and nested structures.
2. Component Extraction & Reusability:
    - Detect and extract unique, reusable UI components from each section.   
    - Group similar components and suggest refactoring opportunities to maximize reusability.
    - Support nested components and common layout patterns (e.g., grids, navbars).
---
@workspace
DO THE FOLLOWING TASK:
1. Generate a `page.md` file that lists all analyzed pages, their sections, and the components used, including a usage summary or component map for each page.
2. Generate a `components.md` file that contains definitions and descriptions of all unique components, including their props, usage examples, and any relevant design notes.

@workspace
FIX THE FOLLOWING ISSUES:
1. IN THE `popup.js`, the "Capture Routes" button is not capturing the routes as well as the other buttons are not functioning properly.

--
@workspace
DO THE FOLLOWING TASKS IN ORDER:
 Export & Error Handling:
   - Provide robust export options for all generated files and images.
   - Implement clear error handling and user feedback for any failed steps.

@workspace
fix the following issuse when click on the capture the route button:
1.Route processing failed: ReferenceError: window is not defined - background.js:524 (anonymous function)
2.Route processing failed: undefined-popup/popup.js:348 (captureRoutes)
3.Error processing single route: ReferenceError: window is not defined-background.js:1628 (anonymous function)
4.Page structure analysis failed: TypeError: Cannot read properties of undefined (reading 'classList')-content-script.js:469 (analyzePageStructure)-content-script.js:49 (handleMessage)

---
@workspace 
i have seen 41 errors in the code shown at problems tab in the vs code editor, please fix them all and make sure the code runs without any errors.
note: make sure to check the problem tabs in the editor for any errors and fix them accordingly until the code runs without any errors.
@workspace
fix the following issues:
1. it does not capture the full page screenshot, it only captures the visible part of the page.

@workspace
fix the following issues:
1.Route processing failed: Unknown error-popup/popup.js:352 (captureRoutes)
2.Page structure analysis failed: TypeError: Cannot read properties of undefined (reading 'classList')-content-script.js:470 (analyzePageStructure)
content-script.js:49 (handleMessage)
3.Export operation failed: Error: Screenshot export failed: screenshots export failed-popup/popup.js:434 (exportComponents)-popup/popup.html