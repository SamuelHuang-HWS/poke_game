// client/src/App.vue
<template>
  <div id="app">
    <div class="orientation-warning">
      <div class="phone-icon">
        <div class="screen"></div>
      </div>
      <p>为了更好的游戏体验，请旋转手机至横屏</p>
    </div>
    <div class="app-content">
      <router-view />
    </div>
    <ToastContainer />
    
    <!-- 全屏切换按钮 -->
    <button 
      class="fullscreen-toggle glass-effect" 
      @click="toggleFullscreen" 
      title="切换全屏"
    >
      <span v-if="isFullscreen">↙️</span>
      <span v-else>⛶</span>
    </button>
    
    <!-- iOS全屏提示 -->
    <div class="ios-prompt glass-effect" v-if="showIOSPrompt">
      iOS请点击"分享"->"添加到主屏幕"以全屏体验
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import ToastContainer from '@/components/ToastContainer.vue';

export default {
  name: 'App',
  components: {
    ToastContainer
  },
  setup() {
    const isFullscreen = ref(false);
    const showIOSPrompt = ref(false);

    const toggleFullscreen = async () => {
      // 增强的 iOS 检测
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                   
      if (isIOS) {
        showIOSPrompt.value = true;
        setTimeout(() => {
          showIOSPrompt.value = false;
        }, 4000); // 延长一点时间
        return;
      }

      try {
        const doc = document;
        const el = document.documentElement;
        
        // 兼容性前缀
        const requestFullScreen = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        const exitFullScreen = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;

        if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
          if (requestFullScreen) {
            await requestFullScreen.call(el);
          } else {
            // 如果不支持全屏 API，显示提示 (针对 iOS 老版本或其他不支持设备)
             showIOSPrompt.value = true;
             setTimeout(() => {
                showIOSPrompt.value = false;
             }, 4000);
          }
        } else {
          if (exitFullScreen) {
            await exitFullScreen.call(doc);
          }
        }
      } catch (err) {
        console.error('全屏切换失败:', err);
        // 发生错误通常意味着不支持，显示提示
        showIOSPrompt.value = true;
        setTimeout(() => {
          showIOSPrompt.value = false;
        }, 4000);
      }
    };

    const handleFullscreenChange = () => {
      isFullscreen.value = !!document.fullscreenElement;
    };

    onMounted(() => {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    });

    onUnmounted(() => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    });

    return {
      isFullscreen,
      toggleFullscreen
    };
  }
};
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #f0f0f0;
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(108, 92, 231, 0.5);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(108, 92, 231, 0.8);
}

/* 玻璃拟态效果 */
.glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 横屏提示相关样式 */
.orientation-warning {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #1a1a2e;
  z-index: 9999;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #fff;
  text-align: center;
}

.orientation-warning p {
  margin-top: 20px;
  font-size: 18px;
  font-weight: 500;
  color: #a0a0a0;
}

.phone-icon {
  width: 60px;
  height: 100px;
  border: 4px solid #fff;
  border-radius: 8px;
  position: relative;
  animation: rotate-phone 2s infinite ease-in-out;
}

.screen {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1px;
  height: 1px;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 20px 10px rgba(255, 255, 255, 0.2);
}

@keyframes rotate-phone {
  0% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(90deg);
  }
  75% {
    transform: rotate(90deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

.app-content {
  width: 100%;
  height: 100%;
}

/* 全屏按钮样式 */
.fullscreen-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9990;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.fullscreen-toggle:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.fullscreen-toggle:active {
  transform: scale(0.95);
}

.ios-prompt {
  position: fixed;
  bottom: 80px;
  right: 20px;
  min-width: 200px;
  background: rgba(0,0,0,0.85);
  color: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.4;
  z-index: 10000;
  text-align: center;
  pointer-events: none;
  border: 1px solid rgba(255,255,255,0.2);
  animation: promptFade 3s ease-in-out forwards;
}

@keyframes promptFade {
  0% { opacity: 0; transform: translateY(10px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
}

/* 桌面端隐藏 */
@media (min-width: 1025px) {
  .fullscreen-toggle {
    display: none;
  }
}

/* 仅在移动端/平板且竖屏时显示提示 */
@media screen and (orientation: portrait) and (max-width: 1024px) {
  .orientation-warning {
    display: flex;
  }
  
  .app-content {
    display: none;
  }
}
</style>
