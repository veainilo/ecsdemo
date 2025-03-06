import { ISystem, SystemPriority, ISystemGroup, SystemGroupType, ISystemConfig } from './Types';
import { SystemGroup } from './SystemGroup';
import { World } from './World';

/**
 * 系统管理器
 */
export class SystemManager {
    private groups: Map<SystemGroupType, ISystemGroup> = new Map();
    private systemToGroup: Map<string, SystemGroupType> = new Map();

    constructor(private world: World) {
        // 初始化默认系统组
        this.initDefaultGroups();
    }

    private initDefaultGroups(): void {
        // 初始化所有系统组
        Object.values(SystemGroupType).forEach(type => {
            const priority = this.getDefaultPriorityForGroup(type as SystemGroupType);
            this.registerGroup(new SystemGroup(type as SystemGroupType, priority));
        });
    }

    private getDefaultPriorityForGroup(type: SystemGroupType): SystemPriority {
        switch (type) {
            case SystemGroupType.CORE:
                return SystemPriority.HIGHEST;
            case SystemGroupType.COMBAT:
            case SystemGroupType.PHYSICS:
                return SystemPriority.HIGH;
            case SystemGroupType.MOVEMENT:
            case SystemGroupType.AI:
                return SystemPriority.NORMAL;
            case SystemGroupType.VISUAL:
            case SystemGroupType.UI:
            case SystemGroupType.AUDIO:
                return SystemPriority.LOW;
            default:
                return SystemPriority.NORMAL;
        }
    }

    /**
     * 注册系统组
     */
    registerGroup(group: ISystemGroup): void {
        this.groups.set(group.type, group);
    }

    /**
     * 添加系统
     */
    addSystem(config: ISystemConfig, system: ISystem): void {
        const group = this.groups.get(config.group);
        if (!group) {
            console.error(`系统组 ${config.group} 不存在`);
            return;
        }

        // 初始化系统
        if (system.init) {
            system.init(this.world);
        }

        // 设置系统优先级
        if (config.priority !== undefined) {
            (system as any).priority = config.priority;
        }

        // 添加到组
        group.addSystem(config.name, system);
        this.systemToGroup.set(config.name, config.group);

        // 设置启用状态
        if (config.enabled === false) {
            group.disable();
        }
    }

    /**
     * 移除系统
     */
    removeSystem(systemName: string): void {
        const groupType = this.systemToGroup.get(systemName);
        if (groupType) {
            const group = this.groups.get(groupType);
            if (group) {
                group.removeSystem(systemName);
            }
            this.systemToGroup.delete(systemName);
        }
    }

    /**
     * 获取系统
     */
    getSystem<T extends ISystem>(systemName: string): T | undefined {
        const groupType = this.systemToGroup.get(systemName);
        if (groupType) {
            const group = this.groups.get(groupType);
            if (group) {
                return group.getSystem(systemName) as T;
            }
        }
        return undefined;
    }

    /**
     * 启用/禁用系统组
     */
    setGroupEnabled(groupType: SystemGroupType, enabled: boolean): void {
        const group = this.groups.get(groupType);
        if (group) {
            enabled ? group.enable() : group.disable();
        }
    }

    /**
     * 更新所有系统
     */
    update(deltaTime: number): void {
        // 按优先级排序更新系统组
        const sortedGroups = Array.from(this.groups.values())
            .sort((a, b) => b.priority - a.priority);

        for (const group of sortedGroups) {
            group.update(deltaTime);
        }
    }
} 