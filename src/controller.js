// @ts-check

/** @declare firebase */

const STATE = {
	NOT_STARTED: 0,
	NOT_CONNECTED: 1,
	CONNECTED: 2,
};

class ControllerConnection {
	/** @type RTCPeerConnection */
	peerConnection;
	/** @type RTCDataChannel */
	dataChannel;
	/** @type number */
	state;
	/** @type string */
	code;

	constructor() {
		this.peerConnection = new RTCPeerConnection();
		this.dataChannel = this.peerConnection.createDataChannel("control");
		this.state = STATE.NOT_STARTED;
	}

	async joinGame() {
		if (this.state != STATE.NOT_STARTED) {
			document.getElementById("status-text").innerHTML = "You have already joined a game";
			document.getElementById("status-text").classList.add("error");
			return false;
		}
		if (document.getElementById("login-code").value === "") {
			document.getElementById("status-text").innerHTML = "Please enter a game Id to join";
			document.getElementById("status-text").classList.add("error");
			return false;
		}

		this.code = document.getElementById("login-code").value;

		let gameInfo = null;
		try {
			gameInfo = await firebase.database().ref("/games/" + this.code).get();
			if (gameInfo.val() == null) {
				document.getElementById("status-text").innerHTML = "The game does not exist or you are not connected to the internet";
				document.getElementById("status-text").classList.remove("info");
				document.getElementById("status-text").classList.add("error");
				return false;
			}
		} catch (e) {
			document.getElementById("status-text").innerHTML = "The game does not exist or you are not connected to the internet";
			document.getElementById("status-text").classList.add("error");
			document.getElementById("status-text").classList.remove("info");
			return false;
		}

		gameInfo = gameInfo.val();
		var msg = gameInfo.userA.message

		if (msg.type != "name") {
			document.getElementById("status_text").innerHTML = "This game has already started";
			document.getElementById("status_text").classList.add("error");
			document.getElementById("status_text").classList.remove("info");
			enableGUI();
			hasCreatedGame = false;
			return false;
		}

		document.getElementById("login-holder").style.display = "none";
		document.getElementById("controller-holder").style.display = "initial";

		var wantToJoin = await getConfirmationFromUser("A game with " + msg.name + " was found, do you want to connect?");
		remoteName = msg.name;

		if (!wantToJoin) {
			document.getElementById("status_text").innerHTML = "Game not joined";
			hasCreatedGame = false;
			enableGUI();
			return false;
		}

		gameDataRef = firebase.database().ref('games/' + gameId);
		localMessageId = gameInfo.userB.messageId;
		gameDataRef.on('value', checkMessages);

		cState = 2;
		sendReadConf();
		sendMessage({type: 'name', name: myName});
		peerConnection.addEventListener("track", function () {});
		peerConnection.ondatachannel = startListeningOnChannel;

		document.getElementById("status_text").innerHTML = "Wating for response from host...";
		document.getElementById("status_text").classList.add("info");

	}
}

/*
var hasCreatedGame = false;
var isHost = false;
var channelOpen = false;
var connectionChecked = false;

var gameId = ""
var offer;
var answer;
var messageId = 0;
var localMessageId = 0;
var remoteMessageId = 0;
var messageQue = [];
var gameDataRef;
var waitingMessageConf = false;

function clearGameData() {
	if (isHost)
		gameDataRef.remove();
}

function disableGUI() {
	document.getElementById("user_name").disabled = true;
	document.getElementById("create_game").disabled = true;
	document.getElementById("join_game").disabled = true;
	document.getElementById("join_game_id").disabled = true;
}

function enableGUI() {
	document.getElementById("user_name").disabled = false;
	document.getElementById("create_game").disabled = false;
	document.getElementById("join_game").disabled = false;
	document.getElementById("join_game_id").disabled = false;
}

async function checkMessages(data) {
	var messages = data.val();
	if (!messages) {
		console.log("Game has been erased from database.")
		document.getElementById("status_text").innerHTML = "Game data has been erased from database.";
		document.getElementById("status_text").classList.remove("error");
		document.getElementById("status_text").classList.add("info");
		peerConnection.close();
		peerConnection = new RTCPeerConnection();
		dataChannel = peerConnection.createDataChannel("number");
		rChannel = null;
		enableGUI();
		cState = 0;
		hasCreatedGame = false;
		remoteMessageId = 0;
		gameDataRef.off();
		return;
	}

	if (isHost) {
		if (messages.userB.messageId > remoteMessageId) {
			remoteMessageId = messages.userB.messageId;
			localMessageId = messages.userA.messageId;
			console.log("Recieved message type:" + messages.userB.message.type);
			processMessage(messages.userB.message);

		} else if (messages.userA.read) {
			waitingMessageConf = false;
		}
	} else {
		if (messages.userA.messageId > remoteMessageId) {
			remoteMessageId = messages.userA.messageId;
			localMessageId = messages.userB.messageId;
			console.log("Recieved message type:" + messages.userA.message.type)
			processMessage(messages.userA.message)

		} else if (messages.userB.read) {
			waitingMessageConf = false;
		}
	}
}

async function sendNext() {
	if (!waitingMessageConf && messageQue.length > 0) {
		localMessageId++;
		var updateData = {}
		if (isHost) {
			updateData["/games/" + gameId + "/userA/read"] = false;
			updateData["/games/" + gameId + "/userA/message"] = messageQue[0]
			updateData["/games/" + gameId + "/userA/messageId"] = localMessageId;
		} else {
			updateData["/games/" + gameId + "/userB/read"] = false;
			updateData["/games/" + gameId + "/userB/message"] = messageQue[0];
			updateData["/games/" + gameId + "/userB/messageId"] = localMessageId;
		}
		firebase.database().ref().update(updateData);
		messageQue.splice(0, 1);
		waitingMessageConf = true;
	} else if (messageQue.length > 0) {
		setTimeout(sendNext, 250);
	}
}

async function sendReadConf() {
	var updateData = {}
	if (isHost) {
		updateData["/games/" + gameId + "/userB/read"] = true;
	} else {
		updateData["/games/" + gameId + "/userA/read"] = true;
	}
	firebase.database().ref().update(updateData);
}

async function sendMessage(message) {
	messageQue.push(message);
	sendNext()
}

async function getConfirmationFromUser(text) {
	document.getElementById("confirm_message").innerHTML = text;
	document.getElementById("confirm_box").style.display = "block";
	return new Promise(function (resolve, reject) {
		confirmationAccepted = resolve;
	})
}

async function processMessage(msg) {
	if (msg.type == "candidate" && msg.candidate) {
		console.log("Remote Candidate recieved: " + msg.candidate);
		try {
			await peerConnection.addIceCandidate(msg.candidate);
			console.log("Succesfully added candidate")

		} catch (e) {
			console.log(e.name)
		}
		return;
	} else if (msg.type == "candidate") {
		sendReadConf();
	}
	switch (cState) {
		case 0: {
			break;
		}
		case 1: {
			if (msg.type == "name") {
				remoteName = msg.name;
			} else {
				return;
			}
			accept = await getConfirmationFromUser(remoteName + " has requested to join the game, do you accept?");
			if (accept) {
				offer = await peerConnection.createOffer({});
				await peerConnection.setLocalDescription(offer);
				console.log("Offer placed")
				sendMessage({type: 'offer', offer: peerConnection.localDescription});
				peerConnection.addEventListener("icecandidate", sendCandidate)
				cState = 4;
				document.getElementById("status_text").innerHTML = "Attempting to connect...";
				document.getElementById("status_text").classList.remove("error");
				document.getElementById("status_text").classList.add("info");
			} else {
				document.getElementById("status_text").innerHTML = "You denied the request, waiting for opponent...";
				document.getElementById("status_text").classList.remove("error");
				document.getElementById("status_text").classList.add("info");
				sendMessage({type: 'denied'})
				sendMessage({type: 'name', name: myName})
			}
			sendReadConf();
			break;
		}
		case 2: {
			if (msg.type == "denied") {
				document.getElementById("status_text").innerHTML = remoteName + " denied the request";
				document.getElementById("status_text").classList.add("error");
				document.getElementById("status_text").classList.remove("info");
				hasCreatedGame = false;
				cState = 0;
				enableGUI();
				gameDataRef.off();
				sendReadConf();
				//Stop waiting for a confirmation message as we are no longer listening 
				waitingMessageConf = false;
				gameDataRef = null;
				return;
			}
			if (msg.type == "offer") {
				await peerConnection.setRemoteDescription(msg.offer);
				var theAnswer = await peerConnection.createAnswer({});
				await peerConnection.setLocalDescription(theAnswer);
				peerConnection.addEventListener("icecandidate", sendCandidate)
				console.log("Offer Recieved: " + msg.offer)
				sendMessage({type: 'answer', answer: theAnswer})
				cState = 6;
				document.getElementById("status_text").innerHTML = "Attempting to connect...";
				document.getElementById("status_text").classList.remove("error");
				document.getElementById("status_text").classList.add("info");
			}
			sendReadConf();
			break;
		}
		case 4: {
			if (msg.type == "answer") {
				document.getElementById("status_text").innerHTML = "Connecting...";
				document.getElementById("status_text").classList.remove("error");
				document.getElementById("status_text").classList.add("info");
				await peerConnection.setRemoteDescription(msg.answer);
				cState = 6;
			}
			sendReadConf();
			break;
		}
	}
}

function sendCandidate(event) {
	console.log("ice candidate event")
	console.log(event)
	sendMessage({type: 'candidate', candidate: event.candidate})

}

function generateCode(length) {
	var code = "";
	for (var i = 0; i < length; i++) {
		code += Math.floor(Math.random() * 10);
	}
	return code;
}

function startListeningOnChannel(e) {
	let rChannel = e.channel;
	rChannel.onmessage = readRemoteMessage;
	rChannel.onopen = function () {
		channelOpen = true;
		console.log("Recieve Channel Opened");
		document.getElementById("status_text").innerHTML = "Receiving Data...";
		document.getElementById("status_text").classList.remove("error");
		document.getElementById("status_text").classList.add("info");
	}
	rChannel.onclose = function () {
		channelOpen = false;
		console.log("Recieve Channel Closed");
		document.getElementById("status_text").innerHTML = "Communication with " + remoteName + " was closed.";
		document.getElementById("status_text").classList.remove("error");
		document.getElementById("status_text").classList.add("info");

		peerConnection.close();
		peerConnection = new RTCPeerConnection();
		dataChannel = peerConnection.createDataChannel("number");
		rChannel = null;
		enableGUI();
		cState = 0;
		hasCreatedGame = false;
		clearGameData();
	}
}

var player1;
var player2;
var gameWidth = 200;
var gameHeight = 400;
var remotePlayerX = gameWidth / 2;
var oldTime = Date.now();
var newTime = Date.now();
var canvas = document.getElementById("myCanvas");
canvas.width = gameWidth;
canvas.height = gameHeight;
var ct = canvas.getContext("2d");
var ball = {
	x: 100,
	y: 200,
	sy: 1,//units per second
	sx: 1,
	r: 10
}

function pingThem() {
	if (!connectionChecked && channelOpen) {
		dataChannel.send('{"type":"ping"}')
	}
}

setInterval(pingThem, 1000)

function Player(pos, control) {
	this.x = 100;
	this.y = 0;
	this.w = 50;
	this.h = 15;
	if (pos == 1) {
		this.y = gameHeight - this.h;
	}
	this.remoteControl = control;//true for remote player, false for local player
	this.render = function () {
		ct.fillStyle = "White";
		ct.fillRect(this.x, this.y, this.w, this.h);
	}
}

function playBall() {//start the game
	if (isHost) {
		player1 = new Player(0, false);
		player2 = new Player(1, true);
	} else {
		player1 = new Player(0, true);
		player2 = new Player(1, false);
	}
	canvas.addEventListener("mousemove", updatePosition);
	canvas.addEventListener("touchmove", updatePositionTouch);
	oldTime = Date.now();
	newTime = Date.now();
	updateGame();
}

function updatePositionTouch(e) {
	e.preventDefault();
	if (!channelOpen)
		return;
	var x = e.changedTouches[0].pageX - player1.w / 2
	var canvasX = canvas.getBoundingClientRect().left;
	x -= canvasX;
	if (!player1.remoteControl) {
		player1.x = x
	}
	if (!player2.remoteControl) {
		player2.x = x
	}
	dataChannel.send('{"type":"player","x":' + x + '}')
}

function updatePosition(e) {

	e.preventDefault();
	if (!channelOpen)
		return;
	var x = e.clientX - player1.w / 2
	var canvasX = canvas.getBoundingClientRect().left;
	x -= canvasX;
	if (!player1.remoteControl) {
		player1.x = x
	}
	if (!player2.remoteControl) {
		player2.x = x
	}
	dataChannel.send('{"type":"player","x":' + x + '}')
}

function updateGame() {
	if (channelOpen) {
		ct.fillStyle = "red";
		ct.fillRect(0, 0, gameWidth, gameHeight);
		player1.render();
		player2.render();
		newTime = Date.now();
		var dt = (newTime - oldTime) / 10;
		var sx = ball.sx * dt;
		var sy = ball.sy * dt;
		if (ball.x + sx + ball.r > gameWidth) {
			ball.sx = -Math.abs(ball.sx);
			sx = ball.sx * dt;
		}
		else if (ball.x + sx - ball.r < 0) {
			ball.sx = Math.abs(ball.sx);
			sx = ball.sx * dt;
		}
		ball.x += sx;
		ball.y += sy;

		if (ball.y + ball.r > player2.y && !player2.remoteControl) {
			if (player2.x < ball.x + ball.r && player2.x + player2.w > ball.x - ball.r) {
				var dx = ball.x - player2.x - player2.w / 2;
				var dy = ball.y - player2.y - player2.h / 2;
				var scale = Math.random() * 0.25 + 0.1;
				ball.sy = dy * scale;
				ball.sx = dx * scale;
				dataChannel.send('{"type":"ball","ball":' + JSON.stringify(ball) + '}')
			} else if (ball.y + ball.r > gameHeight) {
				ball.y = gameHeight / 2;
				ball.x = gameWidth / 2;
				ball.sy = -Math.random() * 2 - 1;
				ball.sx = Math.random() * 4 - 2;

				dataChannel.send('{"type":"ball","ball":' + JSON.stringify(ball) + '}')
			}
		} else if (ball.y - ball.r < player1.y + player1.h && !player1.remoteControl) {
			if (player1.x < ball.x + ball.r && player1.x + player1.w > ball.x - ball.r) {
				var dx = ball.x - player1.x - player1.w / 2;
				var dy = ball.y - player1.y - player1.h / 2;
				var scale = Math.random() * 0.25 + 0.1;
				ball.sy = dy * scale;
				ball.sx = dx * scale;
				dataChannel.send('{"type":"ball","ball":' + JSON.stringify(ball) + '}')
			} else if (ball.y - ball.r < 0) {
				ball.y = gameHeight / 2;
				ball.x = gameWidth / 2;
				ball.sy = Math.random() * 2 + 1;
				ball.sx = Math.random() * 4 - 2;

				dataChannel.send('{"type":"ball","ball":' + JSON.stringify(ball) + '}')
			}
		}
		ct.fillStyle = "white";
		ct.beginPath();
		ct.arc(ball.x, ball.y, ball.r, 0, 2 * Math.PI);
		ct.fill();
		oldTime = newTime;
		requestAnimationFrame(updateGame);
	}
}

function readRemoteMessage(msg) {
	var data = JSON.parse(msg.data);
	//console.log(data);
	switch (data.type) {
		case "ball": {//update on ball when hit
			ball = data.ball;
			break;
		}
		case "player": {//update on position
			if (player1.remoteControl) {
				player1.x = data.x;
			}
			if (player2.remoteControl) {
				player2.x = data.x;
			}
			break;
		}
		case "start": {
			dataChannel.send('{"type":"accept"}')
			playBall();
			break;
		}
		case "accept": {
			playBall();
			break;
		}
		case "ping": {
			dataChannel.send('{"type":"pong"}')
			break;
		}
		case "pong": {
			connectionChecked = true;
			dataChannel.send('{"type":"start"}')
			document.getElementById("status_text").innerHTML = "Connected!";
			document.getElementById("status_text").classList.remove("error");
			document.getElementById("status_text").classList.add("info");
			break;
		}
	}
}
*/

let connection = new ControllerConnection();

document.getElementById("login-submit")?.addEventListener("click", () => connection.joinGame());
