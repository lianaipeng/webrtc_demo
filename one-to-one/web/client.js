//var connection = new WebSocket('ws://10.10.10.87:8888'),
var connection = new WebSocket('wss://xx.xxxxx.com:28887'),
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
var localConstrantsV = document.querySelector('#localConstrantsV');
var localConstrantsA = document.querySelector('#localConstrantsA');
var remoteVideo = document.querySelector('#remoteVideo');
var remoteConstrantsV = document.querySelector('#remoteConstrantsV');
var remoteConstrantsA = document.querySelector('#remoteConstrantsA');
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
var contrants = {
//    video:false,
    video: {
        width:320, 
        height:240, 
        //aspectRatio:1.33, // 宽高比，这个由宽除以高计算，一般不用设置
        frameRate:20, 
        //facingMode:"environment", // 摄像头面对模式，user是面向使用者(前置摄像头),environment是后置摄像头，left前置左摄像头，right前置右摄像头
        //resizeMode:"none", // 裁剪模式，none为不裁剪(不常用)
           },
//    audio: false
    audio: {
        //volume:1.0, // 音量，0静音，1最大声音
        volume:0, // 音量，0静音，1最大声音
        sampleRate:44100,// 采样率
        sampleSize:8, // 采样大小(每一个样用多少位表示)
        echoCancellation: true, // 是否开启回音消除
        autoGainControl:true, // 是否开启自动增益，也就是在原有录制的声音的基础上是否增加音量
        noiseSuppression:true, // 是否开启降噪
        latency: 0.2, // 延迟大小，在直播过程中latency设置的越小实时性会越好，但是网络不好时容易出现卡顿；设置的越大流畅度越好，但是设置太大会有明显的延迟。一般设置500ms，设置为200ms实时效果就很好了，大于500ms就能明显感觉到延迟了。
        channelCount:1, // 声道数，一般设置单声道就够了
           }
};
navigator.mediaDevices.getUserMedia(contrants).then(openLocalStream).catch(handleError);
//navigator.mediaDevices.getUserMedia({
//    audio: true,
//    //video: true
//    video: { 
//        width: 150, 
//        height: 200, 
//        frameRate: {ideal:60, min:10} 
//    }
//})
//.then(openLocalStream)
//.catch(function(e) {
//    alert('getUserMedia() error: ' + e.name);
//});

function openLocalStream(stream) {
    console.log('## Open local video stream');
    localVideo.srcObject = stream;
    localStream = stream;

    var videoTrack = stream.getVideoTracks()[0]; // 获取视频轨的第一个轨
    var videoConstrants = videoTrack.getSettings(); // 获取约束信息
    localConstrantsV.textContent = JSON.stringify(videoConstrants, null, 2);

    var audioTrack = stream.getAudioTracks()[0]; // 获取视频轨的第一个轨
    var audioConstrants = audioTrack.getSettings(); // 获取约束信息
    localConstrantsA.textContent = JSON.stringify(audioConstrants, null, 2);
}

function handleError(err){
    console.log('getUserMedia() name:' + err.name + ' message:' + err.message);
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

    var videoTrack = event.stream.getVideoTracks()[0]; // 获取视频轨的第一个轨
    var videoConstrants = videoTrack.getSettings(); // 获取约束信息
    //remoteConstrants.textContent = JSON.stringify(videoConstrants, null, 2);
    //
    var audioTrack = event.stream.getAudioTracks()[0]; // 获取视频轨的第一个轨
    var audioConstrants = audioTrack.getSettings(); // 获取约束信息
    //localConstrantsA.textContent = JSON.stringify(audioConstrants, null, 2);
    console.log('Handle remote stream added.videoConstrants:', JSON.stringify(videoConstrants, null, 2));
    console.log('Handle remote stream added.audioConstrants:', JSON.stringify(audioConstrants, null, 2));
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
