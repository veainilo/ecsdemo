import { Entity, EntityId, IComponent, IQuery, ISystem, QueryBuilder, SystemGroupType } from "./Types";
import { EntityManager } from "./EntityManager";
import { SystemManager } from "./SystemManager";

/**
 * ECS世界
 * 整合实体管理器和系统管理器，提供统一的接口
 */
export class World {
    private entityManager: EntityManager;
    private systemManager: SystemManager;

    constructor() {
        this.entityManager = new EntityManager(this);
        this.systemManager = new SystemManager(this);
    }

    /**
     * 创建实体
     */
    createEntity(): Entity {
        return this.entityManager.createEntity();
    }

    /**
     * 销毁实体
     */
    destroyEntity(entity: Entity): void {
        this.entityManager.destroyEntity(entity);
    }

    /**
     * 添加组件
     */
    addComponent<T extends IComponent>(entity: Entity, component: T): void {
        this.entityManager.addComponent(entity, component);
    }

    /**
     * 移除组件
     */
    removeComponent(entity: Entity, componentType: string): void {
        this.entityManager.removeComponent(entity, componentType);
    }

    /**
     * 获取组件
     */
    getComponent<T extends IComponent>(entity: Entity, componentType: string): T | undefined {
        return this.entityManager.getComponent<T>(entity, componentType);
    }

    /**
     * 检查实体是否有组件
     */
    hasComponent(entity: Entity, componentType: string): boolean {
        return this.entityManager.hasComponent(entity, componentType);
    }

    /**
     * 创建查询构建器
     */
    createQuery(): QueryBuilder {
        return new QueryBuilder();
    }

    /**
     * 查询实体
     */
    query(query: IQuery): Entity[] {
        return this.entityManager.query(query);
    }

    /**
     * 注册系统
     */
    registerSystem(system: ISystem): void {
        this.systemManager.addSystem({
            name: system.constructor.name,
            group: SystemGroupType.CORE
        }, system);
    }

    /**
     * 注销系统
     */
    unregisterSystem(system: ISystem): void {
        this.systemManager.removeSystem(system.constructor.name);
    }

    /**
     * 更新世界
     */
    update(deltaTime: number): void {
        this.systemManager.update(deltaTime);
    }

    /**
     * 获取实体管理器
     */
    getEntityManager(): EntityManager {
        return this.entityManager;
    }

    /**
     * 获取系统管理器
     */
    getSystemManager(): SystemManager {
        return this.systemManager;
    }
} 