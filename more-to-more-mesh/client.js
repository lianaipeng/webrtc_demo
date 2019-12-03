var connection = new WebSocket('ws://10.10.10.87:8888'),
localName = "";

var loginPage = document.querySelector('#login-page'),
localNameInput = document.querySelector('#localName'),
loginButton = document.querySelector('#login');

var callPage = document.querySelector('#call-page'),
remoteNameInput = document.querySelector('#remoteName'),
joinButton = document.querySelector('#join'),
leaveButton = document.querySelector('#leave');
callPage.style.display = "none";

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
var remoteVideo2 = document.querySelector('#remoteVideo2');
var localUser;
var userList = [];

var remoteVideos = [{"id":1, "handle":remoteVideo, "state":false, "user":""}, 
					{"id":2, "handle":remoteVideo2, "state":false, "user":""}];

function getRemoteVideo() {
	//for (var obj in remoteVideos) {
	for (var i=0; i<remoteVideos.length; i++) {
		console.log("getRemoteVideo id:", remoteVideos[i].id, "state:", remoteVideos[i].state);
		if (remoteVideos[i].state === false) {
			remoteVideos[i].state = true;
			return remoteVideos[i];
		}
		//console.log("##########################", remoteVideos[i]);
		//return remoteVideos[i].state === false ? remoteVideos[i] : "";
	}
}
function retRemoteVideo(video) {
	video.state = false;
	video.user = "";
}


var localStream; // local video stream object
var pcMap = new Map();


//////////////////////////////// WebSocket /////////////////////////////////
connection.onopen = function() {
    console.log("## Connect WebSocket ok");
};
// Handle all messages through this callback
connection.onmessage = function(message) {
    //alert(JSON.stringify(message.data));
    //console.log("Got message:", message.data);
    var data = JSON.parse(message.data);
    switch (data.messageType) {
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
		console.log("Unrecognized command", data.messageType);
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
		var roomId = "wocao";
        send({
            messageType: "login",
			roomId: roomId,
            userName: localUser
        });
    }
});
// 进入房间按钮
joinButton.addEventListener("click",
function() {
	var roomId = "wocao";

	if (userList.length > 0) {
		console.log("&&&&&&&&&&&&&&&&&&&&&7", userList);
		doJoin(roomId);
	}
});
// 退出房间按钮
leaveButton.addEventListener("click",
function() {
    send({
        messageType: "leave",
		//to: remoteUser,
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

		userList = data.userList;
		console.log("handleLogin:", userList);
    }
};
// 接收offer callback
function handleOffer(data) {
	console.log("handleOffer", data);

	// 被接收端 创建与远端的连接
	if (pcMap[data.from]) {
		//console.log("handleOffer has pc", data.from)
		console.log("handleOffer has pc", data)
		pcMap[data.from].setRemoteDescription(data.offer);
	} else {
		console.log("handleOffer no pc", data.from);

		var pc = createPeerConnection(data.from);
		pc.setRemoteDescription(data.offer);
		//pc.createOffer(createOfferAndSendMessage, handleCreateOfferError);
		
		let co = new Promise((r,j)=>{
			pc.createAnswer(answer=>{
						r(answer);
					},error =>{
						j(error);
					});
		});
		co.then(answer =>{
				console.log('createAnswerAndSendMessage from:',localUser, "to:", data.from);
				send({
					messageType: "answer",
					to: data.from,
					from: localUser,
					//to: localUser,
					//from: data.from,
					answer: answer
				});
				pc.setLocalDescription(answer);
		});

		pcMap[data.from] = pc;
		console.log("######## create answer");

		//var pc = createPeerConnection();
		//pc.setRemoteDescription(data.offer);
		//doAnswer();
	}
}
/////////////// call create answer ///////////////
/*
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
		messageType: "answer",
		to: remoteUser,
		from: localUser,
		answer: answer
	});
}
function handleCreateAnswerError(error) {
	console.log('CreateAnswer() error: ', error);
}
*/
/////////////// call create answer ///////////////

// 接收answer callback
function handleAnswer(data) {
	//console.log('Remote answer received: ', data.answer);
	console.log('Remote answer received: ');
	if (pcMap[data.from]) {
		console.log('handleAnswer has user', data.from);
		pcMap[data.from].setRemoteDescription(new RTCSessionDescription(data.answer));
	} else {
		console.log('handleAnswer no user', data.from);
	}
}
// 候选回调
function handleCandidate(data) {
	//console.log('Remote candidate received: ', data.candidate);
	if (pcMap[data.from]) {
		console.log('handleCandidate has user', data.from);
		pcMap[data.from].addIceCandidate(new RTCIceCandidate(data.candidate));
	} else {
		console.log('handleCandidate no user', data.from);
	}
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
	//remoteVideo.srcObject = null;
	remoteVideos[0].srcObject = null;
}
function hangup() {
	console.log('Hanging up !');
	//remoteVideo.srcObject = null;
	remoteVideos[0].srcObject = null;
	//localVideo.srcObject = null;
	/*
	if (pc != null) {
		pc.close();
		pc.onicecandidate = null;
		pc.onaddstream = null;
		pc = null;
	}
	*/
}
//////////////////////////////// Event callback ////////////////////////////

////////////////////////////// PeerConnection //////////////////////////////
/////////////// MediaDevice /////////////////////////
navigator.mediaDevices.getUserMedia({
	audio: true,
	video: { width: 1280, height: 720 }
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
function createPeerConnection(userName) {
	var pc = null;
    try {
		var configuration = { 
			"iceServers": [{
				"url": "stun:stun.1.google.com:19302",
				"credential": "password",
				"username": "username"
			}]
		}; 
		let PeerConnection = (window.RTCPeerConnection ||	
				window.webkitRTCPeerConnection ||	
				window.mozRTCPeerConnection);
        //pc = new RTCPeerConnection(configuration);
        //pc = new RTCPeerConnection(null);
        var pc = new PeerConnection(null);
		/*
        pc.onicecandidate = handleIceCandidate;
		pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
		*/
        //pc.onaddstream = function(e) {
		//	remoteVideo.src = window.URL.createObjectURL(e.stream);
		//};
		pc.onicecandidate = function(event) {
			// console.log('Handle ICE candidate', userName,' event:', event);
			if (event.candidate) {
				send({
					messageType: "candidate",
					to: userName, // remoteUser
					from: localUser,
					candidate: event.candidate
				});
				console.log('Broadcast Candidate:');
			} else {
				console.log('End of candidates.');
			}
		};
		pc.onaddstream = function(event) {
			console.log('Handle remote stream added.');
			//remoteVideo.srcObject = event.stream;

			var video = getRemoteVideo();
			//console.log("# id", video.id, "state", video.state);
			video.handle.srcObject = event.stream;
		}
		pc.onremovestream = function(event) {
			console.log('Handle remote stream removed. Event: ', event);
		}
        pc.addStream(localStream);
        console.log('PeerConnnection Created');
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
    }
	//console.log("createPeerConnection,", pc);
	return pc;
}
/*
function handleIceCandidate(event) {
	 console.log('Handle ICE candidate event: ', event);
	 if (event.candidate) {
		send({
			messageType: "candidate",
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
	//remoteVideo.srcObject = event.stream;
	//remoteVideos[0].srcObject = event.stream;
	//getRemoteVideo();

	//var tempVideo = getRemoteVideo();
	//console.log("# id", tempVideo.id, "state", tempVideo.state);

	var video = getRemoteVideo();
	console.log("# id", video.id, "state", video.state);
	video.srcObject = event.stream;
}
function handleRemoteStreamRemoved(event) {
	console.log('Handle remote stream removed. Event: ', event);
	//remoteVideo.srcObject = null;
	//remoteVideos[0].srcObject = null;
}
*/
/////////////// create peerconnection ///////////////
/////////////// call create offer ///////////////
function doJoin(roomId) {
	console.log("doJoin:user:", localUser, "joining room:", roomId);
	userList.map(async (item) =>{
		console.log("$$$$$$$$$$$$$ remoteUser:", item, "localUser:", localUser);
		if (item !== localUser) {
			var pc = createPeerConnection(item);
			//pc.createOffer(createOfferAndSendMessage, handleCreateOfferError);
			
			let co = new Promise((r,j)=>{
				pc.createOffer(offer=>{
							r(offer);
						},error =>{
							j(error);
						});
			});
			co.then(offer =>{
					//console.log(offer,item);
					console.log('createOfferAndSendMessage from:',localUser, "to:", item);
					send({
						messageType: "offer",
						offer: offer,
						to: item,
						from: localUser
					});
					pc.setLocalDescription(offer);
			});
			pcMap[item] = pc;
		} else {
		}
	});
	console.log("^^^^^^^^^^^^^^^^", pcMap);
}
/*
function createOfferAndSendMessage(offer) {
	//console.log('createOfferAndSendMessage sending message', offer);
	console.log('createOfferAndSendMessage sending message');
	send({
		messageType: "offer",
		offer: offer,
		to: remoteUser,
		from: localUser
	});
	pc.setLocalDescription(offer);
}
function handleCreateOfferError(event) {
	console.log('CreateOffer() error: ', event);
}
*/
/////////////// call create offer ///////////////
////////////////////////////// PeerConnection //////////////////////////////
