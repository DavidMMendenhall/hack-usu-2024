// @ts-check

/*
* 0 = not started
* 1 = waiting for an opponent to join (host)
* 2 = waiting for host to accept (client)
* 3 = starting peer connection (host)
* 4 = waiting for answer (host)
* 5 = waiting for offer (client)
* 6 = waiting for tracks 
* 7 = connected
*/
const STATE = {
	NOT_STARTED: 0,
	WAITING_FOR_CONTROLLER: 1,
	WAITING_FOR_HOST: 2,
	STARTING_PEER_CONNECTION: 3,
	WAITING_FOR_ANSWER: 4,
	WAITING_FOR_OFFER: 5,
	WAITING_FOR_TRACKS: 6,
	CONNECTED: 7,
};

var peerConnection = new RTCPeerConnection({});
var dataChannel = peerConnection.createDataChannel("number");
var rChannel;
var hasCreatedGame = false;
var cState = STATE.NOT_STARTED;
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

function createGame() {
	if (hasCreatedGame) {
		document.getElementById("status-text").innerHTML = "You have already created a game";
		document.getElementById("status-text").classList.add("error");
		return false;
	}

	gameId = generateCode(6);
	document.getElementById("login-game-id").innerHTML = "Your game's id is: " + gameId;

	document.getElementById("status-text").innerHTML = "Wating for controller to join...";
	document.getElementById("status-text").classList.remove("error");
	document.getElementById("status-text").classList.add("info");

	let gameData = {
		state: 0,
		host: {
			message: {type: 'hello'},
			time: Date.now(),
			read: false,
			messageId: 0
		},
		controller: {
			message: "",
			time: 0,
			read: false,
			messageId: 0
		}
	}

	firebase.database().ref("/games/" + gameId).set(gameData);
	waitingMessageConf = true;
	hasCreatedGame = true;
	cState = STATE.WAITING_FOR_CONTROLLER;
	isHost = true;

	gameDataRef = firebase.database().ref('games/' + gameId);
	gameDataRef.on('value', checkMessages);
	peerConnection.addEventListener("track", function () {});
	peerConnection.ondatachannel = startListeningOnChannel;
}

async function joinGame() {
	if (hasCreatedGame) {
		document.getElementById("status-text").innerHTML = "You have already joined a game";
		document.getElementById("status-text").classList.add("error");
		return false;
	}

	if (document.getElementById("login-code").value === "") {
		document.getElementById("status-text").innerHTML = "Please enter a game ID to join";
		document.getElementById("status-text").classList.add("error");
		return false;
	} else {
		document.getElementById("login-code").classList.remove("error");
	}

	gameId = document.getElementById("login-code").value;

	document.getElementById("status-text").innerHTML = "Checking for game...";
	document.getElementById("status-text").classList.remove("error");
	document.getElementById("status-text").classList.add("info");

	hasCreatedGame = true;
	var gameInfo;
	try {
		gameInfo = await firebase.database().ref("/games/" + gameId).get();
		if (gameInfo.val() == null) {
			hasCreatedGame = false;
			document.getElementById("status-text").innerHTML = "The game does not exist or you are not connected to the internet";
			document.getElementById("status-text").classList.remove("info");
			document.getElementById("status-text").classList.add("error");
			return false;
		}
	} catch (e) {
		hasCreatedGame = false;
		document.getElementById("status-text").innerHTML = "The game does not exist or you are not connected to the internet";
		document.getElementById("status-text").classList.add("error");
		document.getElementById("status-text").classList.remove("info");
		return false;
	}

	gameInfo = gameInfo.val();
	var msg = gameInfo.host.message

	if (msg.type != "hello") {
		document.getElementById("status-text").innerHTML = "This game has already started";
		document.getElementById("status-text").classList.add("error");
		document.getElementById("status-text").classList.remove("info");
		hasCreatedGame = false;
		return false;
	}

	gameDataRef = firebase.database().ref('games/' + gameId);
	localMessageId = gameInfo.controller.messageId;
	gameDataRef.on('value', checkMessages);

	cState = STATE.WAITING_FOR_HOST;
	sendReadConf();
	sendMessage({type: 'hello'});
	peerConnection.addEventListener("track", function () {});
	peerConnection.ondatachannel = startListeningOnChannel;

	document.getElementById("status-text").innerHTML = "Wating for response from host...";
	document.getElementById("status-text").classList.add("info");
}

function disableGUI() {
	let lh = document.getElementById("login-holder");
	if (lh) {
		lh.style.display = "none";
	}

	let gh = document.getElementById("game-holder");
	if (gh) {
		gh.style.display = "block";
	}
}

function enableGUI() {
	let lh = document.getElementById("login-holder");
	if (lh) {
		lh.style.display = "block";
	}

	let gh = document.getElementById("game-holder");
	if (gh) {
		gh.style.display = "none";
	}
}

async function checkMessages(data) {
	var messages = data.val();
	if (!messages) {
		console.log("Game has been erased from database.")
		document.getElementById("status-text").innerHTML = "Game data has been erased from database.";
		document.getElementById("status-text").classList.remove("error");
		document.getElementById("status-text").classList.add("info");
		peerConnection.close();
		peerConnection = new RTCPeerConnection();
		dataChannel = peerConnection.createDataChannel("number");
		rChannel = null;
		cState = STATE.NOT_STARTED;
		hasCreatedGame = false;
		remoteMessageId = 0;
		gameDataRef.off();
		return;
	}

	if (isHost) {
		if (messages.controller.messageId > remoteMessageId) {
			remoteMessageId = messages.controller.messageId;
			localMessageId = messages.host.messageId;
			console.log("Recieved message type:" + messages.controller.message.type);
			processMessage(messages.controller.message);

		} else if (messages.host.read) {
			waitingMessageConf = false;
		}
	} else {
		if (messages.host.messageId > remoteMessageId) {
			remoteMessageId = messages.host.messageId;
			localMessageId = messages.controller.messageId;
			console.log("Recieved message type:" + messages.host.message.type)
			processMessage(messages.host.message)

		} else if (messages.controller.read) {
			waitingMessageConf = false;
		}
	}
}

async function sendNext() {
	if (!waitingMessageConf && messageQue.length > 0) {
		localMessageId++;
		var updateData = {}
		if (isHost) {
			updateData["/games/" + gameId + "/host/read"] = false;
			updateData["/games/" + gameId + "/host/message"] = messageQue[0]
			updateData["/games/" + gameId + "/host/messageId"] = localMessageId;
		} else {
			updateData["/games/" + gameId + "/controller/read"] = false;
			updateData["/games/" + gameId + "/controller/message"] = messageQue[0];
			updateData["/games/" + gameId + "/controller/messageId"] = localMessageId;
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
		updateData["/games/" + gameId + "/controller/read"] = true;
	} else {
		updateData["/games/" + gameId + "/host/read"] = true;
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
/*
* 0 = not started
* 1 = waiting for an opponent to join (host)
* 2 = waiting for host to accept (client)
* 3 = starting peer connection (host)
* 4 = waiting for answer (host)
* 5 = waiting for offer (client)
* 6 = waiting for tracks 
* 7 = connected
*/
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
		case STATE.NOT_STARTED: {
			break;
		}
		case STATE.WAITING_FOR_CONTROLLER: {
			if (msg.type != "hello") {
				return;
			}

			offer = await peerConnection.createOffer({});
			await peerConnection.setLocalDescription(offer);
			console.log("Offer placed")
			sendMessage({type: 'offer', offer: peerConnection.localDescription});
			peerConnection.addEventListener("icecandidate", sendCandidate)
			cState = STATE.WAITING_FOR_ANSWER;
			document.getElementById("status-text").innerHTML = "Attempting to connect...";
			document.getElementById("status-text").classList.remove("error");
			document.getElementById("status-text").classList.add("info");

			sendReadConf();
			break;
		}
		case STATE.WAITING_FOR_HOST: {
			if (msg.type == "denied") {
				document.getElementById("status-text").classList.add("error");
				document.getElementById("status-text").classList.remove("info");
				hasCreatedGame = false;
				cState = STATE.NOT_STARTED;
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
				cState = STATE.WAITING_FOR_TRACKS;
				document.getElementById("status-text").innerHTML = "Attempting to connect...";
				document.getElementById("status-text").classList.remove("error");
				document.getElementById("status-text").classList.add("info");
			}
			sendReadConf();
			break;
		}
		case STATE.WAITING_FOR_ANSWER: {
			if (msg.type == "answer") {
				document.getElementById("status-text").innerHTML = "Connecting...";
				document.getElementById("status-text").classList.remove("error");
				document.getElementById("status-text").classList.add("info");
				await peerConnection.setRemoteDescription(msg.answer);
				cState = STATE.WAITING_FOR_TRACKS;
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
	disableGUI();
	rChannel = e.channel;
	rChannel.onmessage = readRemoteMessage;
	rChannel.onopen = function () {
		channelOpen = true;
		console.log("Recieve Channel Opened");
		document.getElementById("status-text").innerHTML = "Receiving Data...";
		document.getElementById("status-text").classList.remove("error");
		document.getElementById("status-text").classList.add("info");
		onConnection();
	}
	rChannel.onclose = function () {
		channelOpen = false;
		console.log("Recieve Channel Closed");
		document.getElementById("status-text").innerHTML = "Communication was closed.";
		document.getElementById("status-text").classList.remove("error");
		document.getElementById("status-text").classList.add("info");

		peerConnection.close();
		peerConnection = new RTCPeerConnection();
		dataChannel = peerConnection.createDataChannel("number");
		rChannel = null;
		cState = STATE.NOT_STARTED;
		hasCreatedGame = false;
		clearGameData();
	}
}

function pingThem() {
	if (!connectionChecked && channelOpen) {
		dataChannel.send('{"type":"ping"}')
	}
}

setInterval(pingThem, 1000)
