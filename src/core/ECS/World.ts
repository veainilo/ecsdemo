import { Entity, EntityId, IComponent, IQuery, ISystem, QueryBuilder, SystemGroupType, ComponentType } from "./Types";
import { EntityManager } from "./EntityManager";
import { SystemManager } from "./SystemManager";
import { ComponentMutex, DEFAULT_MUTEX_GROUPS } from './ComponentMutex';

/**
 * ECS世界
 * 整合实体管理器和系统管理器，提供统一的接口
 */
export class World {
    private entityManager: EntityManager;
    private systemManager: SystemManager;
    private entities: Set<Entity> = new Set();
    private componentMutex: ComponentMutex;
    private nextEntityId = 1;

    constructor() {
        this.entityManager = new EntityManager(this);
        this.systemManager = new SystemManager(this);
        this.componentMutex = new ComponentMutex();
        // 注册默认互斥组
        Object.entries(DEFAULT_MUTEX_GROUPS).forEach(([groupName, components]) => {
            this.componentMutex.registerMutexGroup(groupName, Array.from(components));
        });
    }

    /**
     * 创建实体
     */
    createEntity(): Entity {
        const entity = this.entityManager.createEntity();
        this.entities.add(entity);
        return entity;
    }

    /**
     * 销毁实体
     */
    destroyEntity(entity: Entity): void {
        this.entities.delete(entity);
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

    canAddComponent(entity: Entity, componentType: ComponentType): boolean {
        return this.componentMutex.canAddComponent(entity, componentType);
    }

    getMutexComponents(componentType: ComponentType): ComponentType[] {
        return this.componentMutex.getMutexComponents(componentType);
    }
} 