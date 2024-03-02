function readRemoteMessage(msg) {
	var data = JSON.parse(msg.data);
	console.log(data);
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
			break;
		}
		case "accept": {
			break;
		}
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
	}
}

function onConnection() { }

let orient = null;
let gyro = null;

function sendSensorData() {
	
}

window.addEventListener("load", () => {
	Promise.all([
		navigator.permissions.query({ "name": "accelerometer" }),
		navigator.permissions.query({ "name": "gyroscope" })
	]).then(([acc, gyr]) => {
		if (acc.state == "denied" || gyr.state == "denied") {
			alert("DENIED: I need permission for accelerometer and gyroscope");
			return;
		}

		if (acc.state == "prompt" || gyr.state == "prompt") {
			const response = browser.permissions.request(["accelerometer", "gyroscope"]);
			if (!response) {
				alert("I need permission for accelerometer and gyroscope");
				return;
			}
		}

		if (acc.state == "granted" && gyr.state == "granted") {
			alert("Got permissions :)");
		}

		orient = new AbsoluteOrientationSensor({ frequency: 60, referenceFrame: "device" });
		gyro = new Gyroscope({ frequency: 60 });

		orient.addEventListener("reading", () => {
			alert("got orientation reading");
			document.getElementById("status-text").innerText = "got orientation reading";
			dataChannel.send(JSON.stringify({
				type: "orientation",
				data: orient.quaternion,
			}));
		});

		orient.addEventListener("error", (event) => {
			alert("got error doing orientation reading :(");
			console.log(event);
		});

		gyro.addEventListener("reading", () => {
			document.getElementById("status-text").innerText = "got gyroscope reading";
			dataChannel.send(JSON.stringify({
				type: "gyro",
				x: gyro.x,
				y: gyro.y,
				z: gyro.z,
			}));
		});

		gyro.addEventListener("error", (event) => {
			alert("got error doing gyro reading :(");
			console.log(event);
		});

		orient.start();
		gyro.start();
	}).catch(() => {
		alert("Error getting accelerometer and gyroscope permissions");
	});
});
