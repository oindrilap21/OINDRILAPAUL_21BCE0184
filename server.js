const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initial game state
let gameState = {
    grid: [
        ['A-P1', 'A-P2', 'A-H1', 'A-H2', 'A-P3'],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
        ['B-P1', 'B-P2', 'B-H1', 'B-H2', 'B-P3']
    ],
    turn: 'A',
    winner: null
};

// Broadcast the game state to all connected clients
const broadcastGameState = () => {
    const stateMessage = JSON.stringify({ type: 'state', state: gameState });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(stateMessage);
        }
    });
};

// Check for a winner after each move
const checkForWinner = () => {
    const playerAHasCharacters = gameState.grid.flat().some(cell => cell && cell.startsWith('A-'));
    const playerBHasCharacters = gameState.grid.flat().some(cell => cell && cell.startsWith('B-'));

    if (!playerAHasCharacters) {
        gameState.winner = 'B';
    } else if (!playerBHasCharacters) {
        gameState.winner = 'A';
    }
};

// Handle client connection and messages
wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'state', state: gameState }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'move') {
            const { player, character, direction } = data;

            if (gameState.turn !== player) {
                ws.send(JSON.stringify({ type: 'error', message: 'Not your turn!' }));
                return;
            }

            const [row, col] = findCharacterPosition(`${player}-${character}`);
            if (row === null || col === null) {
                ws.send(JSON.stringify({ type: 'error', message: 'Character not found!' }));
                return;
            }

            let newRow = row;
            let newCol = col;

            // Calculate new position based on move command
            switch (direction) {
                case 'L': newCol = Math.max(0, col - 1); break;
                case 'R': newCol = Math.min(4, col + 1); break;
                case 'F': newRow = Math.max(0, row - 1); break;
                case 'B': newRow = Math.min(4, row + 1); break;
                case 'FL': newRow = Math.max(0, row - 1); newCol = Math.max(0, col - 1); break;
                case 'FR': newRow = Math.max(0, row - 1); newCol = Math.min(4, col + 1); break;
                case 'BL': newRow = Math.min(4, row + 1); newCol = Math.max(0, col - 1); break;
                case 'BR': newRow = Math.min(4, row + 1); newCol = Math.min(4, col + 1); break;
                default: 
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid move command!' }));
                    return;
            }

            if (gameState.grid[newRow][newCol] && gameState.grid[newRow][newCol].startsWith(player)) {
                ws.send(JSON.stringify({ type: 'error', message: 'Cannot move to a cell occupied by your own piece!' }));
                return;
            }

            // Remove characters in the path for Hero1 and Hero2
            if (character === 'H1' || character === 'H2') {
                removeOpponentCharactersInPath(row, col, newRow, newCol);
            }

            gameState.grid[row][col] = null;
            gameState.grid[newRow][newCol] = `${player}-${character}`;

            checkForWinner();
            if (gameState.winner) {
                broadcastGameState();
                return;
            }

            gameState.turn = gameState.turn === 'A' ? 'B' : 'A';
            broadcastGameState();
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Find the position of a character on the grid
const findCharacterPosition = (character) => {
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            if (gameState.grid[i][j] === character) {
                return [i, j];
            }
        }
    }
    return [null, null];
};

// Remove opponent characters in the path of Hero1 and Hero2
const removeOpponentCharactersInPath = (row1, col1, row2, col2) => {
    const directionRow = Math.sign(row2 - row1);
    const directionCol = Math.sign(col2 - col1);

    let currentRow = row1 + directionRow;
    let currentCol = col1 + directionCol;

    while (currentRow !== row2 || currentCol !== col2) {
        if (currentRow >= 0 && currentRow < 5 && currentCol >= 0 && currentCol < 5) {
            if (gameState.grid[currentRow][currentCol] && !gameState.grid[currentRow][currentCol].startsWith('A')) {
                gameState.grid[currentRow][currentCol] = null;
            }
        }
        currentRow += directionRow;
        currentCol += directionCol;
    }
};

server.listen(8080, () => {
    console.log('Server is listening on port 8080');
});
