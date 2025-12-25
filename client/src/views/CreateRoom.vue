// client/src/views/CreateRoom.vue
<template>
  <div class="create-room-container">
    <!-- 顶部导航栏 -->
    <nav class="navbar glass-effect">
      <div class="nav-left">
        <router-link to="/rooms" class="back-link">← 返回房间列表</router-link>
      </div>
      <div class="nav-center">
        <h1 class="title">创建房间</h1>
      </div>
      <div class="nav-right">
        <!-- 占位符 -->
      </div>
    </nav>

    <!-- 创建房间表单 -->
    <div class="form-section">
      <div class="form-container glass-effect">
        <form @submit.prevent="handleCreateRoom" class="room-form">
          <div class="form-group">
            <label class="form-label">房间名称</label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="请输入房间名称"
              class="form-input"
              required
              maxlength="20"
            />
          </div>

          <div class="form-group">
            <label class="form-label">房间初始金币</label>
            <input
              v-model.number="formData.defaultRoomGold"
              type="number"
              placeholder="请输入房间初始金币"
              class="form-input"
              required
              min="1000"
            />
            <div class="form-hint">所有玩家进入房间时的初始金币数量，最少1000金币</div>
          </div>

          <div class="form-group">
            <label class="form-label">单注金额</label>
            <input
              v-model.number="formData.betAmount"
              type="number"
              placeholder="请输入单注金额"
              class="form-input"
              required
              min="50"
            />
            <div class="form-hint">最少50金币</div>
          </div>

          <div class="form-group">
            <label class="form-label">房间局数</label>
            <select
              v-model.number="formData.totalRounds"
              class="form-select"
              required
            >
              <option value="5">5局</option>
              <option value="10">10局</option>
              <option value="15">15局</option>
              <option value="20">20局</option>
              <option value="25">25局</option>
              <option value="30">30局</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">房间密码（可选）</label>
            <input
              v-model="formData.password"
              type="text"
              placeholder="请输入房间密码（可留空）"
              class="form-input"
              maxlength="20"
            />
          </div>

          <button
            type="submit"
            class="create-button"
            :disabled="isLoading"
          >
            {{ isLoading ? '创建中...' : '创建房间' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useRoomStore } from '../stores/room';

export default {
  name: 'CreateRoom',
  setup() {
    const router = useRouter();
    const roomStore = useRoomStore();
    
    const formData = ref({
      name: '',
      defaultRoomGold: 10000,
      betAmount: 50,
      totalRounds: 10,
      password: ''
    });
    
    const isLoading = ref(false);
    
    const handleCreateRoom = async () => {
      try {
        isLoading.value = true;
        console.log("formData.value", formData.value);
        const response = await roomStore.createRoom(formData.value);
        
        // 创建成功，跳转到房间页面
        router.push(`/rooms/${response.data.data.roomId}`);
      } catch (error) {
        alert(error.message || '创建房间失败');
      } finally {
        isLoading.value = false;
      }
    };
    
    return {
      formData,
      isLoading,
      handleCreateRoom
    };
  }
};
</script>

<style scoped>
.create-room-container {
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

.back-link {
  color: #6c5ce7;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
}

.back-link:hover {
  color: #00d2d3;
  text-decoration: underline;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #f0f0f0;
}

.form-section {
  padding: 30px 20px;
  display: flex;
  justify-content: center;
}

.form-container {
  width: 100%;
  max-width: 500px;
  padding: 30px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.room-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 16px;
  font-weight: 500;
  color: #f0f0f0;
  margin-bottom: 8px;
}

.form-input,
.form-select {
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #f0f0f0;
  font-size: 16px;
  transition: all 0.3s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 2px #6c5ce7;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 16px center;
  background-size: 16px;
}

.form-hint {
  font-size: 12px;
  color: #b2b2b2;
  margin-top: 5px;
}

.create-button {
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
}

.create-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(108, 92, 231, 0.4);
}

.create-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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
  
  .form-container {
    margin: 0 10px;
  }
}
</style>