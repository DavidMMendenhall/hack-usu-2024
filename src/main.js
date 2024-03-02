// @ts-check
import { Game } from "./game.js";


window.onConnection = function() {
    for (const el of document.getElementsByTagName("canvas")) {
        el.style.visibility = "visible";
    }
    fetch("./assets/levels/eyeglass-lake.json")
    .then(data => data.json())
    .then(j => Game.loadLevel(j));
}