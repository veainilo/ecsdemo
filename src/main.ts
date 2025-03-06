import { World } from './core/ECS/World';
import { SystemGroup } from './core/ECS/SystemGroup';
import { SystemGroupType, SystemPriority, Entity, QueryBuilder } from './core/ECS/Types';
import { Position, Velocity, Unit, Sprite } from './components';
import {
    MovementSystem,
    PlayerControlSystem,
    AIControlSystem,
    CombatSystem,
    RenderSystem,
    SkillSystem
} from './systems';
import { EventSystem } from './core/ECS/EventSystem';
import { ProjectileSystem } from './systems/ProjectileSystem';
import { TornadoSystem } from './systems/TornadoSystem';

// 创建世界实例
const world = new World();

// 创建系统组
const mainGroup = new SystemGroup(SystemGroupType.CUSTOM, SystemPriority.NORMAL);

// 创建事件系统
const eventSystem = new EventSystem();

// 创建技能系统
const skillSystem = new SkillSystem(world);

// 创建投射物系统
const projectileSystem = new ProjectileSystem(world, eventSystem);

// 添加系统到系统组
mainGroup.addSystem('event', eventSystem);
mainGroup.addSystem('movement', new MovementSystem(world));
mainGroup.addSystem('player', new PlayerControlSystem(world));
mainGroup.addSystem('ai', new AIControlSystem(world));
mainGroup.addSystem('combat', new CombatSystem(world));
mainGroup.addSystem('skill', skillSystem);
mainGroup.addSystem('projectile', projectileSystem);
mainGroup.addSystem('tornado', new TornadoSystem(world));
mainGroup.addSystem('render', new RenderSystem(world));

// 创建单位
function createUnit(x: number, y: number, isPlayer: boolean) {
    const entity = world.createEntity();
    entity.addComponent<Position>({ type: 'position', x, y });
    entity.addComponent<Velocity>({ type: 'velocity', vx: 0, vy: 0 });

    if (isPlayer) {
        entity.addComponent<Unit>({
            type: 'unit',
            health: 1000,
            maxHealth: 1000,
            attackRange: 200,
            attackCooldown: 1,
            currentCooldown: 0,
            speed: 3,
            isPlayer: true
        });
    }
    else {
        entity.addComponent<Unit>({
            type: 'unit',
            health: 100,
            maxHealth: 100,
            attackRange: 200,
            attackCooldown: 2,
            currentCooldown: 0,
            speed: 2,
            isPlayer: false
        });
    }


    entity.addComponent<Sprite>({
        type: 'sprite',
        width: 20,
        height: 20,
        color: isPlayer ? '#00FF00' : '#FF0000',
        rotation: 0
    });
    return entity;
}

// 初始化
function init() {
    // 创建画布
    const canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    // 创建玩家单位
    createUnit(canvas.width / 2, canvas.height / 2, true);

    // 创建AI单位
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        createUnit(x, y, false);
    }

    // 游戏循环
    let lastTime = performance.now();
    function gameLoop() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        mainGroup.update(deltaTime);
        requestAnimationFrame(gameLoop);
    }

    gameLoop();
}

// 重启游戏
function restartGame() {
    // 获取所有实体并销毁它们
    const entities = world.query(new QueryBuilder().build());
    entities.forEach(entity => {
        entity.destroy();
    });

    // 重新初始化游戏
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (canvas) {
        // 创建玩家单位
        createUnit(canvas.width / 2, canvas.height / 2, true);

        // 创建AI单位
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            createUnit(x, y, false);
        }
    }
}

// 监听单位死亡事件
eventSystem.on('unit_died', (data: { unit: Entity, killer: Entity }) => {
    const unit = data.unit.getComponent<Unit>('unit');
    if (unit?.isPlayer) {
        // 如果死亡的是玩家，立即重启游戏
        setTimeout(restartGame, 100); // 短暂延迟以确保死亡效果可见
    }
});

// 启动程序
init(); 