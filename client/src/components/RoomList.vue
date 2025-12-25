// client/src/components/RoomList.vue
<template>
  <div class="room-list">
    <div
      v-for="room in rooms"
      :key="room.roomId"
      class="room-item glass-effect"
    >
      <div class="room-header">
        <h3 class="room-name">{{ room.name }}</h3>
        <span class="room-status" :class="room.status">
          {{ getStatusText(room.status) }}
        </span>
      </div>
      
      <div class="room-details">
        <div class="detail-row">
          <span class="label">房间号:</span>
          <span class="value">{{ room.roomId }}</span>
        </div>
        <div class="detail-row">
          <span class="label">入场金币:</span>
          <span class="value gold">{{ room.entryGold }}</span>
        </div>
        <div class="detail-row">
          <span class="label">单注金额:</span>
          <span class="value">{{ room.betAmount }}</span>
        </div>
        <div class="detail-row">
          <span class="label">局数:</span>
          <span class="value">{{ room.currentRound }}/{{ room.totalRounds }}</span>
        </div>
        <div class="detail-row">
          <span class="label">玩家:</span>
          <span class="value">{{ room.playersCount }}/{{ getMaxPlayers() }}</span>
        </div>
      </div>
      
      <div class="room-actions">
        <button
          @click="$emit('join-room', room.roomId)"
          class="join-button"
          :disabled="room.isFull || room.status !== 'waiting'"
        >
          {{ room.isFull ? '房间已满' : '加入房间' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RoomList',
  props: {
    rooms: {
      type: Array,
      default: () => []
    }
  },
  emits: ['join-room'],
  methods: {
    getStatusText(status) {
      const statusMap = {
        'waiting': '等待中',
        'playing': '游戏中',
        'finished': '已结束'
      };
      return statusMap[status] || status;
    },
    getMaxPlayers() {
      return 5; // 根据配置文件中的MAX_ROOM_PLAYERS
    }
  }
};
</script>

<style scoped>
.room-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.room-item {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.room-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.room-name {
  font-size: 18px;
  font-weight: 600;
  color: #f0f0f0;
  margin: 0;
}

.room-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.room-status.waiting {
  background: rgba(108, 92, 231, 0.2);
  color: #6c5ce7;
}

.room-status.playing {
  background: rgba(0, 210, 211, 0.2);
  color: #00d2d3;
}

.room-status.finished {
  background: rgba(255, 255, 255, 0.2);
  color: #b2b2b2;
}

.room-details {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.label {
  color: #b2b2b2;
}

.value {
  color: #f0f0f0;
  font-weight: 500;
}

.value.gold {
  color: #ffd700;
}

.room-actions {
  display: flex;
  justify-content: flex-end;
}

.join-button {
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.join-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(108, 92, 231, 0.4);
}

.join-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>