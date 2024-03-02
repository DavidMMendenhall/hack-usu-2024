function readRemoteMessage(msg) {
	var data = JSON.parse(msg.data);
	//console.log(data);
	switch (data.type) {
		case "ping": {
			dataChannel.send('{"type":"pong"}')
			break;
		}
		case "pong": {
			connectionChecked = true;
			dataChannel.send('{"type":"start"}')
			document.getElementById("status-text").innerHTML = "Connected!";
			document.getElementById("status-text").classList.remove("error");
			document.getElementById("status-text").classList.add("info");
			break;
		}
		default: {
			logdiv = document.createElement("div");
			logdiv.innerHTML = msg;

			document.getElementById("log").append(logdiv);
		}
	}
}

function onConnection() { }
