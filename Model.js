

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// p: an array of xyz vertex coords
// t: an array of uv tex coords
function Vertex(p, t)
{
    this.p = p;
    this.t = t;
    this.normal = [];
    this.triangles = [];
}

function Triangle(v0, v1, v2)
{
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.normal = [];
    this.tangent = [];
}

// Model Constructor function
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTexCoordsBuffer = gl.createBuffer();
    this.iIndexBuffer  = gl.createBuffer();
    this.count = 0;

    // Identifier of a diffuse texture
    this.idTextureDiffuse  = -1;
    this.idTextureSpecular = -1;


    this.BufferData = function(vertices, indices, texCoords) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        this.count = indices.length;
    }

    this.Draw = function() {

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.idTextureDiffuse);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.idTextureSpecular);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordsBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexCoords, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexCoords);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);

        //gl.drawArrays(gl.LINE_STRIP, 0, this.count);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }
}


function CreateSurfaceData(data)
{
    let vertices = [];
    let triangles = [];

    for (let i=0, ang = 0; i<72; i++, ang+=5) {
        vertices.push( new Vertex( [Math.sin(deg2rad(ang)), 0, Math.cos(deg2rad(ang))], [ang/360, 0] ));
    }

    for (let i=0, ang = 0; i<72; i++, ang+=5) {

        let v0ind = vertices.length;
        vertices.push( new Vertex( [Math.sin(deg2rad(ang)), 1, Math.cos(deg2rad(ang))], [ang/360, 1] ));

        // v0    v2 
        //   o - o
        //   | \ |
        //   o - o
        // v3     v1

        if (i > 0)
        {
            let v1ind = v0ind - 72 -1;
            let v2ind = v0ind - 1;
            let v3ind = v0ind - 72;

            let trian = new Triangle(v0ind, v1ind, v2ind);
            let trianInd = triangles.length;

            triangles.push( trian );
            vertices[v0ind].triangles.push(trianInd);
            vertices[v1ind].triangles.push(trianInd);
            vertices[v2ind].triangles.push(trianInd);

            let trian2 = new Triangle(v0ind, v3ind, v1ind);
            let trianInd2 = triangles.length;

            triangles.push( trian2 );
            vertices[v0ind].triangles.push(trianInd2);
            vertices[v3ind].triangles.push(trianInd2);
            vertices[v1ind].triangles.push(trianInd2);
        }
    }

    data.verticesF32 = new Float32Array(vertices.length*3);
    data.texcoordsF32 = new Float32Array(vertices.length*2);
    for (let i=0, len=vertices.length; i<len; i++)
    {
        data.verticesF32[i*3 + 0] = vertices[i].p[0];
        data.verticesF32[i*3 + 1] = vertices[i].p[1];
        data.verticesF32[i*3 + 2] = vertices[i].p[2];

        data.texcoordsF32[i*2 + 0] = vertices[i].t[0];
        data.texcoordsF32[i*2 + 1] = vertices[i].t[1];
    }

    data.indicesU16 = new Uint16Array(triangles.length*3);
    for (let i=0, len=triangles.length; i<len; i++)
    {
        data.indicesU16[i*3 + 0] = triangles[i].v0;
        data.indicesU16[i*3 + 1] = triangles[i].v1;
        data.indicesU16[i*3 + 2] = triangles[i].v2;
    }

}