const binarySizeLimit = 1*1024*1024*1024;
const wsPort = "12345";
const messageSound = new Audio("newMessage.mp3");
let notifications = [];
<!-- IOS doesn't support Notification -->
const messageBox = document.getElementById("message");
const chatbox = document.getElementById("chatbox");
const loginModal = document.getElementById("login");
const waitingModal = document.getElementById("waiting");
let secret = null;
let ws = null;
let recorder = null;
try {
	secret = decodeURIComponent(window.location.search.slice(1));
} catch (e) {}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

<!-- let connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection; -->

<!-- websocket -->
let connectSucceeded = false;
let initialWebsocket = () => {
	ws = new WebSocket(`wss://${window.location.hostname}:${wsPort}`);
	ws.onopen = () => {
		ws.send(secret);
	}
	ws.onmessage = event => {
		connectSucceeded = true;
		if (event.data === "") return;
		let newMessage = event.data.toString();
		appendChat(newMessage);
		try {
			if (document.visibilityState != 'visible')
				notifications.push(new Notification(newMessage));
			else
				messageSound.play();
		} catch (e) {}
	}
	ws.onerror = event => {
		alert(`Websocket connecting error, please check if the ws port ${wsPort} is open, and the ws service is running OK.`);
		console.log(event);
	}
	ws.onclose = () => {
		if (connectSucceeded === true)
			setTimeout(initialWebsocket, 500);
		else
			alert("This is a private room. Bring an invitation, please.");
	}
}
let askNotification = () => {
	try {
		if (Notification.permission === 'default') {
			if(confirm("Allow notification push when new message received.")) {
				Notification.requestPermission();
			}
		}
	} catch (e) {
		console.log(e)
	}
}


<!-- element events -->
document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'visible'){
		notifications.forEach(n => n.close());
		notifications = [];
	}
});
let appendChat = text => {
	chatbox.insertAdjacentHTML("beforeend", `<div class="chatBubble">${text}</div>`);
	window.scrollTo(0,document.body.scrollHeight);
}
let waitForSendingComplete = async () => {
	while(ws.bufferedAmount !== 0) {
		await sleep(300);
	}
}
let sendMessage2Server = text => ws.send(text);
let sendBinaryMessage = async data => {
	if (data.size <= binarySizeLimit) {
		waitingModal.style.display = "block";
		sendMessage2Server(data);
		await waitForSendingComplete();
		waitingModal.style.display = "none";
	} else
		alert(`File size over limit ${binarySizeLimit/1024/1024} MB`);
}
let sendMessage = () => {
	let message2Send = messageBox.value;
	sendMessage2Server(message2Send);
	<!-- appendChat(message2Send) -->
	messageBox.value = "";
};
let checkInputAndSend = event => {
	if(event.keyCode === 13)
		sendMessage();
};
let sendHeartbeat = () => {
	if (ws.readyState === WebSocket.OPEN) ws.send(''); 
}
let notifyMe = () => {
	askNotification();
	messageSound.play();
	if (!("Notification" in window)) {
		// Check if the browser supports notifications
		alert("This browser does not support desktop notification");
	} else if (Notification.permission === "granted") {
		// Check whether notification permissions have already been granted;
		// if so, create a notification
		const notification = new Notification("Notification enabled, have fun!");
		// …
	} else if (Notification.permission !== "denied") {
		// We need to ask the user for permission
		Notification.requestPermission().then((permission) => {
			// If the user accepts, let's create a notification
			if (permission === "granted") {
				const notification = new Notification("Notification enabled, have fun!");
			}
		});
	}
// At last, if the user has denied notifications, and you
// want to be respectful there is no need to bother them anymore.
}
document.ondblclick = e => {
	if(e.target.className==="chatBubble") {
		messageBox.value = `${e.target.textContent} <---------- `;
		messageBox.focus();
	}
};
document.onpaste = evt => {
	let binaryData = evt.clipboardData.files[0];
	if (binaryData)
		sendBinaryMessage(binaryData);
};

<!-- startWebsocket -->
let login = () => {
	if (secret != null && secret != '') {
		let firstTime = localStorage.getItem("first_time");
		if(!firstTime) {
			// first time loaded!
			localStorage.setItem("first_time","1");
			alert("Don't share the link to anyone else as it leaks your credential (in the URL)!");
		}
		initialWebsocket();
		setInterval(sendHeartbeat, 7000);
		<!-- connection.ontypechange = sendHeartbeat; -->
		<!-- connection.ontypechange = () => { -->
			<!-- notifications.push(new Notification(ws.readyState)); -->
			<!-- sendHeartbeat(); -->
		<!-- } -->
	}
	loginModal.style.display = "none";
}