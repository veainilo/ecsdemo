import { World } from './ECS/World';
import { SystemGroup } from './ECS/SystemGroup';
import { Position, Velocity, Circle } from './components';

// 创建世界实例
const world = new World();

// 创建系统组
const mainGroup = new SystemGroup();

// 移动系统
const movementSystem = (world: World) => {
  const entities = world.getEntitiesWith(['position', 'velocity']);
  
  entities.forEach(entity => {
    const position = world.getComponent<Position>(entity, 'position');
    const velocity = world.getComponent<Velocity>(entity, 'velocity');
    
    position.x += velocity.vx;
    position.y += velocity.vy;
  });
};

// 边界碰撞系统
const bounceSystem = (world: World) => {
  const entities = world.getEntitiesWith(['position', 'velocity', 'circle']);
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const width = canvas.width;
  const height = canvas.height;

  entities.forEach(entity => {
    const position = world.getComponent<Position>(entity, 'position');
    const velocity = world.getComponent<Velocity>(entity, 'velocity');
    const circle = world.getComponent<Circle>(entity, 'circle');

    if (position.x - circle.radius <= 0 || position.x + circle.radius >= width) {
      velocity.vx *= -1;
      position.x = Math.max(circle.radius, Math.min(width - circle.radius, position.x));
    }

    if (position.y - circle.radius <= 0 || position.y + circle.radius >= height) {
      velocity.vy *= -1;
      position.y = Math.max(circle.radius, Math.min(height - circle.radius, position.y));
    }
  });
};

// 渲染系统
const renderSystem = (world: World) => {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const entities = world.getEntitiesWith(['position', 'circle']);
  
  entities.forEach(entity => {
    const position = world.getComponent<Position>(entity, 'position');
    const circle = world.getComponent<Circle>(entity, 'circle');
    
    ctx.beginPath();
    ctx.arc(position.x, position.y, circle.radius, 0, Math.PI * 2);
    ctx.fillStyle = circle.color;
    ctx.fill();
    ctx.closePath();
  });
};

// 添加系统到系统组
mainGroup.addSystem(movementSystem);
mainGroup.addSystem(bounceSystem);
mainGroup.addSystem(renderSystem);

// 创建小球
function createBall(x: number, y: number, vx: number, vy: number, radius: number, color: string) {
  const entity = world.createEntity();
  world.addComponent(entity, 'position', { x, y });
  world.addComponent(entity, 'velocity', { vx, vy });
  world.addComponent(entity, 'circle', { radius, color });
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
  function gameLoop() {
    mainGroup.update(world);
    requestAnimationFrame(gameLoop);
  }
  
  gameLoop();
}

// 启动程序
init(); 