// @ts-check
import { Graphics } from "./graphics/render.js";
import { quaternionFromAngle } from "./math/quaternion.js";
import { loadPLY } from "./modelLoader/modelLoader.js";
// import { computeNormals } from "./modelLoader/normals.js";

let pot = await loadPLY("./assets/models/pot.ply");
let tree = await loadPLY("./assets/models/tree.ply");
// computeNormals(pot);
// console.log(pot)
// Graphics.model = pot;
// Graphics.camera.position.z = 2;
let frame = (d) => {
    Graphics.addToDrawQueue(pot, [
        {
            position: {x:1, y:0, z: 0},
            scale: {x: 0.2, y:0.2, z:0.2},
            quaternion: quaternionFromAngle(Math.PI/2, [1, 0, 0]),
        },
        {
            position: {x:0, y:0, z: 0},
            scale: {x: 0.2, y:0.2, z:0.2},
            quaternion: quaternionFromAngle(Math.PI/2, [0, 1, 0]),
        }
    ]);
    Graphics.addToDrawQueue(tree, [
        {
            position: {x:-1, y:0, z: 0},
            scale: {x: 0.5, y:0.2, z:0.2},
            quaternion: quaternionFromAngle(Math.PI/2, [1, 0, 1]),
        },
        {
            position: {x:0, y:1, z: -1},
            scale: {x: 0.2, y:0.2, z:0.2},
            quaternion: quaternionFromAngle(Math.PI/2, [0, 1, 0]),
        }
    ]);
    Graphics.camera.position.y = 5;
    Graphics.camera.position.x = Math.cos(d * 0.001) * 15;
    Graphics.camera.position.z = Math.sin(d * 0.001) * 15;
    Graphics.draw();
    requestAnimationFrame(frame)
}

frame();