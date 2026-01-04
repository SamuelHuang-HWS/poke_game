<template>
  <div class="toast-item" :class="type" @click="$emit('close')">
    <span class="icon">{{ icon }}</span>
    <span class="message">{{ message }}</span>
    <button class="close-btn">×</button>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'ToastItem',
  props: {
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'info',
      validator: (value) => ['success', 'error', 'info', 'warning'].includes(value)
    }
  },
  emits: ['close'],
  setup(props) {
    const icon = computed(() => {
      switch (props.type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        default: return 'ℹ️';
      }
    });

    return { icon };
  }
};
</script>

<style scoped>
.toast-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 300px;
  max-width: 450px;
  padding: 12px 16px;
  background: rgba(30, 30, 40, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  margin-bottom: 10px;
  cursor: pointer;
  border-left: 4px solid #4a90e2; /* Default info color */
  color: #fff;
  transition: all 0.3s ease;
  pointer-events: auto; /* Ensure updated pointer events */
}

.toast-item.success {
  border-left-color: #50e3c2;
}

.toast-item.error {
  border-left-color: #ff5b5b;
}

.toast-item.warning {
  border-left-color: #f5a623;
}

.icon {
  font-size: 18px;
}

.message {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  word-break: break-all;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}
</style>
