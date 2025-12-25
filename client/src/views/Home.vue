// client/src/views/Home.vue
<template>
  <div class="home-container">
    <!-- 顶部导航栏 -->
    <nav class="navbar glass-effect">
      <div class="nav-left">
        <h1 class="logo">炸金花</h1>
      </div>
      <div class="nav-right">
        <div class="user-info">
          <span class="gold">💰 {{ user?.gold || 0 }}</span>
          <span class="nickname">{{ user?.nickname || user?.phoneNumber }}</span>
        </div>
        <router-link to="/profile" class="profile-link">
          <div class="avatar-placeholder">👤</div>
        </router-link>
      </div>
    </nav>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <div class="welcome-section">
        <h2 class="welcome-title">欢迎来到炸金花</h2>
        <p class="welcome-subtitle">与朋友一起享受刺激的纸牌游戏</p>
      </div>

      <div class="action-buttons">
        <router-link to="/rooms/create" class="action-button primary">
          <div class="button-icon">🏠</div>
          <div class="button-text">创建房间</div>
        </router-link>

        <router-link to="/rooms" class="action-button secondary">
          <div class="button-icon">🔍</div>
          <div class="button-text">搜索房间</div>
        </router-link>
      </div>

      <div class="quick-stats">
        <div class="stat-card glass-effect">
          <div class="stat-value">{{ stats.totalGames || 0 }}</div>
          <div class="stat-label">总局数</div>
        </div>
        <div class="stat-card glass-effect">
          <div class="stat-value">{{ stats.winRate || '0%' }}</div>
          <div class="stat-label">胜率</div>
        </div>
        <div class="stat-card glass-effect">
          <div class="stat-value">{{ stats.bestWin || 0 }}</div>
          <div class="stat-label">最高赢取</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useRoomStore } from '@/stores/room';

export default {
  name: 'Home',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const roomStore = useRoomStore();
    
    const user = ref(null);
    const stats = ref({
      totalGames: 0,
      winRate: '0%',
      bestWin: 0
    });

    onMounted(async () => {
      try {
        // 获取用户信息
        await authStore.fetchUser();
        user.value = authStore.user;
        
        // 检查用户是否有活跃房间
        const activeRooms = await roomStore.fetchUserActiveRooms();
        if (activeRooms && activeRooms.length > 0) {
          // 如果有活跃房间，自动进入第一个房间
          router.push(`/rooms/${activeRooms[0].roomId}`);
        }
      } catch (error) {
        console.error('获取用户信息或检查活跃房间失败:', error);
      }
    });

    return {
      user,
      stats
    };
  }
};
</script>

<style scoped>
.home-container {
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

.logo {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gold {
  font-size: 16px;
  font-weight: 600;
  color: #ffd700;
}

.nickname {
  font-size: 16px;
  color: #f0f0f0;
}

.profile-link {
  text-decoration: none;
}

.avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #b2b2b2;
}

.main-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

.welcome-section {
  text-align: center;
  margin-bottom: 50px;
}

.welcome-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 15px;
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-subtitle {
  font-size: 18px;
  color: #b2b2b2;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 50px;
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  border-radius: 20px;
  text-decoration: none;
  transition: all 0.3s ease;
  width: 200px;
}

.primary {
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  box-shadow: 0 8px 32px rgba(108, 92, 231, 0.3);
}

.secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-button:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(108, 92, 231, 0.5);
}

.button-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.button-text {
  font-size: 20px;
  font-weight: 600;
  color: white;
}

.quick-stats {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 150px;
  padding: 25px;
  border-radius: 16px;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 5px;
  color: #6c5ce7;
}

.stat-label {
  font-size: 16px;
  color: #b2b2b2;
}

/* 玻璃拟态效果 */
.glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .action-button {
    width: 100%;
    max-width: 300px;
  }
  
  .quick-stats {
    flex-direction: column;
    align-items: center;
  }
  
  .stat-card {
    width: 100%;
    max-width: 300px;
  }
}
</style>