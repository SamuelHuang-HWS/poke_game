// client/src/components/RoomCard.vue
<template>
  <div class="room-card glass-effect" @click="$emit('select', room)">
    <div class="room-header">
      <div class="room-title">
        <h3 class="room-name">房间 {{ room.roomId }}</h3>
        <span v-if="room.hasPassword" class="password-badge" title="需要密码">
          🔒
        </span>
      </div>
      <span class="room-status" :class="room.status">
        {{ getStatusText(room.status) }}
      </span>
    </div>
    
    <div class="room-details">
      <div class="detail-item">
        <span class="label">房间号:</span>
        <span class="value">{{ room.roomId }}</span>
      </div>
      <div class="detail-item">
        <span class="label">单注倍数:</span>
        <span class="value">{{ room.baseBet }}倍</span>
      </div>
      <div class="detail-item">
        <span class="label">局数:</span>
        <span class="value">{{ room.currentRound }}/{{ room.totalRounds }}</span>
      </div>
      <div class="detail-item">
        <span class="label">玩家:</span>
        <span class="value">{{ room.playersCount }}/{{ getMaxPlayers() }}</span>
      </div>
    </div>
    
    <div class="room-footer">
      <button
        @click.stop="handleJoin"
        class="join-button"
        :disabled="!canJoinRoom()"
      >
        {{ getButtonText() }}
      </button>
    </div>
    
    <PasswordModal
      :visible="showPasswordModal"
      @confirm="handlePasswordConfirm"
      @cancel="showPasswordModal = false"
    />
  </div>
</template>

<script>
import { ref } from 'vue';
import PasswordModal from './PasswordModal.vue';

export default {
  name: 'RoomCard',
  components: {
    PasswordModal
  },
  props: {
    room: {
      type: Object,
      required: true
    },
    currentUserId: {
      type: String,
      default: null
    }
  },
  emits: ['select', 'join'],
  setup(props, { emit }) {
    const showPasswordModal = ref(false);
    
    const isPlayerInRoom = () => {
      if (!props.currentUserId || !props.room.players) return false;
      return props.room.players.some(player => 
        player.userId?.toString() === props.currentUserId?.toString()
      );
    };
    
    const canJoinRoom = () => {
      if (props.room.isFull) return false;
      if (isPlayerInRoom()) return true;
      return props.room.status === 'waiting';
    };
    
    const getButtonText = () => {
      if (props.room.isFull) return '房间已满';
      if (isPlayerInRoom()) return '进入房间';
      return '加入房间';
    };
    
    const handleJoin = () => {
      if (!canJoinRoom()) {
        return;
      }
      
      if (isPlayerInRoom()) {
        emit('join', props.room.roomId);
        return;
      }
      
      if (props.room.hasPassword) {
        showPasswordModal.value = true;
      } else {
        emit('join', props.room.roomId);
      }
    };
    
    const handlePasswordConfirm = (password) => {
      showPasswordModal.value = false;
      emit('join', props.room.roomId, password);
    };
    
    return {
      showPasswordModal,
      handleJoin,
      handlePasswordConfirm,
      canJoinRoom,
      getButtonText
    };
  },
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
      return 5;
    }
  }
};
</script>

<style scoped>
.room-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
}

.room-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.room-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.room-name {
  font-size: 18px;
  font-weight: 600;
  color: #f0f0f0;
  margin: 0;
}

.password-badge {
  font-size: 16px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
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

.detail-item {
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

.room-footer {
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