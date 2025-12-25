'use strict';

/**
 * Cornucopia Surface - Parametric Surface Implementation with Phong Shading
 * 
 * Parameters:
 * p = 0.15; m = 0.1
 * 0 ≤ u ≤ 5π; 0 ≤ v ≤ 2π
 * 
 * Parametric equations:
 * x(u,v) = [e^(mu) + e^(pu)cos(v)]cos(u)
 * y(u,v) = [e^(mu) + e^(pu)cos(v)]sin(u)
 * z(u,v) = e^(pu)sin(v)
 */

// Global variables
let gl;                 // WebGL context
let surface;            // Cornucopia surface model
let lightSource;        // Light source object
let shProgram;          // Shader program
let spaceball;          // Trackball rotator
let lightAngle = 0;     // Angle for rotating light
let lightRotationSpeed = 0.002; // Speed of light rotation (reduced for slower movement)
let lightRadius = 20;   // Distance of light from origin (moved even closer to the model)
let meshUpdateNeeded = false;  // Flag to indicate if the mesh needs to be updated
let lastTime = 0;       // Last frame timestamp for constant movement

/**
 * CornucopiaModel class to create and render the surface
 */
/**
 * LightSourceModel class for creating and rendering a visible light source
 */
function LightSourceModel() {
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.normalBuffer = null;
    this.vertices = [];
    this.indices = [];
    this.normals = [];
    this.numVertices = 0;
    this.numIndices = 0;
    this.position = [0, 0, 0]; // Current position of the light
    this.radius = .5; // Smaller radius for the light sphere
    
    /**
     * Generate a sphere mesh for the light source
     */
    this.generateSphere = function() {
        // Sphere parameters
        const segments = 16;
        const rings = 16;
        
        this.vertices = [];
        this.indices = [];
        this.normals = [];
        
        // Generate vertices
        for (let ring = 0; ring <= rings; ring++) {
            const theta = ring * Math.PI / rings;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            
            for (let segment = 0; segment <= segments; segment++) {
                const phi = segment * 2 * Math.PI / segments;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                
                // Vertex position
                const x = this.radius * cosPhi * sinTheta;
                const y = this.radius * sinPhi * sinTheta;
                const z = this.radius * cosTheta;
                
                // Add vertex to the array
                this.vertices.push(x, y, z);
                
                // Normal vector is simply the normalized position vector for a sphere
                this.normals.push(cosPhi * sinTheta, sinPhi * sinTheta, cosTheta);
            }
        }
        
        // Generate indices for triangle strips
        for (let ring = 0; ring < rings; ring++) {
            const ringStart = ring * (segments + 1);
            const nextRingStart = (ring + 1) * (segments + 1);
            
            for (let segment = 0; segment < segments; segment++) {
                // Triangle 1
                this.indices.push(ringStart + segment);
                this.indices.push(nextRingStart + segment);
                this.indices.push(ringStart + segment + 1);
                
                // Triangle 2
                this.indices.push(ringStart + segment + 1);
                this.indices.push(nextRingStart + segment);
                this.indices.push(nextRingStart + segment + 1);
            }
        }
        
        this.numVertices = this.vertices.length / 3;
        this.numIndices = this.indices.length;
    };
    
    /**
     * Initialize the light source object by creating a sphere
     */
    this.initialize = function() {
        // Generate the light sphere
        this.generateSphere();
        
        // Create and populate the vertex buffer
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
        
        // Create and populate the normal buffer
        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
        
        // Create and populate the index buffer
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
    };
    
    /**
     * Update the position of the light source
     */
    this.updatePosition = function(position) {
        this.position = position;
    };
    
    /**
     * Draw the light source
     */
    this.draw = function(shaderProgram, modelViewMatrix, projectionMatrix) {
        // Bind vertex buffer and set attribute pointer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(shaderProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.iAttribVertex);
        
        // Bind normal buffer and set attribute pointer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(shaderProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.iAttribNormal);
        
        // Bind index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        
        // Set light material properties (yellow color for the light source ball)
        gl.uniform3fv(shaderProgram.iMaterialAmbient, [0.8, 0.8, 0.0]);
        gl.uniform3fv(shaderProgram.iMaterialDiffuse, [1.0, 1.0, 0.0]);
        gl.uniform3fv(shaderProgram.iMaterialSpecular, [1.0, 1.0, 0.3]);
        gl.uniform1f(shaderProgram.iShininess, 30.0); // Some shininess for a more vibrant yellow
        
        // Create a model matrix for the light source
        const lightModelMatrix = m4.translation(
            this.position[0], 
            this.position[1], 
            this.position[2]
        );
        
        // Apply the light's model matrix
        const savedModelViewMatrix = new Float32Array(16);
        for (let i = 0; i < 16; i++) {
            savedModelViewMatrix[i] = modelViewMatrix[i]; // Save the current matrix
        }
        
        // Combine matrices
        const lightModelViewMatrix = m4.multiply(modelViewMatrix, lightModelMatrix);
        const lightMVP = m4.multiply(projectionMatrix, lightModelViewMatrix);
        
        // Calculate normal matrix for the light
        const lightNormalMatrix = calculateNormalMatrix(lightModelViewMatrix, new Float32Array(9));
        
        // Set the new matrices for drawing the light
        gl.uniformMatrix4fv(shaderProgram.iModelViewProjectionMatrix, false, lightMVP);
        gl.uniformMatrix4fv(shaderProgram.iModelViewMatrix, false, lightModelViewMatrix);
        gl.uniformMatrix3fv(shaderProgram.iNormalMatrix, false, lightNormalMatrix);
        
        // Draw the light sphere
        gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);
        
        // Restore the original modelview matrix
        gl.uniformMatrix4fv(shaderProgram.iModelViewMatrix, false, savedModelViewMatrix);
        
        // Restore the original normal matrix
        const originalNormalMatrix = calculateNormalMatrix(savedModelViewMatrix, new Float32Array(9));
        gl.uniformMatrix3fv(shaderProgram.iNormalMatrix, false, originalNormalMatrix);
    };
}

/**
 * CornucopiaModel class to create and render the surface
 */
function CornucopiaModel() {
    // Surface parameters - exactly as shown in Fig. 2
    this.p = 0.1;
    this.m = 0.2;
    this.uMin = 0;
    this.uMax = 4 * Math.PI;
    this.vMin = 0;
    this.vMax = 2 * Math.PI;
    
    // Number of segments for the grid (adjustable via sliders)
    this.uSegments = 80;
    this.vSegments = 40;
    
    // Buffers for the triangular mesh
    this.vertexBuffer = null;
    this.normalBuffer = null;
    this.indexBuffer = null;
    this.numVertices = 0;
    this.numIndices = 0;

    // Array to store vertex positions for normal calculation
    this.vertices = [];
    this.normals = [];
    this.indices = [];
    
    /**
     * Calculate a point on the surface using the parametric equations
     */
    this.computePoint = function(u, v) {
        const ePu = Math.exp(this.p * u); // e^(pu)
        const eMu = Math.exp(this.m * u); // e^(mu)
        
        return {
            x: (eMu + ePu * Math.cos(v)) * Math.cos(u),
            y: (eMu + ePu * Math.cos(v)) * Math.sin(u),
            z: ePu * Math.sin(v)
        };
    };
    
    /**
     * Calculate the analytical normal at a point by computing the cross product
     * of the tangent vectors along u and v directions
     */
    this.computeAnalyticalNormal = function(u, v) {
        const ePu = Math.exp(this.p * u);
        const eMu = Math.exp(this.m * u);
        
        // Partial derivative with respect to u
        const dxdu = -1 * (eMu + ePu * Math.cos(v)) * Math.sin(u) 
                   + (this.m * eMu + this.p * ePu * Math.cos(v)) * Math.cos(u);
        const dydu = (eMu + ePu * Math.cos(v)) * Math.cos(u) 
                   + (this.m * eMu + this.p * ePu * Math.cos(v)) * Math.sin(u);
        const dzdu = this.p * ePu * Math.sin(v);
        
        // Partial derivative with respect to v
        const dxdv = -1 * ePu * Math.sin(v) * Math.cos(u);
        const dydv = -1 * ePu * Math.sin(v) * Math.sin(u);
        const dzdv = ePu * Math.cos(v);
        
        // Cross product to find normal vector
        const nx = dydu * dzdv - dzdu * dydv;
        const ny = dzdu * dxdv - dxdu * dzdv;
        const nz = dxdu * dydv - dydu * dxdv;
        
        // Normalize the normal vector
        const length = Math.sqrt(nx*nx + ny*ny + nz*nz);
        return {
            x: nx / length,
            y: ny / length,
            z: nz / length
        };
    };
    
    /**
     * Generate the triangular mesh vertices and indices
     */
    this.generateMesh = function() {
        console.log("Generating mesh with segments: U=" + this.uSegments + ", V=" + this.vSegments);
        
        this.vertices = [];
        this.normals = [];
        this.indices = [];
        
        // Generate vertices
        for (let uIndex = 0; uIndex <= this.uSegments; uIndex++) {
            const u = this.uMin + (uIndex / this.uSegments) * (this.uMax - this.uMin);
            
            for (let vIndex = 0; vIndex <= this.vSegments; vIndex++) {
                const v = this.vMin + (vIndex / this.vSegments) * (this.vMax - this.vMin);
                const point = this.computePoint(u, v);
                
                // Store vertex
                this.vertices.push(point.x, point.y, point.z);
                
                // Calculate analytical normal for now (will be replaced with facet average)
                const normal = this.computeAnalyticalNormal(u, v);
                this.normals.push(normal.x, normal.y, normal.z);
            }
        }
        
        // Generate indices for triangle strips
        for (let uIndex = 0; uIndex < this.uSegments; uIndex++) {
            for (let vIndex = 0; vIndex < this.vSegments; vIndex++) {
                const vertexIndex = uIndex * (this.vSegments + 1) + vIndex;
                
                // First triangle
                this.indices.push(vertexIndex);
                this.indices.push(vertexIndex + 1);
                this.indices.push(vertexIndex + this.vSegments + 1);
                
                // Second triangle
                this.indices.push(vertexIndex + 1);
                this.indices.push(vertexIndex + this.vSegments + 2);
                this.indices.push(vertexIndex + this.vSegments + 1);
            }
        }
        
        this.numVertices = this.vertices.length / 3;
        this.numIndices = this.indices.length;
    };
    
    /**
     * Calculate facet normals for each triangle
     */
    this.calculateFacetNormals = function() {
        const facetNormals = [];
        
        // Initialize facet normals array
        for (let i = 0; i < this.numIndices / 3; i++) {
            facetNormals.push({ x: 0, y: 0, z: 0 });
        }
        
        // Calculate normal for each triangle
        for (let i = 0; i < this.numIndices; i += 3) {
            const idx1 = this.indices[i];
            const idx2 = this.indices[i + 1];
            const idx3 = this.indices[i + 2];
            
            const v1x = this.vertices[idx1 * 3];
            const v1y = this.vertices[idx1 * 3 + 1];
            const v1z = this.vertices[idx1 * 3 + 2];
            
            const v2x = this.vertices[idx2 * 3];
            const v2y = this.vertices[idx2 * 3 + 1];
            const v2z = this.vertices[idx2 * 3 + 2];
            
            const v3x = this.vertices[idx3 * 3];
            const v3y = this.vertices[idx3 * 3 + 1];
            const v3z = this.vertices[idx3 * 3 + 2];
            
            // Calculate vectors for two sides of the triangle
            const ax = v2x - v1x;
            const ay = v2y - v1y;
            const az = v2z - v1z;
            
            const bx = v3x - v1x;
            const by = v3y - v1y;
            const bz = v3z - v1z;
            
            // Cross product to get normal (ensure consistent outward-facing normal)
            // Using right-hand rule for cross product (matches WebGL's CCW winding order)
            const nx = ay * bz - az * by;
            const ny = az * bx - ax * bz;
            const nz = ax * by - ay * bx;
            
            // We're using counter-clockwise vertex winding, so this normal should point outward
            
            // Normalize
            const length = Math.sqrt(nx*nx + ny*ny + nz*nz);
            
            if (length > 0) {
                facetNormals[i/3] = {
                    x: nx / length,
                    y: ny / length,
                    z: nz / length
                };
            } else {
                facetNormals[i/3] = {
                    x: 0,
                    y: 0,
                    z: 1  // Default normal if length is zero
                };
            }
        }
        
        return facetNormals;
    };
    
    /**
     * Calculate vertex normals using facet average method
     */
    this.calculateFacetAverageNormals = function() {
        // Reset normals array
        this.normals = new Array(this.numVertices * 3).fill(0);
        
        // Get facet normals
        const facetNormals = this.calculateFacetNormals();
        
        // Map to track which facets are adjacent to each vertex
        const vertexFacets = new Array(this.numVertices).fill().map(() => []);
        
        // Associate each facet with its vertices
        for (let i = 0; i < this.numIndices; i += 3) {
            const faceIndex = i / 3;
            const idx1 = this.indices[i];
            const idx2 = this.indices[i + 1];
            const idx3 = this.indices[i + 2];
            
            vertexFacets[idx1].push(faceIndex);
            vertexFacets[idx2].push(faceIndex);
            vertexFacets[idx3].push(faceIndex);
        }
        
        // Calculate average normal for each vertex
        for (let i = 0; i < this.numVertices; i++) {
            let sumX = 0, sumY = 0, sumZ = 0;
            
            // Sum normals of all adjacent facets
            for (const facetIdx of vertexFacets[i]) {
                sumX += facetNormals[facetIdx].x;
                sumY += facetNormals[facetIdx].y;
                sumZ += facetNormals[facetIdx].z;
            }
            
            // Normalize the result
            const length = Math.sqrt(sumX*sumX + sumY*sumY + sumZ*sumZ);
            if (length > 0) {
                this.normals[i * 3] = sumX / length;
                this.normals[i * 3 + 1] = sumY / length;
                this.normals[i * 3 + 2] = sumZ / length;
            } else {
                // Default normal if length is zero
                this.normals[i * 3] = 0;
                this.normals[i * 3 + 1] = 0;
                this.normals[i * 3 + 2] = 1;
            }
        }
    };
    
    /**
     * Initialize the model by generating the mesh and setting up buffers
     */
    this.initialize = function() {
        console.log("Initializing Cornucopia with parameters:");
        console.log("p =", this.p, "m =", this.m);
        console.log("uMax =", this.uMax/Math.PI + "π", "vMax =", this.vMax/Math.PI + "π");
        console.log("uSegments =", this.uSegments, "vSegments =", this.vSegments);
        
        // Generate the mesh data
        this.generateMesh();
        
        // Calculate facet average normals
        this.calculateFacetAverageNormals();
        
        // Create and populate the vertex buffer
        if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
        
        // Create and populate the normal buffer
        if (this.normalBuffer) gl.deleteBuffer(this.normalBuffer);
        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
        
        // Create and populate the index buffer
        if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
    };
    
    /**
     * Update the surface with new granularity values
     */
    this.updateGranularity = function(uSegments, vSegments) {
        console.log("Updating granularity to: U=" + uSegments + ", V=" + vSegments);
        this.uSegments = uSegments;
        this.vSegments = vSegments;
        this.initialize();
    };
    
    /**
     * Draw the model
     */
    this.draw = function(shaderProgram) {
        // Bind vertex buffer and set attribute pointer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(shaderProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.iAttribVertex);
        
        // Bind normal buffer and set attribute pointer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(shaderProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.iAttribNormal);
        
        // Bind index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        
        // Set material properties (white color with very strong black shadows)
        gl.uniform3fv(shaderProgram.iMaterialAmbient, [0.01, 0.01, 0.01]);  // Almost no ambient light for very dark shadows
        gl.uniform3fv(shaderProgram.iMaterialDiffuse, [1.0, 1.0, 1.0]);     // Pure white diffuse color
        gl.uniform3fv(shaderProgram.iMaterialSpecular, [1.0, 1.0, 1.0]);    // Full white specular
        gl.uniform1f(shaderProgram.iShininess, 50.0);                      // Very high shininess for very sharp highlights
        
        // Draw the triangles
        gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);
    };
}

/**
 * Shader Program constructor
 */
function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    this.iModelViewProjectionMatrix = -1;
    this.iModelViewMatrix = -1;
    this.iNormalMatrix = -1;
    this.iLightPosition = -1;
    this.iLightColor = -1;
    this.iMaterialAmbient = -1;
    this.iMaterialDiffuse = -1;
    this.iMaterialSpecular = -1;
    this.iShininess = -1;
    
    this.use = function() {
        gl.useProgram(this.prog);
    };
}

/**
 * Calculate the normal matrix from the model-view matrix
 * Normal matrix is the transpose of the inverse of the top-left 3x3 of the model-view matrix
 */
function calculateNormalMatrix(modelViewMatrix, resultMatrix) {
    // Extract the 3x3 portion
    let a00 = modelViewMatrix[0], a01 = modelViewMatrix[1], a02 = modelViewMatrix[2];
    let a10 = modelViewMatrix[4], a11 = modelViewMatrix[5], a12 = modelViewMatrix[6];
    let a20 = modelViewMatrix[8], a21 = modelViewMatrix[9], a22 = modelViewMatrix[10];
    
    // Calculate the determinant
    let det = a00 * (a11 * a22 - a12 * a21) -
              a01 * (a10 * a22 - a12 * a20) +
              a02 * (a10 * a21 - a11 * a20);
    
    if (!det) {
        return resultMatrix || [1, 0, 0, 0, 1, 0, 0, 0, 1]; // Return identity if no det
    }
    
    det = 1.0 / det;
    
    if (!resultMatrix) {
        resultMatrix = new Float32Array(9);
    }
    
    // Calculate the inverse
    resultMatrix[0] = (a11 * a22 - a12 * a21) * det;
    resultMatrix[1] = (a02 * a21 - a01 * a22) * det;
    resultMatrix[2] = (a01 * a12 - a02 * a11) * det;
    resultMatrix[3] = (a12 * a20 - a10 * a22) * det;
    resultMatrix[4] = (a00 * a22 - a02 * a20) * det;
    resultMatrix[5] = (a02 * a10 - a00 * a12) * det;
    resultMatrix[6] = (a10 * a21 - a11 * a20) * det;
    resultMatrix[7] = (a01 * a20 - a00 * a21) * det;
    resultMatrix[8] = (a00 * a11 - a01 * a10) * det;
    
    return resultMatrix;
}

/**
 * Update the light position for animation
 * @param {number} timestamp - Current timestamp from requestAnimationFrame
 */
function updateLightPosition(timestamp) {
    // Calculate time delta for smooth animation
    const deltaTime = (timestamp - lastTime) || 0;
    lastTime = timestamp;
    
    // Rotate light around the surface at a constant speed
    // Using deltaTime ensures consistent speed regardless of frame rate
    lightAngle += lightRotationSpeed * deltaTime;
    
    // Keep angle in the [0, 2π] range
    if (lightAngle > 2 * Math.PI) {
        lightAngle -= 2 * Math.PI;
    }
    
    // Calculate light position (elliptical orbit with height variation)
    // Use modified position to ensure proper shadow direction
    const lightX = lightRadius * Math.cos(lightAngle);
    const lightY = lightRadius * Math.sin(lightAngle);
    // Ensure light is always above the surface with sufficient height
    const lightZ = 15 + Math.sin(lightAngle * 0.5); // Height varies between 30 and 45
    
    return [lightX, lightY, lightZ];
}

/**
 * Draw function
 * @param {number} timestamp - Current timestamp from requestAnimationFrame
 */
function draw(timestamp) {
    // Apply mesh updates if needed
    if (meshUpdateNeeded) {
        updateMeshFromSliders();
        meshUpdateNeeded = false;
    }
    
    gl.clearColor(1, 1, 1, 1); // Changed from black (0,0,0) to white (1,1,1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Set up viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    // Create custom transformation matrices
    const aspect = gl.canvas.width/gl.canvas.height;
    const znear = 1;
    const zfar = 200;
    const fov = Math.PI/3; // 60 degrees field of view
    
    // Create a projection matrix
    const projectionMatrix = m4.perspective(fov, aspect, znear, zfar);
    
    // Get user rotation from trackball
    let modelViewMatrix = spaceball.getViewMatrix();
    
    // Translate back to see the whole structure (moved further for better view)
    const moveBack = m4.translation(0, 0, -70);
    
    // Update light position for animation
    const lightPosition = updateLightPosition(timestamp);
    
    // Update light source object position
    lightSource.updatePosition(lightPosition);
    
    // Apply transformations (right to left)
    modelViewMatrix = m4.multiply(moveBack, modelViewMatrix);
    
    // Calculate the combined model-view-projection matrix
    const mvpMatrix = m4.multiply(projectionMatrix, modelViewMatrix);
    
    // Calculate normal matrix (for transforming normals)
    const normalMatrix = calculateNormalMatrix(modelViewMatrix, new Float32Array(9));
    
    // Set shader uniforms
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, mvpMatrix);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix3fv(shProgram.iNormalMatrix, false, normalMatrix);
    gl.uniform3fv(shProgram.iLightPosition, lightPosition);
    gl.uniform3fv(shProgram.iLightColor, [1.0, 1.0, 1.0]); // Pure white light
    
    // Draw the surface model
    surface.draw(shProgram);
    
    // Draw the light source
    lightSource.draw(shProgram, modelViewMatrix, projectionMatrix);
    
    // Request next frame for animation
    requestAnimationFrame(draw);
}

/**
 * Update mesh from slider values
 */
function updateMeshFromSliders() {
    const uGranSlider = document.getElementById("u-granularity");
    const vGranSlider = document.getElementById("v-granularity");
    
    if (uGranSlider && vGranSlider) {
        const uSegments = parseInt(uGranSlider.value);
        const vSegments = parseInt(vGranSlider.value);
        
        // Update the display values
        document.getElementById("u-gran-value").textContent = uSegments;
        document.getElementById("v-gran-value").textContent = vSegments;
        
        console.log("Updating mesh from sliders: U=" + uSegments + ", V=" + vSegments);
        
        // Update the surface
        if (surface) {
            surface.updateGranularity(uSegments, vSegments);
        }
    }
}

/**
 * Create shader program
 */
function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    // Create and compile vertex shader
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vertexShaderSource);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader: " + gl.getShaderInfoLog(vsh));
    }
    
    // Create and compile fragment shader
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fragmentShaderSource);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader: " + gl.getShaderInfoLog(fsh));
    }
    
    // Create program and link shaders
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program: " + gl.getProgramInfoLog(prog));
    }
    
    return prog;
}

/**
 * Initialize WebGL
 */
function initGL() {
    // Create shader program
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    
    // Create shader program object
    shProgram = new ShaderProgram("Basic", prog);
    shProgram.use();
    
    // Get attribute and uniform locations
    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");
    shProgram.iLightColor = gl.getUniformLocation(prog, "lightColor");
    shProgram.iMaterialAmbient = gl.getUniformLocation(prog, "materialAmbient");
    shProgram.iMaterialDiffuse = gl.getUniformLocation(prog, "materialDiffuse");
    shProgram.iMaterialSpecular = gl.getUniformLocation(prog, "materialSpecular");
    shProgram.iShininess = gl.getUniformLocation(prog, "shininess");
    
    // Create surface model
    surface = new CornucopiaModel();
    surface.initialize();
    
    // Create light source model
    lightSource = new LightSourceModel();
    lightSource.initialize();
    
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
}

/**
 * Set up UI controls
 */
function setupControls() {
    const uGranSlider = document.getElementById("u-granularity");
    const vGranSlider = document.getElementById("v-granularity");
    
    if (uGranSlider && vGranSlider) {
        // Initialize display values
        const uGranValue = document.getElementById("u-gran-value");
        const vGranValue = document.getElementById("v-gran-value");
        
        if (uGranValue) uGranValue.textContent = uGranSlider.value;
        if (vGranValue) vGranValue.textContent = vGranSlider.value;
        
        // Set slider values to match current model
        if (surface) {
            uGranSlider.value = surface.uSegments;
            vGranSlider.value = surface.vSegments;
        }
        
        // Add direct input event handlers that update on drag
        uGranSlider.addEventListener("input", function() {
            if (uGranValue) uGranValue.textContent = uGranSlider.value;
            meshUpdateNeeded = true; // Flag for update on next frame
        });
        
        vGranSlider.addEventListener("input", function() {
            if (vGranValue) vGranValue.textContent = vGranSlider.value;
            meshUpdateNeeded = true; // Flag for update on next frame
        });
        
        console.log("UI sliders initialized successfully");
    } else {
        console.warn("Could not find granularity sliders");
    }
}

/**
 * Main initialization function
 */
function init() {
    try {
        console.log("Initializing WebGL application...");
        
        // Get the canvas and initialize WebGL
        let canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (!gl) {
            throw "Browser doesn't support WebGL";
        }
        
        // Initialize GL and create the scene
        initGL();
        
        // Create trackball for rotation
        spaceball = new TrackballRotator(canvas, draw, 0);
        
        // Set up UI controls after GL is initialized
        setupControls();
        
        // Initial drawing of the scene
        draw();
        
        console.log("3D Cornucopia surface initialized successfully with Phong shading and Facet Average normals!");
    } catch (e) {
        console.error("ERROR: " + e);
        document.getElementById("canvas-holder").innerHTML = 
            "<p style='color:red'><b>Error:</b> " + e + "</p>";
    }
}