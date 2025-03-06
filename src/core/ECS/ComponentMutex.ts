import { ComponentType, Entity } from './Types';

/**
 * 组件互斥组管理器
 */
export class ComponentMutex {
    private mutexGroups: Map<string, Set<ComponentType>> = new Map();

    /**
     * 注册互斥组
     * @param groupName 互斥组名称
     * @param components 互斥的组件类型列表
     */
    registerMutexGroup(groupName: string, components: ComponentType[]): void {
        this.mutexGroups.set(groupName, new Set(components));
    }

    /**
     * 检查组件是否可以添加到实体
     * @param entity 目标实体
     * @param componentType 要添加的组件类型
     * @returns 是否可以添加
     */
    canAddComponent(entity: Entity, componentType: ComponentType): boolean {
        for (const [_, components] of this.mutexGroups) {
            if (components.has(componentType)) {
                // 检查实体是否已经有该互斥组中的其他组件
                for (const mutexType of components) {
                    if (mutexType !== componentType && entity.hasComponent(mutexType)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * 获取与指定组件互斥的组件类型
     * @param componentType 组件类型
     * @returns 互斥的组件类型列表
     */
    getMutexComponents(componentType: ComponentType): ComponentType[] {
        const mutexComponents: ComponentType[] = [];
        for (const [_, components] of this.mutexGroups) {
            if (components.has(componentType)) {
                components.forEach(type => {
                    if (type !== componentType) {
                        mutexComponents.push(type);
                    }
                });
            }
        }
        return mutexComponents;
    }
}

// 预定义的互斥组
export const DEFAULT_MUTEX_GROUPS = {
    // 运动相关互斥组
    MOTION: new Set([
        'unit',           // 单位（可控制移动）
        'projectile',     // 投射物
        'stationary'      // 固定物体
    ]),

    // 目标相关互斥组
    TARGET: new Set([
        'unit',              // 可被攻击的单位
        'projectile_effect', // 投射物效果（如虚拟目标）
        'structure'          // 建筑物
    ]),

    // 控制相关互斥组
    CONTROL: new Set([
        'player_controlled',  // 玩家控制
        'ai_controlled',      // AI控制
        'script_controlled'   // 脚本控制
    ]),

    // 碰撞相关互斥组
    COLLISION: new Set([
        'solid',             // 实体碰撞
        'trigger',           // 触发器
        'ghost'             // 无碰撞
    ]),

    // 生命周期互斥组
    LIFECYCLE: new Set([
        'permanent',         // 永久存在
        'temporary',         // 临时存在
        'timed'             // 定时销毁
    ])
}; 