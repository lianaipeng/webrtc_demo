
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

var selectRoom = document.getElementById('selectRoom');
var inputRoom = document.getElementById('inputRoom');

var localStream; // local video stream object

var localUser;
var roomId = "myRoom";
var roomList = [];
var pcMap = new Map();

var connection = new WebSocket('ws://10.10.10.87:8888', 'chat');

//////////////////////////////// GET ROOMID ////////////////////////////////
function selectAddOption(value, index) {
    selectRoom.options.add(new Option(value, index));
}

function selectRoomChanged() {
    var selectText = selectRoom.options[selectRoom.selectedIndex].text;
    inputRoom.value = selectText;
}
//////////////////////////////// GET ROOMID ////////////////////////////////

//////////////////////////////// GET VIDEO //////////////////////////////////
var remoteVideos = [{"id":1, "handle":remoteVideo1, "state":false, "userName":""}, 
                    {"id":2, "handle":remoteVideo2, "state":false, "userName":""},
                    {"id":3, "handle":remoteVideo3, "state":false, "userName":""},
                    {"id":4, "handle":remoteVideo4, "state":false, "userName":""},
                    {"id":5, "handle":remoteVideo5, "state":false, "userName":""}];
function getRemoteVideo(user) {
    //for (var obj in remoteVideos) {
    for (var i=0; i<remoteVideos.length; i++) {
        console.log("getRemoteVideo id:", remoteVideos[i].id, "state:", remoteVideos[i].state);
        if (remoteVideos[i].state === false) {
            remoteVideos[i].state = true;
            remoteVideos[i].userName = user;
            return remoteVideos[i];
        }
    }
}
function retRemoteVideo(user) {
    var tvideo = remoteVideos.find(item => {
        return item.userName == user;        
    });

    if (tvideo) {
        tvideo.state = false;
        tvideo.userName = "";
        tvideo.handle.srcObject = null;
    }
}
//////////////////////////////// GET VIDEO //////////////////////////////////

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
    case "join":
        handleJoin(data);
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
// 进入房间按钮
joinButton.addEventListener("click",
function() {
    roomId = inputRoom.value;
    //console.log("######################", roomId);

    if (roomId.length > 0) {
        console.log("JoinButton join roomId roomId:", roomId);
        send({
            messageType: "join",
            roomId: roomId,
            userName: localUser
        });
    }
});
// 退出房间按钮
leaveButton.addEventListener("click",
function() {
    // 只关闭视频连接
    console.log('leaveButton ', roomId);
    for (var key in pcMap) {
        send({
            messageType: "leave",
            roomId: roomId, 
            fromUser: localUser,
            toUser: key
        });

        deletePeerConnection(key);

        retRemoteVideo(key);
    }
});
// callback
function handleLogin(data) {
    console.log("handleLogin^^", data);
    if (data.state === false) {
        alert("handleLogin unsuccessful, please try a different name.");
    } else {
        loginPage.style.display = "none";
        callPage.style.display = "block";

        // only get roomlist 
        roomList = data.roomList;
        //console.log("handleLogin:", data.roomList);
        
        roomList.forEach(function(value, index, all) {
            selectAddOption(value.roomId, index);
        });
    }

    navigator.mediaDevices.getUserMedia({
        audio: true,
        //video: { width: 1280, height: 720 }
        //video: { width: 260, height: 400 }
        video: { 
            width: 260, 
            height: 200, 
            frameRate: {ideal:60, min:10} 
        }
    })
    .then(openLocalStream)
    .catch(function(e) {
        alert('getUserMedia() error: ' + e.name);
    });

    console.log("handleLogin$$", roomList);
};
// 接收join callback
function handleJoin(data) {
    console.log("handleJoin^^", data);

    roomId = data.roomId;
    var troomInfo = roomList.find(item => {return item.roomId === data.roomId});
    if (troomInfo) {
        console.log("handleJoin exist", data.roomId);
        troomInfo.userList = data.userList;
    } else {
        troomInfo = {};
        console.log("handleJoin create", data.roomId);
        troomInfo.roomId = data.roomId;
        troomInfo.userList = data.userList;
        roomList.push(troomInfo);
    }
    console.log("handleJoin$$", roomList);

    troomInfo.userList.forEach(function(name, index, all) {
        console.log("handleJoin", name, index);        
        if (name !== localUser) {
            doOffer(data.roomId, name);
        }
    });
}
function doOffer(room, remote) {
    console.log("doOffer^^: roomId:", room,"localUser:", localUser, "romoteUser:", remote);
    var pc = createPeerConnection(room, remote);
    let co = new Promise((r,j)=>{
        pc.createOffer(offer=>{
                    r(offer);
                },error =>{
                    j(error);
                });
    });
    co.then(offer =>{
            console.log('createOfferAndSendMessage from:',localUser, "to:", remote);
            send({
                messageType: "offer",
                roomId: room,
                fromUser: localUser,
                toUser: remote,
                offer: offer
            });
            pc.setLocalDescription(offer);
    });
    pcMap[remote] = pc;
    //pcMap[localUser] = pc;
    console.log("doOffer fromUser:", remote," pcMap:", pcMap);
}
// 接收offer callback
function handleOffer(data) {
    console.log("handleOffer^^ reviced remote offer", data);
    // 被接收端 创建与远端的连接
    if (pcMap[data.fromUser]) {
        console.log("handleOffer has pc", data)
        pcMap[data.fromUser].setRemoteDescription(data.offer);
    } else {
        console.log("handleOffer no pc", data.fromUser);

        var pc = createPeerConnection(data.roomId, data.fromUser);
        pc.setRemoteDescription(data.offer);
        
        let co = new Promise((r,j)=>{
            pc.createAnswer(answer=>{
                        r(answer);
                    },error =>{
                        j(error);
                    });
        });
        co.then(answer =>{
                console.log('createAnswerAndSendMessage from:',localUser, "to:", data.fromUser);
                send({
                    messageType: "answer",
                    roomId: data.roomId,
                    fromUser: localUser,
                    toUser: data.fromUser,
                    answer: answer
                });
                pc.setLocalDescription(answer);
        });

        pcMap[data.fromUser] = pc;
        //console.log("handleOffer fromUser:", data.fromUser," pcMap:", pcMap);
    }
    //console.log("handleOffer$$", pcMap);
    console.log("handleOffer fromUser:", data.fromUser," pcMap:", pcMap);
}
// 接收answer callback
function handleAnswer(data) {
    console.log('handleAnswer^^ Remote answer received:');

    if (pcMap[data.fromUser]) {
        console.log('handleAnswer has user', data.fromUser);
        pcMap[data.fromUser].setRemoteDescription(new RTCSessionDescription(data.answer));
    } else {
        console.log('handleAnswer no user', data.fromUser);
    }
    console.log('handleAnswer$$');
}
// 候选回调
function handleCandidate(data) {
    console.log('handleCandidate^^ Remote candidate received:');
    
    if (pcMap[data.fromUser]) {
        console.log('handleCandidate has user', data.fromUser);
        pcMap[data.fromUser].addIceCandidate(new RTCIceCandidate(data.candidate));
    } else {
        console.log('handleCandidate no user', data.fromUser);
    }
    console.log('handleCandidate$$');
}
// 退出回调
function handleLeave(data) {
    console.log('handleLeave^^ remoteUser:', data.fromUser);

    if (pcMap[data.fromUser]) {
        pcMap[data.fromUser].close();
        pcMap[data.fromUser].onicecandidate = null;
        pcMap[data.fromUser].onaddstream = null;
        delete pcMap[data.fromUser];

        retRemoteVideo(data.fromUser);
    }
    console.log('handleLeave$$', pcMap);
}
//////////////////////////////// Event callback ////////////////////////////
////////////////////////////// PeerConnection //////////////////////////////
// 必须初始化完 本地视频 才能调用create函数
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
/*
navigator.mediaDevices.getUserMedia({
    audio: true,
    //video: { width: 1280, height: 720 }
    //video: { width: 260, height: 400 }
    video: { 
        width: 260, 
        height: 200, 
        frameRate: {ideal:60, min:10} 
    }
})
.then(openLocalStream)
.catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
});
*/
function openLocalStream(stream) {
    console.log('## Open local video stream');
    localVideo.srcObject = stream;
    localStream = stream;
}
/////////////// MediaDevice /////////////////////////
/////////////// create peerconnection ///////////////
function deletePeerConnection(remote) {
    console.log('deletePeerConnection^^', remote);
    pcMap[remote].close();
    pcMap[remote].onicecandidate = null;
    pcMap[remote].onaddstream = null;
    delete pcMap[remote];
    console.log('deletePeerConnection$$');
}
function createPeerConnection(room, rUser) {
    var pc = null;
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
        //    remoteVideo.src = window.URL.createObjectURL(e.stream);
        //};
        pc.onicecandidate = function(event) {
            // console.log('Handle ICE candidate', userName,' event:', event);
            if (event.candidate) {
                send({
                    messageType: "candidate",
                    roomId: room,
                    fromUser: localUser,
                    toUser: rUser, // remoteUser
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

            var tvideo = getRemoteVideo(rUser);
            tvideo.handle.srcObject = event.stream;
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
    return pc;
}
////////////////////////////// PeerConnection //////////////////////////////
