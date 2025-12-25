'use strict';

/**
 * Cornucopia Surface - Fig. 2 Implementation
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
let shProgram;          // Shader program
let spaceball;          // Trackball rotator

/**
 * CornucopiaModel class to create and render the surface
 */
function CornucopiaModel() {
    // Surface parameters - exactly as shown in Fig. 2
    this.p = 0.15;
    this.m = 0.1;
    this.uMin = 0;
    this.uMax = 5 * Math.PI;
    this.vMin = 0;
    this.vMax = 2 * Math.PI;
    
    // Number of segments for the grid
    this.uSegments = 80;
    this.vSegments = 40;
    
    // Buffers for drawing the grid lines
    this.uLinesBuffer = null;
    this.vLinesBuffer = null;
    this.uLinesCount = 0;
    this.vLinesCount = 0;
    
    /**
     * Calculate a point on the surface using the parametric equations
     */
    this.computePoint = function(u, v) {
        const ePu = Math.exp(this.p * u); // e^(pu)
        const eMu = Math.exp(this.m * u); // e^(mu)
        
        // Use the exact formula from Fig. 2
        return {
            x: (eMu + ePu * Math.cos(v)) * Math.cos(u),
            y: (eMu + ePu * Math.cos(v)) * Math.sin(u),
            z: ePu * Math.sin(v)
        };
    };
    
    /**
     * Generate the U-polylines (lines of constant v)
     */
    this.generateULines = function() {
        let vertices = [];
        
        // Create lines for each v value
        for (let vIndex = 0; vIndex <= this.vSegments; vIndex++) {
            const v = this.vMin + (vIndex / this.vSegments) * (this.vMax - this.vMin);
            
            // Generate points along u for this v value
            for (let uIndex = 0; uIndex <= this.uSegments; uIndex++) {
                const u = this.uMin + (uIndex / this.uSegments) * (this.uMax - this.uMin);
                const point = this.computePoint(u, v);
                vertices.push(point.x, point.y, point.z);
            }
        }
        
        // Create buffer
        this.uLinesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uLinesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        this.uLinesCount = vertices.length / 3;
    };
    
    /**
     * Generate the V-polylines (circular cross-sections)
     */
    this.generateVLines = function() {
        let vertices = [];
        const numCircles = 40; // Number of circular cross-sections
        
        // Create circles at different u values
        for (let uIndex = 0; uIndex < numCircles; uIndex++) {
            // Distribute circles evenly
            const u = this.uMin + (uIndex / (numCircles - 1)) * (this.uMax - this.uMin);
            
            // Generate points around the circle at this u value
            for (let vIndex = 0; vIndex <= this.vSegments; vIndex++) {
                const v = this.vMin + (vIndex / this.vSegments) * (this.vMax - this.vMin);
                const point = this.computePoint(u, v);
                vertices.push(point.x, point.y, point.z);
            }
        }
        
        // Create buffer
        this.vLinesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vLinesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        this.vLinesCount = vertices.length / 3;
        this.numCircles = numCircles;
    };
    
    /**
     * Initialize the model by generating all vertices
     */
    this.initialize = function() {
        console.log("Initializing Cornucopia with parameters:");
        console.log("p =", this.p, "m =", this.m);
        console.log("uMax =", this.uMax/Math.PI + "π", "vMax =", this.vMax/Math.PI + "π");
        
        this.generateULines();
        this.generateVLines();
    };
    
    /**
     * Draw the model
     */
    this.draw = function(shaderProgram) {
        // Set color to green
        gl.uniform4fv(shaderProgram.iColor, [0.0, 1.0, 0.0, 1.0]);
        
        // Draw U-polylines
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uLinesBuffer);
        gl.vertexAttribPointer(shaderProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.iAttribVertex);
        
        // Draw each U-polyline
        const pointsPerULine = this.uSegments + 1;
        for (let i = 0; i <= this.vSegments; i++) {
            gl.drawArrays(gl.LINE_STRIP, i * pointsPerULine, pointsPerULine);
        }
        
        // Draw V-polylines (circular cross-sections)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vLinesBuffer);
        gl.vertexAttribPointer(shaderProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.iAttribVertex);
        
        // Draw each circular cross-section
        const pointsPerVLine = this.vSegments + 1;
        for (let i = 0; i < this.numCircles; i++) {
            gl.drawArrays(gl.LINE_LOOP, i * pointsPerVLine, pointsPerVLine);
        }
    };
}

/**
 * Shader Program constructor
 */
function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iModelViewProjectionMatrix = -1;
    this.iColor = -1;
    
    this.use = function() {
        gl.useProgram(this.prog);
    };
}

/**
 * Draw function
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Set up viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    // Create custom transformation matrices
    const aspect = gl.canvas.width/gl.canvas.height;
    const znear = 1;
    const zfar = 200;
    const fov = Math.PI/3; // 60 degrees field of view
    
    // Create a projection matrix
    const projection = m4.perspective(fov, aspect, znear, zfar);
    
    // Get user rotation from trackball
    let modelView = spaceball.getViewMatrix();
    
    // Create our custom view matrix to position the camera
    // Start with identity matrix
    const viewMatrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
    
    // Translate back to see the whole structure
    const moveBack = m4.translation(0, 0, -50);
    
    // Apply transformations (right to left)
    const combinedMatrix = m4.multiply(projection, moveBack);
    const finalMatrix = m4.multiply(combinedMatrix, modelView);
    
    // Send matrix to shader
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, finalMatrix);
    
    // Draw the model
    surface.draw(shProgram);
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
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    
    // Create model
    surface = new CornucopiaModel();
    surface.initialize();
    
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
}

/**
 * Main initialization function
 */
function init() {
    try {
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
        
        // Initial drawing of the scene
        draw();
        
        console.log("3D Cornucopia surface initialized successfully - you should now be able to see the entire structure!");
    } catch (e) {
        console.error("ERROR: " + e);
        document.getElementById("canvas-holder").innerHTML = 
            "<p style='color:red'><b>Error:</b> " + e + "</p>";
    }
}