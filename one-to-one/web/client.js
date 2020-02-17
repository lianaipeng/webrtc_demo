var connection = new WebSocket('ws://10.10.10.87:8888'),
localName = "";

var loginPage = document.querySelector('#login-page'),
localNameInput = document.querySelector('#localName'),
loginButton = document.querySelector('#login');

var callPage = document.querySelector('#call-page'),
remoteNameInput = document.querySelector('#remoteName'),
callButton = document.querySelector('#call'),
leaveButton = document.querySelector('#leave');
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
        send({
            messageType: "login",
            userName: localUser
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
leaveButton.addEventListener("click",
function() {
    send({
        messageType: "leave",
        userName: localUser
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
    remoteUser = data.fromUser;
    if (pc == null) {
        createPeerConnection()
    }
    pc.setRemoteDescription(data.offer);
    //pc.setRemoteDescription(JSON.parse(data.offer));
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
    console.log('Remote hangup received:', data.fromUser, "leave");
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
//var constraints = { // 音频、视频约束
//  audio: true, // 指定请求音频Track
//  video: {  // 指定请求视频Track
//      mandatory: { // 对视频Track的强制约束条件
//          width: {min: 320},
//          height: {min: 180}
//      },
//      optional: [ // 对视频Track的可选约束条件
//          {frameRate: 30}
//      ]
//  }
//};
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
        //"iceServers": [
        //    { "url": "stun:stun.l.google.com:19302" }, //使用google公共测试服务器
        //    { "url": "turn:user@turnserver.com", "credential": "pass" } // 如有turn服务器，可在此配置
        //]
        var configuration = { 
            "iceServers": [{
                "url": "stun:stun.1.google.com:19302",
                "credential": "password",
                "username": "username"
            }]
        }; 
        var optionalArgument = {
            optional: [{
                DtlsSrtpKeyAgreement: true
          },{frameRate:30}]
        };
        //pc = new RTCPeerConnection(configuration);

        pc = new RTCPeerConnection(null, optionalArgument);
        pc.onicecandidate = handleIceCandidate;
        pc.onaddstream = handleRemoteStreamAdded;
        //pc.onaddstream = function(e) {
        //    remoteVideo.src = window.URL.createObjectURL(e.stream);
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
            messageType: "candidate",
            toUser: remoteUser,
            fromUser: localUser,
            candidate: event.candidate
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
        messageType: "offer",
        toUser: remoteUser,
        fromUser: localUser,
        offer: offer
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
        messageType: "answer",
        toUser: remoteUser,
        fromUser: localUser,
        answer: answer
    });
}
function handleCreateAnswerError(error) {
    console.log('CreateAnswer() error: ', error);
}
/////////////// call create answer ///////////////
////////////////////////////// PeerConnection //////////////////////////////
