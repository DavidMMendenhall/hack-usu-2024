// @ts-check
import { Graphics } from "./graphics/render.js";
import { quaternionFromAngle } from "./math/quaternion.js";
import { subtract } from "./math/vector.js";
import { loadPLY } from "./modelLoader/modelLoader.js";
import { computeNormals } from "./modelLoader/normals.js";
import { Physics } from "./physics/physics.js";

let pot = await loadPLY("./assets/models/pot.ply", true);
let tree = await loadPLY("./assets/models/tree.ply", false);
let iron = await loadPLY("./assets/models/iron.ply", false);
let level = await loadPLY("./assets/models/eyeglass-lake.ply", false);

let inputQuaternion = quaternionFromAngle(0, [1, 0, 0]);
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
    
    Graphics.camera.position = {x: 0, y:15, z:0};
    Graphics.camera.target = {x: 0, y:10, z:-5};
    Graphics.addToDrawQueue(iron, [{
        position: {x:0, y:10, z: -5},
        scale: {x: 1, y:1, z:1},
        quaternion: inputQuaternion,
    },])
    // Graphics.camera.target = testSphere.position;
    // Graphics.camera.position = subtract(testSphere.position, {x:0, y:-5, z:10})
    // Graphics.camera.position.y = 50;
    // Graphics.camera.position.x = Math.cos(d * 0.00) * 200;
    // Graphics.camera.position.z = Math.sin(d * 0.00) * 200;
    Graphics.draw();
    requestAnimationFrame(frame)
    // console.log(testSphere)
}


/** @param {string} msg */
window.readRemoteMessage = function(msg) { 
    let data = JSON.parse(msg.data);
    if(data.data){
        inputQuaternion.i = data.data[0];
        inputQuaternion.j = data.data[2];
        inputQuaternion.k = data.data[1];
        inputQuaternion.w = data.data[3];
    }
    // console.log(inputQuaternion);
    // console.log(msg);
    // console.log(data);

}
// requestAnimationFrame(frame)

window.onConnection = function() {
    for (const el of document.getElementsByTagName("canvas")) {
        el.style.visibility = "visible";
    }
    requestAnimationFrame(frame)
}
