'use strict';

AFRAME.registerComponent('cornucopia-surface', {
    schema: {
        p: { type: 'number', default: 0.1 },
        m: { type: 'number', default: 0.2 },
        uSegments: { type: 'int', default: 72 },
        vSegments: { type: 'int', default: 36 },
        uMax: { type: 'number', default: Math.PI * 4 },
        vMax: { type: 'number', default: Math.PI * 2 }
    },

    init: function() {
        const mesh = this.createCornucopiaMesh();
        this.el.setObject3D('mesh', mesh);

        const axes = new THREE.AxesHelper(1.6);
        axes.position.set(0, 0, 0);
        this.el.object3D.add(axes);

        const marker = document.getElementById('control-marker');
        const statusPanel = document.getElementById('status-panel');
        if (marker && statusPanel) {
            marker.addEventListener('markerFound', function() {
                statusPanel.firstChild.textContent = 'Marker detected. Cornucopia surface is registered.';
            });
            marker.addEventListener('markerLost', function() {
                statusPanel.firstChild.textContent = 'Point the camera at the printed registration marker.';
            });
        }
    },

    computePoint: function(u, v) {
        const ePu = Math.exp(this.data.p * u);
        const eMu = Math.exp(this.data.m * u);

        return new THREE.Vector3(
            (eMu + ePu * Math.cos(v)) * Math.cos(u),
            (eMu + ePu * Math.cos(v)) * Math.sin(u),
            ePu * Math.sin(v)
        );
    },

    createCornucopiaMesh: function() {
        const positions = [];
        const uvs = [];
        const indices = [];
        const min = new THREE.Vector3(Infinity, Infinity, Infinity);
        const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

        for (let ui = 0; ui <= this.data.uSegments; ui++) {
            const u = (ui / this.data.uSegments) * this.data.uMax;

            for (let vi = 0; vi <= this.data.vSegments; vi++) {
                const v = (vi / this.data.vSegments) * this.data.vMax;
                const point = this.computePoint(u, v);

                positions.push(point.x, point.y, point.z);
                uvs.push(ui / this.data.uSegments, vi / this.data.vSegments);
                min.min(point);
                max.max(point);
            }
        }

        for (let ui = 0; ui < this.data.uSegments; ui++) {
            for (let vi = 0; vi < this.data.vSegments; vi++) {
                const a = ui * (this.data.vSegments + 1) + vi;
                const b = a + 1;
                const c = a + this.data.vSegments + 1;
                const d = c + 1;

                indices.push(a, b, c);
                indices.push(b, d, c);
            }
        }

        const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] -= center.x;
            positions[i + 1] -= center.y;
            positions[i + 2] -= center.z;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0x41d98c,
            roughness: 0.58,
            metalness: 0.08,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });

        const mesh = new THREE.Mesh(geometry, material);
        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x101010, linewidth: 1 })
        );

        const group = new THREE.Group();
        group.add(mesh);
        group.add(wireframe);

        const light = new THREE.DirectionalLight(0xffffff, 1.4);
        light.position.set(1, 2, 2);
        group.add(light);
        group.add(new THREE.AmbientLight(0xffffff, 0.45));

        return group;
    }
});
