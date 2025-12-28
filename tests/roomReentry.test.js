const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../server/app");
const Room = require("../server/models/Room");
const User = require("../server/models/User");

describe("Room Re-entry Tests", () => {
  let testUser1, testUser2, testRoom;

  beforeAll(async () => {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pokegame_test",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    testUser1 = await User.create({
      nickname: "testuser1",
      phoneNumber: "13800138001",
      password: "password123",
      gold: 10000,
    });

    testUser2 = await User.create({
      nickname: "testuser2",
      phoneNumber: "13800138002",
      password: "password123",
      gold: 10000,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Room.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Room.deleteMany({});
  });

  describe("Room Joining Logic", () => {
    test("should allow existing player to re-enter room during active game", async () => {
      testRoom = await Room.create({
        name: "Test Room",
        creatorId: testUser1._id,
        maxPlayers: 4,
        status: "playing",
        players: [
          {
            userId: testUser1._id,
            username: testUser1.nickname,
            isReady: true,
            isFolded: false,
            hasSeenCards: false,
            status: "playing",
            cards: ["♠A", "♥K", "♦Q"],
            currentBet: 100,
            totalBet: 100,
            isTurn: true,
          },
          {
            userId: testUser2._id,
            username: testUser2.nickname,
            isReady: true,
            isFolded: false,
            hasSeenCards: false,
            status: "playing",
            cards: ["♠2", "♥3", "♦4"],
            currentBet: 100,
            totalBet: 100,
            isTurn: false,
          },
        ],
        currentRound: 1,
        pot: 200,
        currentBet: 100,
        minBet: 10,
        maxBet: 500,
        smallBlind: 10,
        bigBlind: 20,
      });

      const response = await request(app).post("/api/rooms/join").send({
        roomId: testRoom._id,
        userId: testUser1._id,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.room.status).toBe("playing");
    });

    test("should not allow new player to join room during active game", async () => {
      const testUser3 = await User.create({
        nickname: "testuser3",
        phoneNumber: "13800138003",
        password: "password123",
        gold: 10000,
      });

      testRoom = await Room.create({
        name: "Test Room",
        creatorId: testUser1._id,
        maxPlayers: 4,
        status: "playing",
        players: [
          {
            userId: testUser1._id,
            username: testUser1.nickname,
            isReady: true,
            isFolded: false,
            hasSeenCards: false,
            status: "playing",
            cards: ["♠A", "♥K", "♦Q"],
            currentBet: 100,
            totalBet: 100,
            isTurn: true,
          },
          {
            userId: testUser2._id,
            username: testUser2.nickname,
            isReady: true,
            isFolded: false,
            hasSeenCards: false,
            status: "playing",
            cards: ["♠2", "♥3", "♦4"],
            currentBet: 100,
            totalBet: 100,
            isTurn: false,
          },
        ],
        currentRound: 1,
        pot: 200,
        currentBet: 100,
        minBet: 10,
        maxBet: 500,
        smallBlind: 10,
        bigBlind: 20,
      });

      const response = await request(app).post("/api/rooms/join").send({
        roomId: testRoom._id,
        userId: testUser3._id,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("游戏已开始");
    });
  });

  describe("Player State Reset", () => {
    test("should reset all player properties when room status changes to waiting", async () => {
      testRoom = await Room.create({
        name: "Test Room",
        creatorId: testUser1._id,
        maxPlayers: 4,
        status: "playing",
        players: [
          {
            userId: testUser1._id,
            username: testUser1.nickname,
            isReady: true,
            isFolded: false,
            hasSeenCards: true,
            status: "playing",
            cards: ["♠A", "♥K", "♦Q"],
            currentBet: 100,
            totalBet: 200,
            isTurn: true,
          },
          {
            userId: testUser2._id,
            username: testUser2.nickname,
            isReady: true,
            isFolded: true,
            hasSeenCards: false,
            status: "folded",
            cards: ["♠2", "♥3", "♦4"],
            currentBet: 50,
            totalBet: 100,
            isTurn: false,
          },
        ],
        currentRound: 1,
        pot: 300,
        currentBet: 100,
        minBet: 10,
        maxBet: 500,
        smallBlind: 10,
        bigBlind: 20,
      });

      testRoom.status = "waiting";
      await testRoom.save();

      const updatedRoom = await Room.findById(testRoom._id);

      updatedRoom.players.forEach((player) => {
        expect(player.isReady).toBe(false);
        expect(player.isFolded).toBe(false);
        expect(player.hasSeenCards).toBe(false);
        expect(player.status).toBe("waiting");
        expect(player.cards).toEqual([]);
        expect(player.currentBet).toBe(0);
        expect(player.totalBet).toBe(0);
        expect(player.isTurn).toBe(false);
      });
    });
  });
});
