//@ts-check
import { loadPLY } from "./modelLoader/modelLoader"
import { quaternionFromAngle } from "./math/quaternion";

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

    let loadLevel = (levelData) => {

    }

    let currentStroke = 1;
    let score = 0;
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
                break;
            }

            case STATES.ballControlled: {
                // update ball influnce direction
                // use magic up
                // update ball physics
                // check for collision with pots
                // lag behind ball with camera
                // draw level, ball, and pots
                // transfer to ball in play when there is no magic
                break;
            }

            case STATES.ballInPlay: {
                // update ball physics
                // check for collision with pots
                // if ball is lower than a certain threshold for longer than a specified time,
                // advance the stroke, new tee position is at ball location
                // If ball goes out of bounds(below water level), advance the stroke, go back to previous tee
                // losely follow ball with camera
                // draw level, ball, and pots
                break;
            }

            case STATES.scoring: {
                // after player hits final required pot
                // display their score at the end of the round
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

    }
    

})()