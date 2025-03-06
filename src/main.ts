import { World } from './core/ECS/World';
import { SystemGroup } from './core/ECS/SystemGroup';
import { SystemGroupType, SystemPriority } from './core/ECS/Types';
import { Position, Velocity, Circle } from './components';
import { MovementSystem, BounceSystem, RenderSystem } from './systems';

// 创建世界实例
const world = new World();

// 创建系统组
const mainGroup = new SystemGroup(SystemGroupType.CUSTOM, SystemPriority.NORMAL);

// 添加系统到系统组
mainGroup.addSystem('movement', new MovementSystem(world));
mainGroup.addSystem('bounce', new BounceSystem(world));
mainGroup.addSystem('render', new RenderSystem(world));

// 创建小球
function createBall(x: number, y: number, vx: number, vy: number, radius: number, color: string) {
  const entity = world.createEntity();
  entity.addComponent<Position>({ type: 'position', x, y });
  entity.addComponent<Velocity>({ type: 'velocity', vx, vy });
  entity.addComponent<Circle>({ type: 'circle', radius, color });
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
  
  // 创建多个小球
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'];
  for (let i = 0; i < 50; i++) {
    const radius = Math.random() * 10 + 5;
    const x = Math.random() * (canvas.width - radius * 2) + radius;
    const y = Math.random() * (canvas.height - radius * 2) + radius;
    const vx = (Math.random() - 0.5) * 5;
    const vy = (Math.random() - 0.5) * 5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    createBall(x, y, vx, vy, radius, color);
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

// 启动程序
init(); 