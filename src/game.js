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
        pot: await loadPLY("./assets/models/pot.ply", true),
        clubs:{
            iron: await loadPLY("./assets/models/iron.ply", false),
        },
        ball: await loadPLY("./assets/models/golfball.ply", false),
        tree: await loadPLY("./assets/models/tree.ply", false),
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

        loadPLY(levelData.geometry, false)
        .then(level => {
            Physics.setLevel(level);
            levelGeometry = level;
            state = STATES.hitting;
            console.log("HITTING")
        });
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
    let teeCamDistance = 1;
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

    let state = STATES.idle;
    let oldTime = 0;
    let gameLoop = (time) => {
        let dt = (time - oldTime) / 1000;
        oldTime = time;
        switch(state){
            case STATES.loading: {
                // do nothing and wait
                requestAnimationFrame(gameLoop);
                break;
            }

            case STATES.hitting: {
                // update club quaternion,
                // move club hit box
                // listen for rotation/calibrate commands from controller
                // watch for shaking to build magic power
                // check if club has hit ball hitbox, if so, check velocity of hit, transfer to ball at an upwards angle
                // draw level, ball, and pots
               
                Graphics.addToDrawQueue(levelGeometry, [{
                    position: {x:0, y:0, z: 0},
                    scale: {x: 1, y:1, z:1},
                    quaternion: quaternionFromAngle(0, [1, 0, 1]),
                },])
                let clubOrigin = {
                    x: Math.cos(teeAngle + Math.PI / 2) * clubDistance,
                    y: 0.80,
                    z: Math.sin(teeAngle + Math.PI / 2) * clubDistance,
                }
                clubOrigin = add(clubOrigin, teePosition);
                let clubQuaternion = multiplyQuaternion(multiplyQuaternion(inputQuaternion,calQuaternion), quaternionFromAngle(teeAngle - Math.PI / 2, [0, 1, 0]));
                let headPosition = transformVector(matrixFromQuaternion(clubQuaternion),clubHead);
                clubCollisionOld = clubCollision.position;
                clubCollision.position = add(clubOrigin, headPosition);
                clubCollision.velocity = scale(subtract(clubCollision.position, clubCollisionOld), 1);

                
                Graphics.camera.position = add(teePosition, {x:Math.cos(teeAngle) * teeCamDistance, y:1, z:Math.sin(teeAngle) * teeCamDistance});
                Graphics.camera.target = add(teePosition, {x:0, y:1, z:0});
                Graphics.camera.fieldOfView = Math.PI / 1.5;
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
                }
                requestAnimationFrame(gameLoop);
                break;
            }

            case STATES.ballControlled: {
                // update ball influnce direction
                // use magic up
                // update ball physics
                Physics.updateSphere(ballPhysicsModel, {x:0, y:-9.8, z:0}, dt)

                // check for collision with pots
                // lag behind ball with camera
                // draw level, ball, and pots
                // transfer to ball in play when there is no magic
                requestAnimationFrame(gameLoop);
                break;
            }

            case STATES.ballInPlay: {
                // update ball physics
                Physics.updateSphere(ballPhysicsModel, {x:0, y:-9.8, z:0}, dt)
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
                let clubOrigin = {
                    x: Math.cos(teeAngle + Math.PI / 2) * clubDistance,
                    y: 0.80,
                    z: Math.sin(teeAngle + Math.PI / 2) * clubDistance,
                }
                clubOrigin = add(clubOrigin, teePosition);
                let clubQuaternion = multiplyQuaternion(multiplyQuaternion(inputQuaternion,calQuaternion), quaternionFromAngle(teeAngle - Math.PI / 2, [0, 1, 0]));
                let headPosition = transformVector(matrixFromQuaternion(clubQuaternion),clubHead);
                clubCollisionOld = clubCollision.position;
                clubCollision.position = add(clubOrigin, headPosition);
                clubCollision.velocity = scale(subtract(clubCollision.position, clubCollisionOld), 1/60);

                
                // Graphics.camera.position = add(teePosition, {x:Math.cos(teeAngle) * teeCamDistance, y:1, z:Math.sin(teeAngle) * teeCamDistance});
                let ballDir = subtract(ballPhysicsModel.position, Graphics.camera.position);
                Graphics.camera.position = add(Graphics.camera.position, scale(ballDir, 0.05));
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