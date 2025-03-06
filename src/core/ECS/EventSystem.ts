import { ISystem, SystemPriority } from './Types';

export class EventSystem implements ISystem {
    priority = SystemPriority.HIGH;
    private listeners: Map<string, Set<(event: any) => void>> = new Map();

    emit(eventType: string, data: any): void {
        const handlers = this.listeners.get(eventType);
        handlers?.forEach(handler => handler(data));
    }

    on(eventType: string, handler: (event: any) => void): void {
        let handlers = this.listeners.get(eventType);
        if (!handlers) {
            handlers = new Set();
            this.listeners.set(eventType, handlers);
        }
        handlers.add(handler);
    }

    off(eventType: string, handler: (event: any) => void): void {
        const handlers = this.listeners.get(eventType);
        handlers?.delete(handler);
        if (handlers?.size === 0) {
            this.listeners.delete(eventType);
        }
    }

    update(): void {
        // 事件系统不需要每帧更新
    }
} 