var connection = new WebSocket('ws://10.10.10.87:8888'),
localName = "";

var loginPage = document.querySelector('#login-page'),
localNameInput = document.querySelector('#localName'),
loginButton = document.querySelector('#login');

var callPage = document.querySelector('#call-page'),
remoteNameInput = document.querySelector('#remoteName'),
callButton = document.querySelector('#call'),
hangUpButton = document.querySelector('#hang-up');
callPage.style.display = "none";

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
var localUser;
var remoteUser;

var localStream; // local video stream object
var pc = null; // webrtc RTCPeerConnection

//////////////////////////////// WebSocket /////////////////////////////////
connection.onopen = function() {
    console.log("## Connect WebSocket ok");
};
// Handle all messages through this callback
connection.onmessage = function(message) {
    //alert(JSON.stringify(message.data));
    //console.log("Got message:", message.data);
    var data = JSON.parse(message.data);
    switch (data.type) {
    case "login":
        handleLogin(data);
        break;
    case "offer":
        handleOffer(data);
        break;
    case "answer":
        handleAnswer(data);
        break;
    case "candidate":
        handleCandidate(data);
        break;
    case "leave":
        handleLeave(data);
        break;
    default:
		console.log("Unrecognized command", data.type);
        break;
    }
};

connection.onerror = function(err) {
    console.log("Got error", err);
};
// Alias for sending messages in JSON format
function send(message) {
    connection.send(JSON.stringify(message));
};
//////////////////////////////// WebSocket /////////////////////////////////

//////////////////////////////// Event callback ////////////////////////////
// 登录按钮 
loginButton.addEventListener("click",
function(event) {
    localUser = localNameInput.value;
    if (localUser.length > 0) {
        send({
            type: "login",
            name: localUser
        });
    }
});
// 呼叫按钮
callButton.addEventListener("click",
function() {
    remoteUser = remoteNameInput.value;
    if (remoteUser.length > 0) {
		doCall();
    }
});
// 挂起按钮
hangUpButton.addEventListener("click",
function() {
    send({
        type: "leave",
		to: remoteUser,
		from: localUser
    });
	hangup();
});
// callback
function handleLogin(data) {
    if (data.login === false) {
        alert("Login unsuccessful, please try a different name.");
    } else {
        loginPage.style.display = "none";
        callPage.style.display = "block";
        // Get the plumbing ready for a call
        createPeerConnection();
    }
};
// 接收offer callback
function handleOffer(data) {
	remoteUser = data.from;
	if (pc == null) {
		createPeerConnection()
	}
	pc.setRemoteDescription(data.offer);
	doAnswer();
}
// 接收answer callback
function handleAnswer(data) {
	//console.log('Remote answer received: ', data.answer);
	console.log('Remote answer received: ');
    pc.setRemoteDescription(new RTCSessionDescription(data.answer));
}
// 候选回调
function handleCandidate(data) {
	//console.log('Remote candidate received: ', data.candidate);
	console.log('Remote candidate received: ');
    pc.addIceCandidate(new RTCIceCandidate(data.candidate));
}
// 退出回调
function handleLeave(data) {
	/*
    theirVideo.src = null;
    yourPeerConn.close();
    yourPeerConn.onicecandidate = null;
    yourPeerConn.onaddstream = null;

    setupPeerConnection(stream);
	*/
	console.log('Remote hangup received:', data.from, "leave");
	//hangup();
	remoteVideo.srcObject = null;
}
function hangup() {
	console.log('Hanging up !');
	remoteVideo.srcObject = null;
	localVideo.srcObject = null;
	if (pc != null) {
		pc.close();
		pc.onicecandidate = null;
		pc.onaddstream = null;
		pc = null;
	}
}
//////////////////////////////// Event callback ////////////////////////////

////////////////////////////// PeerConnection //////////////////////////////
/////////////// MediaDevice /////////////////////////
navigator.mediaDevices.getUserMedia({
	audio: true,
	video: true
})
.then(openLocalStream)
.catch(function(e) {
	alert('getUserMedia() error: ' + e.name);
});

function openLocalStream(stream) {
	console.log('## Open local video stream');
	localVideo.srcObject = stream;
	localStream = stream;
}
/////////////// MediaDevice /////////////////////////
/////////////// create peerconnection ///////////////
function createPeerConnection() {
    try {
		var configuration = { 
			"iceServers": [{
				"url": "stun:stun.1.google.com:19302"
			}]  
		}; 
        //pc = new RTCPeerConnection(configuration);

        pc = new RTCPeerConnection(null);
        pc.onicecandidate = handleIceCandidate;
		pc.onaddstream = handleRemoteStreamAdded;
        //pc.onaddstream = function(e) {
		//	remoteVideo.src = window.URL.createObjectURL(e.stream);
		//};
        pc.onremovestream = handleRemoteStreamRemoved;
        pc.addStream(localStream);
        console.log('RTCPeerConnnection Created');
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
}
function handleIceCandidate(event) {
	 console.log('Handle ICE candidate event: ', event);
	 if (event.candidate) {
		send({
			type: "candidate",
			candidate: event.candidate,
			to: remoteUser,
			frome: localUser
		});
		console.log('Broadcast Candidate:');
	 } else {
		console.log('End of candidates.');
	 }
}
function handleRemoteStreamAdded(event) {
	console.log('Handle remote stream added.');
	remoteVideo.srcObject = event.stream;
}
function handleRemoteStreamRemoved(event) {
	console.log('Handle remote stream removed. Event: ', event);
	remoteVideo.srcObject = null;
}
/////////////// create peerconnection ///////////////
/////////////// call create offer ///////////////
function doCall() {
	console.log('Starting call: Sending offer to remote peer:', remoteUser, "from:", localUser);
	if (pc == null) {
		createPeerConnection()
	}
	pc.createOffer(createOfferAndSendMessage, handleCreateOfferError);
}
function createOfferAndSendMessage(offer) {
	//console.log('createOfferAndSendMessage sending message', offer);
	console.log('createOfferAndSendMessage sending message');
	send({
		type: "offer",
		offer: offer,
		to: remoteUser,
		from: localUser
	});
	pc.setLocalDescription(offer);
}
function handleCreateOfferError(event) {
	console.log('CreateOffer() error: ', event);
}
/////////////// call create offer ///////////////
/////////////// call create answer ///////////////
function doAnswer() {
	console.log('Answer call: Sending answer to remote peer');
	if (pc == null) {
		createPeerConnection()
	}
	pc.createAnswer().then(createAnswerAndSendMessage, handleCreateAnswerError);
}
function createAnswerAndSendMessage(answer) {
	//console.log('createAnswerAndSendMessage sending message', answer);
	console.log('createAnswerAndSendMessage sending message');
	pc.setLocalDescription(answer);
	send({
		type: "answer",
		answer: answer,
		to: remoteUser,
		from: localUser
	});
}
function handleCreateAnswerError(error) {
	console.log('CreateAnswer() error: ', error);
}
/////////////// call create answer ///////////////
////////////////////////////// PeerConnection //////////////////////////////
