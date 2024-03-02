// @ts-check
import { buildHierarchy } from "../primitiveStructures/boundingVolume.js";

/**
 * @typedef PhysicsSphere
 * @prop {number} radius
 * @prop {import("../math/geometry").Point} position
 * @prop {import("../math/geometry").Vector} velocity In meters per second
 * @prop {import("../math/quaternion.js").Quaternion} rotor
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
     * @param {import("../graphics/render").Model} geometry 
     */
    let setLevel = (geometry) => {
        levelGeometry = geometry;
        bvh = buildHierarchy(geometry, 20);
    }
})();

export { Physics }