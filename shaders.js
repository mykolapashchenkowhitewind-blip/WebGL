'use strict';

// Vertex shader for Phong shading
const vertexShaderSource = `
attribute vec3 vertex;
attribute vec3 normal;
uniform mat4 ModelViewProjectionMatrix;
uniform mat4 ModelViewMatrix;
uniform mat3 NormalMatrix; // For transforming normals
uniform vec3 lightPosition; // In world space

varying vec3 fragNormal;
varying vec3 fragPosition;
varying vec3 fragLightPosition;

void main() {
    // Transform vertex to clip space
    gl_Position = ModelViewProjectionMatrix * vec4(vertex, 1.0);
    
    // Pass transformed normal to fragment shader
    // IMPORTANT: Invert the normal direction to fix shadow orientation
    fragNormal = NormalMatrix * (-normal);
    
    // Pass vertex position in view space for lighting calculations
    fragPosition = vec3(ModelViewMatrix * vec4(vertex, 1.0));
    
    // Pass light position to fragment shader
    fragLightPosition = vec3(ModelViewMatrix * vec4(lightPosition, 1.0));
}`;

// Fragment shader for Phong lighting
const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
   precision highp float;
#else
   precision mediump float;
#endif

varying vec3 fragNormal;
varying vec3 fragPosition;
varying vec3 fragLightPosition;

// Material properties
uniform vec3 materialAmbient;
uniform vec3 materialDiffuse;
uniform vec3 materialSpecular;
uniform float shininess;

// Light properties
uniform vec3 lightColor; // Light color

void main() {
    // Normalize vectors (required for correct lighting)
    // Ensure normal is correctly oriented (pointing outward from the surface)
    vec3 normal = normalize(fragNormal);
    
    // Calculate vector from fragment to light
    vec3 lightDir = normalize(fragLightPosition - fragPosition);
    
    // Calculate view direction vector (viewer at origin in view space)
    // Using global viewer model as per hint - fixed direction (0,0,1)
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
    
    // Calculate ambient component (controlled ambient for better shadows)
    vec3 ambient = materialAmbient;
    
    // Calculate diffuse component with light color
    // The dot product determines how directly the light hits the surface
    // A value of 1.0 means the light is hitting directly, 0.0 means it's at 90 degrees
    // and negative values mean the light is coming from behind the surface
    float diffuseFactor = dot(normal, lightDir);
    
    // Only apply lighting where the light actually hits the surface (front-facing)
    diffuseFactor = max(diffuseFactor, 0.0);
    
    // Apply stronger non-linearity to the diffuse factor for very dramatic shadows
    // Higher exponent (2.0) creates a much sharper transition between light and shadow
    diffuseFactor = pow(diffuseFactor, 2.0); 
    
    // Calculate final diffuse color
    vec3 diffuse = materialDiffuse * lightColor * diffuseFactor;
    
    // Calculate specular component (Phong reflection model) with light color
    vec3 reflectDir = reflect(-lightDir, normal);
    float specularFactor = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = materialSpecular * lightColor * specularFactor;
    
    // Combine all lighting components
    vec3 finalColor = ambient + diffuse + specular;
    
    // Set final fragment color
    gl_FragColor = vec4(finalColor, 1.0);
}`;