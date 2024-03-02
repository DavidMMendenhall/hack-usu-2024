// @ts-check
import { getIdenity4x4Matricies, inverseMatrix4x4, lookAt, scaleMatrix4x4, translate } from "../math/matrix.js";
import { projectionPerspectiveFOV } from "../math/projection.js";
import { matrixFromQuaternion } from "../math/quaternion.js";
import { identityMatrix4x4, multiplyMatrix4x4 } from "../modelLoader/utilities.js";
import { buildProgramFromFiles } from "./graphicsUtil.js";

let canvas = document.createElement('canvas');
canvas.id = 'canvas';
/** @type {WebGL2RenderingContext} */
// @ts-ignore
let gl = canvas.getContext('webgl2');
if(!gl){
    throw "Unable to get webgl2 context";
}
document.getElementById("game-holder")?.appendChild(canvas);

/**
 * @typedef Model
 * @prop {Float32Array} vertices
 * @prop {Float32Array} normals
 * @prop {Float32Array} colors
 * @prop {Float32Array} textures
 * @prop {Uint32Array} indices
 * @prop {number} [_modelId]
 */

/**
 * @typedef Pose
 * @prop {{x:number, y:number, z:number}} position
 * @prop {{x:number, y:number, z:number}} scale
 * @prop {import("../math/quaternion.js").Quaternion} quaternion
 */

/**
 * @typedef Camera
 * @prop {import("../math/geometry").Point} position
 * @prop {import("../math/geometry").Point} target
 * @prop {import("../math/vector").Vector} up
 * @prop {number} fieldOfView Radians
 * @prop {number} near
 * @prop {number} far
 */

/**
 * @typedef DrawBatch
 * @prop {Pose[]} poses
 * @prop {number} modelId
 */

/**
 * @typedef BufferSet
 * @prop {WebGLBuffer} vertex
 * @prop {WebGLBuffer} color
 * @prop {WebGLBuffer} normal
 * @prop {WebGLBuffer} texture
 * @prop {WebGLBuffer} matrix
 * @prop {WebGLBuffer} index
 */


/**
 * @typedef ModelData private data for keeping track of models
 * @prop {Float32Array} matricies
 * @prop {number} allocatedCount
 * @prop {WebGLVertexArrayObject} VAO
 * @prop {BufferSet} buffers
 * @prop {number} indexCount
 */

/**
 * Builds a projection matrix for a camera
 * @param {Camera} camera
 * @param {Float32Array} [destination]
 */
let getCameraMatrix = (camera, destination) => {
    if(destination){
        return inverseMatrix4x4(lookAt(camera.position, camera.target, camera.up), destination);
    }
    return inverseMatrix4x4(lookAt(camera.position, camera.target, camera.up));
};

let aspectNeedsUpdate = true;

let resize = () => {
    let cRect = canvas.getBoundingClientRect();
    canvas.width = cRect.width;
    canvas.height = cRect.height;
    gl.viewport(0, 0, canvas.width, canvas.height);
    aspectNeedsUpdate = true;
}
window.addEventListener('resize', resize);
resize();

let clear = () => {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.colorMask(true, true, true, true);
    gl.clearColor(0.5, 0.5, 0.7, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.colorMask(true, true, true, false);// dont wirte alpha data
}

/**
 * 
 * @param {Float32Array | Uint16Array | Uint32Array} data 
 * @param {number} type
 * @param {number} [usage]
 */
let writeNewBuffer = (data, type, usage=gl.STATIC_DRAW) => {
    let buffer = gl.createBuffer();
    if(!buffer){
        throw "failed to create webgl buffer";
    }
    gl.bindBuffer(type, buffer);
    gl.bufferData(type, data, usage);
    gl.bindBuffer(type, null);
    return buffer;
}

/**
 * 
 * @param {Model} model
 * @param {number} instanceCount
 */
let bufferModelData = (model, instanceCount) => {
    return {
        vertex: writeNewBuffer(model.vertices, gl.ARRAY_BUFFER),
        color: writeNewBuffer(model.colors, gl.ARRAY_BUFFER),
        normal: writeNewBuffer(model.normals, gl.ARRAY_BUFFER), 
        texture: writeNewBuffer(model.textures, gl.ARRAY_BUFFER),
        matrix:writeNewBuffer(getIdenity4x4Matricies(instanceCount), gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW),
        index: writeNewBuffer(model.indices, gl.ELEMENT_ARRAY_BUFFER),
    }
}

/**
 * 
 * @param {BufferSet} buffers 
 */
let createAttribArray = (buffers, attributes) => {
    let vao = gl.createVertexArray();
    if(!vao){
        throw "Failed to create Vertex Array";
    }

    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(attributes.position, 3, gl.FLOAT, false, 4 * 3, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.enableVertexAttribArray(attributes.color);
    gl.vertexAttribPointer(attributes.color, 4, gl.FLOAT, false, 4 * 4, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.enableVertexAttribArray(attributes.normal);
    gl.vertexAttribPointer(attributes.normal, 3, gl.FLOAT, false, 4 * 3, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texture);
    gl.enableVertexAttribArray(attributes.texture);
    gl.vertexAttribPointer(attributes.texture, 2, gl.FLOAT, false, 4 * 2, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.matrix);
    for(let col = 0; col < 4; col ++){
        let colLocation = attributes.matrix + col;
        gl.enableVertexAttribArray(colLocation);
        gl.vertexAttribPointer(colLocation, 4, gl.FLOAT, false, 4 * 16, col * 4 * 4);
        gl.vertexAttribDivisor(colLocation, 1);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);

    gl.bindVertexArray(null);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return vao;
};

const CUBE_MODEL = {
    vertices: new Float32Array([
        -0.5, 0.5, 0.5, // front
        -0.5,-0.5, 0.5,
         0.5,-0.5, 0.5,
         0.5, 0.5, 0.5,

        0.5, 0.5,-0.5, // back
        0.5,-0.5,-0.5,
       -0.5,-0.5,-0.5,
       -0.5, 0.5,-0.5,

       -0.5, 0.5,-0.5, // left
       -0.5,-0.5,-0.5,
       -0.5,-0.5, 0.5,
       -0.5, 0.5, 0.5,

        0.5, 0.5, 0.5, // right
        0.5,-0.5, 0.5,
        0.5,-0.5,-0.5,
        0.5, 0.5,-0.5,

       -0.5, 0.5,-0.5, // top
       -0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5,-0.5,

        -0.5,-0.5, 0.5, // bottom
        -0.5,-0.5,-0.5,
         0.5,-0.5,-0.5,
         0.5,-0.5, 0.5,
    ]),
    normals: new Float32Array([
       0.0, 0.0, 1.0, // front
       0.0, 0.0, 1.0,
       0.0, 0.0, 1.0,
       0.0, 0.0, 1.0,

       0.0, 0.0,-1.0, // back
       0.0, 0.0,-1.0,
       0.0, 0.0,-1.0,
       0.0, 0.0,-1.0,

      -1.0, 0.0, 0.0, // left
      -1.0, 0.0, 0.0,
      -1.0, 0.0, 0.0,
      -1.0, 0.0, 0.0,

       1.0, 0.0, 0.0, // right
       1.0, 0.0, 0.0,
       1.0, 0.0, 0.0,
       1.0, 0.0, 0.0,

       0.0, 1.0, 0.0, // top
       0.0, 1.0, 0.0,
       0.0, 1.0, 0.0,
       0.0, 1.0, 0.0,

       0.0,-1.0, 0.0, // bottom
       0.0,-1.0, 0.0,
       0.0,-1.0, 0.0,
       0.0,-1.0, 0.0,
   ]),
   colors: new Float32Array(6 * 4 * 4),
    textures: new Float32Array(6 * 4 * 2), // 6 faces with 4 points, each with 2 coordinates
    indices: new Uint32Array([
        0 + 0, 1 + 0,   1 + 0, 2 + 0,   2 + 0, 3 + 0,  3 + 0, 0 + 0,
        0 + 4, 1 + 4,   1 + 4, 2 + 4,   2 + 4, 3 + 4,  3 + 4, 0 + 4,
        0 + 8, 1 + 8,   1 + 8, 2 + 8,   2 + 8, 3 + 8,  3 + 8, 0 + 8,
        0 +12, 1 +12,   1 +12, 2 +12,   2 +12, 3 +12,  3 +12, 0 +12,
        0 +16, 1 +16,   1 +16, 2 +16,   2 +16, 3 +16,  3 +16, 0 +16,
        0 +20, 1 +20,   1 +20, 2 +20,   2 +20, 3 +20,  3 +20, 0 +20, // line model

        0 + 0, 1 + 0, 2 + 0, 0 + 0, 2 + 0, 3 + 0,
        0 + 4, 1 + 4, 2 + 4, 0 + 4, 2 + 4, 3 + 4,
        0 + 8, 1 + 8, 2 + 8, 0 + 8, 2 + 8, 3 + 8,
        0 +12, 1 +12, 2 +12, 0 +12, 2 +12, 3 +12,
        0 +16, 1 +16, 2 +16, 0 +16, 2 +16, 3 +16,
        0 +20, 1 +20, 2 +20, 0 +20, 2 +20, 3 +20, // box model
    ])
}

const RAY_MODEL = {
    vertices: new Float32Array([
        0, 0, 0,
        0, 0, 1,
    ]),
    colors: new Float32Array([
        0, 0, 5, 1,
        5, 0, 0, 1,
    ]),
    normals: new Float32Array([
        0, 0, 1,
        0, 0, 1,
    ]),
    textures: new Float32Array([
        0, 0,
        0, 1,
    ]),
    indices: new Uint32Array([
        0, 1
    ]),
}



let Graphics = await (async () => {
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.depthFunc(gl.LEQUAL);
    
    const settings = {};

    /** @type {ModelData[]} */
    let modelDataSets = [];

    /** @type {DrawBatch[]} */
    let drawQueue = [];

    let program = await buildProgramFromFiles(gl, './src/graphics/shaders/main.vert', './src/graphics/shaders/main.frag');
    let attributes = {
        position: gl.getAttribLocation(program, 'aPosition'),
        normal: gl.getAttribLocation(program, 'aNormal'),
        texture: gl.getAttribLocation(program, 'aTexture'),
        matrix: gl.getAttribLocation(program, 'aModel'),
        color: gl.getAttribLocation(program, 'aColor'),
    };
    let uniforms = {
        matrix: {
            aspect: gl.getUniformLocation(program, 'uAspect'),
            projection: gl.getUniformLocation(program, 'uProjection'),
            view: gl.getUniformLocation(program, 'uView'),
        },
        eye: gl.getUniformLocation(program, 'uEye'),
        opacity: gl.getUniformLocation(program, 'opacity'),
        highlight: gl.getUniformLocation(program, 'highlight'),
    };



    /** @type {WebGLVertexArrayObject | null} */
    let modelVAO = null;

    /** @type {Camera} */
    const camera = {
        position: {x: 0, y:0, z:5},
        target: {x: 0, y:0, z:0},
        up: {x:0, y:1, z:0},
        fieldOfView: Math.PI / 12,
        near: -1,
        far: -1000,
    }
    /** @type {Model | null} */
    let model = null;
    /** @type {BufferSet | null} */
    let buffers = null;
    gl.useProgram(program);
    
    const aspect = [
        1, 0, 0, 0,
        0, 1, 0, 0, 
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
    let updateAspect = () => {
        if (canvas.width > canvas.height) {
            aspect[0] = canvas.height / canvas.width;
        } else {
            aspect[5] = canvas.width / canvas.height;
        }
        gl.uniformMatrix4fv(uniforms.matrix.aspect, false, aspect);
        aspectNeedsUpdate = false;
    }

    let draw = () => {
        gl.disable(gl.BLEND);
        gl.depthMask(true);
        clear();
        gl.useProgram(program);
        if(aspectNeedsUpdate){
            updateAspect();
        }

        const projection = projectionPerspectiveFOV(camera.fieldOfView, camera.near, camera.far);
        gl.uniformMatrix4fv(uniforms.matrix.projection, false, projection);
        gl.uniformMatrix4fv(uniforms.matrix.view, false, getCameraMatrix(camera));
        gl.uniform3f(uniforms.eye, camera.position.x, camera.position.y, camera.position.z);
        gl.enable(gl.BLEND);
        gl.uniform4fv(uniforms.highlight, [0,0,0,0]);
        gl.depthMask(true);
        gl.uniform1f(uniforms.opacity, 1);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        for(let i = 0; i < drawQueue.length; i++){
            let item = drawQueue[i];
            for(let p = 0; p < item.poses.length; p++){
                let pose = item.poses[p];

                let mat = modelDataSets[item.modelId].matricies.subarray(p * 16, 16 * 4);

                identityMatrix4x4(mat);
                translate(mat, pose.position.x, pose.position.y, pose.position.z);
                scaleMatrix4x4(mat, pose.scale.x, pose.scale.y, pose.scale.z);
                let rotationMatrix = matrixFromQuaternion(pose.quaternion);
                multiplyMatrix4x4(rotationMatrix, mat,  mat);
            }
            gl.bindVertexArray(modelDataSets[item.modelId].VAO);
            gl.bindBuffer(gl.ARRAY_BUFFER, modelDataSets[item.modelId].buffers.matrix);
            gl.bufferData(gl.ARRAY_BUFFER, modelDataSets[item.modelId].matricies, gl.DYNAMIC_DRAW);
            gl.bindVertexArray(null);
        }
        for(let i = 0; i < drawQueue.length; i++){
            let item = drawQueue[i];
            gl.bindVertexArray(modelDataSets[item.modelId].VAO);
            gl.drawElementsInstanced(gl.TRIANGLES, modelDataSets[item.modelId].indexCount, gl.UNSIGNED_INT, 0, item.poses.length);
            gl.bindVertexArray(null);
        }
        gl.bindVertexArray(null);
        drawQueue.length = 0;
    }
    
    /**
     * 
     * @param {Model} model 
     * @param {Pose[]} poses 
     */
    let addToDrawQueue = (model, poses) => {
        if(model._modelId === undefined){
            model._modelId = modelDataSets.length;
            let buffers = bufferModelData(model, poses.length);
            let VAO = createAttribArray(buffers, attributes);
            modelDataSets.push({
                matricies: new Float32Array(16 * poses.length),
                VAO,
                allocatedCount: poses.length,
                buffers,
                indexCount: model.indices.length,
            });
        } else if (modelDataSets[model._modelId].allocatedCount < poses.length){
            let buffers = bufferModelData(model, poses.length);
            let VAO = createAttribArray(buffers, attributes);
            modelDataSets[model._modelId] = {
                matricies: new Float32Array(16 * poses.length),
                VAO,
                allocatedCount: poses.length,
                buffers,
                indexCount: model.indices.length,
            };
        }
        // debugger;
        drawQueue.push({
            poses,
            modelId: model._modelId,
        })
    }

    return {
        draw,
        addToDrawQueue,
        camera,
        settings,
        canvas,
    }
})();


export { Graphics }
