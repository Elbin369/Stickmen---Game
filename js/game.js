/**
 * GameManager - Core Game Loop & State Orchestrator
 * Coordinates background, entities, controls, particles, audio, and waves.
 */
class GameManager {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Set virtual resolution
        this.canvas.width = 800;
        this.canvas.height = 375;
        this.groundY = 340;

        // Game state
        this.state = 'start'; // 'start', 'active', 'paused', 'gameover'
        this.score = 0;
        this.kills = 0;

        // Wave management
        this.wave = 1;
        this.enemies = [];
        this.bullets = [];
        this.grenades = [];
        this.enemyArrows = [];
        this.activeArrowShower = []; // Arrow storm logic
        this.waveTimer = 0;
        this.waveActive = false;
        this.enemiesToSpawn = [];
        this.spawnTimer = 0;
        this.spawnDelay = 90; // frames between spawns

        // Gameplay timing
        this.shootCooldown = 0;
        this.screenShakeTime = 0;

        // Entities
        this.tower = new Tower(400, this.groundY);
        this.player = new PlayerStickman(400, this.groundY - this.tower.height);

        // Core systems
        this.background = new BackgroundManager(this.canvas, this.ctx);
        this.particles = new ParticleSystem();
    }

    /**
     * Bootstraps the game loop and UI actions
     */
    init() {
        // Init input controls
        controls.init(this.canvas);

        // Resize / layout adjustment
        this.background.init();

        // Bind Start, Pause, Resume, Restart buttons
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('resume-game-btn').addEventListener('click', () => this.togglePause());

        // Listen for window resize
        window.addEventListener('resize', () => this.background.init());

        // Kickoff game loop
        this.loop();
    }

    /**
     * Start/Restart Game State transition
     */
    startGame() {
        audio.init(); // Initialize audio synth context
        audio.playClick();

        // Hide overlays
        document.getElementById('start-overlay').classList.add('hidden');
        document.getElementById('game-over-overlay').classList.add('hidden');
        document.getElementById('pause-overlay').classList.add('hidden');

        // Reset statistics
        this.score = 0;
        this.kills = 0;
        this.wave = 1;
        this.enemies = [];
        this.bullets = [];
        this.grenades = [];
        this.enemyArrows = [];
        this.activeArrowShower = [];
        this.enemiesToSpawn = [];
        this.spawnTimer = 0;
        this.shootCooldown = 0;
        this.screenShakeTime = 0;

        // Reset tower & controls
        this.tower.health = 100;
        this.tower.takeDamage(0); // updates UI health bar
        controls.reset();

        // Set wave stats
        this.state = 'active';
        this.startWave();
    }

    /**
     * Toggle game pause
     */
    togglePause() {
        if (this.state === 'active') {
            audio.playClick();
            this.state = 'paused';
            document.getElementById('pause-overlay').classList.remove('hidden');
        } else if (this.state === 'paused') {
            audio.playClick();
            this.state = 'active';
            document.getElementById('pause-overlay').classList.add('hidden');
        }
    }

    /**
     * Trigger Game Over
     */
    triggerGameOver() {
        this.state = 'gameover';
        audio.playGameOver();

        // Update score HUD
        document.getElementById('final-waves').textContent = this.wave - 1;
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-kills').textContent = this.kills;

        // Show Game Over panel
        document.getElementById('game-over-overlay').classList.remove('hidden');
    }

    /**
     * Spawns current wave configuration
     */
    startWave() {
        this.waveActive = true;
        this.enemiesToSpawn = [];
        this.spawnTimer = 0;

        audio.playWaveStart();

        // Wave formula: base 6 swarms + wave difficulty scaling
        const swarmerCount = 6 + this.wave * 4;
        const shieldCount = Math.max(0, -2 + this.wave * 2);
        const archerCount = Math.max(0, -3 + this.wave * 2);

        // Queue swarmers
        for (let i = 0; i < swarmerCount; i++) this.enemiesToSpawn.push('swarmer');
        // Queue shield tanks
        for (let i = 0; i < shieldCount; i++) this.enemiesToSpawn.push('shield');
        // Queue archers
        for (let i = 0; i < archerCount; i++) this.enemiesToSpawn.push('archer');

        // Shuffle spawn queue to mix enemy types
        this.enemiesToSpawn.sort(() => Math.random() - 0.5);

        // Adjust delay between spawns
        this.spawnDelay = Math.max(25, 90 - this.wave * 8);

        // Update UI
        document.getElementById('wave-number').textContent = `WAVE ${this.wave}`;
        this.updateRemainingHUD();
    }

    updateRemainingHUD() {
        const remaining = this.enemiesToSpawn.length + this.enemies.filter(e => !e.isDying).length;
        document.getElementById('enemies-remaining').textContent = `Enemies Left: ${remaining}`;
    }

    /**
     * Main 60fps Loop
     */
    loop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    /**
     * Logic Updates
     */
    update() {
        if (this.state !== 'active') return;

        // 1. Process keyboard & controls ticks
        controls.updateCooldowns();
        if (this.shootCooldown > 0) this.shootCooldown--;

        // 2. Wave Spawning
        if (this.waveActive) {
            this.spawnTimer--;
            if (this.spawnTimer <= 0 && this.enemiesToSpawn.length > 0) {
                const nextType = this.enemiesToSpawn.pop();
                const side = Math.random() > 0.5 ? 'left' : 'right';
                this.enemies.push(new Enemy(side, nextType, this.groundY));
                
                this.spawnTimer = this.spawnDelay;
                this.updateRemainingHUD();
            }

            // Check wave cleared (all spawned & dead)
            if (this.enemiesToSpawn.length === 0 && this.enemies.length === 0) {
                this.waveActive = false;
                this.waveTimer = 180; // 3 seconds delay before next wave
                audio.playWaveComplete();
            }
        } else {
            // Countdown to next wave
            this.waveTimer--;
            if (this.waveTimer <= 0) {
                this.wave++;
                this.startWave();
            }
        }

        // 3. Auto-Aiming fallback - Controlled by toggle button
        // If joystick/keyboard is idle and auto aim is enabled, target the nearest non-dying enemy
        if (controls.autoAimEnabled && !controls.joystickActive && !Object.values(controls.keys).some(v => v)) {
            let nearestEnemy = null;
            let minDist = Infinity;
            const playerX = 400;

            for (let enemy of this.enemies) {
                if (enemy.isDying) continue;
                const dist = Math.abs(enemy.x - playerX);
                if (dist < minDist) {
                    minDist = dist;
                    nearestEnemy = enemy;
                }
            }

            if (nearestEnemy) {
                const targetY = nearestEnemy.y - 18; // Aim at chest
                const dx = nearestEnemy.x - playerX;
                const dy = targetY - (this.groundY - this.tower.height - 18);
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > 0) {
                    controls.aimDir.x = dx / d;
                    controls.aimDir.y = dy / d;
                }
            }
        }

        // 4. Casting instant Skills
        // A. Grenade Launcher
        if (controls.cast_grenade) {
            controls.cast_grenade = false;
            // Spawn grenade
            const barrelX = 400 + controls.aimDir.x * 26;
            const barrelY = (this.groundY - this.tower.height - 18) + controls.aimDir.y * 26;
            
            const g = new Grenade(barrelX, barrelY, controls.aimDir.x, controls.aimDir.y);
            // Explosion logic callback
            g.onExplode = (x, y, radius, damage) => {
                this.screenShakeTime = 16;
                this.particles.addExplosion(x, y, radius);
                audio.playExplosion();

                // Deal damage in area
                for (let enemy of this.enemies) {
                    if (enemy.isDying) continue;
                    const dist = Math.sqrt((enemy.x - x)**2 + (enemy.y - y)**2);
                    if (dist <= radius) {
                        const pushDir = enemy.x < x ? -1.8 : 1.8;
                        const kill = enemy.takeDamage(damage, pushDir, -1);
                        if (kill) this.onEnemyKill(enemy);
                    }
                }
                this.updateRemainingHUD();
            };
            this.grenades.push(g);
        }

        // B. Arrow Storm
        if (controls.cast_arrows) {
            controls.cast_arrows = false;
            
            // Queue 30 random falling arrows inside dynamic arrays
            for (let i = 0; i < 28; i++) {
                this.activeArrowShower.push({
                    x: Math.random() * 800,
                    y: -Math.random() * 200,
                    vx: 1 + Math.random() * 2, // falling diagonally down-right
                    vy: 6 + Math.random() * 3,
                    damage: 16,
                    life: 120
                });
            }
            audio.playArrowStorm();
        }

        // C. Heal Spell
        if (controls.cast_heal) {
            controls.cast_heal = false;
            this.tower.heal(25);
            audio.playHeal();
            
            // Add green sparkle particles rising from doorway
            for (let i = 0; i < 25; i++) {
                this.particles.particles.push({
                    type: 'smoke', // reusable particle wrapper
                    x: 380 + Math.random() * 40,
                    y: this.groundY - 10 - Math.random() * 30,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: -(1.5 + Math.random() * 2), // rise up
                    radius: 4 + Math.random() * 5,
                    color: `rgba(${30 + Math.random() * 50}, 230, ${100 + Math.random() * 50}, 0.35)`,
                    life: 30 + Math.random() * 25,
                    maxLife: 60,
                    gravity: -0.02
                });
            }
        }

        // 5. Normal Shooting (Gatling Primary)
        if (controls.isShooting && this.shootCooldown === 0) {
            this.shootCooldown = 7; // Fast firing rate
            
            // Gun offset barrel coordinates
            const barrelX = 400 + controls.aimDir.x * 32;
            const barrelY = (this.groundY - this.tower.height - 4) + controls.aimDir.y * 32;

            audio.playShoot();
            this.player.triggerRecoil(controls.aimDir.x);
            
            // Add muzzle flash sparks
            this.particles.addMuzzleFlash(barrelX, barrelY, Math.atan2(controls.aimDir.y, controls.aimDir.x));

            // Create bullet
            const b = new Bullet(barrelX, barrelY, controls.aimDir.x, controls.aimDir.y);
            this.bullets.push(b);
            
            // Add screen shake recoil
            this.screenShakeTime = 2;
        }

        // 6. Update Entities & Particles
        this.tower.update();
        this.player.update();
        this.background.update(800, 375);
        this.particles.update(800, 375, this.groundY);

        // Update Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update(800, 375, this.groundY);

            if (!b.alive) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Bullet collision checking with enemies
            for (let enemy of this.enemies) {
                if (enemy.isDying) continue;

                // Simple box check (adjusted for silhouette size)
                const enemyChestY = enemy.y - 18;
                if (b.x >= enemy.x - 12 && b.x <= enemy.x + 12 && b.y >= enemy.y - 36 && b.y <= enemy.y + 4) {
                    
                    // Shield carrier reduces damage if bullets hit front face
                    let finalDmg = b.damage;
                    let block = false;
                    if (enemy.type === 'shield' && !enemy.isDying) {
                        const shieldFacingLeft = enemy.side === 'right'; // shield is in front
                        const bulletMovingRight = b.vx > 0;
                        if ((shieldFacingLeft && !bulletMovingRight) || (!shieldFacingLeft && bulletMovingRight)) {
                            finalDmg = b.damage * 0.15; // 85% block
                            block = true;
                        }
                    }

                    audio.playHit();
                    
                    // Add blood splatters or spark block splatters
                    if (block) {
                        // Steel sparks
                        this.particles.addMuzzleFlash(b.x, b.y, Math.atan2(b.vy, b.vx) + Math.PI, 4);
                    } else {
                        this.particles.addBlood(b.x, b.y, b.vx * 0.15, b.vy * 0.15, 6);
                    }

                    const killed = enemy.takeDamage(finalDmg, b.vx > 0 ? 1 : -1, b.vy > 0 ? 0.3 : -0.3);
                    if (killed) this.onEnemyKill(enemy);

                    b.alive = false;
                    this.bullets.splice(i, 1);
                    this.updateRemainingHUD();
                    break;
                }
            }
        }

        // Update Grenades
        for (let i = this.grenades.length - 1; i >= 0; i--) {
            const g = this.grenades[i];
            g.update(800, 375, this.groundY);
            if (!g.alive) {
                this.grenades.splice(i, 1);
            }
        }

        // Update Arrow Storm particles
        for (let i = this.activeArrowShower.length - 1; i >= 0; i--) {
            const arr = this.activeArrowShower[i];
            arr.x += arr.vx;
            arr.y += arr.vy;
            arr.life--;

            // Check hits
            let hit = false;
            for (let enemy of this.enemies) {
                if (enemy.isDying) continue;
                if (arr.x >= enemy.x - 14 && arr.x <= enemy.x + 14 && arr.y >= enemy.y - 30 && arr.y <= enemy.y) {
                    const killed = enemy.takeDamage(arr.damage, arr.vx, arr.vy * 0.1);
                    if (killed) this.onEnemyKill(enemy);
                    hit = true;
                    this.particles.addBlood(arr.x, arr.y, 0, 0, 4);
                    break;
                }
            }

            if (hit || arr.y >= this.groundY || arr.life <= 0) {
                // Add tiny ground splash
                this.activeArrowShower.splice(i, 1);
                this.updateRemainingHUD();
            }
        }

        // Update Enemy archer arrows
        for (let i = this.enemyArrows.length - 1; i >= 0; i--) {
            const arr = this.enemyArrows[i];
            // Tower Top center is 400, 205
            arr.update(400, 65, 205);

            if (!arr.alive) {
                if (arr.hitTower) {
                    this.tower.takeDamage(arr.damage);
                    audio.playHit();
                    
                    // Splatter sparks on tower hitting
                    this.particles.addMuzzleFlash(arr.x, arr.y, Math.PI / 2, 3);
                }
                this.enemyArrows.splice(i, 1);
                continue;
            }
        }

        // Update Enemy Actions & Tower Hits
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Pass lambda callbacks to enemy to handle Arrow Spawning
            enemy.update(400, 65, this.particles, (x, y, vx, vy) => {
                this.enemyArrows.push(new EnemyArrow(x, y, vx, vy));
            });

            // If enemy died and finished falling, remove it
            if (enemy.isDying && enemy.y >= this.groundY && Math.abs(enemy.deathVX) < 0.1) {
                this.enemies.splice(i, 1);
                continue;
            }

            // Melee Attack Tower contact check
            if (!enemy.isDying && enemy.type !== 'archer') {
                const targetX = enemy.side === 'left' ? 400 - 32.5 : 400 + 32.5;
                if (Math.abs(enemy.x - targetX) < 8) {
                    this.tower.takeDamage(enemy.damage);
                    
                    // Spawn tiny sparks/blood rub on contact
                    if (Math.random() > 0.8) {
                        this.particles.addBlood(targetX, this.groundY - 12, enemy.side === 'left' ? -1 : 1, -1, 2);
                    }
                }
            }
        }

        // 7. Check Game Over
        if (this.tower.health <= 0) {
            this.triggerGameOver();
        }
    }

    /**
     * Score & particle adjustments on enemy kill
     */
    onEnemyKill(enemy) {
        this.kills++;
        this.score += enemy.scoreVal;

        // Update score UI
        document.getElementById('score-value').textContent = this.score;
    }

    /**
     * Screen shake parallax math wrapper
     */
    applyScreenShake() {
        if (this.screenShakeTime > 0) {
            this.screenShakeTime--;
            
            // Random displacement vector
            const shakeMag = 3;
            const dx = (Math.random() - 0.5) * shakeMag;
            const dy = (Math.random() - 0.5) * shakeMag;
            
            this.background.cameraX = dx;
            this.background.cameraY = dy;
            this.ctx.translate(dx, dy);
        } else {
            this.background.cameraX = 0;
            this.background.cameraY = 0;
        }
    }

    /**
     * Rendering Cycle
     */
    render() {
        const ctx = this.ctx;
        ctx.save();

        // Apply screen shake translation if active
        this.applyScreenShake();

        // 1. Draw Background forest layers & mist
        this.background.render(800, 375);

        // 2. Draw Tower
        this.tower.render(ctx);

        // 3. Draw Player Stickman
        this.player.render(ctx, controls.aimDir);

        // 4. Draw Projectiles
        // Bullets
        ctx.save();
        for (let b of this.bullets) {
            // Draw bullet as a bright yellow glowing dot
            ctx.fillStyle = '#ffeb3b';
            ctx.shadowColor = '#ffb830';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Grenades
        for (let g of this.grenades) {
            g.render(ctx);
        }

        // Enemy Arrows
        for (let arr of this.enemyArrows) {
            arr.render(ctx);
        }

        // Arrow Storm lines
        ctx.save();
        ctx.strokeStyle = 'rgba(100, 160, 255, 0.7)';
        ctx.lineWidth = 1.2;
        for (let arr of this.activeArrowShower) {
            ctx.beginPath();
            ctx.moveTo(arr.x, arr.y);
            ctx.lineTo(arr.x - arr.vx * 1.5, arr.y - arr.vy * 1.5);
            ctx.stroke();
        }
        ctx.restore();

        // 5. Draw Enemies
        for (let enemy of this.enemies) {
            enemy.render(ctx);
        }

        // 6. Draw Particle Visual Effects
        this.particles.render(ctx);


        ctx.restore();
    }
}

// Instantiate and start game engine
window.addEventListener('DOMContentLoaded', () => {
    const game = new GameManager();
    game.init();
});
