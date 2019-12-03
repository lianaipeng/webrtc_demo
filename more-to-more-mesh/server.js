var WebSocketServer = require('ws').Server,
wss = new WebSocketServer({
    port: 8888
});
var users = new Map;
var roomMap = new Map();

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
	//var roomList = [{roomId:"",roomName:"", userList:[1,2,3,4]},...]
	console.log("handleLogin:", data.roomId);
	console.log("handleLogin: #", roomMap);
	
	if (roomMap[data.roomId]) {
		//console.log("############# handleLogin:", data.userName);
		//if (tuserName === data.userName) {
		if (roomMap[data.roomId].userList.includes(data.userName)) {
		// if(roomMap[data.roomId].userList.has(data.userName)) {
			console.log("############# handleLogin: exist", data.userName);
		} else {
			roomMap[data.roomId].userList.push(data.userName);
			//roomMap[data.roomId].userList.add(data.userName);
		}
	} else {
		/*
		var tuserList = new Set([]);
		tuserList.add(data.userName);
		*/
		var tuserList = [];
		tuserList.push(data.userName);

		var troom = {};
		troom.roomId = data.roomId;
		troom.userList = tuserList;
		roomMap[data.roomId] = troom;
	}
	console.log("handleLogin: #", roomMap, " userList:", roomMap[data.roomId].userList);

	users[data.userName] = conn;

	sendTo(conn, {
		messageType: "login",
		userList: roomMap[data.roomId].userList
	});

	/*
	//查询房间
	var troom = roomArray.filter(item => {return item.roomId === data.roomId});
	console.log("handleLogin: #", troom);
	if(troom.length > 0){
		troom.userList.push(data.userName);
	} else {
		var tuserList = [];
		tuserList.push(data.userName);

		var troom = {};
		troom.roomId = data.roomId;
		troom.userList = tuserList;
		roomArray.push(troom);
	}
	console.log("handleLogin: #", roomArray);
	*/


	/*
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
	*/

}

function handleOffer(conn, data) {
    console.log("Sending offer from:" , data.from , "to:", data.to);
	var tconn = users[data.to];
	//console.log("handleOffer", users);
	if (tconn != null) {
		conn.other = data.to;
		sendTo(tconn, {
			messageType: "offer",
			offer: data.offer,
			to: data.to,
			from: data.from
		});
		console.log("Sending offer OK!!!!!! from:" , data.from , "to:", data.to);
	}
}

function handleAnswer(conn, data) {
    console.log("Sending answer from:", data.from, "to", data.to);
    var tconn = users[data.to];
    if (tconn != null) {
        conn.other = data.to;
        sendTo(tconn, {
            messageType: "answer",
            answer: data.answer,
			to: data.to,
			from: data.from
        });
    }
}

function handleCandidate(data) {
    //console.log("Sending candidate to", data.to);
    //console.log("Sending candidate to", data);
    var tconn = users[data.to];
    if (tconn != null) {
		console.log("Sending candidatei OK!!!!!!!!!!! to", data.to)
        sendTo(tconn, {
            messageType: "candidate",
			to: data.to,
			from: data.from,
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
            messageType: "leave",
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
                    messageType: "leave"
                });
            }
        }
    }
}
