btw Antigravity will always read the GEMINI.md file whenever you give any prompt

Always read the docs https://www.remotion.dev/llms.txt
Always create temporary files, scratch files, or intermediate data files inside a `temp/` folder in the project root so they can be easily deleted later. Do not clutter the root directory.

## Do's
- **Animation Pacing & Frames**: If an animation is big (e.g., panning the map across a long distance or across the globe), ensure there is a **good amount of frames** allocated for it. Moving the camera too fast over a short frame window overwhelms the tile downloader, resulting in dropped frames, hanging renders, and flickering. Give the map time to fetch tiles smoothly!