<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <ToastItem
        v-for="toast in toasts"
        :key="toast.id"
        :message="toast.message"
        :type="toast.type"
        @close="remove(toast.id)"
      />
    </TransitionGroup>
  </div>
</template>

<script>
import { useToast } from '@/composables/useToast';
import ToastItem from './ToastItem.vue';

export default {
  name: 'ToastContainer',
  components: {
    ToastItem
  },
  setup() {
    const { toasts, remove } = useToast();
    return { toasts, remove };
  }
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 9999;
  pointer-events: none; /* Let clicks pass through container area */
}

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}
</style>
