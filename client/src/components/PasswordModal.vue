<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
    <div class="modal-container glass-effect">
      <div class="modal-header">
        <h3 class="modal-title">输入房间密码</h3>
        <button class="close-button" @click="handleCancel">×</button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="password"
            type="password"
            class="form-input"
            placeholder="请输入房间密码"
            maxlength="20"
            @keyup.enter="handleConfirm"
            ref="passwordInput"
          />
          <div v-if="error" class="error-message">{{ error }}</div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="button button-cancel" @click="handleCancel">
          取消
        </button>
        <button class="button button-confirm" @click="handleConfirm" :disabled="!password">
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, nextTick } from 'vue';

export default {
  name: 'PasswordModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  emits: ['confirm', 'cancel'],
  setup(props, { emit }) {
    const password = ref('');
    const error = ref('');
    const passwordInput = ref(null);

    const handleConfirm = () => {
      if (!password.value || password.value.trim() === '') {
        error.value = '密码不能为空';
        return;
      }
      emit('confirm', password.value.trim());
    };

    const handleCancel = () => {
      password.value = '';
      error.value = '';
      emit('cancel');
    };

    watch(() => props.visible, (newVal) => {
      if (newVal) {
        password.value = '';
        error.value = '';
        nextTick(() => {
          if (passwordInput.value) {
            passwordInput.value.focus();
          }
        });
      }
    });

    return {
      password,
      error,
      passwordInput,
      handleConfirm,
      handleCancel
    };
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-container {
  width: 90%;
  max-width: 400px;
  border-radius: 20px;
  background: rgba(22, 33, 62, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #f0f0f0;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  color: #b2b2b2;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
  line-height: 1;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f0f0f0;
}

.modal-body {
  padding: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #b2b2b2;
  margin-bottom: 8px;
}

.form-input {
  padding: 14px 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #f0f0f0;
  font-size: 16px;
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #6c5ce7;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.2);
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.error-message {
  color: #ff6b6b;
  font-size: 12px;
  margin-top: 6px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.button {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.button-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #f0f0f0;
}

.button-cancel:hover {
  background: rgba(255, 255, 255, 0.2);
}

.button-confirm {
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  color: white;
}

.button-confirm:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(108, 92, 231, 0.4);
}

.button-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 玻璃拟态效果 */
.glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@media (max-width: 768px) {
  .modal-container {
    width: 95%;
    margin: 20px;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 16px 20px;
  }

  .modal-title {
    font-size: 18px;
  }

  .button {
    padding: 10px 16px;
    font-size: 14px;
  }
}
</style>
