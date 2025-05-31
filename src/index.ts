import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

interface User {
    socket: WebSocket;
    room: string;
    userId: string;
    username: string;
}

let allSockets: User[] = [];
let userCounts: { [key: string]: number } = {};

wss.on("connection", (socket) => {
    let userId = Math.random().toString(36).substring(7);
    
    socket.on("message", (message) => {
        const parsedMessage = JSON.parse(message.toString());
        
        if (parsedMessage.type === "join") {
            const { roomId, username } = parsedMessage.payload;
            console.log(`User ${username} joined room ${roomId}`);
            
            // Add user to room
            allSockets.push({
                socket,
                room: roomId,
                userId,
                username
            });
            
            // Update user count
            userCounts[roomId] = (userCounts[roomId] || 0) + 1;
            
            // Send userId to the joining user
            socket.send(JSON.stringify({
                type: "userId",
                userId: userId
            }));
            
            // Broadcast updated user count to room
            broadcastToRoom(roomId, {
                type: "roomCount",
                count: userCounts[roomId]
            });
        }

        if (parsedMessage.type === "chat") {
            const { text, userId, username } = parsedMessage.payload;
            const user = allSockets.find(u => u.socket === socket);
            
            if (user) {
                broadcastToRoom(user.room, {
                    type: "chat",
                    message: text,
                    userId: userId,
                    username: username
                });
            }
        }
    });

    socket.on("close", () => {
        const user = allSockets.find(u => u.socket === socket);
        if (user) {
            // Remove user from room
            allSockets = allSockets.filter(u => u.socket !== socket);
            
            // Update user count
            if (userCounts[user.room]) {
                userCounts[user.room]--;
                if (userCounts[user.room] === 0) {
                    delete userCounts[user.room];
                } else {
                    // Broadcast updated count
                    broadcastToRoom(user.room, {
                        type: "roomCount",
                        count: userCounts[user.room]
                    });
                }
            }
        }
    });
});

function broadcastToRoom(roomId: string, message: any) {
    const roomUsers = allSockets.filter(u => u.room === roomId);
    roomUsers.forEach(user => {
        if (user.socket.readyState === WebSocket.OPEN) {
            user.socket.send(JSON.stringify(message));
        }
    });
}