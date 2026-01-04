<template>
  <div class="login-container">
    <div class="login-card glass-effect">
      <div class="login-header">
        <div class="brand-wrapper">
          <img src="@/assets/logo.png" alt="PokerVerse" class="brand-logo" />
          <h1 class="title">PokerVerse</h1>
        </div>
      </div>
      
      <div class="login-body">
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="input-group">
            <input
              v-model="formData.phoneNumber"
              type="tel"
              placeholder="请输入手机号"
              class="input-field"
              required
            />
          </div>
          
          <div class="input-group">
            <input
              v-model="formData.password"
              type="password"
              placeholder="请输入密码"
              class="input-field"
              required
            />
          </div>
          
          <button
            type="submit"
            class="login-button"
            :disabled="isLoading"
          >
            {{ isLoading ? '登录中...' : '登录' }}
          </button>
        </form>
        
        <div class="footer">
          <p>还没有账户？<router-link to="/register" class="link">立即注册</router-link></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

export default {
  name: 'Login',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const toast = useToast();
    
    const formData = ref({
      phoneNumber: '',
      password: ''
    });
    
    const isLoading = ref(false);
    
    const handleLogin = async () => {
      try {
        isLoading.value = true;
        
        await authStore.login(
          formData.value.phoneNumber,
          formData.value.password
        );
        
        // 登录成功，跳转到首页
        router.replace('/');
      } catch (error) {
        toast.error(error.message || '登录失败');
      } finally {
        isLoading.value = false;
      }
    };
    
    return {
      formData,
      isLoading,
      handleLogin
    };
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background-image: url("@/assets/auth_bg.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px 30px;
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.brand-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 10px;
}

.brand-logo {
  width: 60px;
  height: 60px;
  object-fit: contain;
  margin-bottom: 10px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 0;
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 16px;
  color: #b2b2b2;
  margin-bottom: 30px;
}

.login-form {
  margin-bottom: 30px;
}

.input-group {
  margin-bottom: 20px;
}

.input-field {
  width: 100%;
  padding: 16px 20px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #f0f0f0;
  font-size: 16px;
  transition: all 0.3s ease;
}

.input-field:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 2px #6c5ce7;
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.login-button {
  width: 100%;
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

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(108, 92, 231, 0.4);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.footer {
  font-size: 14px;
  color: #b2b2b2;
}

.link {
  color: #ff9f43; /* More visible orange */
  text-decoration: none;
  font-weight: bold;
  font-size: 16px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  transition: all 0.3s ease;
}

.link:hover {
  color: #ffb168;
  text-decoration: underline;
}

/* 玻璃拟态效果 */
.glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 移动端横屏适配 */
@media screen and (orientation: landscape) and (max-height: 600px) {
  .login-card {
    display: flex;
    flex-direction: row;
    max-width: 700px;
    padding: 20px 30px;
    gap: 30px;
    align-items: center;
    text-align: left;
  }

  .login-header {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .login-body {
    flex: 1.2;
    width: 100%;
  }

  .title {
    font-size: 28px;
    background: linear-gradient(135deg, #6c5ce7, #00d2d3);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-align: left;
  }

  .subtitle {
    margin-bottom: 20px;
  }

  .login-form {
    margin-bottom: 10px;
  }

  .input-group {
    margin-bottom: 15px;
  }

  .input-field {
    padding: 12px 16px;
  }
}
</style>
