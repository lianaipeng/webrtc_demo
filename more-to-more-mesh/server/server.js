//var WebSocketServer = require('ws').Server,
//
//wss = new WebSocketServer({
//    port: 8888
//});


const config = {
    port: 8888,
    ssl_key: '/usr/local/nginx/cert2/private.key',
    ssl_cert: '/usr/local/nginx/cert2/caroot/cacert.pem'
}

const fs = require('fs');
const httpServer = require('https');
const WebSocketServer = require('ws').Server;
// 创建request请求监听器
const processRequest = (req, res) => {
    res.writeHead(200);
    res.end('websocket && https\n');
};

const app = httpServer.createServer({
            key: fs.readFileSync(config.ssl_key),
            cert: fs.readFileSync(config.ssl_cert)
        }, processRequest).listen(config.port);

const wss = new WebSocketServer({
            server: app
        });



var roomList = [];
var connMap = new Map();
//////////////////////////// WebSocket ////////////////////////////
wss.on('connection',
function(connection) {
    //console.log("User connected");

    connection.on('message', function(message) {
        doMessage(message, connection)
    });
 
    /*
    function sendTo(conn, message) {
        conn.send(JSON.stringify(message));
    }
    */
 
    connection.on('close', function() {
        //console.log("close ###############");
        doClose(connection)
    });
    //connection.send('{"hello":"hello123"}');
});
 
wss.on('listening',
function() {
    console.log("Server started...");
});
//////////////////////////// WebSocket ////////////////////////////

function sendTo(conn, message) {
    conn.send(JSON.stringify(message));
}

function doMessage(message, conn) {
    console.log("doMessage:" + message);
    var data;
    try {
        data = JSON.parse(message);
        //console.log(message);
    } catch(e) {
        console.log("Error parsing JSON");
        data = {};
    }

    switch (data.messageType) {
        case "login":
            handleLogin(conn, data);
            break;
        case "join":
            handleJoin(conn, data);
            break;
        case "offer":
            handleOffer(conn, data);
            break;
        case "answer":
            handleAnswer(conn, data);
            break;
        case "candidate":
            handleCandidate(data);
            break;
        case "leave":
            handleLeave(data);
            break;
        case "detach":
            handleDetach(data);
            break;
        default:
            sendTo(conn, {
                messageType: "error",
                message: "Unrecognized command:" + data.messageType
            });
            break;
    }
}

function handleLogin(conn, data) {
    console.log("handleLogin^^", data);
    console.log("handleLogin^^ connMap:", Object.keys(connMap).length, "data:", data);

    if (Object.keys(connMap).includes(data.userName)) {
        console.log("handleLogin-- includes");
    } else {
        console.log("handleLogin-- no includes");
    }

    connMap[data.userName] = conn;
    conn.userName = data.userName;
    // 还拿不到roomId
    // conn.roomId = data.roomId;
    sendTo(conn, {
        messageType: "login",
        state: true,
        roomList: roomList
    });

    console.log("handleLogin^^ connMap:", Object.keys(connMap).length, "data:", data);
    console.log("handleLogin$$", roomList);
}
function handleJoin(conn, data) {
    console.log("handleJoin^^ roomId:", data.roomId, "userName:", data.userName);

    //var troomInfo = roomList.filter(item => {return item.roomId === data.roomId});
    conn.roomId = data.roomId;
    var troomInfo = roomList.find(item => {
            return item.roomId === data.roomId;
            });
    // 如果房间存在追加用户 如果不存在创建
    if (troomInfo) {
        console.log("handleJoin room exist roomId:", data.roomId, "add userName:", data.userName);
        // 如果房间为空 则第一个进入房间的为管理员
        if (troomInfo.userList.length === 0) {
            troomInfo.master = data.userName;
        }
        
        // 如果房间里不存在该用户 追加之
        if (!troomInfo.userList.includes(data.userName)) {
            troomInfo.userList.push(data.userName);
        }

        // 通知所在在线用户 有新用户加入
        troomInfo.userList.forEach(function(value, index, all) {
            if (value === data.userName) {
                sendTo(conn, {
                    messageType: "join",
                    roomInfo: troomInfo,
                    state: 'joined',
                });
                console.log("handleJoin value:", value, " joined");
            } else {
                var tconn = connMap[value];
                if (tconn != null) {
                    sendTo(tconn, {
                        messageType: "join",
                        roomInfo: troomInfo,
                        state: 'newjoin',
                    });
                    console.log("handleJoin value:", value, " newjoin ERROR");
                } else {
                    console.log("handleJoin value:", value, " newjoin");
                }
            }
        });
    } else {
        console.log("handleJoin room create roomId:", data.roomId, "add userName:", data.userName);
        var tuserList = [];
        tuserList.push(data.userName);

        var troom = {};
        troom.roomId = data.roomId;
        troom.master = data.userName;
        troom.userList = tuserList;
        roomList.push(troom);

        sendTo(conn, {
            messageType: "join",
            roomInfo: troom,
            state: 'created',
        });
    }
    console.log("handleJoin$$ roomId:", data.roomId, "roomList:", roomList);
}

function handleOffer(conn, data) {
    console.log("handleOffer^^ roomId:", data.roomId, "fromUser:", data.fromUser, "to:", data.toUser);
    var tconn = connMap[data.toUser];
    if (tconn != null) {
        sendTo(tconn, {
            messageType: "offer",
            roomId: data.roomId,
            fromUser: data.fromUser,
            toUser: data.toUser,
            offer: data.offer
        });
    }
    console.log("handleOffer$$");
}

function handleAnswer(conn, data) {
    console.log("handleAnswer^^ roomId:", data.roomId, "fromUser:", data.fromUser, "to:", data.toUser);
    var tconn = connMap[data.toUser];
    if (tconn != null) {
        conn.other = data.toUser;
        sendTo(tconn, {
            messageType: "answer",
            roomId: data.roomId,
            fromUser: data.fromUser,
            toUser: data.toUser,
            answer: data.answer
        });
    }
    console.log("handleAnswer$$");
}

function handleCandidate(data) {
    console.log("handleCandidate^^ roomId:", data.roomId, "fromUser:", data.fromUser, "to:", data.toUser);
    var tconn = connMap[data.toUser];
    if (tconn != null) {
        console.log("Sending candidate OK! to", data.toUser)
        sendTo(tconn, {
            messageType: "candidate",
            roomId: data.roomId,
            toUser: data.toUser,
            fromUser: data.fromUser,
            candidate: data.candidate
        });
    }
    console.log("handleCandidate$$");
}

function leaveMessage(room, from, to) {
    console.log('leaveMessage^^ roomId:', room, "fromUser:", from, "toUser:", to);
    // 只关闭视频连接
    //var tconn = connMap[data.toUser];
    var tconn = connMap[to];
    if (tconn != null) {
        sendTo(tconn, {
            messageType: "leave",
            roomId: room,
            toUser: to,
            fromUser: from
        });
    }
    console.log('leaveMessage$$');
}
function detachMessage(room, from, to, detach) {
    console.log('detachMessage^^ roomId:', room, "fromUser:", from, "toUser:", to, "detachUser:", detach);
    // 只关闭视频连接
    //var tconn = connMap[data.toUser];
    var tconn = connMap[to];
    if (tconn != null) {
        sendTo(tconn, {
            messageType: "detach",
            roomId: room,
            fromUser: from,
            detachUser: detach,
        });
    }
    console.log('detachMessage$$');
}

function removeUser(room, from, to) {
    console.log("removeUser^^ roomId:", room, "fromUser:", from, "toUser:", to);
    // 如果房间存在 删除房间里的该用户
    var troomInfo = roomList.find(item => {
        return item.roomId === room;
    });
    if (troomInfo) {
        console.log("clearUser ", troomInfo.userList);
        var index = troomInfo.userList.indexOf(from);
        if (index != -1) {
            troomInfo.userList.splice(index, 1);
        }
        console.log("clearUser ", troomInfo.userList, index);
    }
    console.log("removeUser$$");
}

function handleLeave(data) {
    //console.log("handleLeave^^ roomId:", data.roomId, "fromUser:", data.fromUser, "to:", data.toUser);
    console.log("handleLeave^^ roomId:", data.roomId);
    /*
    // 只关闭视频连接
    var tconn = connMap[data.toUser];
    if (tconn != null) {
        sendTo(tconn, {
            messageType: "leave",
            roomId: data.roomId,
            toUser: data.toUser,
            fromUser: data.fromUser
        });
    }
    */
    leaveMessage(data.roomId, data.fromUser, data.toUser);
    
    removeUser(data.roomId, data.fromUser, data.toUser);
    
    for (var key in connMap) {
        console.log("handleLeave$$ exist connnection:", key);
    }
}
function handleDetach(data) {
    console.log("handleDetach^^ roomId:", data.roomId);
    var troomInfo = roomList.find(item => {
        return item.roomId === data.roomId;
    });
    if (troomInfo) {
        console.log("handleDetach## userName:", troomInfo.userList);
        troomInfo.userList.forEach(function(value, index, all) {
            if (value !== data.detachUser) {
                detachMessage(data.roomId, data.fromUser, value, data.detachUser);
            }
        });
        console.log("handleDetach## userName:", troomInfo.userList);
    }

    if (connMap[data.detachUser]) {
        delete connMap[data.detachUser];
    }
    console.log("handleDetach$$ ", data);
}

function doClose(conn) {
    console.log("doClose^^ roomId:", conn.roomId, "userName:", conn.userName);
    if (conn.userName) {
        var troomInfo = roomList.find(item => {
            return item.roomId === conn.roomId;
        });
        if (troomInfo) {
            console.log("doClose## userName:", troomInfo.userList);
            troomInfo.userList.forEach(function(value, index, all) {
                if (value === conn.userName) {
                    console.log("doClose remove == userName:", value);
                    troomInfo.userList.splice(index, 1);
                } else {
                    leaveMessage(conn.roomId, conn.userName, value);
                    console.log("doClose message != userName:", value);
                }
            });
            console.log("doClose## userName:", troomInfo.userList);
        }

        if (connMap[conn.userName]) {
            delete connMap[conn.userName];
        }
        for (var key in connMap) {
            console.log("doClose## exist connnection:", key);
        }
    }
    console.log("doClose$$");
}
