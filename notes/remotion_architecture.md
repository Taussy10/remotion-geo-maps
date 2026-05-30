# Remotion Architecture Comparison: Direct TSX vs. JSON-Driven Engine

In Remotion, there are two primary design patterns you can use to build videos.

---

## Comparison of Design Patterns

### 1. Direct React/TSX Coding (Hardcoded Timings & Layouts)
You write all layout markup, timings, interpolations, and scene transitions directly inside your React components (`.tsx` / `.jsx`).

* **Pros:**
  * **Infinite Flexibility:** You can write custom inline styling, canvas drawing, hooks, and complex logic for any specific frame on the fly.
  * **Direct DOM Control:** Standard React workflow where everything is in a single place.
* **Cons:**
  * **Heavy Redundancy:** You repeat the same layout structures (captions, borders, zooms) with slightly different frame interpolations.
  * **Code Bloat:** A 38-scene script will result in a 5,000+ line React component, causing memory issues, bundling lag, and slow development.
  * **Low Replicability:** To make a new video with the same style but different locations (e.g., Canada instead of Korea), you have to duplicate the entire component and edit all coordinates and frames by hand.

### 2. Config-Driven Engine (Generic TSX + JSON Storyboard)



* **Pros:**
  * **High Replicability:** To create a new video (e.g., Canada Map Video), you just write a new JSON file. The React engine remains unchanged.
  * **Extremely Fast Storyboarding:** Adding or tweaking scenes takes seconds because you are only editing text and numbers in a structured JSON file.
  * **Separation of Concerns:** Designers modify the TSX code to style the map and labels; script writers modify the JSON file to define the timings and captions.
  * **Zero Code Redundancy:** The React component maps over the storyboard scenes, so the code length doesn't grow with the video duration.
* **Cons:**
  * **Initial Setup Cost:** Requires building a robust engine that knows how to parse and animate camera paths, layer visibilities, and captions.
  * **Constraint Bounds:** You can only do what the JSON schema supports. If scene 25 requires a brand-new custom animation not in the schema, you must extend the React Engine to support that configuration.

---

## Our Refactoring Plan for the Korea Map Video

We are going to implement the **Config-Driven Engine** to handle the remaining 28 scenes efficiently:

1. **Create the Storyboard:** Save a JSON configuration at `src/korea_storyboard.json` containing the coordinates, timings, and captions for the first 10 scenes.
2. **Implement the Engine:** Rewrite `src/KoreaComposition.tsx` to accept the JSON storyboard configuration, parse the active scene based on the current frame, and animate the camera/layers dynamically.
3. **Extend to 38 Scenes:** Append scenes 11 through 38 to `src/korea_storyboard.json` without writing any more TSX.
