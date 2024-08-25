const ws = new WebSocket('ws://localhost:8080');
const gameBoard = document.getElementById('game-board');
const playerAMoveInput = document.getElementById('player-a-move');
const playerBMoveInput = document.getElementById('player-b-move');
const playerASubmitButton = document.getElementById('player-a-submit');
const playerBSubmitButton = document.getElementById('player-b-submit');
const playerAControls = document.getElementById('player-a-controls');
const playerBControls = document.getElementById('player-b-controls');

// Initialize the game board
const initializeBoard = (state) => {
    gameBoard.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            if (state.grid[i][j]) {
                cell.textContent = state.grid[i][j];
            }
            gameBoard.appendChild(cell);
        }
    }
};

// Handle incoming messages from the server
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'state') {
        initializeBoard(message.state);
        togglePlayerControls(message.state.turn);
    }
};

// Send the move command to the server
const sendMove = (command) => {
    const player = document.getElementById('player-a-controls').style.display === 'block' ? 'A' : 'B';
    ws.send(JSON.stringify({ type: 'move', player, character: command.split(':')[0], direction: command.split(':')[1] }));
};

// Toggle the controls for the current player
const togglePlayerControls = (currentTurn) => {
    if (currentTurn === 'A') {
        playerAControls.style.display = 'block';
        playerBControls.style.display = 'none';
    } else {
        playerAControls.style.display = 'none';
        playerBControls.style.display = 'block';
    }
};

// Event listeners for submitting moves
playerASubmitButton.addEventListener('click', () => {
    const command = playerAMoveInput.value.trim();
    if (command) {
        sendMove(command);
        playerAMoveInput.value = '';
    }
});

playerBSubmitButton.addEventListener('click', () => {
    const command = playerBMoveInput.value.trim();
    if (command) {
        sendMove(command);
        playerBMoveInput.value = '';
    }
});
