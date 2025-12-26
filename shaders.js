'use strict';

// Vertex shader for Phong shading with normal mapping
const vertexShaderSource = `
attribute vec3 vertex;
attribute vec3 normal;
attribute vec3 tangent;
attribute vec3 bitangent;
attribute vec2 texCoord;

uniform mat4 ModelViewProjectionMatrix;
uniform mat4 ModelViewMatrix;
uniform mat3 NormalMatrix; // For transforming normals
uniform vec3 lightPosition; // In world space

// Texture transformation uniforms
uniform vec2 texReferencePoint; // Reference point for transformations (u,v)
uniform float texScaleFactor;   // Scale factor 
uniform float texRotationAngle; // Rotation angle in radians

varying vec3 fragNormal;
varying vec3 fragTangent;
varying vec3 fragBitangent;
varying vec3 fragPosition;
varying vec3 fragLightPosition;
varying vec2 fragTexCoord;

// Function to transform texture coordinates based on scaling/rotation
vec2 transformTexCoords(vec2 texCoords, vec2 refPoint, float scale, float angle) {
    // Translate to reference point origin
    vec2 centered = texCoords - refPoint;
    
    // Apply scale and rotation
    float s = sin(angle);
    float c = cos(angle);
    
    // Create rotation matrix
    mat2 rotation = mat2(
        c, -s,
        s, c
    );
    
    // Apply scale and rotation
    vec2 transformed;
    
    // First apply scaling around reference point
    vec2 scaled = centered * scale;
    
    #ifdef ENABLE_ROTATION
        // Then apply rotation around reference point if rotation is enabled
        transformed = rotation * scaled;
    #else
        // Otherwise just use the scaled coordinates
        transformed = scaled;
    #endif
    
    // Translate back from reference point
    return transformed + refPoint;
}

void main() {
    // Transform vertex to clip space
    gl_Position = ModelViewProjectionMatrix * vec4(vertex, 1.0);
    
    // Pass transformed normal to fragment shader
    // IMPORTANT: Invert the normal direction to fix shadow orientation
    fragNormal = normalize(NormalMatrix * (-normal));
    
    // Transform tangent and bitangent to view space
    fragTangent = normalize(NormalMatrix * tangent);
    fragBitangent = normalize(NormalMatrix * bitangent);
    
    // Pass vertex position in view space for lighting calculations
    fragPosition = vec3(ModelViewMatrix * vec4(vertex, 1.0));
    
    // Pass light position to fragment shader
    fragLightPosition = vec3(ModelViewMatrix * vec4(lightPosition, 1.0));
    
    // Apply texture transformation and pass texture coordinates to fragment shader
    fragTexCoord = transformTexCoords(texCoord, texReferencePoint, texScaleFactor, texRotationAngle);
}`;

// Fragment shader for Phong lighting with normal mapping
const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
   precision highp float;
#else
   precision mediump float;
#endif

varying vec3 fragNormal;
varying vec3 fragTangent;
varying vec3 fragBitangent;
varying vec3 fragPosition;
varying vec3 fragLightPosition;
varying vec2 fragTexCoord;

// Material properties
uniform vec3 materialAmbient;
uniform vec3 materialDiffuse;
uniform vec3 materialSpecular;
uniform float shininess;

// Light properties
uniform vec3 lightColor; // Light color

// Texture samplers
uniform sampler2D textureDiffuse;
uniform sampler2D textureSpecular;
uniform sampler2D textureNormal;

void main() {
    // Sample textures
    vec4 diffuseColor = texture2D(textureDiffuse, fragTexCoord);
    
    // The roughness map is the inverse of specularity
    // Convert from roughness to specular by inverting: specular = 1.0 - roughness
    vec4 roughnessColor = texture2D(textureSpecular, fragTexCoord);
    vec4 specularColor = vec4(vec3(1.0 - roughnessColor.r), 1.0);
    
    vec3 normalMapColor = texture2D(textureNormal, fragTexCoord).rgb;
    
    // Convert normal map from [0, 1] to [-1, 1] range
    vec3 normalTangentSpace = normalMapColor * 2.0 - 1.0;
    
    // Construct TBN matrix (Tangent, Bitangent, Normal) for transforming normal from tangent space to view space
    // This matrix transforms vectors from tangent space to view space
    mat3 TBN = mat3(
        normalize(fragTangent),
        normalize(fragBitangent),
        normalize(fragNormal)
    );
    
    // Transform normal from tangent space to view space
    vec3 normal = normalize(TBN * normalTangentSpace);
    
    // Calculate vector from fragment to light
    vec3 lightDir = normalize(fragLightPosition - fragPosition);
    
    // Calculate view direction vector (viewer at origin in view space)
    // Using global viewer model as per hint - fixed direction (0,0,1)
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
    
    // Calculate ambient component (controlled ambient for better shadows)
    // Modulated by diffuse texture
    vec3 ambient = materialAmbient * diffuseColor.rgb;
    
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
    
    // Calculate final diffuse color - modulated by diffuse texture
    vec3 diffuse = materialDiffuse * lightColor * diffuseFactor * diffuseColor.rgb;
    
    // Calculate specular component (Phong reflection model) with light color
    vec3 reflectDir = reflect(-lightDir, normal);
    float specularFactor = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    
    // Modulate specular by specular texture
    vec3 specular = materialSpecular * lightColor * specularFactor * specularColor.rgb;
    
    // Combine all lighting components
    vec3 finalColor = ambient + diffuse + specular;
    
    // Set final fragment color
    gl_FragColor = vec4(finalColor, 1.0);
}`;