// importing npm packages
const express = require("express");
const socket = require("socket.io");
const path = require("path");

// creatting app instance
const app = express();
// serving piblic directory
app.use(express.static(path.join(__dirname, "public")));
// default path
app.get("/", (req, res, next) => {
  res.sendFile("/public/index.html");
});
// listen and creating server instance
const expressServer = app.listen(process.env.PORT || 3000);
const io = socket(expressServer);
let roomNumber = 0;
io.on("connection", (socket) => {
  //   when a client is connected, make a room for him/her
  //   create a new game
  socket.on("createNewGame", (data) => {
    socket.join(`gameRoom${roomNumber}`);
    // emitting new game event with room name and data to the connected socket
    socket.emit("newGame", {
      name: data.name,
      room: `gameRoom${roomNumber}`,
      winArray: [7, 56, 448, 73, 146, 292, 273, 84],
    });
    roomNumber++;
  });
  socket.on("joinGame", (data) => {
    // var room = io.nsps["/"].adapter.rooms[data.roomToJoin];
    const roomSet = io.sockets.adapter.rooms.get(data.roomToJoin);
    if (!roomSet) {
      socket.emit("roomError", { message: "Room does not exist" });
    } else if (roomSet.size > 1) {
      socket.emit("roomError", { message: "Room is Full" });
    } else if (roomSet.size < 1) {
      socket.emit("roomError", { message: "Owner left the room" });
    } else {
      socket.join(data.roomToJoin);
      socket.broadcast.to(data.roomToJoin).emit("player1", {});
      socket.emit("player2", {
        name: data.name,
        room: data.roomToJoin,
        winArray: [7, 56, 448, 73, 146, 292, 273, 84],
      });
    }
  });
  socket.on("playTurn", (data) => {
    socket.broadcast.to(data.room).emit("turnPlayed", data);
  });
  socket.on("gameEnded", (data) => {
    // console.log(data);
    io.to(data.room).emit("gameEnd", data);
  });
  socket.on("gameTied", (data) => {
    io.to(data.room).emit("tie", data);
  });
  socket.on("disconnecting", () => {
    const roomSet = Array.from(socket.rooms); // the Set contains at least the socket ID
    if (roomSet.length >= 2) {
      const room = roomSet[1];
      socket.broadcast.to(room).emit("clientLeaves", {
        message: "Other player has leave the room😢😢😢",
      });
    }
  });
});
