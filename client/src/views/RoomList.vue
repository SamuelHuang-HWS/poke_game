// client/src/views/RoomList.vue
<template>
  <div class="room-list-container">
    <!-- 顶部导航栏 -->
    <nav class="navbar glass-effect">
      <div class="nav-left">
        <router-link to="/" class="back-link">← 返回首页</router-link>
      </div>
      <div class="nav-center">
        <h1 class="title">房间列表</h1>
      </div>
      <div class="nav-right">
        <router-link to="/rooms/create" class="create-link">创建房间</router-link>
      </div>
    </nav>

    <!-- 搜索区域 -->
    <div class="search-section">
      <div class="search-container glass-effect">
        <input
          v-model="searchRoomId"
          type="text"
          placeholder="输入房间号搜索房间"
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <button
          @click="handleSearch"
          class="search-button"
          :disabled="!searchRoomId.trim()"
        >
          搜索
        </button>
      </div>
    </div>

    <!-- 房间列表 -->
    <div class="rooms-section">
      <h2 class="section-title">我的房间</h2>
      
      <div v-if="isLoading" class="loading">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
      
      <div v-else-if="rooms.length === 0" class="empty-state">
        <div class="empty-icon">🏠</div>
        <p>暂无房间</p>
        <router-link to="/rooms/create" class="create-button">创建房间</router-link>
      </div>
      
      <div v-else class="rooms-grid">
        <RoomCard
          v-for="room in rooms"
          :key="room.roomId"
          :room="room"
          @join="handleJoinRoom"
          class="room-card"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import RoomCard from '@/components/RoomCard.vue';
import { useRoomStore } from '@/stores/room';

export default {
  name: 'RoomList',
  components: {
    RoomCard
  },
  setup() {
    const router = useRouter();
    const roomStore = useRoomStore();
    
    const searchRoomId = ref('');
    const isLoading = ref(false);
    
    const rooms = ref([]);
    
    onMounted(async () => {
      await loadRooms();
    });
    
    const loadRooms = async () => {
      try {
        isLoading.value = true;
        const roomList = await roomStore.fetchUserRooms();
        rooms.value = roomList;
      } catch (error) {
        console.error('加载房间列表失败:', error);
        alert(error.message || '加载房间列表失败');
      } finally {
        isLoading.value = false;
      }
    };
    
    const handleSearch = async () => {
      if (!searchRoomId.value.trim()) return;
      
      try {
        isLoading.value = true;
        const room = await roomStore.searchRoom(searchRoomId.value.trim());
        console.log(room);
        // 直接跳转到房间页面
        if (room && room?.data?.data && room.data?.data.roomId) {
          console.log(room);
          router.push(`/rooms/${room.data?.data.roomId}`);
        } else {
          // alert('房间信息不完整');
        }
      } catch (error) {
        console.error('搜索房间失败:', error);
        alert(error.message || '房间不存在');
      } finally {
        isLoading.value = false;
      }
    };
    
    const handleJoinRoom = async (roomId) => {
      try {
        isLoading.value = true;
        // 获取房间详情以获取房间初始金币
        const room = await roomStore.searchRoom(roomId);
        console.log(room);
        
        // 检查房间数据完整性
        if (!room || !room.data || !room.data.defaultRoomGold) {
          alert('房间信息不完整');
          return;
        }
        
        const joinResponse = await roomStore.joinRoom(roomId);

        console.log(joinResponse);
        
        // 跳转到游戏房间
        // router.push(`/rooms/${roomId}`);
      } catch (error) {
        console.error('加入房间失败:', error);
        alert(error.message || '加入房间失败');
      } finally {
        isLoading.value = false;
      }
    };
    
    return {
      searchRoomId,
      isLoading,
      rooms,
      handleSearch,
      handleJoinRoom
    };
  }
};
</script>

<style scoped>
.room-list-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: rgba(22, 33, 62, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-left,
.nav-right {
  flex: 1;
}

.nav-center {
  flex: 2;
  text-align: center;
}

.back-link,
.create-link {
  color: #6c5ce7;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
}

.back-link:hover,
.create-link:hover {
  color: #00d2d3;
  text-decoration: underline;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #f0f0f0;
}

.search-section {
  padding: 30px 20px;
  display: flex;
  justify-content: center;
}

.search-container {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 500px;
  width: 100%;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #f0f0f0;
  font-size: 16px;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-input:focus {
  outline: none;
}

.search-button {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.search-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(108, 92, 231, 0.4);
}

.search-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rooms-section {
  padding: 0 20px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: #f0f0f0;
  margin-bottom: 20px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px;
  color: #b2b2b2;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top: 4px solid #6c5ce7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 50px 20px;
  color: #b2b2b2;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.create-button {
  display: inline-block;
  margin-top: 20px;
  padding: 12px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  color: white;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
}

.create-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(108, 92, 231, 0.4);
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

/* 玻璃拟态效果 */
.glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    gap: 15px;
  }
  
  .nav-left,
  .nav-center,
  .nav-right {
    flex: none;
  }
  
  .rooms-grid {
    grid-template-columns: 1fr;
  }
}
</style>