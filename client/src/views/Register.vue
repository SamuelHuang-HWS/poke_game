// client/src/views/Register.vue
<template>
  <div class="register-container">
    <div class="register-card glass-effect">
      <div class="register-header">
        <div class="brand-wrapper">
          <img src="@/assets/logo.png" alt="PokerVerse" class="brand-logo" />
          <h1 class="title">PokerVerse</h1>
        </div>
      </div>
      
      <div class="register-body">
        <form @submit.prevent="handleRegister" class="register-form">
          <div class="input-group">
            <input
              v-model="formData.username"
              type="text"
              placeholder="请输入用户名"
              class="input-field"
              required
            />
          </div>
          
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
              placeholder="请输入密码（至少6位）"
              class="input-field"
              required
              minlength="6"
            />
          </div>
          
          <div class="input-group">
            <input
              v-model="formData.confirmPassword"
              type="password"
              placeholder="请确认密码"
              class="input-field"
              required
            />
          </div>
          
          <button
            type="submit"
            class="register-button"
            :disabled="isLoading"
          >
            {{ isLoading ? '注册中...' : '注册' }}
          </button>
        </form>
        
        <div class="footer">
          <p>已有账户？<router-link to="/login" class="link">立即登录</router-link></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'Register',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    
    const formData = ref({
      username: '',
      phoneNumber: '',
      password: '',
      confirmPassword: ''
    });
    
    const isLoading = ref(false);
    const passwordMismatch = ref(false);
    
    // 监听密码确认字段
    watch([() => formData.value.password, () => formData.value.confirmPassword], 
      ([newPassword, newConfirmPassword]) => {
        passwordMismatch.value = newPassword !== newConfirmPassword && newConfirmPassword !== '';
      }
    );
    
    const handleRegister = async () => {
      // 检查密码是否匹配
      if (formData.value.password !== formData.value.confirmPassword) {
        alert('两次输入的密码不一致');
        return;
      }
      
      try {
        isLoading.value = true;
        
        await authStore.register(
          formData.value.username,
          formData.value.phoneNumber,
          formData.value.password
        );
        
        // 注册成功，跳转到首页
        alert('注册成功！');
        router.push('/');
      } catch (error) {
        alert(error.message || '注册失败');
      } finally {
        isLoading.value = false;
      }
    };
    
    return {
      formData,
      isLoading,
      passwordMismatch,
      handleRegister
    };
  }
};
</script>

<style scoped>
.register-container {
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

.register-card {
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

.register-form {
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

.register-button {
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

.register-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(108, 92, 231, 0.4);
}

.register-button:disabled {
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
  .register-container {
    padding: 10px;
    align-items: center;
    overflow-y: auto;
  }

  .register-card {
    display: flex;
    flex-direction: row;
    max-width: 750px;
    padding: 20px 30px;
    gap: 30px;
    align-items: center;
    text-align: left;
  }

  .register-header {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .register-body {
    flex: 1.5;
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

  .register-form {
    margin-bottom: 10px;
  }

  .input-group {
    margin-bottom: 10px; /* 减少间距 */
  }

  .input-field {
    padding: 10px 16px; /* 减少 padding */
  }
}
</style>
