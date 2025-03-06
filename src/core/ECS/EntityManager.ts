import { ComponentType, Entity, EntityId, IComponent, IQuery } from "./Types";
import { World } from "./World";

/**
 * 实体管理器
 * 负责实体的创建、销毁和组件管理
 */
export class EntityManager {
    private nextEntityId: EntityId = 0;
    private entities: Map<EntityId, Entity> = new Map();
    private entityComponents: Map<EntityId, Map<ComponentType, IComponent>> = new Map();
    private componentEntities: Map<ComponentType, Set<EntityId>> = new Map();

    constructor(private world: World) {}

    /**
     * 创建一个新实体
     */
    createEntity(): Entity {
        const entityId = this.nextEntityId++;
        const entity = new Entity(entityId, this.world);
        this.entities.set(entityId, entity);
        this.entityComponents.set(entityId, new Map());
        return entity;
    }

    /**
     * 销毁实体
     */
    destroyEntity(entity: Entity): void {
        const entityId = entity.getId();
        if (!this.entities.has(entityId)) {
            return;
        }

        // 移除实体的所有组件
        const components = this.entityComponents.get(entityId);
        if (components) {
            for (const [type] of components) {
                this.removeComponent(entity, type);
            }
        }

        // 清理实体数据
        this.entities.delete(entityId);
        this.entityComponents.delete(entityId);
    }

    /**
     * 添加组件
     */
    addComponent(entity: Entity, component: IComponent): void {
        const entityId = entity.getId();
        if (!this.entities.has(entityId)) {
            throw new Error(`Entity ${entityId} does not exist`);
        }

        const components = this.entityComponents.get(entityId)!;
        if (components.has(component.type)) {
            throw new Error(`Entity ${entityId} already has component of type ${component.type}`);
        }

        // 添加组件到实体
        components.set(component.type, component);

        // 更新组件索引
        let entities = this.componentEntities.get(component.type);
        if (!entities) {
            entities = new Set();
            this.componentEntities.set(component.type, entities);
        }
        entities.add(entityId);
    }

    /**
     * 移除组件
     */
    removeComponent(entity: Entity, type: ComponentType): void {
        const entityId = entity.getId();
        const components = this.entityComponents.get(entityId);
        if (!components || !components.has(type)) {
            return;
        }

        // 从实体移除组件
        components.delete(type);

        // 更新组件索引
        const entities = this.componentEntities.get(type);
        if (entities) {
            entities.delete(entityId);
            if (entities.size === 0) {
                this.componentEntities.delete(type);
            }
        }
    }

    /**
     * 获取组件
     */
    getComponent<T extends IComponent>(entity: Entity, type: ComponentType): T | undefined {
        const components = this.entityComponents.get(entity.getId());
        return components?.get(type) as T | undefined;
    }

    /**
     * 查询实体
     */
    query(query: IQuery): Entity[] {
        if (query.types.length === 0) {
            return Array.from(this.entities.values());
        }

        // 找到包含组件最少的集合作为起点
        let minEntities: Set<EntityId> | undefined;
        let minSize = Infinity;

        for (const type of query.types) {
            const entities = this.componentEntities.get(type);
            if (!entities) {
                return [];
            }
            if (entities.size < minSize) {
                minEntities = entities;
                minSize = entities.size;
            }
        }

        if (!minEntities) {
            return [];
        }

        // 过滤出匹配的实体
        return Array.from(minEntities)
            .map(id => this.entities.get(id)!)
            .filter(entity => query.match(entity));
    }

    /**
     * 检查实体是否存在
     */
    hasEntity(entity: Entity): boolean {
        return this.entities.has(entity.getId());
    }

    /**
     * 检查实体是否有指定组件
     */
    hasComponent(entity: Entity, type: ComponentType): boolean {
        return this.entityComponents.get(entity.getId())?.has(type) ?? false;
    }

    /**
     * 获取实体
     */
    getEntity(entityId: EntityId): Entity | undefined {
        return this.entities.get(entityId);
    }
} 