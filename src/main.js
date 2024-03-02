// @ts-check
import { Game } from "./game.js";


window.onConnection = function() {
    for (const el of document.getElementsByTagName("canvas")) {
        el.style.visibility = "visible";
    }
    Game.loadLevel();
}