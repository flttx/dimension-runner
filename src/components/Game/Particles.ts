import * as THREE from "three";

interface Particle {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    color: THREE.Color;
    life: number;
    maxLife: number;
    scale: number;
    active: boolean;
}

const MAX_PARTICLES = 500;

export class ParticleSystem {
    private mesh: THREE.InstancedMesh;
    private particles: Particle[] = [];
    private dummy = new THREE.Object3D();
    private geometry: THREE.BufferGeometry;
    private material: THREE.MeshBasicMaterial;

    constructor(scene: THREE.Scene) {
        this.geometry = new THREE.PlaneGeometry(0.5, 0.5);
        this.material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, MAX_PARTICLES);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(this.mesh);

        // Initialize pool
        for (let i = 0; i < MAX_PARTICLES; i++) {
            this.particles.push({
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                color: new THREE.Color(),
                life: 0,
                maxLife: 1,
                scale: 1,
                active: false
            });
        }
    }

    emit(position: THREE.Vector3, color: THREE.ColorRepresentation, count = 10) {
        const pColor = new THREE.Color(color);
        let spawned = 0;

        for (const p of this.particles) {
            if (spawned >= count) break;
            if (p.active) continue;

            p.active = true;
            p.life = 1.0;
            p.maxLife = 0.5 + Math.random() * 0.5;
            p.scale = 0.5 + Math.random() * 0.5;
            p.position.copy(position);
            p.position.x += (Math.random() - 0.5) * 1.0;
            p.position.y += (Math.random() - 0.5) * 1.0;
            p.position.z += (Math.random() - 0.5) * 1.0;

            // Explosion velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            p.color.copy(pColor);

            p.velocity.set(
                (Math.random() - 0.5) * speed * 2,
                (Math.random() - 0.5) * speed * 2,
                (Math.random() - 0.5) * speed * 2 + 5 // Forward momentum usually
            );

            spawned++;
        }
    }

    update(delta: number) {
        let activeCount = 0;

        this.particles.forEach((p, i) => {
            if (!p.active) {
                this.mesh.setMatrixAt(i, new THREE.Matrix4().scale(new THREE.Vector3(0, 0, 0)));
                return;
            }

            p.life -= delta;
            if (p.life <= 0) {
                p.active = false;
                this.mesh.setMatrixAt(i, new THREE.Matrix4().scale(new THREE.Vector3(0, 0, 0)));
                return;
            }

            // Physics
            p.velocity.y -= 9.8 * delta; // Gravity
            p.position.addScaledVector(p.velocity, delta);

            // Render
            this.dummy.position.copy(p.position);
            const lifeRatio = p.life / p.maxLife;
            const currentScale = p.scale * lifeRatio;
            this.dummy.scale.setScalar(currentScale);
            this.dummy.lookAt(this.dummy.position.clone().add(new THREE.Vector3(0, 0, 1))); // Billboarding approximation
            // Actually simpler to just rotate to match camera if we passed camera, but screen aligned quads are okay-ish fixed or random rotation
            this.dummy.rotation.z += delta * 5; // Spin

            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
            this.mesh.setColorAt(i, p.color);

            activeCount++;
        });

        if (activeCount > 0) {
            this.mesh.count = MAX_PARTICLES;
            this.mesh.instanceMatrix.needsUpdate = true;
            if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
            this.mesh.visible = true;
        } else {
            this.mesh.visible = false;
        }
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}
