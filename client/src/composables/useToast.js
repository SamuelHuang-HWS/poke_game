// client/src/composables/useToast.js
import { ref } from 'vue';

const toasts = ref([]);
let toastId = 0;

export function useToast() {
    const add = (message, type = 'info', duration = 3000) => {
        const id = toastId++;
        const toast = {
            id,
            message,
            type,
            duration
        };

        toasts.value.push(toast);

        if (duration > 0) {
            setTimeout(() => {
                remove(id);
            }, duration);
        }

        return id;
    };

    const remove = (id) => {
        const index = toasts.value.findIndex(t => t.id === id);
        if (index !== -1) {
            toasts.value.splice(index, 1);
        }
    };

    const success = (message, duration = 3000) => add(message, 'success', duration);
    const error = (message, duration = 4000) => add(message, 'error', duration);
    const info = (message, duration = 3000) => add(message, 'info', duration);
    const warning = (message, duration = 3000) => add(message, 'warning', duration);

    return {
        toasts,
        add,
        remove,
        success,
        error,
        info,
        warning
    };
}
