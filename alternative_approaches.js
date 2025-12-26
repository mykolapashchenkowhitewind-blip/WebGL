/**
 * Alternative Approaches for Normal Calculation
 * 
 * This file contains alternative methods for calculating normals and tangents
 * that were used in previous implementations. These are kept for reference
 * and comparison purposes but are not used in the main application.
 */

/**
 * OLD APPROACH
 * Calculate vertex normals using facet average method
 * This method averages the facet normals of all triangles adjacent to a vertex.
 * The teacher specifically noted that this is not the approach to use for var23,
 * which requires using facet normals directly without averaging.
 */
function calculateFacetAverageNormals() {
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
}

/**
 * OLD APPROACH
 * Apply facet normals directly to each vertex of each triangle
 * This was a transitional method that wasn't used in the final implementation.
 * The functionality is now integrated into calculateTangentsAndBitangentsWithFacetNormals.
 */
function applyFacetNormalsDirectly() {
    // Get facet normals
    const facetNormals = this.calculateFacetNormals();
    
    // Create a new normals array that has one normal per vertex of each face
    // This will result in duplicated vertices, but with different normals
    const newNormals = new Array(this.numIndices * 3).fill(0);
    
    // Apply the facet normal to each vertex of the triangle
    for (let i = 0; i < this.numIndices; i += 3) {
        const faceIndex = i / 3;
        const idx1 = this.indices[i] * 3;
        const idx2 = this.indices[i + 1] * 3;
        const idx3 = this.indices[i + 2] * 3;
        
        // For each vertex in the triangle, use the facet normal
        for (let j = 0; j < 3; j++) {
            newNormals[i * 3 + j] = facetNormals[faceIndex].x;
            newNormals[(i + 1) * 3 + j] = facetNormals[faceIndex].y;
            newNormals[(i + 2) * 3 + j] = facetNormals[faceIndex].z;
        }
    }
    
    // Replace the existing normals with the facet-based ones
    this.normals = newNormals;
}

/**
 * OLD APPROACH
 * Calculate tangent and bitangent vectors using Gram-Schmidt orthogonalization
 * Variant 23: Prioritize tangent, but using averaged normals instead of facet normals
 * 
 * The teacher indicated that this approach isn't what was expected for var23, which
 * should use facet normals directly rather than averaged normals.
 */
function calculateTangentsAndBitangents() {
    // Initialize arrays
    this.tangents = new Array(this.numVertices * 3).fill(0);
    this.bitangents = new Array(this.numVertices * 3).fill(0);
    
    // Temporary arrays to accumulate tangent/bitangent contributions from triangles
    const tan1 = new Array(this.numVertices * 3).fill(0);
    const tan2 = new Array(this.numVertices * 3).fill(0);
    
    // Calculate tangent and bitangent for each triangle
    for (let i = 0; i < this.numIndices; i += 3) {
        const i1 = this.indices[i];
        const i2 = this.indices[i + 1];
        const i3 = this.indices[i + 2];
        
        // Get vertex positions
        const v1 = [this.vertices[i1 * 3], this.vertices[i1 * 3 + 1], this.vertices[i1 * 3 + 2]];
        const v2 = [this.vertices[i2 * 3], this.vertices[i2 * 3 + 1], this.vertices[i2 * 3 + 2]];
        const v3 = [this.vertices[i3 * 3], this.vertices[i3 * 3 + 1], this.vertices[i3 * 3 + 2]];
        
        // Get texture coordinates
        const w1 = [this.texCoords[i1 * 2], this.texCoords[i1 * 2 + 1]];
        const w2 = [this.texCoords[i2 * 2], this.texCoords[i2 * 2 + 1]];
        const w3 = [this.texCoords[i3 * 2], this.texCoords[i3 * 2 + 1]];
        
        // Calculate edge vectors in 3D space
        const x1 = v2[0] - v1[0];
        const x2 = v3[0] - v1[0];
        const y1 = v2[1] - v1[1];
        const y2 = v3[1] - v1[1];
        const z1 = v2[2] - v1[2];
        const z2 = v3[2] - v1[2];
        
        // Calculate edge vectors in texture space
        const s1 = w2[0] - w1[0];
        const s2 = w3[0] - w1[0];
        const t1 = w2[1] - w1[1];
        const t2 = w3[1] - w1[1];
        
        // Calculate tangent and bitangent using the formula
        const r = 1.0 / (s1 * t2 - s2 * t1);
        const sdir = [
            (t2 * x1 - t1 * x2) * r,
            (t2 * y1 - t1 * y2) * r,
            (t2 * z1 - t1 * z2) * r
        ];
        const tdir = [
            (s1 * x2 - s2 * x1) * r,
            (s1 * y2 - s2 * y1) * r,
            (s1 * z2 - s2 * z1) * r
        ];
        
        // Accumulate tangent and bitangent for each vertex of the triangle
        for (const idx of [i1, i2, i3]) {
            tan1[idx * 3] += sdir[0];
            tan1[idx * 3 + 1] += sdir[1];
            tan1[idx * 3 + 2] += sdir[2];
            
            tan2[idx * 3] += tdir[0];
            tan2[idx * 3 + 1] += tdir[1];
            tan2[idx * 3 + 2] += tdir[2];
        }
    }
    
    // Gram-Schmidt orthogonalization for each vertex (prioritizing tangent - variant 23)
    for (let i = 0; i < this.numVertices; i++) {
        const n = [
            this.normals[i * 3],
            this.normals[i * 3 + 1],
            this.normals[i * 3 + 2]
        ];
        
        const t = [
            tan1[i * 3],
            tan1[i * 3 + 1],
            tan1[i * 3 + 2]
        ];
        
        const b = [
            tan2[i * 3],
            tan2[i * 3 + 1],
            tan2[i * 3 + 2]
        ];
        
        // Variant 23: Prioritize tangent
        // Step 1: Normalize the tangent
        let tLen = Math.sqrt(t[0] * t[0] + t[1] * t[1] + t[2] * t[2]);
        if (tLen > 0) {
            t[0] /= tLen;
            t[1] /= tLen;
            t[2] /= tLen;
        }
        
        // Step 2: Orthogonalize normal with respect to tangent
        // n' = n - (n · t) * t
        const nDotT = n[0] * t[0] + n[1] * t[1] + n[2] * t[2];
        const nPrime = [
            n[0] - nDotT * t[0],
            n[1] - nDotT * t[1],
            n[2] - nDotT * t[2]
        ];
        
        // Normalize the orthogonalized normal
        let nPrimeLen = Math.sqrt(nPrime[0] * nPrime[0] + nPrime[1] * nPrime[1] + nPrime[2] * nPrime[2]);
        if (nPrimeLen > 0) {
            nPrime[0] /= nPrimeLen;
            nPrime[1] /= nPrimeLen;
            nPrime[2] /= nPrimeLen;
        }
        
        // Update the normal (we keep the orthogonalized version)
        this.normals[i * 3] = nPrime[0];
        this.normals[i * 3 + 1] = nPrime[1];
        this.normals[i * 3 + 2] = nPrime[2];
        
        // Step 3: Calculate bitangent as cross product of normal and tangent
        // This ensures all three vectors are orthogonal
        const bPrime = [
            nPrime[1] * t[2] - nPrime[2] * t[1],
            nPrime[2] * t[0] - nPrime[0] * t[2],
            nPrime[0] * t[1] - nPrime[1] * t[0]
        ];
        
        // Normalize bitangent
        let bPrimeLen = Math.sqrt(bPrime[0] * bPrime[0] + bPrime[1] * bPrime[1] + bPrime[2] * bPrime[2]);
        if (bPrimeLen > 0) {
            bPrime[0] /= bPrimeLen;
            bPrime[1] /= bPrimeLen;
            bPrime[2] /= bPrimeLen;
        }
        
        // Store the orthogonalized tangent and bitangent
        this.tangents[i * 3] = t[0];
        this.tangents[i * 3 + 1] = t[1];
        this.tangents[i * 3 + 2] = t[2];
        
        this.bitangents[i * 3] = bPrime[0];
        this.bitangents[i * 3 + 1] = bPrime[1];
        this.bitangents[i * 3 + 2] = bPrime[2];
    }
}