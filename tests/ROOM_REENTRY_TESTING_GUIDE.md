# Room Re-entry Testing Guide

## Overview
This guide provides step-by-step instructions for testing the room re-entry functionality that was implemented to fix the issue where players couldn't re-enter a game room after accidentally exiting during an active game.

## Test Environment Setup

### Prerequisites
1. MongoDB database running (local or remote)
2. Node.js and npm installed
3. Two or more test user accounts created

### Starting the Application
```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Start the development server
npm run dev
```

This will start both the backend server (port 3001) and the frontend development server (port 5173).

## Test Scenarios

### Test Case 1: Existing Player Re-enters During Active Game

**Objective**: Verify that a player who is already in a room can re-enter after accidentally exiting during an active game.

**Steps**:
1. Create a new room with at least 2 players
2. Start the game
3. Player 1 intentionally exits the room (close browser tab or navigate away)
4. Player 1 attempts to re-enter the room from the room list
5. Verify Player 1 can successfully re-enter the room
6. Verify the game state is properly synchronized for Player 1
7. Verify Player 1 can see the current game state (cards, pot, current turn, etc.)

**Expected Results**:
- Player 1 sees "进入房间" (Enter Room) button instead of "加入房间" (Join Room) on the room card
- Player 1 can successfully re-enter the room
- Game state is properly synchronized (current round, pot, player cards, current turn)
- Player 1 can resume playing without disrupting the game

### Test Case 2: New Player Cannot Join During Active Game

**Objective**: Verify that new players cannot join a room while a game is in progress.

**Steps**:
1. Create a new room with at least 2 players
2. Start the game
3. A third player (not in the room) attempts to join the room
4. Verify the join button is disabled or shows appropriate message
5. Verify the third player cannot join the room

**Expected Results**:
- Third player sees "游戏已开始" (Game in progress) or similar message
- Join button is disabled or shows appropriate state
- Third player cannot join the room

### Test Case 3: Player State Reset Between Games

**Objective**: Verify that all player properties are properly reset when a game ends and the room status changes to "waiting".

**Steps**:
1. Create a new room with at least 2 players
2. Start the game and play through several rounds
3. End the game (by having all but one player fold or by reaching the final round)
4. Verify the room status changes to "waiting"
5. Verify all player properties are reset:
   - isReady = false
   - isFolded = false
   - hasSeenCards = false
   - status = "waiting"
   - cards = []
   - currentBet = 0
   - totalBet = 0
   - isTurn = false

**Expected Results**:
- All player properties are reset to their initial values
- Room status is "waiting"
- Players can ready up for the next game
- No residual game state from the previous game

### Test Case 4: Room Updated Event Emission

**Objective**: Verify that the "room_updated" socket event is properly emitted after room state changes.

**Steps**:
1. Open browser developer tools and navigate to the Network tab
2. Filter by WebSocket connections
3. Create a room and join with multiple players
4. Start the game
5. Perform game actions (bet, fold, see cards)
6. Monitor WebSocket messages for "room_updated" events
7. Verify that "room_updated" events are emitted after each game action
8. Verify the event data contains the updated room state

**Expected Results**:
- "room_updated" events are emitted after game actions that change room state
- Event data contains the complete updated room object
- All connected clients receive the event

### Test Case 5: Multiple Players Disconnect and Reconnect

**Objective**: Verify the system handles multiple players disconnecting and reconnecting during an active game.

**Steps**:
1. Create a room with 4 players
2. Start the game
3. Player 1 disconnects (close browser tab)
4. Player 2 disconnects (close browser tab)
5. Player 1 reconnects to the room
6. Player 2 reconnects to the room
7. Verify both players can successfully re-enter
8. Verify the game state is properly synchronized for both players
9. Verify the game can continue normally

**Expected Results**:
- Both players can successfully re-enter the room
- Game state is properly synchronized for both players
- Game continues without issues
- All players see consistent game state

### Test Case 6: Player Disconnects During Their Turn

**Objective**: Verify that the game continues properly when a player disconnects during their turn.

**Steps**:
1. Create a room with at least 2 players
2. Start the game
3. Wait for Player 1's turn
4. Player 1 disconnects (close browser tab)
5. Verify the game automatically folds Player 1
6. Verify the turn passes to the next player
7. Verify the game continues without Player 1
8. Player 1 reconnects to the room
9. Verify Player 1 can observe the game (but cannot participate in the current round)

**Expected Results**:
- Player 1 is automatically folded when they disconnect during their turn
- Turn passes to the next player
- Game continues without interruption
- Player 1 can reconnect and observe the game

## Test Data

### Test Users
Create the following test users:
- User 1: testuser1 / password123
- User 2: testuser2 / password123
- User 3: testuser3 / password123
- User 4: testuser4 / password123

### Test Room Configuration
- Room Name: Test Room
- Max Players: 4
- Min Bet: 10
- Max Bet: 500
- Small Blind: 10
- Big Blind: 20

## Common Issues and Troubleshooting

### Issue: Player cannot see "Enter Room" button
**Solution**: Check that the currentUserId prop is being passed correctly to the RoomCard component and that the isPlayerInRoom() function is working correctly.

### Issue: Game state not synchronized after re-entry
**Solution**: Verify that the "get_game_data" socket event is being emitted after rejoining an active game and that the GameRoom component is properly handling the response.

### Issue: Player state not reset between games
**Solution**: Verify that the player state reset logic in gameService.js is being called when the room status changes to "waiting".

### Issue: "room_updated" event not received
**Solution**: Check that the socket event is being emitted in socket/index.js after room state changes and that the GameRoom component is listening for the event.

## Success Criteria

The room re-entry functionality is considered successful when:
1. Players can re-enter rooms they are already in during active games
2. New players cannot join rooms during active games
3. Player state is properly reset between games
4. "room_updated" events are properly emitted and handled
5. Multiple players can disconnect and reconnect without issues
6. Game state is properly synchronized after re-entry
7. Games continue without interruption when players disconnect

## Performance Considerations

- Monitor WebSocket connection stability during re-entry
- Check that room state updates are efficient and don't cause performance issues
- Verify that the database queries for room joining are optimized
- Ensure that the frontend can handle rapid state updates without lag

## Security Considerations

- Verify that only existing players can re-enter during active games
- Ensure that unauthorized users cannot join rooms during active games
- Check that player authentication is properly validated during re-entry
- Verify that game state is not exposed to unauthorized users
