Object: Chrome Extension Development Plan to Capture and Segment Routes into react components so that it can be used in a react app and generate a markdown file which will contain all the details of the routes
convert the draft.md file into a react component which will be used in a react app
here is the extension development plan to achieve the above objective:

step-1:
find all routes in the website 
step-2
now give me an option to select the routes that i checked at checkbox and capture all the selected routes as png 
step-3
segment each section of the image of route using ai 
repeat the same process for all routes 
step 4 
convert the segmented images into sections with the section details and create a draft.md file which will contain all the details of the routes 
step 5
now generate reusable components under section in the sections.md file
like this:
featured collections:
-collection card:
  -image
  -title
  -description
  -link

step 6
read the sections.md file and list down all unique components from the file in a components.md file 
after the all components are listed down, components under sections under routes will be noted in the components.md file
like this:

```markdown
# Components
#1 collection card
- image
- title
- description
- link      

#2 product card
- image
- title
- price
- link  
.....
.....
#50 footer
- logo
- links:
  - link1
  - link2
  - link3      

#Home page
- hero section:
  - background image
  - title
  - subtitle
  - cta button
- featured collections:
  - collection card:
    - image
    - title
    - description
    - link
- footer
  - logo
  - links:
    - link1
    - link2
    - link3
```
p-1
```
@workspace
i don't want to generate the react components in this step, i just want to generate the sections.md file and components.md file
```