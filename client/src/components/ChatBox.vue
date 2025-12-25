// client/src/components/ChatBox.vue
<template>
  <div class="chat-box glass-effect">
    <div class="chat-header">
      <h3 class="chat-title">聊天</h3>
    </div>
    
    <div class="chat-messages" ref="messagesContainer">
      <div
        v-for="(message, index) in messages"
        :key="index"
        class="chat-message"
      >
        <span class="message-sender">{{ message.sender }}:</span>
        <span class="message-content">{{ message.content }}</span>
      </div>
    </div>
    
    <div class="chat-input">
      <input
        v-model="inputMessage"
        type="text"
        placeholder="输入消息..."
        @keyup.enter="sendMessage"
        class="chat-text-input"
      />
      <button @click="sendMessage" class="send-button">发送</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue';

export default {
  name: 'ChatBox',
  props: {
    messages: {
      type: Array,
      default: () => []
    }
  },
  emits: ['send-message'],
  setup(props, { emit }) {
    const inputMessage = ref('');
    const messagesContainer = ref(null);
    
    const sendMessage = () => {
      if (!inputMessage.value.trim()) return;
      
      emit('send-message', inputMessage.value.trim());
      inputMessage.value = '';
    };
    
    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      });
    };
    
    onMounted(() => {
      scrollToBottom();
    });
    
    return {
      inputMessage,
      messagesContainer,
      sendMessage,
      scrollToBottom
    };
  },
  watch: {
    messages: {
      handler() {
        this.scrollToBottom();
      },
      deep: true
    }
  }
};
</script>

<style scoped>
.chat-box {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(22, 33, 62, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
}

.chat-header {
  padding: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-title {
  font-size: 16px;
  font-weight: 600;
  color: #f0f0f0;
  margin: 0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-message {
  font-size: 14px;
  word-break: break-all;
}

.message-sender {
  color: #6c5ce7;
  font-weight: 600;
  margin-right: 5px;
}

.message-content {
  color: #f0f0f0;
}

.chat-input {
  display: flex;
  gap: 10px;
  padding: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-text-input {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #f0f0f0;
  font-size: 14px;
}

.chat-text-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 2px #6c5ce7;
}

.send-button {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.send-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 92, 231, 0.4);
}
</style>