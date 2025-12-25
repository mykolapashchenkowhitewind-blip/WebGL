# Enhanced Cornucopia Surface WebGL Visualization

This project implements a WebGL visualization of an enhanced Cornucopia surface with pronounced curl, rendered as a wireframe model with two sets of polylines (U-lines and V-lines).

## Surface Definition

The Cornucopia surface is a special case of a spiral-shaped surface "Shell without vertex". It is a cyclic surface with generatrix circles of variable radius. Our enhanced version uses modified parameters and additional transformations to create a more dramatic spiral effect:

Base equation: R(u) = e^(pu)

Parameters (matching reference image):
- p = 0.1 (standard parameter as shown in reference)
- m = 0.2 (standard parameter as shown in reference)
- 0 ≤ u ≤ 4π (expanded range for complete disk-like spiral)
- 0 ≤ v ≤ 2π

Visualization features:
- Rainbow color gradient matching the reference image
- Grid-like wireframe appearance with clear U and V lines
- Flat, disk-like spiral structure
- Higher resolution sampling with 80×60 grid for smooth appearance
- Optimized camera angle to match the reference image view

## Implementation Details

The implementation uses WebGL for rendering and consists of the following components:

1. **Model Object**: The `CornucopiaModel` object in `model.js` contains the implementation of:
   - Parametric equations for the Cornucopia surface
   - Functions to generate vertices for U-polylines (constant v, varying u)
   - Functions to generate vertices for V-polylines (constant u, varying v)
   - Drawing function that renders both sets of polylines

2. **Data Structure**:
   - U-polylines: Represent circles in the v-direction at fixed u values
   - V-polylines: Represent spiral curves in the u-direction at fixed v values
   - Both sets of polylines are stored in separate WebGL buffers

## How to Launch

1. Clone or download the repository
2. Open the `index.html` file in a modern web browser that supports WebGL
3. You should see the Cornucopia surface rendered as a wireframe
4. Use mouse drag (or touch on touchscreens) to rotate the model

## Controls

- **Mouse Drag**: Rotate the model
- **Touch and Drag**: Rotate the model (on touch-enabled devices)

## Technical Requirements

- A modern web browser with WebGL support (Chrome, Firefox, Edge, Safari)
- JavaScript enabled

## File Structure

- `index.html`: Main HTML file
- `main.js`: WebGL initialization and main drawing loop
- `model.js`: Cornucopia model implementation with parametric equations
- `shader.gpu`: Vertex and fragment shaders
- `Utils/`: Helper utilities
  - `m4.js`: Matrix operations for 3D transformations
  - `trackball-rotator.js`: Mouse rotation implementation

## Task Description

This project was created as a part of a practical assignment to render a wireframe model of an analytical surface using WebGL. The Cornucopia surface was chosen as the specific variant.

The implementation draws the surface wireframe as two sets of vertices:
- A set of U polylines (with constant v parameter)
- A set of V polylines (with constant u parameter)