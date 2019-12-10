var WebSocketServer = require('ws').Server,
wss = new WebSocketServer({
    port: 8888
});
users = {};

//////////////////////////// WebSocket ////////////////////////////
wss.on('connection',
function(connection) {
    console.log("User connected");
 
    connection.on('message', function(message) {
        doMessage(message, connection)
    });
 
    /*
    function sendTo(conn, message) {
        conn.send(JSON.stringify(message));
    }
    */
 
    connection.on('close', function() {
        doClose(connection)
    });
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
        default:
            sendTo(conn, {
                messageType: "error",
                message: "Unrecognized command:" + data.messageType
            });
            break;
    }
}

function handleLogin(conn, data) {
    if (users[data.userName]) {
        sendTo(conn, {
            messageType: "login",
            login: false
        });
        console.log("Login as User:", data.userName, "false");
    } else {
        users[data.userName] = conn;
        conn.userName = data.userName;
        sendTo(conn, {
            messageType: "login",
            login: true
        });
        console.log("Login as User:", data.userName, "OK");
    }
}

function handleOffer(conn, data) {
    console.log("Sending offer from:" , data.fromUser, "to:", data.toUser);
    var tconn = users[data.toUser];
    if (tconn != null) {
        conn.other = data.toUser;
        sendTo(tconn, {
            messageType: "offer",
            toUser: data.toUser,
            fromUser: data.fromUser,
            offer: data.offer
        });
    }
}

function handleAnswer(conn, data) {
    console.log("Sending answer from:", data.fromUser, "to", data.toUser);
    var tconn = users[data.toUser];
    if (tconn != null) {
        conn.other = data.toUser;
        sendTo(tconn, {
            messageType: "answer",
            toUser: data.toUser,
            fromUser: data.fromUser,
            answer: data.answer
        });
    }
}

function handleCandidate(data) {
    console.log("Sending candidate to", data.toUser);
    var tconn = users[data.toUser];
    if (tconn != null) {
        sendTo(tconn, {
            messageType: "candidate",
            toUser: data.toUser,
            fromUser: data.fromUser,
            candidate: data.candidate
        });
    }
}

function handleLeave(data) {
    /*
    console.log("Disconnecting user from", data.name);
    var conn = users[data.name];
    conn.other = null;
    if (conn != null) {
        sendTo(conn, {
            messageType: "leave"
        });
    }
    */
    console.log("Disconnecting user from", data.fromUser);
    var tconn = users[data.toUser];
    if (tconn != null) {
        if (tconn.other != null) {
            tconn.other = null;
        }
        sendTo(tconn, {
            messageType: "leave",
            userName: data.fromUser
        });
    }
}

function doClose(conn) {
    if (conn.userName) {
        delete users[conn.userName];
        if (conn.otherName) {
            console.log("Disconnecting user from", conn.otherName);
            var tconn = users[conn.otherName];
            tconn.otherName = null;
            if (tconn != null) {
                sendTo(tconn, {
                    messageType: "leave"
                });
            }
        }
    }
}
