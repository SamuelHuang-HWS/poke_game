// client/src/views/Profile.vue
<template>
  <div class="profile-container">
    <!-- 顶部导航栏 -->
    <nav class="navbar glass-effect">
      <div class="nav-left">
        <router-link to="/" class="back-link">← 返回首页</router-link>
      </div>
      <div class="nav-center">
        <h1 class="title">个人资料</h1>
      </div>
      <div class="nav-right">
        <button @click="handleLogout" class="logout-button">退出登录</button>
      </div>
    </nav>

    <!-- 个人资料卡片 -->
    <div class="profile-card glass-effect">
      <div class="avatar-section">
        <div class="avatar-placeholder">👤</div>
        <h2 class="username">{{ user?.nickname || user?.phoneNumber }}</h2>
      </div>

      <div class="stats-section">
        <div class="stat-item">
          <div class="stat-value">💰 {{ user?.gold || 0 }}</div>
          <div class="stat-label">金币余额</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.totalGames || 0 }}</div>
          <div class="stat-label">总局数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.winRate || '0%' }}</div>
          <div class="stat-label">胜率</div>
        </div>
      </div>

      <div class="edit-section">
        <h3 class="section-title">编辑资料</h3>
        <form @submit.prevent="handleUpdateProfile" class="edit-form">
          <div class="form-group">
            <label class="form-label">昵称</label>
            <input
              v-model="editForm.nickname"
              type="text"
              placeholder="请输入昵称"
              class="form-input"
              maxlength="20"
            />
          </div>

          <button
            type="submit"
            class="save-button"
            :disabled="isLoading"
          >
            {{ isLoading ? '保存中...' : '保存修改' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

export default {
  name: 'Profile',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    
    const user = ref(null);
    const stats = ref({
      totalGames: 0,
      winRate: '0%'
    });
    
    const editForm = ref({
      nickname: ''
    });
    
    const isLoading = ref(false);
    
    onMounted(async () => {
      try {
        // 获取用户信息
        await authStore.fetchUser();
        user.value = authStore.user;
        editForm.value.nickname = authStore.user?.nickname || '';
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    });
    
    const handleUpdateProfile = async () => {
      try {
        isLoading.value = true;
        
        const updateData = {};
        if (editForm.value.nickname !== (user.value?.nickname || '')) {
          updateData.nickname = editForm.value.nickname;
        }
        
        if (Object.keys(updateData).length > 0) {
          await authStore.updateUser(updateData);
          user.value = authStore.user;
          alert('资料更新成功');
        }
      } catch (error) {
        alert(error.message || '更新资料失败');
      } finally {
        isLoading.value = false;
      }
    };
    
    const handleLogout = () => {
      if (confirm('确定要退出登录吗？')) {
        authStore.logout();
        router.push('/login');
      }
    };
    
    return {
      user,
      stats,
      editForm,
      isLoading,
      handleUpdateProfile,
      handleLogout
    };
  }
};
</script>

<style scoped>
.profile-container {
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

.logout-button {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 118, 117, 0.2);
  color: #ff7675;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logout-button:hover {
  background: rgba(255, 118, 117, 0.3);
}

.profile-card {
  max-width: 600px;
  margin: 30px auto;
  padding: 40px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.avatar-section {
  text-align: center;
  margin-bottom: 30px;
}

.avatar-placeholder {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: #b2b2b2;
  margin: 0 auto 20px;
}

.username {
  font-size: 24px;
  font-weight: 700;
  color: #f0f0f0;
  margin: 0;
}

.stats-section {
  display: flex;
  justify-content: space-around;
  margin-bottom: 40px;
  flex-wrap: wrap;
  gap: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #6c5ce7;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 16px;
  color: #b2b2b2;
}

.edit-section {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 30px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #f0f0f0;
  margin-bottom: 20px;
  text-align: center;
}

.edit-form {
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

.form-input {
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #f0f0f0;
  font-size: 16px;
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 2px #6c5ce7;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.save-button {
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.save-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(108, 92, 231, 0.4);
}

.save-button:disabled {
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
  
  .profile-card {
    margin: 20px;
    padding: 30px 20px;
  }
  
  .stats-section {
    flex-direction: column;
    align-items: center;
  }
}

/* 移动端横屏适配 */
@media screen and (orientation: landscape) and (max-height: 600px) {
  .profile-container {
    padding-bottom: 20px;
    height: 100vh;
    overflow-y: auto;
  }

  .navbar {
    padding: 5px 15px;
    flex-direction: row; 
    min-height: 40px;
  }
  
  .title {
    font-size: 18px;
    margin: 0;
  }
  
  .profile-card {
    margin: 10px auto;
    padding: 15px 20px;
    max-width: 700px;
    display: flex;
    flex-direction: row;
    gap: 20px;
    align-items: flex-start;
  }
  
  .avatar-section {
    flex: 1;
    margin-bottom: 0;
    text-align: center;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    padding-right: 20px;
  }
  
  .avatar-placeholder {
    width: 60px;
    height: 60px;
    font-size: 30px;
    margin: 0 auto 10px;
  }
  
  .username {
    font-size: 18px;
  }
  
  .stats-section {
    flex: 1.5;
    margin-bottom: 0;
    flex-direction: row;
    gap: 10px;
    justify-content: space-around;
  }
  
  .stat-item {
    margin: 5px;
  }
  
  .stat-value {
    font-size: 18px;
    margin-bottom: 2px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .edit-section {
    flex: 1.5;
    border-top: none;
    padding-top: 0;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    padding-left: 20px;
  }
  
  .section-title {
    font-size: 16px;
    margin-bottom: 10px;
    text-align: left;
  }
  
  .edit-form {
    gap: 10px;
  }
  
  .form-label {
    font-size: 14px;
    margin-bottom: 4px;
  }
  
  .form-input {
    padding: 8px;
    font-size: 14px;
  }
  
  .save-button {
    padding: 10px;
    font-size: 14px;
  }
}
</style>