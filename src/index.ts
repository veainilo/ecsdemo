import { World } from './ECS/World';
import { SystemGroup } from './ECS/SystemGroup';
import { Position, Velocity, Circle } from './components';
import { SystemGroupType, SystemPriority, ISystem, QueryBuilder } from './ECS/Types';

// 创建世界实例
const world = new World();

// 创建系统组
const mainGroup = new SystemGroup(SystemGroupType.CUSTOM, SystemPriority.NORMAL);

// 移动系统
class MovementSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private query = new QueryBuilder()
    .with('position')
    .with('velocity')
    .build();

  update(deltaTime: number): void {
    const entities = world.query(this.query);
    
    entities.forEach(entity => {
      const position = entity.getComponent<Position>('position');
      const velocity = entity.getComponent<Velocity>('velocity');
      
      if (position && velocity) {
        position.x += velocity.vx;
        position.y += velocity.vy;
      }
    });
  }
}

// 边界碰撞系统
class BounceSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private query = new QueryBuilder()
    .with('position')
    .with('velocity')
    .with('circle')
    .build();

  update(deltaTime: number): void {
    const entities = world.query(this.query);
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const width = canvas.width;
    const height = canvas.height;

    entities.forEach(entity => {
      const position = entity.getComponent<Position>('position');
      const velocity = entity.getComponent<Velocity>('velocity');
      const circle = entity.getComponent<Circle>('circle');

      if (position && velocity && circle) {
        if (position.x - circle.radius <= 0 || position.x + circle.radius >= width) {
          velocity.vx *= -1;
          position.x = Math.max(circle.radius, Math.min(width - circle.radius, position.x));
        }

        if (position.y - circle.radius <= 0 || position.y + circle.radius >= height) {
          velocity.vy *= -1;
          position.y = Math.max(circle.radius, Math.min(height - circle.radius, position.y));
        }
      }
    });
  }
}

// 渲染系统
class RenderSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private query = new QueryBuilder()
    .with('position')
    .with('circle')
    .build();

  update(deltaTime: number): void {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const entities = world.query(this.query);
    
    entities.forEach(entity => {
      const position = entity.getComponent<Position>('position');
      const circle = entity.getComponent<Circle>('circle');
      
      if (position && circle) {
        ctx.beginPath();
        ctx.arc(position.x, position.y, circle.radius, 0, Math.PI * 2);
        ctx.fillStyle = circle.color;
        ctx.fill();
        ctx.closePath();
      }
    });
  }
}

// 添加系统到系统组
mainGroup.addSystem('movement', new MovementSystem());
mainGroup.addSystem('bounce', new BounceSystem());
mainGroup.addSystem('render', new RenderSystem());

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