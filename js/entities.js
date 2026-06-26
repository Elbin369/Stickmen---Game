/**
 * EntitiesManager - Character & Projectile definitions
 * Implements stickman skeletal rendering, running cycles, AI behaviors, and projectile physics.
 */

// Global config for positioning
const GAME_HEIGHT = 400; // Virtual height of gameplay canvas
const GAME_WIDTH = 800;  // Virtual width of gameplay canvas

class Tower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 85; // Gameplay logic width
        this.height = 170; // Gameplay logic stone body height

        // Drawing size scaled to match stone body height of 170
        // Content ratio: total width 707, total height 1105, stone body height 890
        // Scaled height: 170 * (1105 / 890) = 211
        // Scaled width: 211 * (707 / 1105) = 135
        this.renderWidth = 135;
        this.renderHeight = 211;

        this.health = 100;
        this.maxHealth = 100;
        
        this.doorGlow = 0;
        this.flagWave = 0;

        // Tower Image with Chroma Key
        this.img = new Image();
        this.img.src = 'Tower.jpeg';
        this.imgLoaded = false;
        this.img.onload = () => {
            // Cut checkered background perfectly
            this.transparentCanvas = this.createChromaKey(this.img);
            this.imgLoaded = true;
        };
    }

    createChromaKey(img) {
        // Crop coordinates (from 960x1280 image to remove checkerboard margins):
        // Content bounds: X from 132 to 839 (width 707), Y from 81 to 1186 (height 1105)
        const sx = 132;
        const sy = 81;
        const sw = 707;
        const sh = 1105;

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        
        const imgData = ctx.getImageData(0, 0, sw, sh);
        const data = imgData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            
            // Silhouette pixels are very dark (R,G,B < 150)
            // Background checkered pixels are very light (R,G,B > 240)
            if (r < 150 && g < 150 && b < 150) {
                // Keep it, make it solid black/dark for clean silhouette edges
                data[i] = 2;
                data[i+1] = 2;
                data[i+2] = 2;
                data[i+3] = 255;
            } else {
                data[i+3] = 0; // Make checkered background transparent
            }
        }
        
        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        // Update DOM health bar
        const fill = document.getElementById('health-bar-fill');
        const text = document.getElementById('health-text');
        if (fill && text) {
            const percent = (this.health / this.maxHealth) * 100;
            fill.style.width = `${percent}%`;
            text.textContent = `${Math.ceil(this.health)}/${this.maxHealth}`;

            // Add warning classes based on HP
            fill.className = '';
            if (percent < 30) {
                fill.classList.add('danger');
            } else if (percent < 60) {
                fill.classList.add('warning');
            }
        }
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.takeDamage(0); // refresh UI
    }

    update() {
        // Door light pulse
        this.doorGlow += 0.05;
        
        // Flag wave speed (unused for image flag but kept for backwards compatibility)
        this.flagWave += 0.12;
    }

    render(ctx) {
        ctx.save();

        if (this.imgLoaded) {
            // Draw doorway glow underneath the tower first!
            // Proportional door: width 18, height 41, centered at bottom
            const doorW = 18;
            const doorH = 41;
            const doorX = this.x - doorW / 2;
            const doorY = this.y - doorH;
            
            // Outer light glow
            const glowRadius = 25 + Math.sin(this.doorGlow) * 4;
            const doorGlowGrad = ctx.createRadialGradient(this.x, doorY + doorH/2, 2, this.x, doorY + doorH/2, glowRadius);
            doorGlowGrad.addColorStop(0, 'rgba(255, 140, 0, 0.7)');
            doorGlowGrad.addColorStop(0.5, 'rgba(255, 69, 0, 0.3)');
            doorGlowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = doorGlowGrad;
            ctx.beginPath();
            ctx.arc(this.x, doorY + doorH/2, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            // Actual doorway warm color overlay (will show through transparent door cutout)
            ctx.fillStyle = 'rgba(255, 140, 0, 0.85)';
            ctx.beginPath();
            ctx.moveTo(doorX, this.y);
            ctx.lineTo(doorX, doorY + 8);
            ctx.quadraticCurveTo(this.x, doorY, doorX + doorW, doorY + 8);
            ctx.lineTo(doorX + doorW, this.y);
            ctx.closePath();
            ctx.fill();

            // Draw the transparent cropped tower image on top of the door glow
            const leftX = this.x - this.renderWidth / 2;
            const topY = this.y - this.renderHeight;
            ctx.drawImage(this.transparentCanvas, leftX, topY, this.renderWidth, this.renderHeight);
        } else {
            // Fallback: Draw central stone tower turret (Solid black/dark silhouette)
            ctx.fillStyle = '#050507';
            ctx.strokeStyle = '#151720';
            ctx.lineWidth = 2.5;

            const leftX = this.x - this.width / 2;
            const topY = this.y - this.height;

            ctx.beginPath();
            // Left side wall
            ctx.moveTo(leftX, this.y);
            ctx.lineTo(leftX + 5, topY + 20); // slight tapering
            ctx.lineTo(leftX - 8, topY + 20); // crenellation lip
            ctx.lineTo(leftX - 8, topY);
            
            // Battlements (top notches)
            ctx.lineTo(leftX + 2, topY);
            ctx.lineTo(leftX + 2, topY + 12);
            ctx.lineTo(leftX + 16, topY + 12);
            ctx.lineTo(leftX + 16, topY);
            
            ctx.lineTo(leftX + 29, topY);
            ctx.lineTo(leftX + 29, topY + 12);
            ctx.lineTo(leftX + 43, topY + 12);
            ctx.lineTo(leftX + 43, topY);
            
            ctx.lineTo(leftX + 56, topY);
            ctx.lineTo(leftX + 56, topY + 12);
            ctx.lineTo(leftX + 70, topY + 12);
            ctx.lineTo(leftX + 70, topY); // right outer crenellation
            
            ctx.lineTo(leftX + 80, topY);
            ctx.lineTo(leftX + 80, topY + 20);
            ctx.lineTo(leftX + 67, topY + 20);
            
            // Right side wall
            ctx.lineTo(leftX + 72, this.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2. Draw brick line highlights for premium texture
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            // Horizontal brick lines
            for (let rowY = topY + 30; rowY < this.y; rowY += 22) {
                const widthOffset = 5 * ((rowY - topY - 30) / (this.y - topY - 30));
                ctx.moveTo(leftX + widthOffset + 3, rowY);
                ctx.lineTo(leftX + 70 - widthOffset + 3, rowY);
            }
            ctx.stroke();

            // 3. Draw a hanging dark red banner in the middle
            ctx.fillStyle = '#660a0a';
            ctx.fillRect(this.x - 8, topY + 28, 16, 45);
            ctx.strokeStyle = '#220000';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x - 8, topY + 28, 16, 45);

            // 4. Glowing Doorway at the bottom center (yellow/orange warm light)
            const doorW = 24;
            const doorH = 36;
            const doorX = this.x - doorW / 2;
            const doorY = this.y - doorH;
            
            // Outer light glow
            const glowRadius = 25 + Math.sin(this.doorGlow) * 4;
            const doorGlowGrad = ctx.createRadialGradient(this.x, doorY + doorH/2, 2, this.x, doorY + doorH/2, glowRadius);
            doorGlowGrad.addColorStop(0, 'rgba(255, 140, 0, 0.65)');
            doorGlowGrad.addColorStop(0.5, 'rgba(255, 69, 0, 0.25)');
            doorGlowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = doorGlowGrad;
            ctx.beginPath();
            ctx.arc(this.x, doorY + doorH/2, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            // Actual doorway
            ctx.fillStyle = '#ff8c00';
            ctx.beginPath();
            ctx.moveTo(doorX, this.y);
            ctx.lineTo(doorX, doorY + 8);
            ctx.quadraticCurveTo(this.x, doorY, doorX + doorW, doorY + 8);
            ctx.lineTo(doorX + doorW, this.y);
            ctx.closePath();
            ctx.fill();

            // 5. Tall flag pole and waving red flag
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x, topY + 6);
            ctx.lineTo(this.x, topY - 50); // pole extending up
            ctx.stroke();

            // Waving flag polygon
            ctx.fillStyle = '#b31212';
            ctx.beginPath();
            ctx.moveTo(this.x, topY - 50);
            
            // Draw waving flag outline using sine wave
            const flagHeight = 15;
            const flagLength = 32;
            for (let fx = 0; fx <= flagLength; fx += 4) {
                const wave = Math.sin(this.flagWave + fx * 0.15) * 2.5;
                ctx.lineTo(this.x + fx, topY - 50 + wave);
            }
            for (let fx = flagLength; fx >= 0; fx -= 4) {
                const wave = Math.sin(this.flagWave + fx * 0.15) * 2.5;
                ctx.lineTo(this.x + fx, topY - 50 + flagHeight + wave);
            }
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}

class PlayerStickman {
    constructor(x, y) {
        this.x = x;
        this.y = y; // Y coordinate is top of tower
        this.scale = 1.0;
        
        // Recoil variables
        this.recoilLeft = 0;
        this.recoilRight = 0;
    }

    update() {
        if (this.recoilLeft > 0) this.recoilLeft -= 0.5;
        if (this.recoilRight > 0) this.recoilRight -= 0.5;
    }

    triggerRecoil(aimDirX) {
        if (aimDirX < 0) {
            this.recoilLeft = 4;
        } else {
            this.recoilRight = 4;
        }
    }

    render(ctx, aimDir) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Color theme: Premium black shadow silhouette
        ctx.strokeStyle = '#020202';
        ctx.fillStyle = '#020202';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 1. Draw Stickman standing
        // Head
        ctx.beginPath();
        ctx.arc(0, -32, 6, 0, Math.PI * 2);
        ctx.fill();

        // Spine/Torso
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(0, -10);
        ctx.stroke();

        // Legs (standing firmly)
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(-6, 0); // left leg
        ctx.moveTo(0, -10);
        ctx.lineTo(6, 0); // right leg
        ctx.stroke();

        // Arms aiming (connected to double machine guns)
        const angle = Math.atan2(aimDir.y, aimDir.x);
        const aimDist = 12;
        const armX = Math.cos(angle) * aimDist;
        const armY = -18 + Math.sin(angle) * aimDist;

        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(armX, armY);
        ctx.stroke();

        ctx.restore();

        // 2. Draw Heavy Dual Machine Guns mounted on battlements
        // We draw two machine guns: one pointing left, one pointing right
        // The one in the direction of the target aim has a recoil animation
        this.drawMountedGun(ctx, this.x - 14, this.y - 4, angle, aimDir.x < 0 ? this.recoilLeft : 0, aimDir.x < 0);
        this.drawMountedGun(ctx, this.x + 14, this.y - 4, angle, aimDir.x >= 0 ? this.recoilRight : 0, aimDir.x >= 0);
    }

    drawMountedGun(ctx, x, y, angle, recoil, isActive) {
        ctx.save();
        ctx.translate(x, y);

        // If inactive, point gun at a relaxed rest angle (diagonal outwards)
        const gunAngle = isActive ? angle : (x < this.x ? Math.PI * 1.15 : -Math.PI * 0.15);

        ctx.rotate(gunAngle);

        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#101010';
        ctx.lineWidth = 1;

        // Gun body box (push back slightly on recoil)
        const rx = -10 - recoil;
        ctx.fillRect(rx, -4, 20, 8);
        
        // Gun barrel
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(rx + 20, -1.5);
        ctx.lineTo(rx + 36, -1.5);
        ctx.moveTo(rx + 20, 1.5);
        ctx.lineTo(rx + 36, 1.5);
        ctx.stroke();

        // Ammo drum
        ctx.fillStyle = '#050505';
        ctx.beginPath();
        ctx.arc(rx + 5, 6, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Draw mount tripod
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 5, y + 8);
        ctx.moveTo(x, y);
        ctx.lineTo(x + 5, y + 8);
        ctx.stroke();
    }
}

class Enemy {
    constructor(side, type, y) {
        // Spawns outside screen borders (GAME_WIDTH = 800)
        this.side = side; // 'left' or 'right'
        this.x = side === 'left' ? -40 : GAME_WIDTH + 40;
        this.y = y; // Ground height level
        this.initialY = y; // Keep track of spawn ground level
        this.type = type; // 'swarmer', 'shield', 'archer'
        
        this.width = 18;
        this.height = 36;
        
        // Bone animation variables
        this.animTime = Math.random() * Math.PI * 2;
        
        // Hit effect timer
        this.hitFlash = 0;

        // Balance Stats
        switch (type) {
            case 'swarmer':
                this.health = 18;
                this.maxHealth = 18;
                this.speed = 1.35 + Math.random() * 0.4;
                this.damage = 0.08; // Continuous damage rate per frame
                this.scoreVal = 10;
                break;
            case 'shield':
                this.health = 50;
                this.maxHealth = 50;
                this.speed = 0.7 + Math.random() * 0.2;
                this.damage = 0.15;
                this.scoreVal = 25;
                break;
            case 'archer':
                this.health = 25;
                this.maxHealth = 25;
                this.speed = 1.0;
                this.damage = 0; // Archer uses projectiles instead of melee hit
                this.scoreVal = 35;
                this.shootCooldown = 60 + Math.random() * 90;
                this.shootRange = 180 + Math.random() * 60; // stops before tower
                break;
        }

        // Dying state (ragdoll launch)
        this.isDying = false;
        this.deathVX = 0;
        this.deathVY = 0;
        this.deathRot = 0;
        this.deathRotSpeed = 0;
    }

    takeDamage(amount, forceX, forceY) {
        if (this.isDying) return false;

        this.health -= amount;
        this.hitFlash = 3; // flash visual for 3 frames

        if (this.health <= 0) {
            this.isDying = true;
            
            // Set dramatic flying death velocities
            this.deathVX = forceX * 1.8 + (Math.random() - 0.5) * 3;
            this.deathVY = forceY * 1.8 - (2 + Math.random() * 5); // Fly up
            this.deathRotSpeed = (Math.random() - 0.5) * 0.4;
            return true; // confirm kill
        }
        return false;
    }

    update(towerX, towerWidth, particles, addEnemyArrow) {
        if (this.isDying) {
            // Apply physics of death fly back
            this.x += this.deathVX;
            this.y += this.deathVY;
            this.deathVY += 0.25; // gravity
            this.deathRot += this.deathRotSpeed;

            // Stop sliding when hitting ground
            if (this.y >= this.initialY) {
                this.y = this.initialY;
                this.deathVX *= 0.85;
                this.deathRotSpeed *= 0.8;
            }
            return;
        }

        // Tick hit visual down
        if (this.hitFlash > 0) this.hitFlash--;

        this.animTime += this.speed * 0.12;

        const targetX = this.side === 'left' ? towerX - towerWidth / 2 : towerX + towerWidth / 2;
        const dist = Math.abs(this.x - targetX);

        if (this.type === 'archer') {
            // Archer stops at range to shoot arrows
            if (dist <= this.shootRange) {
                this.shootCooldown--;
                if (this.shootCooldown <= 0) {
                    this.shootCooldown = 120 + Math.random() * 60;
                    
                    // Shoot arrow projectile aiming at top of tower (~GAME_HEIGHT * 0.58)
                    const targetY = GAME_HEIGHT * 0.58;
                    const dx = towerX - this.x;
                    const dy = targetY - this.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    
                    const avx = (dx / d) * 5;
                    const avy = (dy / d) * 5;
                    
                    addEnemyArrow(this.x, this.y - 20, avx, avy);
                }
            } else {
                // Keep moving in range
                this.x += this.side === 'left' ? this.speed : -this.speed;
            }
        } else {
            // Melee swarmer / shield carrier run to tower
            if (dist > 4) {
                this.x += this.side === 'left' ? this.speed : -this.speed;
            }
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.isDying) {
            ctx.rotate(this.deathRot);
        }

        // Custom hit-flash rendering (glowing red when shot)
        if (this.hitFlash > 0) {
            ctx.strokeStyle = '#ff3333';
            ctx.fillStyle = '#ff3333';
            // Glowing shadow
            ctx.shadowColor = '#ff3333';
            ctx.shadowBlur = 8;
        } else {
            ctx.strokeStyle = '#000000';
            ctx.fillStyle = '#000000';
        }

        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Bone positions based on run animations
        const time = this.animTime;
        const isMeleeAttacking = !this.isDying && (this.type !== 'archer' && Math.abs(this.x - (GAME_WIDTH / 2)) < 50);

        // Run cycle angles
        const angle1 = Math.sin(time) * 0.6;
        const angle2 = Math.sin(time + Math.PI) * 0.6;

        // Stickman coordinates relative to origin (ground base)
        const spineY = -12;
        const chestY = -24;
        const headY = -30;

        // 1. Draw Legs
        ctx.beginPath();
        if (this.isDying) {
            // Legs open wide in death flight
            ctx.moveTo(0, spineY);
            ctx.lineTo(-8, spineY + 8);
            ctx.moveTo(0, spineY);
            ctx.lineTo(8, spineY + 8);
        } else if (isMeleeAttacking) {
            // Standing close, striking
            ctx.moveTo(0, spineY);
            ctx.lineTo(-4, 0);
            ctx.moveTo(0, spineY);
            ctx.lineTo(4, 0);
        } else {
            // Running leg swing
            ctx.moveTo(0, spineY);
            ctx.lineTo(Math.sin(time) * 6, -6);
            ctx.lineTo(Math.sin(time) * 10 - (this.side === 'left' ? -2 : 2), 0);

            ctx.moveTo(0, spineY);
            ctx.lineTo(Math.sin(time + Math.PI) * 6, -6);
            ctx.lineTo(Math.sin(time + Math.PI) * 10 - (this.side === 'left' ? -2 : 2), 0);
        }
        ctx.stroke();

        // 2. Torso
        ctx.beginPath();
        ctx.moveTo(0, spineY);
        ctx.lineTo(0, chestY);
        ctx.stroke();

        // 3. Head
        ctx.beginPath();
        ctx.arc(0, headY, 5, 0, Math.PI * 2);
        ctx.fill();

        // 4. Arms & Gear
        ctx.beginPath();
        if (this.isDying) {
            // Flailing arms
            ctx.moveTo(0, chestY);
            ctx.lineTo(-8, chestY - 4);
            ctx.moveTo(0, chestY);
            ctx.lineTo(8, chestY - 4);
            ctx.stroke();
        } 
        else if (this.type === 'shield') {
            // Left arm holds shield in front
            const armForward = this.side === 'left' ? 10 : -10;
            ctx.moveTo(0, chestY);
            ctx.lineTo(armForward, chestY + 4);
            ctx.stroke();

            // Draw shield (black slab)
            ctx.restore();
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.fillStyle = '#050505';
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1.5;
            
            const shieldX = this.side === 'left' ? 8 : -14;
            ctx.fillRect(shieldX, -28, 6, 22);
            ctx.strokeRect(shieldX, -28, 6, 22);
            ctx.stroke();
        } 
        else if (this.type === 'archer') {
            // Draw archer aiming bow
            const aimDir = this.side === 'left' ? 1 : -1;
            ctx.moveTo(0, chestY);
            ctx.lineTo(aimDir * 10, chestY + 2);
            ctx.stroke();

            // Draw Bow
            ctx.strokeStyle = '#442b15';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(aimDir * 11, chestY + 2, 8, -Math.PI/2, Math.PI/2, this.side === 'right');
            ctx.stroke();
        } 
        else { // Swarmer / Melee stickman
            // Holding sword/dagger swinging
            const swing = isMeleeAttacking ? Math.sin(time * 2) * 8 : Math.sin(time) * 4;
            const armForward = this.side === 'left' ? 8 : -8;
            ctx.moveTo(0, chestY);
            ctx.lineTo(armForward, chestY - 2 + swing);
            ctx.stroke();

            // Draw short weapon blade
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(armForward, chestY - 2 + swing);
            ctx.lineTo(armForward + (this.side === 'left' ? 6 : -6), chestY - 8 + swing);
            ctx.stroke();
        }

        // Draw small health bar above enemies with < 100% HP
        if (!this.isDying && this.health < this.maxHealth) {
            const barW = 16;
            const barH = 3;
            const barX = -barW / 2;
            const barY = headY - 10;
            
            ctx.fillStyle = '#400';
            ctx.fillRect(barX, barY, barW, barH);
            
            ctx.fillStyle = '#f33';
            ctx.fillRect(barX, barY, barW * (this.health / this.maxHealth), barH);
        }

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, vx, vy, speed = 24) {
        this.x = x;
        this.y = y;
        this.vx = vx * speed;
        this.vy = vy * speed;
        
        this.damage = 6.5; // Bullet base damage
        this.alive = true;
    }

    update(w, h, groundY) {
        this.x += this.vx;
        this.y += this.vy;

        // Boundaries check
        if (this.x < -10 || this.x > w + 10 || this.y < -10 || this.y >= groundY) {
            this.alive = false;
        }
    }
}

class Grenade {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx * 6; // slow, arc trajectory
        this.vy = vy * 6 - 3; // add upward push for nice lob
        
        this.gravity = 0.18;
        this.radius = 4;
        this.blastRadius = 80;
        this.damage = 45;
        this.alive = true;
    }

    update(w, h, groundY) {
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        // Bounce/Explode on ground
        if (this.y >= groundY - 2) {
            this.y = groundY - 2;
            this.explode();
        }
    }

    explode() {
        this.alive = false;
        
        // visual & sound triggered in game.js via callback hook
        if (this.onExplode) {
            this.onExplode(this.x, this.y, this.blastRadius, this.damage);
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Dark iron oval grenade
        ctx.fillStyle = '#1c221e';
        ctx.strokeStyle = '#050505';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pin detail
        ctx.strokeStyle = '#b0b5b2';
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(2, -this.radius - 2);
        ctx.stroke();

        ctx.restore();
    }
}

class EnemyArrow {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        
        this.damage = 4.0;
        this.alive = true;
    }

    update(towerX, towerWidth, towerTopY) {
        this.x += this.vx;
        this.y += this.vy;

        // Collision check with Central Tower
        const leftLimit = towerX - towerWidth / 2;
        const rightLimit = towerX + towerWidth / 2;

        if (this.x >= leftLimit && this.x <= rightLimit && this.y >= towerTopY) {
            this.alive = false;
            this.hitTower = true;
        }

        // Offscreen boundary check
        if (this.x < -20 || this.x > GAME_WIDTH + 20 || this.y > GAME_HEIGHT) {
            this.alive = false;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx));

        // Draw glowing red trailing projectile arrow
        ctx.strokeStyle = 'rgba(255, 60, 60, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();

        // Arrow head
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-3, -2);
        ctx.lineTo(-3, 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}
