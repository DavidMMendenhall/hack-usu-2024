//@ts-check
import { loadPLY } from "./modelLoader/modelLoader.js"
import { matrixFromQuaternion, multiplyQuaternion, quaternionFromAngle, unitQuaternionInverse } from "./math/quaternion.js";
import { Graphics } from "./graphics/render.js";
import { Physics } from "./physics/physics.js";
import { add, magnitude, normalize, scale, subtract, transformVector } from "./math/vector.js";

/**
 * @typedef PotDef
 * @prop {"goal"|"required"|"point"|"bad"} type
 * @prop {number[]} position
 * @prop {boolean} onGround
 */

/**
 * @typedef LevelDef
 * @prop {string} geometry path to geometry
 * @prop {string} texture path to texture
 * @prop {number} fluid_level
 * @prop {PotDef[]} pots
 * @prop {number[]} startPos
 */

const STATES = {
    loading: 0,
    hitting: 1,
    ballControlled: 2,
    ballInPlay: 3,
    scoring: 4,
    end: 5,
    idle: 6,
}

let Game = await ( async () => {
    let models = {
        pot: await loadPLY("./assets/models/pot.ply", "./assets/models/PotTexture.png", true),
        clubs:{
            iron: await loadPLY("./assets/models/iron.ply","./assets/models/golf_diffuse_no_ao.jpg", false),
        },
        ball: await loadPLY("./assets/models/golfball.ply","./assets/models/golf_diffuse_no_ao.jpg", false),
    }

    /**
     * 
     * @param {LevelDef} levelData 
     */
    let loadLevel = async (levelData) => {

        teePosition.x = levelData.startPos[0];
        teePosition.y = levelData.startPos[1];
        teePosition.z = levelData.startPos[2];
        fluidLevel = levelData.fluid_level;

        pots = levelData.pots;
        for (let p = 0; p < pots.length; p++) {
            const pot = pots[p];

			let objPos = {
				x: pot.position[0],
				y: pot.position[1],
				z: pot.position[2],
			};

			if (pot.onGround) {
				let intersection = Physics.findIntersectionWithBVH({
					point: objPos,
					dir: {
						x: 0,
						y: -1,
						z: 0,
					},
				});

				if (intersection && intersection.point) {
					objPos = intersection.point;
					objPos.y += 0.2
				}
			}

            potPoses.push({
                position: objPos,
                scale: {
                    x: 0.5,
                    y: 0.5,
                    z: 0.5,
                },
                quaternion: quaternionFromAngle(0, [1, 0, 0])
            });

            potCollisions.push({
                position: objPos,
                radius: .15,
            });
        }

        loadPLY(levelData.geometry,levelData.texture, false)
        .then(level => {
            Physics.setLevel(level);
            levelGeometry = level;
            state = STATES.hitting;
            console.log("HITTING")
        })
        state = STATES.loading;
        requestAnimationFrame(gameLoop);
    }

    let levelGeometry;
    let inputQuaternion = quaternionFromAngle(0, [1, 0, 0]);
    let calQuaternion = quaternionFromAngle(0, [1, 0, 0]);
    let currentStroke = 1;
    let score = 0;
    let fluidLevel = 0;
    let teeAngle = 0;// in radians
    const clubHead = {
        x:0.05,
        y: 0,
        z: -1,
    }
    let teeCamDistance = 1.25;
    let clubDistance = 0.6;
    let teePosition = {
        x: 0,
        y: 0,
        z: 0,
    }

    /** @type {import("./physics/physics.js").PhysicsSphere} */
    let ballPhysicsModel = {
        radius: 0.05,
        velocity: {x:1, y:0, z:1},
        position: {x:10, y:15, z:-26},
        quaternion: quaternionFromAngle(0, [1, 0, 0]),
        rotationalVelocity: 0,
        axisOfRotation: {x:0, y:1, z:0},
    }

    // updates to be at the end of the club
    let clubCollisionOld = {x:0, y:0, z:0};
    let clubCollision = {
        radius: 0.1,
        velocity: {x:0, y:0, z:0},
        position: {x:0, y:0, z:0},
    };

    let pots = [];
    let potPoses = [];
    /** @type {{position: (import("./math/vector.js").Vector), radius: number}[]} */
	let potCollisions = [];

    let addPotsToDrawQueue = () => {
        Graphics.addToDrawQueue(models.pot, potPoses);
    }

    let state = STATES.idle;
    let oldTime = 0;
    let stillTime = 0;
    const STOP_TIME = 3000; // 3 seconds
    const STOP_THRESHOLD = 0.05;

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
        ]),
        texture: "",
    }
    let gameLoop = (time) => {
        let dt = (time - oldTime) / 1000;
        oldTime = time;
        Graphics.addToDrawQueue(CUBE_MODEL, [{
            position: {x:0, y:fluidLevel - 1, z:0},
            scale: {x: 1000, y:1, z:1000},
            quaternion: quaternionFromAngle(0, [1, 0, 1]),
        },])
        switch(state){
            case STATES.loading: {
                // do nothing and wait
                requestAnimationFrame(gameLoop);
                break;
            }
           
            case STATES.hitting: {
                // listen for rotation/calibrate commands from controller
                // watch for shaking to build magic power
                // draw level, ball, and pots
                Graphics.addToDrawQueue(levelGeometry, [{
                    position: {x:0, y:0, z: 0},
                    scale: {x: 1, y:1, z:1},
                    quaternion: quaternionFromAngle(0, [1, 0, 1]),
                },])

                addPotsToDrawQueue();
                let clubOrigin = {
                    x: Math.cos(teeAngle + Math.PI / 6) * clubDistance,
                    y: 0.80,
                    z: Math.sin(teeAngle + Math.PI / 6) * clubDistance,
                }
                clubOrigin = add(clubOrigin, teePosition);
                let clubQuaternion = multiplyQuaternion(multiplyQuaternion(inputQuaternion,calQuaternion), quaternionFromAngle(teeAngle - Math.PI / 2, [0, 1, 0]));
                let headPosition = transformVector(matrixFromQuaternion(clubQuaternion),clubHead);
                clubCollisionOld = clubCollision.position;
                clubCollision.position = add(clubOrigin, headPosition);
                clubCollision.velocity = scale(subtract(clubCollision.position, clubCollisionOld), 300/6);

                
                Graphics.camera.position = add(teePosition, {x:Math.cos(teeAngle) * teeCamDistance, y:1, z:Math.sin(teeAngle) * teeCamDistance});
                Graphics.camera.target = add(teePosition, {x:0, y:1, z:0});
                Graphics.camera.fieldOfView = Math.PI / 6 * 4;
                Graphics.addToDrawQueue(models.clubs.iron, [{
                    position: clubOrigin,
                    scale: {x: 1, y:1, z:1},
                    quaternion:clubQuaternion,
                },])
                ballPhysicsModel.position = teePosition;
                Graphics.addToDrawQueue(models.ball, [
                    {
                        position: ballPhysicsModel.position,
                        scale: {x: 1, y:1, z:1},
                        quaternion: ballPhysicsModel.quaternion,
                    }
                ]);
                

                if(magnitude(subtract(clubCollision.position, ballPhysicsModel.position)) < clubCollision.radius + ballPhysicsModel.radius){
                    // hit
                    ballPhysicsModel.velocity = clubCollision.velocity;
                    state = STATES.ballInPlay;
                    console.log(clubCollision.velocity);
                    stillTime = time;
                }
                requestAnimationFrame(gameLoop);
                break;
            }

            case STATES.ballControlled: {
                // update ball influnce direction
                // use magic up
                // update ball physics
                Physics.updateSphere(ballPhysicsModel, {x:0, y:-3, z:0}, dt)

                // check for collision with pots
                // lag behind ball with camera
                // draw level, ball, and pots
                // transfer to ball in play when there is no magic
                requestAnimationFrame(gameLoop);
                break;
            }

            case STATES.ballInPlay: {
                // update ball physics
                Physics.updateSphere(ballPhysicsModel, {x:0, y:-3, z:0}, dt)
                // check for collision with pots
                // if ball is lower than a certain threshold for longer than a specified time,
                // advance the stroke, new tee position is at ball location
                // If ball goes out of bounds(below water level), advance the stroke, go back to previous tee
                // losely follow ball with camera
                // draw level, ball, and pots
                Graphics.addToDrawQueue(levelGeometry, [{
                    position: {x:0, y:0, z: 0},
                    scale: {x: 1, y:1, z:1},
                    quaternion: quaternionFromAngle(0, [1, 0, 1]),
                },])

                addPotsToDrawQueue();
                let clubOrigin = {
                    x: Math.cos(teeAngle + Math.PI / 6) * clubDistance,
                    y: 0.80,
                    z: Math.sin(teeAngle + Math.PI / 6) * clubDistance,
                }
                clubOrigin = add(clubOrigin, teePosition);
                let clubQuaternion = multiplyQuaternion(multiplyQuaternion(inputQuaternion,calQuaternion), quaternionFromAngle(teeAngle - Math.PI / 2, [0, 1, 0]));
                
                // Graphics.camera.position = add(teePosition, {x:Math.cos(teeAngle) * teeCamDistance, y:1, z:Math.sin(teeAngle) * teeCamDistance});
                let ballDir = add( {x:0, y:1, z:0}, subtract(ballPhysicsModel.position, Graphics.camera.position));
                Graphics.camera.position = add(Graphics.camera.position, scale(ballDir, 0.02));
                Graphics.camera.target = ballPhysicsModel.position;
                Graphics.camera.fieldOfView = Math.PI / 1.5;
                Graphics.addToDrawQueue(models.clubs.iron, [{
                    position: clubOrigin,
                    scale: {x: 1, y:1, z:1},
                    quaternion:clubQuaternion,
                },])
                Graphics.addToDrawQueue(models.ball, [
                    {
                        position: ballPhysicsModel.position,
                        scale: {x: 1, y:1, z:1},
                        quaternion: ballPhysicsModel.quaternion,
                    }
                ]);
                if(magnitude(ballPhysicsModel.velocity) > STOP_THRESHOLD){
                    stillTime = time;
                }
                if(time - stillTime > STOP_TIME){
                    teePosition = add(ballPhysicsModel.position, {x:0, y:0, z:0});
                    state = STATES.hitting;
                }
                if(ballPhysicsModel.position.y < fluidLevel){
                    currentStroke++;
                    state = STATES.hitting
                }

                let idxsToErase = []
                for (let p = 0; p < pots.length; p++) {
                    let delta = subtract(ballPhysicsModel.position, potCollisions[p].position)
                    if (magnitude(delta) <= potCollisions[p].radius + ballPhysicsModel.radius) {
                        console.log("removing pot!");
                        idxsToErase.push(p);
                    }
                }

                for (let i = idxsToErase.length - 1; i >= 0; i--) {
                    pots.splice(idxsToErase[i], 1);
                    potPoses.splice(idxsToErase[i], 1);
                    potCollisions.splice(idxsToErase[i], 1);
                }

                requestAnimationFrame(gameLoop);
                break;
            }

            case STATES.scoring: {
                // after player hits final required pot
                // display their score at the end of the round
                requestAnimationFrame(gameLoop);
                break;
            }

            case STATES.end: {
                // Go back to menu?
                break;
            }

            // do nothing and stop game loop
            case STATES.idle:
            default:
        }

        Graphics.draw();
    }
    
    document.addEventListener("keydown", (event)=>{
    
        if(event.key == 'c'){
            calQuaternion = unitQuaternionInverse(inputQuaternion);
        }
        if(event.key == 'ArrowRight'){
            teeAngle += Math.PI / 24;
        }
        if(event.key == 'ArrowLeft'){
            teeAngle -= Math.PI / 24;
        }
    });
    // @ts-ignore
    window.readRemoteMessage = function(msg) { 
        let data = JSON.parse(msg.data);
        if(data.type=="orientation" && data.data){
            inputQuaternion.i =-data.data[0];
            inputQuaternion.j =-data.data[2];
            inputQuaternion.k = data.data[1];
            inputQuaternion.w = data.data[3];
        }
        if(data.type=="calibrate"){
            calQuaternion = unitQuaternionInverse(inputQuaternion);
        }
        if(data.type=="rotate"){
            if(data.direction < 0){
                teeAngle -= Math.PI / 240;
            }
            if(data.direction > 0){
                teeAngle += Math.PI / 240;
            }
        }
    }
    return {
        loadLevel,

    }
})()

export {Game}
