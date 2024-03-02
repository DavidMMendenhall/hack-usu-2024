// @ts-check
import { multiplyQuaternion, quaternionFromAngle } from "../math/quaternion.js";
import { add, cross, dot, magnitude, normalize, reflect, scale, subtract } from "../math/vector.js";
import { computeFaceNormal } from "../modelLoader/normals.js";
import { buildHierarchy } from "../primitiveStructures/boundingVolume.js";

/**
 * @typedef PhysicsSphere
 * @prop {number} radius
 * @prop {import("../math/geometry").Point} position
 * @prop {import("../math/geometry").Vector} velocity In meters per second
 * @prop {import("../math/vector.js").Vector} axisOfRotation
 * @prop {number} rotationalVelocity 
 * @prop {import("../math/quaternion.js").Quaternion} quaternion
 * 
*/

let Physics = (() => {
    /** @type {import("../primitiveStructures/boundingVolume").BVH | null} */
    let bvh = null;
    /** @type {import("../graphics/render").Model | null} */
    let levelGeometry = null;


    /**
     * 
     * @param {PhysicsSphere} sphere 
     * @param {import("../math/vector.js").Vector} gravity 
     * @param {number} delta in seconds
     */
    let updateSphere = (sphere, gravity, delta) => {
        sphere.velocity = add(sphere.velocity, scale(gravity, delta));
        if(bvh && levelGeometry){
            // project sphere velocity to detect colision
            
                let intersection = bvh.findIntersection({point:sphere.position, dir:sphere.velocity});
                if(intersection.point){
                    if(intersection.point.t < delta){
                        sphere.position = add(sphere.position, scale(sphere.velocity, delta));
                    } else {
                        // colision
                        // console.log("COL")
                        let surfaceNormal = computeFaceNormal(levelGeometry, intersection.face);
                        sphere.position = add(sphere.position, scale(sphere.velocity, intersection.point.t));
                        // travel -= intersection.point.t * delta - sphere.radius - 0.001;
                        // sphere.position = add(sphere.position, sphereBackTrack);
                        // let bouncyness = 
                        // levelGeometry.colors[levelGeometry.indices[intersection.face * 3 + 0] * 3 + 0] +
                        // levelGeometry.colors[levelGeometry.indices[intersection.face * 3 + 1] * 3 + 0] +
                        // levelGeometry.colors[levelGeometry.indices[intersection.face * 3 + 2] * 3 + 0];
                        // bouncyness /= 3;
                        // bouncyness += 0.01;
                        // let friction = 
                        // levelGeometry.colors[levelGeometry.indices[intersection.face * 3 + 0] * 3 + 2] +
                        // levelGeometry.colors[levelGeometry.indices[intersection.face * 3 + 1] * 3 + 2] +
                        // levelGeometry.colors[levelGeometry.indices[intersection.face * 3 + 2] * 3 + 2];
                        // friction /= 3;
                        // let frictionRatio = 1 + dot(normalize(sphere.velocity), surfaceNormal);
                        // friction= 0;
                        // bouncyness = 1;
                        // friction *= frictionRatio;
                        // bouncyness = Math.min(1.0, Math.max(0.75, bouncyness))
                        // friction = Math.max(0.1, friction);
                        sphere.velocity = reflect(sphere.velocity, surfaceNormal);
                        let rotAxes = cross(sphere.velocity, surfaceNormal);
                        sphere.axisOfRotation = rotAxes;
                        sphere.rotationalVelocity = magnitude(rotAxes) / sphere.radius / 2;
                    }
                } else {
                    sphere.position = add(sphere.position, scale(sphere.velocity, delta));
                }
                sphere.quaternion = multiplyQuaternion(sphere.quaternion, quaternionFromAngle(sphere.rotationalVelocity * delta, [sphere.axisOfRotation.x, sphere.axisOfRotation.y, sphere.axisOfRotation.z]));
        }
    }

    /**
     * 
     * @param {import("../graphics/render").Model} geometry 
     */
    let setLevel = (geometry) => {
        levelGeometry = geometry;
        bvh = buildHierarchy(geometry, 20);
        console.log(bvh)
    }

    return {
        setLevel,
        updateSphere,
    }
})();

export { Physics }