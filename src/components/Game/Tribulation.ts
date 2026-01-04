import * as THREE from "three";
import { AudioManager } from "@/lib/audio";

type TribulationState = "inactive" | "active" | "cooldown";

interface Strike {
    mesh: THREE.Mesh; // The warning marker
    active: boolean;
    timer: number;
}

export class TribulationManager {
    state: TribulationState = "inactive";
    private scene: THREE.Scene;

    // Visuals
    private clouds: THREE.Group;
    private lightnings: THREE.Line[] = [];
    private warningGeo: THREE.CylinderGeometry;
    private warningMat: THREE.MeshBasicMaterial;
    private originalFogColor: THREE.Color | null = null;
    private targetFogColor = new THREE.Color("#1a0b2e"); // Deep Purple

    // Logic
    private duration = 0;
    private strikeTimer = 0;
    private strikes: Strike[] = [];
    private readonly STRIKE_DELAY = 1.5; // Warning duration
    private speed = 0;

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        // Cloud Ring
        this.clouds = new THREE.Group();
        const cloudGeo = new THREE.RingGeometry(15, 50, 16);
        const cloudMat = new THREE.MeshBasicMaterial({
            color: 0x220033,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
        cloudMesh.rotation.x = -Math.PI / 2;
        cloudMesh.position.y = 15;
        this.clouds.add(cloudMesh);
        this.scene.add(this.clouds);

        // Warning Marker Asset
        this.warningGeo = new THREE.CylinderGeometry(1, 1, 0.1, 32);
        this.warningMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }

    trigger(duration = 15) {
        if (this.state === "active") {
            this.duration += duration;
            return;
        }
        this.state = "active";
        this.duration = duration;
        this.strikeTimer = 0;

        if (this.scene.fog) {
            this.originalFogColor = (this.scene.fog as THREE.Fog).color.clone();
        }
    }

    update(delta: number, speed: number, playerPos: THREE.Vector3, onHit: () => void) {
        this.speed = speed;

        // 1. Atmosphere Animation
        if (this.scene.fog && this.originalFogColor) {
            const fog = this.scene.fog as THREE.Fog;
            if (this.state === "active") {
                fog.color.lerp(this.targetFogColor, delta * 1.5);
                this.clouds.children[0].material.opacity = THREE.MathUtils.lerp(this.clouds.children[0].material.opacity, 0.6, delta);
                this.clouds.rotation.y += delta * 0.2;
            } else {
                fog.color.lerp(this.originalFogColor, delta * 0.5);
                this.clouds.children[0].material.opacity = THREE.MathUtils.lerp(this.clouds.children[0].material.opacity, 0, delta);
                if (this.clouds.children[0].material.opacity < 0.01) {
                    this.clouds.visible = false;
                    this.state = "inactive";
                    return;
                }
            }
        }
        this.clouds.visible = this.clouds.children[0].material.opacity > 0.01;

        if (this.state !== "active" && this.strikes.length === 0 && this.lightnings.length === 0) return;

        // 2. Gameplay Logic
        if (this.state === "active") {
            this.duration -= delta;
            if (this.duration <= 0) {
                this.state = "cooldown";
            }

            // Spawn logic
            this.strikeTimer -= delta;
            if (this.strikeTimer <= 0) {
                this.spawnWarning(playerPos);
                // Panic mode: strikes get faster as time goes on or random?
                this.strikeTimer = 0.8 + Math.random() * 1.2;
            }
        }

        // 3. Update Strikes (Warnings)
        const travel = speed * delta;
        for (let i = this.strikes.length - 1; i >= 0; i--) {
            const strike = this.strikes[i];
            strike.mesh.position.z += travel; // Move with world speed towards player
            strike.timer -= delta;

            // Pulse warning
            strike.mesh.visible = Math.sin(strike.timer * 20) > 0;

            if (strike.timer <= 0) {
                // Trigger bolt
                this.spawnBolt(strike.mesh.position);

                // Check Hit
                // Strike is at mesh position. Player is at playerPos.
                // Check distance (ignore Y)
                const dx = Math.abs(strike.mesh.position.x - playerPos.x);
                const dz = Math.abs(strike.mesh.position.z - playerPos.z);

                if (dx < 1.0 && dz < 1.5) {
                    // If player has shield, maybe shield handles it? Call onHit to let Main loop decide
                    onHit();
                }

                // Remove warning
                this.scene.remove(strike.mesh);
                this.strikes.splice(i, 1);
            }
        }

        // 4. Update Lightnings
        for (let i = this.lightnings.length - 1; i >= 0; i--) {
            const bolt = this.lightnings[i];
            (bolt.material as THREE.LineBasicMaterial).opacity -= delta * 3.0; // Fade out
            if ((bolt.material as THREE.LineBasicMaterial).opacity <= 0) {
                this.scene.remove(bolt);
                bolt.geometry.dispose();
                this.lightnings.splice(i, 1);
            }
        }
    }

    private spawnWarning(playerPos: THREE.Vector3) {
        // Predict where to spawn
        // Spawn ahead of the player 
        // Distance depends on speed? If speed is 20m/s, and Delay is 1.5s, it travels 30m.
        // If we spawn at Z = playerPos.z - 30, it will reach player exactly when timer ends.
        // To force reaction, maybe spawn slightly closer or further?
        // "Dodgeable": Player sees red circle moving towards them? No, usually in these games Markers are grounded and move with track.
        // Yes, `strike.mesh.position.z += travel` simulates moving with track.

        const spawnDist = this.speed * this.STRIKE_DELAY;
        const lanes = [-2, 0, 2];
        // Weighted random: 50% chance to pick player's current lane to force move
        let lane = lanes[Math.floor(Math.random() * lanes.length)];
        if (Math.random() < 0.5) {
            // Find lane closest to player currently
            const currentLane = Math.round(playerPos.x / 2) * 2; // -2, 0, 2
            lane = currentLane;
        }

        const warning = new THREE.Mesh(this.warningGeo, this.warningMat.clone());
        warning.position.set(lane, 0.1, playerPos.z - spawnDist);
        this.scene.add(warning);

        this.strikes.push({
            mesh: warning,
            active: true,
            timer: this.STRIKE_DELAY
        });
    }

    private spawnBolt(target: THREE.Vector3) {
        const geometry = new THREE.BufferGeometry();
        const points = [];
        let currentPos = new THREE.Vector3(target.x, 20, target.z);
        points.push(currentPos.clone());

        // Jagged line down
        const segments = 10;
        for (let i = 0; i < segments; i++) {
            currentPos.y -= 20 / segments;
            currentPos.x += (Math.random() - 0.5) * 1.5;
            currentPos.z += (Math.random() - 0.5) * 1.5;
            points.push(currentPos.clone());
        }
        points.push(target.clone()); // Connect to ground

        geometry.setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            linewidth: 3,
            transparent: true,
            opacity: 1
        });
        const bolt = new THREE.Line(geometry, material);
        this.scene.add(bolt);
        this.lightnings.push(bolt);
    }

    dispose() {
        this.scene.remove(this.clouds);
        this.strikes.forEach(s => this.scene.remove(s.mesh));
        this.lightnings.forEach(l => this.scene.remove(l));
    }
}
