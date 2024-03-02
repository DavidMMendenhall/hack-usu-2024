// @ts-check
import { Graphics } from "./graphics/render.js";
import { quaternionFromAngle } from "./math/quaternion.js";
import { subtract } from "./math/vector.js";
import { loadPLY } from "./modelLoader/modelLoader.js";
import { computeNormals } from "./modelLoader/normals.js";
import { Physics } from "./physics/physics.js";

let pot = await loadPLY("./assets/models/pot.ply", true);
let tree = await loadPLY("./assets/models/tree.ply", false);
let iron = await loadPLY("./assets/models/iron.ply", true);
let level = await loadPLY("./assets/models/eyeglass-lake.ply", false);
/** @type {import("./physics/physics.js").PhysicsSphere} */
let testSphere = {
    radius: 0.5,
    velocity: {x:1, y:0, z:1},
    position: {x:0.3, y:3, z:7},
    quaternion: quaternionFromAngle(0, [1, 0, 0]),
    rotationalVelocity: 1,
    axisOfRotation: {x:0, y:1, z:0},
}
Physics.setLevel(level);
// computeNormals(iron);
// Graphics.camera.position.z = 2;
let timeOld = -1;
let frame = (d) => {
    if(timeOld < 0){
        timeOld = d - 1;
    }
    let dt = (d - timeOld)/1000;
    timeOld = d;
    Physics.updateSphere(testSphere, {x:0, y:-9.8, z:0}, dt)
    Graphics.addToDrawQueue(pot, [
        {
            position: testSphere.position,
            scale: {x: 1, y:1, z:1},
            quaternion: testSphere.quaternion,
        }
    ]);
    // Graphics.addToDrawQueue(tree, [
    //     {
    //         position: {x:-2, y:0, z: 0},
    //         scale: {x: 1, y:1, z:1},
    //         quaternion: quaternionFromAngle(0, [1, 0, 1]),
    //     },
    // ]);

    // Graphics.addToDrawQueue(iron, [
    //     {
    //         position: {x:0, y:0, z: 0},
    //         scale: {x: 1, y:1, z:1},
    //         quaternion: quaternionFromAngle(0, [1, 0, 1]),
    //     },
    //     {
    //         position: {x:0, y:1, z: 0},
    //         scale: {x: 1, y:1, z:1},
    //         quaternion: quaternionFromAngle(0, [1, 0, 1]),
    //     }
    // ]);

    Graphics.addToDrawQueue(level, [{
        position: {x:0, y:0, z: 0},
        scale: {x: 1, y:1, z:1},
        quaternion: quaternionFromAngle(0, [1, 0, 1]),
    },])
    Graphics.camera.target = testSphere.position;
    Graphics.camera.position = subtract(testSphere.position, {x:0, y:-5, z:10})
    // Graphics.camera.position.y = 50;
    // Graphics.camera.position.x = Math.cos(d * 0.00) * 200;
    // Graphics.camera.position.z = Math.sin(d * 0.00) * 200;
    Graphics.draw();
    requestAnimationFrame(frame)
}

requestAnimationFrame(frame)

/** @param {string} msg */
window.readRemoteMessage = function(msg) { }

window.onConnection = function() {
    for (const el of document.getElementsByTagName("canvas")) {
        el.style.visibility = "visible";
    }
}
