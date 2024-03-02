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

function calibrate() {
	dataChannel.send('{"type":"calibrate"}')
}

let orient = null;

async function initSensors() {
	try {
		// Check if the browser supports the required sensors
		if (!('AbsoluteOrientationSensor' in window) || !('Gyroscope' in window)) {
			throw new Error('AbsoluteOrientationSensor or Gyroscope not supported in this browser.');
		}

		// Request permission for AbsoluteOrientationSensor
		const orientPermission = await navigator.permissions.query({ name: 'accelerometer' });
		if (orientPermission.state !== 'granted') {
			throw new Error('Permission for AbsoluteOrientationSensor denied.');
		}

		// Request permission for Gyroscope
		const gyroPermission = await navigator.permissions.query({ name: 'gyroscope' });
		if (gyroPermission.state !== 'granted') {
			throw new Error('Permission for Gyroscope denied.');
		}

		// Request permission for Magnetometer
		const magnetPermission = await navigator.permissions.query({ name: 'magnetometer' });
		if (magnetPermission.state !== 'granted') {
			throw new Error('Permission for Magnetometer denied.');
		}

		// Instantiate sensors
		orient = new AbsoluteOrientationSensor({ frequency: 60, referenceFrame: "device" });

		// Set up event listeners
		orient.addEventListener("reading", () => {
			console.log("Got orientation reading:", orient.quaternion);
			dataChannel.send(JSON.stringify({
				type: "orientation",
				timestamp: orient.timestamp,
				data: orient.quaternion,
			}));
		});

		orient.addEventListener("error", (event) => {
			console.error("Error reading orientation sensor:", event);
		});

		// Start sensors
		orient.start();

	} catch (error) {
		console.error('Error initializing sensors:', error);
	}
}

// Call the function to initialize sensors
initSensors();

let leftHeld = false;
let rightHeld = false;

setInterval(() => {
	if (leftHeld && rightHeld) {
		return;
	} else if (leftHeld) {
		dataChannel.send('{"type":"rotate","direction":-1}');
	} else if (rightHeld) {
		dataChannel.send('{"type":"rotate","direction":1}');
	}
}, 1000/60);
