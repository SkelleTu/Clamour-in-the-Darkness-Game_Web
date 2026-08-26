import { Color, Entity, Script } from 'playcanvas';
import { createInputState, bindInput } from './input.mjs';
import { createPlayerState, updatePlayer, applyPlayerToEntity } from './player.mjs';
import { buildWorld, destroyWorld } from './world.mjs';

const RULES = {
    movement: {
        walkSpeed: 3.8,
        sprintSpeed: 6.2,
        acceleration: 18,
        deceleration: 22,
        gravity: -24,
        jumpHeight: 1.45,
        controllerHeight: 1.8
    },
    camera: {
        eyeHeight: 1.62,
        lookSensitivity: 0.075,
        minPitch: -78,
        maxPitch: 82
    },
    vitals: {
        maxHealth: 100,
        maxStamina: 100,
        sprintDrainPerSecond: 20,
        staminaRegenPerSecond: 12,
        exhaustionThreshold: 1
    }
};

class ClamourRuntime extends Script {
    static scriptName = 'clamourRuntime';

    initialize() {
        this.app.scene.ambientLight = new Color(0.08, 0.09, 0.12);

        this.cameraEntity = this.entity.findByName('Camera') ?? new Entity('Camera');
        if (!this.cameraEntity.camera) {
            this.cameraEntity.addComponent('camera', {
                clearColor: new Color(0.015, 0.02, 0.03, 1),
                fov: 72,
                nearClip: 0.05,
                farClip: 2000
            });
        }
        if (!this.cameraEntity.parent) this.app.root.addChild(this.cameraEntity);

        const light = new Entity('MoonLight');
        light.addComponent('light', {
            type: 'directional',
            color: new Color(0.55, 0.62, 0.82),
            intensity: 0.8,
            castShadows: true
        });
        light.setEulerAngles(55, 25, 0);
        this.app.root.addChild(light);

        this.playerEntity = this.entity.findByName('Player') ?? new Entity('Player');
        if (!this.playerEntity.render) {
            this.playerEntity.addComponent('render', { type: 'capsule' });
        }
        this.playerEntity.render.enabled = false;
        if (!this.playerEntity.parent) this.app.root.addChild(this.playerEntity);

        this.world = buildWorld(this.app);
        this.player = createPlayerState(RULES.movement);
        this.playerInput = createInputState();
        this.cleanupInput = bindInput(this.playerInput, this.app.graphicsDevice.canvas);

        this.app.graphicsDevice.canvas.setAttribute('data-clamour-runtime', 'playcanvas-esm');
        window.__CLAMOUR_PLAYCANVAS_RUNTIME__ = {
            version: 'esm-1',
            getState: () => this.getRuntimeState()
        };
    }

    update(dt) {
        const result = updatePlayer(this.player, this.playerInput, Math.min(dt, 0.1), {
            ...RULES.movement,
            ...RULES.camera,
            ...RULES.vitals
        });

        applyPlayerToEntity(
            this.playerEntity,
            this.player,
            this.cameraEntity,
            RULES.camera.eyeHeight
        );

        this.playerInput.jump = false;
        this.playerInput.interact = false;

        if (this.app.graphicsDevice.canvas) {
            this.app.graphicsDevice.canvas.dataset.playerSpeed = String(result.horizontalSpeed);
            this.app.graphicsDevice.canvas.dataset.fps = String(Math.round(this.app.stats.frame.fps));
        }
    }

    getRuntimeState() {
        return {
            scene: this.app.root.name,
            player: {
                x: this.player.position.x,
                y: this.player.position.y,
                z: this.player.position.z,
                yaw: this.player.yaw,
                pitch: this.player.pitch,
                grounded: this.player.onGround,
                health: this.player.health,
                stamina: this.player.stamina
            },
            camera: {
                yaw: this.player.yaw,
                pitch: this.player.pitch
            },
            performance: {
                fps: this.app.stats.frame.fps
            }
        };
    }

    destroy() {
        this.cleanupInput?.();
        delete window.__CLAMOUR_PLAYCANVAS_RUNTIME__;
        destroyWorld(this.world);
        super.destroy();
    }
}

export { ClamourRuntime };
