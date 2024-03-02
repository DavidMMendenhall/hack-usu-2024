// @ts-check
import { Graphics } from "./graphics/render.js";
import { quaternionFromAngle } from "./math/quaternion.js";
import { loadPLY } from "./modelLoader/modelLoader.js";
import { computeNormals } from "./modelLoader/normals.js";

let pot = await loadPLY("./assets/models/pot.ply", false);
let tree = await loadPLY("./assets/models/tree.ply", false);
let iron = await loadPLY("./assets/models/iron.ply", false);
// computeNormals(iron);
// Graphics.camera.position.z = 2;
let frame = (d) => {
    Graphics.addToDrawQueue(pot, [
        {
            position: {x:2, y:0, z: 0},
            scale: {x: 1, y:1, z:1},
            quaternion: quaternionFromAngle(0, [1, 0, 0]),
        }
    ]);
    Graphics.addToDrawQueue(tree, [
        {
            position: {x:-2, y:0, z: 0},
            scale: {x: 1, y:1, z:1},
            quaternion: quaternionFromAngle(0, [1, 0, 1]),
        },
    ]);

    Graphics.addToDrawQueue(iron, [
        {
            position: {x:0, y:0, z: 0},
            scale: {x: 1, y:1, z:1},
            quaternion: quaternionFromAngle(0, [1, 0, 1]),
        },
        {
            position: {x:0, y:1, z: 0},
            scale: {x: 1, y:1, z:1},
            quaternion: quaternionFromAngle(0, [1, 0, 1]),
        }
    ]);
    Graphics.camera.position.y = 5;
    Graphics.camera.position.x = Math.cos(d * 0.001) * 15;
    Graphics.camera.position.z = Math.sin(d * 0.001) * 15;
    Graphics.draw();
    requestAnimationFrame(frame)
}

frame();