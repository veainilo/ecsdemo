import { World } from "./World";

/**
 * 实体ID类型
 */
export type EntityId = number;

/**
 * 实体类
 */
export class Entity {
    constructor(
        private readonly id: EntityId,
        private readonly world: World
    ) { }

    /**
     * 获取实体ID
     */
    getId(): EntityId {
        return this.id;
    }

    /**
     * 添加组件
     */
    addComponent<T extends IComponent>(component: T): this {
        this.world.addComponent(this, component);
        return this;
    }

    /**
     * 移除组件
     */
    removeComponent(componentType: ComponentType): this {
        this.world.removeComponent(this, componentType);
        return this;
    }

    /**
     * 获取组件
     */
    getComponent<T extends IComponent>(componentType: ComponentType): T | undefined {
        return this.world.getComponent<T>(this, componentType);
    }

    /**
     * 检查是否有组件
     */
    hasComponent(componentType: ComponentType): boolean {
        return this.world.hasComponent(this, componentType);
    }

    /**
     * 销毁实体
     */
    destroy(): void {
        this.world.destroyEntity(this);
    }
}

/**
 * 组件类型
 */
export type ComponentType = string;

/**
 * 组件数据接口
 */
export interface IComponent {
    readonly type: ComponentType;
}

/**
 * 系统优先级
 */
export enum SystemPriority {
    HIGHEST = 0,
    HIGH = 1,
    NORMAL = 2,
    LOW = 3,
    LOWEST = 4
}

/**
 * 系统接口
 */
export interface ISystem {
    readonly priority: SystemPriority;
    init?(world: World): void;
    update(deltaTime: number): void;
    onEntityAdded?(entity: Entity): void;
    onEntityRemoved?(entity: Entity): void;
}

/**
 * 查询接口
 */
export interface IQuery {
    readonly types: ComponentType[];
    match(entity: Entity): boolean;
}

/**
 * 查询构建器
 */
export class QueryBuilder {
    private types: ComponentType[] = [];

    with(componentType: ComponentType): this {
        this.types.push(componentType);
        return this;
    }

    build(): IQuery {
        return {
            types: [...this.types],
            match: (entity: Entity) =>
                this.types.every(type => entity.hasComponent(type))
        };
    }
}

/**
 * 系统组类型
 */
export enum SystemGroupType {
    CORE = 'core',           // 核心系统
    COMBAT = 'combat',       // 战斗相关
    MOVEMENT = 'movement',   // 移动相关
    AI = 'ai',              // AI相关
    VISUAL = 'visual',      // 视觉相关
    PHYSICS = 'physics',    // 物理相关
    NETWORK = 'network',    // 网络相关
    UI = 'ui',              // UI相关
    AUDIO = 'audio',        // 音频相关
    CUSTOM = 'custom'       // 自定义组
}

/**
 * 系统组接口
 */
export interface ISystemGroup {
    readonly type: SystemGroupType;
    readonly priority: SystemPriority;
    readonly systems: Map<string, ISystem>;
    enabled: boolean;

    addSystem(name: string, system: ISystem): void;
    removeSystem(name: string): void;
    getSystem(name: string): ISystem | undefined;
    enable(): void;
    disable(): void;
    update(deltaTime: number): void;
}

/**
 * 系统配置接口
 */
export interface ISystemConfig {
    name: string;
    group: SystemGroupType;
    priority?: SystemPriority;
    enabled?: boolean;
} 