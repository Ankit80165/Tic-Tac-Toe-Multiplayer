const socket = io("https://tictactoenode80165.herokuapp.com/");
let player, game;
let WIN_ARRAY = [];
const stopwatch = document.querySelector(".stopwatch");
stopwatch.loop = true;
initGame();

class Player {
  constructor(name, type) {
    this.name = name;
    this.type = type;
    this.currentTurn = false;
    this.playerSum = 0;
  }
  setCurrentTurn(turn) {
    this.currentTurn = turn;
    const message = turn ? "Your turn" : "Waiting for Opponent...";
    $("#turn").text(message);
  }
  getPlayerType() {
    return this.type;
  }
  getPlayerName() {
    return this.name;
  }
  getCurrentTurn() {
    return this.currentTurn;
  }
  updatePlayerSum(val) {
    this.playerSum += val;
  }
  getPlayerSum() {
    return this.playerSum;
  }
}
class GameBoard {
  constructor(roomId) {
    this.roomId = roomId;
    this.board = [];
    this.moves = 0;
  }
  getRoomId() {
    return this.roomId;
  }
  createGameBoard() {
    function tileClickHandler() {
      const row = parseInt(this.id.split("_")[1][0], 10);
      const col = parseInt(this.id.split("_")[1][1], 10);
      const audio = document.querySelector(`#audio_${row}${col}`);
      if (!player.getCurrentTurn() || !game) {
        swal(`It is not your turn. Wait for other player!!!`, {
          icon: "warning",
          buttons: false,
          closeOnClickOutside: false,
          closeOnEsc: false,
          timer: 2000,
        });
        return;
      }
      console.log($(this).prop("disabled"));
      if ($(this).prop("disabled")) {
        console.log("disabled");
        swal(`This cell is already played on!`, {
          icon: "warning",
          buttons: false,
          closeOnClickOutside: false,
          closeOnEsc: false,
          timer: 2000,
        });
        return;
      }
      // Update board after your turn.
      game.playTurn(this);
      game.updateBoard(row, col, player.getPlayerType());

      player.setCurrentTurn(false);
      player.updatePlayerSum(1 << (row * 3 + col));

      game.checkWinner();
    }

    for (let i = 0; i < 3; i++) {
      this.board.push(["", "", ""]);
      for (let j = 0; j < 3; j++) {
        $(`#button_${i}${j}`).on("click", tileClickHandler);
      }
    }
  }
  checkWinner() {
    const currentPlayerSum = player.getPlayerSum();
    WIN_ARRAY.forEach((winValue) => {
      if ((winValue & currentPlayerSum) === winValue) {
        this.declareWinner();
        return;
      }
    });
    if (this.checkTie()) {
      socket.emit("gameTied", { message: "Game Tied", room: this.getRoomId() });
    }
  }
  checkTie() {
    if (this.moves >= 9) {
      return true;
    }
    return false;
  }
  declareWinner() {
    const message = `${player.getPlayerName()} wins!`;
    socket.emit("gameEnded", {
      room: this.getRoomId(),
      message,
      name: player.getPlayerName(),
    });
  }
  displayBoard(message1, message2) {
    $(".menu").css("display", "none");
    $(".gameBoard").css("display", "block");
    $("#userHello").html(message1);
    $("#invite").html(message2);
    this.createGameBoard();
  }
  updateBoard(row, col, type) {
    let color;
    if (type == "X") {
      color = "red";
    } else {
      color = "green";
    }
    $(`#button_${row}${col}`)
      .html(`<h1 style="color:${color};">${type}</h1>`)
      .prop("disabled", true);
    this.board[row][col] = type;
    this.moves++;
  }
  playTurn(element) {
    const clickedTile = $(element).attr("id");
    stopwatch.play();
    // Emit an event to update other player that you've played your turn.
    socket.emit("playTurn", {
      tile: clickedTile,
      room: this.getRoomId(),
    });
  }
}
function initGame() {
  // when client create a new game
  $("#new").on("click", () => {
    const name = $("#nameNew").val();
    if (!name) {
      alert("please enter your name");
      return;
    }
    socket.emit("createNewGame", { name });
    player = new Player(name, "X");
  });
  //   server response to create a new game, so we render the details on th screen
  socket.on("newGame", (data) => {
    const message1 = `Hello, ${data.name} &nbsp;<i class="fas fa-user-astronaut"></i>`;
    const message2 = `Please ask your friend to enter Game ID:
    <span class="game-room">${data.room}</span>
    <button class="copy-btn" onclick="copyToclipBoard()"><i class="fas fa-copy"></i></button>
    `;
    WIN_ARRAY = data.winArray;
    game = new GameBoard(data.room);
    game.displayBoard(message1, message2);
  });
  //   when another client click the join button
  $("#join").on("click", () => {
    const name = $("#nameJoin").val();
    const roomToJoin = $("#room").val();
    if (!name || !roomToJoin) {
      alert("plaese enter room or name");
      return;
    }
    socket.emit("joinGame", { name, roomToJoin });
    player = new Player(name, "O");
  });
  //   if any error happens
  socket.on("roomError", (data) => {
    console.log(data);
  });
  //   for player1
  socket.on("player1", (data) => {
    const message = `Hello, ${player.getPlayerName()} <i class="fas fa-user-astronaut"></i>...`;
    $("#userHello").html(message);
    $("#invite").hide();
    player.setCurrentTurn(true);
    swal("Other player has joined🎉🎉🎉...Lets start the game", {
      icon: "success",
      buttons: false,
      closeOnClickOutside: false,
      closeOnEsc: false,
      timer: 2000,
    });
  });
  //   for player2
  socket.on("player2", (data) => {
    const message = `Hello, ${data.name} <i class="fas fa-user-ninja"></i>`;
    // Create game for player 2
    game = new GameBoard(data.room);
    game.displayBoard(message);
    WIN_ARRAY = data.winArray;
    player.setCurrentTurn(false);
  });
  socket.on("turnPlayed", (data) => {
    stopwatch.pause();
    const row = +data.tile.split("_")[1][0];
    const col = +data.tile.split("_")[1][1];
    let opponentType;
    if (player.getPlayerType() == "X") {
      opponentType = "O";
    } else {
      opponentType = "X";
    }
    game.updateBoard(row, col, opponentType);
    player.setCurrentTurn(true);
  });
  socket.on("gameEnd", (data) => {
    let message;
    if (data.name === player.getPlayerName()) {
      message = `You wins!`;
    } else {
      message = `You lost!`;
    }
    const winningAudio = document.querySelector(".winning-audio");
    setTimeout(() => {
      //   alert(message);
      location.reload();
    }, 5000);
    if (message === "You wins!") {
      stopwatch.pause();
      winningAudio.play();
      swal(`${player.getPlayerName()} Wins !!!🤩🎉`, {
        icon: "success",
        buttons: false,
        closeOnClickOutside: false,
        closeOnEsc: false,
        timer: 5000,
      });
    } else {
      stopwatch.pause();
      winningAudio.setAttribute("src", "./sounds/lossing_sound.wav");
      winningAudio.play();
      swal(`${player.getPlayerName()} Lost😟💔`, {
        icon: "error",
        buttons: false,
        closeOnClickOutside: false,
        closeOnEsc: false,
        timer: 5000,
      });
    }
  });
  socket.on("tie", (data) => {
    swal(`Game Tied!!!😝`, {
      icon: "warning",
      buttons: false,
      closeOnClickOutside: false,
      closeOnEsc: false,
      timer: 5000,
    });
    setTimeout(() => {
      location.reload();
    }, 5000);
  });
}

// copy to clip board
function copyToclipBoard() {
  console.log("clicked");
  const cb = navigator.clipboard;
  const span = document.querySelector(".game-room");
  cb.writeText(span.innerText).then(() => {
    swal(`Room ID copied!`, {
      icon: "success",
      buttons: false,
      closeOnClickOutside: false,
      closeOnEsc: false,
      timer: 1000,
    });
  });
}
