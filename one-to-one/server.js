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
 
    connection.send('{"hello":"hello123"}');
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
	//console.log("doMessage:" + message);
	var data;
	try {
		data = JSON.parse(message);
		//console.log(message);
	} catch(e) {
		console.log("Error parsing JSON");
		data = {};
	}

	switch (data.type) {
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
                type: "error",
                message: "Unrecognized command:" + data.type
            });
            break;
	}
}

function handleLogin(conn, data) {
	if (users[data.name]) {
		sendTo(conn, {
			type: "login",
			login: false
		});
		console.log("Login as User:", data.name, "false");
	} else {
		users[data.name] = conn;
		conn.name = data.name;
		sendTo(conn, {
			type: "login",
			login: true
		});
		console.log("Login as User:", data.name, "OK");
	}
}

function handleOffer(conn, data) {
    console.log("Sending offer from:" , data.from , "to:", data.to);
	var tconn = users[data.to];
	if (tconn != null) {
		conn.other = data.to;
		sendTo(tconn, {
			type: "offer",
			offer: data.offer,
			to: data.to,
			from: data.from
		});
	}
}

function handleAnswer(conn, data) {
    console.log("Sending answer from:", data.from, "to", data.to);
    var tconn = users[data.to];
    if (tconn != null) {
        conn.other = data.to;
        sendTo(tconn, {
            type: "answer",
            answer: data.answer,
			to: data.to,
			from: data.from
        });
    }
}

function handleCandidate(data) {
    console.log("Sending candidate to", data.to);
    var tconn = users[data.to];
    if (tconn != null) {
        sendTo(tconn, {
            type: "candidate",
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
            type: "leave"
        });
    }
	*/
    console.log("Disconnecting user from", data.from);
    var tconn = users[data.to];
    if (tconn != null) {
		if (tconn.other != null) {
			tconn.other = null;
		}
        sendTo(tconn, {
            type: "leave",
			to: data.to,
			from: data.from
        });
    }
}

function doClose(conn) {
    if (conn.name) {
        delete users[conn.name];
        if (conn.otherName) {
            console.log("Disconnecting user from", conn.otherName);
            var tconn = users[conn.otherName];
            tconn.otherName = null;
            if (tconn != null) {
                sendTo(tconn, {
                    type: "leave"
                });
            }
        }
    }
}
