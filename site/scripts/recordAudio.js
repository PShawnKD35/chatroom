const voiceButton = document.getElementById("voice");
let mediaRecorder;
let chunks = [];

voiceButton.style.background="#DAF7A6"

voiceButton.onclick = () => {
	if (mediaRecorder && mediaRecorder.state === "recording") {
		mediaRecorder.stop();
		mediaRecorder.stream.getTracks().forEach(track => track.stop());
		mediaRecorder = null;
		voiceButton.textContent = "Voice";
		voiceButton.style.background="#DAF7A6"
	} else {
		if (navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia({ audio: true }).then(
				stream => {
					mediaRecorder = new MediaRecorder(stream);
					mediaRecorder.ondataavailable = e => {
						chunks.push(e.data);
					};

					mediaRecorder.onstop = e => {
						let blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
						chunks = [];
						sendMessage2Server(blob);
						blob = null;
					};
					mediaRecorder.start();
					voiceButton.textContent = "Stop";
					voiceButton.style.background="#F08080"
				},
				() => {
					alert("授权录音失败！");
				}
			);
		} else {
			alert("浏览器不支持录音");
		}
	}
};
