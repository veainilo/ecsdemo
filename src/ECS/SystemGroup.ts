import { ISystem, ISystemGroup, SystemGroupType, SystemPriority } from './Types';

/**
 * 系统组实现类
 */
export class SystemGroup implements ISystemGroup {
    private _systems: Map<string, ISystem> = new Map();
    private _enabled: boolean = true;

    constructor(
        public readonly type: SystemGroupType,
        public readonly priority: SystemPriority
    ) {}

    get systems(): Map<string, ISystem> {
        return this._systems;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        this._enabled = value;
    }

    addSystem(name: string, system: ISystem): void {
        if (this._systems.has(name)) {
            console.warn(`系统 ${name} 已存在于组 ${this.type} 中，将被覆盖`);
        }
        this._systems.set(name, system);
    }

    removeSystem(name: string): void {
        this._systems.delete(name);
    }

    getSystem(name: string): ISystem | undefined {
        return this._systems.get(name);
    }

    enable(): void {
        this._enabled = true;
    }

    disable(): void {
        this._enabled = false;
    }

    update(deltaTime: number): void {
        if (!this._enabled) return;

        // 按优先级排序系统
        const sortedSystems = Array.from(this._systems.entries())
            .sort(([, a], [, b]) => {
                const priorityA = (a as any).priority ?? SystemPriority.NORMAL;
                const priorityB = (b as any).priority ?? SystemPriority.NORMAL;
                return priorityB - priorityA;
            });

        // 更新所有系统
        for (const [, system] of sortedSystems) {
            system.update(deltaTime);
        }
    }
} 