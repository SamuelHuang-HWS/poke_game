/*
 * @Author: Wensong Huang wensong.huang@eeoa.com
 * @Date: 2025-12-19 18:30:55
 * @LastEditors: Wensong Huang wensong.huang@eeoa.com
 * @LastEditTime: 2025-12-28 09:40:55
 * @FilePath: /poke_game/client/src/router/index.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// client/src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useGameStore } from "@/stores/game";
import authUtils from "@/utils/auth";
import socket from "@/utils/socket";

// 页面组件
const Login = () => import("../views/Login.vue");
const Register = () => import("../views/Register.vue");
const Home = () => import("../views/Home.vue");
const RoomList = () => import("../views/RoomList.vue");
const CreateRoom = () => import("../views/CreateRoom.vue");
const GameRoom = () => import("../views/GameRoom.vue");
const Profile = () => import("../views/Profile.vue");

// 路由守卫
function requireAuth(to, from, next) {
  const token = localStorage.getItem("token");
  if (!token) {
    next("/login");
  } else {
    next();
  }
}

function requireGuest(to, from, next) {
  const token = localStorage.getItem("token");
  if (token) {
    next("/");
  } else {
    next();
  }
}

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
    beforeEnter: requireAuth,
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
    beforeEnter: requireGuest,
  },
  {
    path: "/register",
    name: "Register",
    component: Register,
    beforeEnter: requireGuest,
  },
  {
    path: "/rooms",
    name: "RoomList",
    component: RoomList,
    beforeEnter: requireAuth,
  },
  {
    path: "/rooms/create",
    name: "CreateRoom",
    component: CreateRoom,
    beforeEnter: requireAuth,
  },
  {
    path: "/rooms/:roomId",
    name: "GameRoom",
    component: GameRoom,
    beforeEnter: requireAuth,
    props: true,
  },
  {
    path: "/profile",
    name: "Profile",
    component: Profile,
    beforeEnter: requireAuth,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局前置守卫 - 优化版本
router.beforeEach(async (to, from, next) => {
  // 获取认证存储实例
  const authStore = useAuthStore();
  const gameStore = useGameStore();

  // 检查是否需要认证
  const requiresAuth = to.matched.some(
    (record) => record.beforeEnter === requireAuth
  );

  if (requiresAuth) {
    // 首先进行本地验证（无需网络请求）
    if (!authStore.token || !authUtils.isAuthenticated()) {
      // 本地验证失败，清除认证信息并跳转到登录页
      authStore.logout();
      next("/login");
      return;
    }

    // 本地验证通过，但为了确保用户信息是最新的，我们可以选择性地进行网络验证
    // 这里我们只在必要时才进行网络验证（比如用户信息可能已更新的情况）
    // 或者定期进行一次验证（比如每隔一段时间）

    // 如果用户信息不存在，从本地存储获取
    if (!authStore.user) {
      const userInfo = authUtils.getUserInfoFromStorage();
      if (userInfo) {
        authStore.user = userInfo;
        authStore.isAuthenticated = true;
      }
    }

    // 检查是否在游戏中
    if (gameStore.isInGame && gameStore.currentGame) {
      const currentGame = gameStore.currentGame;
      const roomId = currentGame.roomId;
      const gameRoomPath = `/rooms/${roomId}`;

      // 如果当前不在游戏房间页面，则自动跳转到游戏房间
      if (to.path !== gameRoomPath) {
        console.log("路由守卫: 检测到用户在游戏中，自动跳转到游戏房间", {
          roomId,
          from: to.path,
          to: gameRoomPath,
        });
        next(gameRoomPath);
        return;
      }

      // 检查socket是否已连接
      if (!socket.getStatus().connected) {
        try {
          // 连接socket
          const socketUrl =
            import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
          socket.connect(socketUrl);

          // 等待socket连接建立
          await new Promise((resolve, reject) => {
            let checkCount = 0;
            const maxChecks = 50; // 最多检查50次，每次100ms，总共5秒

            const checkConnection = setInterval(() => {
              checkCount++;

              if (socket.getStatus().connected) {
                clearInterval(checkConnection);
                resolve();
              } else if (checkCount >= maxChecks) {
                clearInterval(checkConnection);
                reject(new Error("Socket连接超时"));
              }
            }, 100);
          });

          // 设置当前房间信息，用于重连时自动重新加入
          socket.setCurrentRoom(roomId, authStore.user?.id);

          // 重新加入房间
          socket.emit("user_join", {
            userId: authStore.user?.id,
            roomId: roomId,
          });

          console.log("路由守卫: 已重新连接游戏房间", {
            roomId,
            userId: authStore.user?.id,
          });
        } catch (error) {
          console.error("路由守卫: Socket重连失败", error);
        }
      }
    }

    next();
  } else {
    // 对于不需要认证的路由，直接通过
    next();
  }
});

export default router;
