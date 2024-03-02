// @ts-check
import { multiplyQuaternion, quaternionFromAngle } from "../math/quaternion.js";
import { add, cross, magnitude, reflect, scale } from "../math/vector.js";
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
        let sphereDirection = scale(sphere.velocity, 1 / magnitude(sphere.velocity));
        let sphereSurfacePoint = add(sphere.position, scale(sphereDirection, sphere.radius));
        if(bvh && levelGeometry){
            // project sphere velocity to detect colision
            let intersection = bvh.findIntersection({point:sphere.position, dir:sphere.velocity});
            if(intersection.point){
                if(intersection.point.t > delta){
                    sphere.position = add(sphere.position, scale(sphere.velocity, delta));
                } else {
                    // colision
                    let surfaceNormal = computeFaceNormal(levelGeometry, intersection.face);
                    sphere.position = add(sphere.position, scale(sphere.velocity, intersection.point.t));
                    sphere.velocity = reflect(sphere.velocity, surfaceNormal);
                    sphere.position = add(sphere.position, scale(sphere.velocity, delta - intersection.point.t));
                    let rotAxes = cross(sphere.velocity, surfaceNormal);
                    sphere.axisOfRotation = rotAxes;
                    sphere.rotationalVelocity = magnitude(rotAxes);
                }
            } else {
                sphere.position = add(sphere.position, scale(sphere.velocity, delta));
            }
            sphere.quaternion = multiplyQuaternion(sphere.quaternion, quaternionFromAngle(sphere.rotationalVelocity * delta, [sphere.axisOfRotation.x, sphere.axisOfRotation.y, sphere.axisOfRotation.z]))
            // console.log(intersection.hitNodes);
            // console.log(intersection.testedNodes.length);
            // debugger;
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