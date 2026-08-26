import { Color, Entity, StandardMaterial } from 'playcanvas';

function makeMaterial(color) {
    const material = new StandardMaterial();
    material.diffuse = new Color(color[0], color[1], color[2]);
    material.roughness = 0.9;
    material.update();
    return material;
}

function addBox(parent, name, position, scale, material) {
    const entity = new Entity(name);
    entity.addComponent('render', { type: 'box' });
    entity.setLocalPosition(position[0], position[1], position[2]);
    entity.setLocalScale(scale[0], scale[1], scale[2]);
    entity.render.material = material;
    parent.addChild(entity);
    return entity;
}

export function buildWorld(app) {
    const root = new Entity('ClamourWorld');
    app.root.addChild(root);

    const ground = makeMaterial([0.06, 0.07, 0.09]);
    const building = makeMaterial([0.11, 0.12, 0.15]);
    const street = makeMaterial([0.18, 0.18, 0.20]);

    addBox(root, 'Ground', [0, -0.05, 0], [200, 0.1, 200], ground);
    addBox(root, 'ROAD_Main_01', [0, 0.01, 0], [12, 0.02, 200], street);

    for (const side of [-1, 1]) {
        for (let i = -5; i <= 5; i += 1) {
            const z = i * 14;
            const x = side * 14;
            addBox(root, `BLDG_Block_${side}_${i}`, [x, 4 + (i % 3), z], [8, 8 + (i % 3) * 2, 8], building);
        }
    }

    return { root };
}

export function destroyWorld(world) {
    world?.root?.destroy();
}
