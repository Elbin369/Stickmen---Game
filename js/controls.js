/**
 * ControlsManager - Inputs and Control HUD binder
 * Supports mouse aiming (desktop), virtual joystick (mobile/drag), and keyboard hotkeys.
 */
class ControlsManager {
    constructor() {
        // Aiming vector (normalized)
        this.aimDir = { x: 1, y: 0 };
        this.isAiming = false;

        // Shooting action state
        this.isShooting = false;

        // Active weapon/skill state
        this.selectedSkill = 'gatling'; // 'gatling', 'grenade', 'arrows', 'heal'
        this.cooldowns = {
            gatling: { current: 0, max: 0 },
            grenade: { current: 0, max: 120, count: 3 }, // cooldown in frames at 60fps (~2s)
            arrows: { current: 0, max: 300, count: 2 },  // ~5s
            heal: { current: 0, max: 480, count: 2 }      // ~8s
        };

        // Key bindings state
        this.keys = {
            KeyW: false, ArrowUp: false,
            KeyS: false, ArrowDown: false,
            KeyA: false, ArrowLeft: false,
            KeyD: false, ArrowRight: false,
            Space: false
        };

        this.canvasPos = { x: 0, y: 0, w: 1, h: 1 };
        this.joystickActive = false;
        this.joystickCenter = { x: 0, y: 0 };
        this.joystickMaxDist = 36; // Maximum pixels the stick can move
    }

    /**
     * Set up event listeners
     */
    init(gameCanvas) {
        this.canvas = gameCanvas;

        // Reset aim direction relative to canvas center
        this.aimDir = { x: 1, y: -0.2 }; // Default aim slightly up and right

        this.setupKeyboard();
        this.setupMouse(gameCanvas);
        this.setupJoystick();
        this.setupSkillButtons();
        this.setupShootButton();
    }

    /**
     * Keyboard Input handlers
     */
    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (['Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                if (e.code === 'Space') {
                    this.isShooting = true;
                }
                this.keys[e.code] = true;
            }

            // Skill Hotkeys 1, 2, 3, 4
            if (e.key === '1') this.triggerSkill('gatling');
            if (e.key === '2') this.triggerSkill('grenade');
            if (e.key === '3') this.triggerSkill('arrows');
            if (e.key === '4') this.triggerSkill('heal');
        });

        window.addEventListener('keyup', (e) => {
            if (['Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                if (e.code === 'Space') {
                    this.isShooting = false;
                }
                this.keys[e.code] = false;
            }
        });
    }

    /**
     * Mouse / Touch Screen Aiming
     */
    setupMouse(canvas) {
        const updateAimFromMouse = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            this.canvasPos = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };

            // Player stickman is exactly at tower top (screen center, ~58% of height)
            const playerX = rect.left + rect.width / 2;
            const playerY = rect.top + rect.height * 0.58;

            const dx = clientX - playerX;
            const dy = clientY - playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 10) {
                this.aimDir.x = dx / dist;
                this.aimDir.y = dy / dist;
                this.isAiming = true;
            }
        };

        // Track mouse movement over the canvas area for aiming
        canvas.addEventListener('mousemove', (e) => {
            // Only mouse-aim if virtual joystick is NOT currently active
            if (!this.joystickActive) {
                updateAimFromMouse(e.clientX, e.clientY);
            }
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.isShooting = true;
                if (!this.joystickActive) {
                    updateAimFromMouse(e.clientX, e.clientY);
                }
            }
        });

        window.addEventListener('mouseup', () => {
            this.isShooting = false;
        });

        // Touch aiming on mobile
        canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0 && !this.joystickActive) {
                updateAimFromMouse(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0 && !this.joystickActive) {
                this.isShooting = true;
                updateAimFromMouse(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        canvas.addEventListener('touchend', () => {
            this.isShooting = false;
        });
    }

    /**
     * Virtual Joystick Drag Logic
     */
    setupJoystick() {
        const ring = document.getElementById('joystick-ring');
        const stick = document.getElementById('joystick-stick');
        
        if (!ring || !stick) return;

        const handleStart = (clientX, clientY) => {
            audio.init(); // Activate AudioContext on interaction
            this.joystickActive = true;
            const rect = ring.getBoundingClientRect();
            this.joystickCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        };

        const handleMove = (clientX, clientY) => {
            if (!this.joystickActive) return;

            const dx = clientX - this.joystickCenter.x;
            const dy = clientY - this.joystickCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Clamp sticking to radius
            let clampX = dx;
            let clampY = dy;
            if (dist > this.joystickMaxDist) {
                clampX = (dx / dist) * this.joystickMaxDist;
                clampY = (dy / dist) * this.joystickMaxDist;
            }

            // Move the stick visually
            stick.style.transform = `translate(${clampX}px, ${clampY}px)`;

            // Update aim vector
            if (dist > 5) {
                this.aimDir.x = dx / dist;
                this.aimDir.y = dy / dist;
                this.isAiming = true;
            }
        };

        const handleEnd = () => {
            if (!this.joystickActive) return;
            this.joystickActive = false;
            stick.style.transform = 'translate(0px, 0px)';
            // Keep the last aimed direction
        };

        // Mouse Joystick Events
        ring.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            handleStart(e.clientX, e.clientY);
        });

        window.addEventListener('mousemove', (e) => {
            if (this.joystickActive) {
                handleMove(e.clientX, e.clientY);
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.joystickActive) {
                handleEnd();
            }
        });

        // Touch Joystick Events
        ring.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            if (e.touches.length > 0) {
                handleStart(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (this.joystickActive && e.touches.length > 0) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        window.addEventListener('touchend', () => {
            if (this.joystickActive) {
                handleEnd();
            }
        });
    }

    /**
     * Skill slots UI binding
     */
    setupSkillButtons() {
        const slots = document.querySelectorAll('.skill-slot');
        slots.forEach(slot => {
            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                audio.init();
                const skill = slot.getAttribute('data-skill');
                this.triggerSkill(skill);
            });
        });
    }

    /**
     * Skill trigger logic (with cooldown check)
     */
    triggerSkill(skillName) {
        const skill = this.cooldowns[skillName];
        if (!skill) return;

        // Click sound for triggers
        audio.playClick();

        if (skillName === 'gatling') {
            this.selectedSkill = 'gatling';
            this.updateSkillUI();
            return;
        }

        // Active/instant casting skills
        if (skill.current <= 0 && skill.count > 0) {
            // Trigger immediately
            this.executeSkill(skillName);
        } else {
            // Flash red to indicate cooldown
            const element = document.getElementById(`skill-${skillName}`);
            if (element) {
                element.classList.add('shake-anim');
                setTimeout(() => element.classList.remove('shake-anim'), 200);
            }
        }
    }

    /**
     * Execute skill specific code and start cooldowns
     */
    executeSkill(skillName) {
        const skill = this.cooldowns[skillName];
        skill.current = skill.max; // Set cooldown active
        skill.count--;             // Deduct charge

        // Update charge text UI
        const countText = document.getElementById(`count-${skillName}`);
        if (countText) {
            countText.textContent = skill.count;
        }

        // Register action hook for game.js to process
        this[`cast_${skillName}`] = true;
    }

    /**
     * Highlight active skill UI
     */
    updateSkillUI() {
        const slots = document.querySelectorAll('.skill-slot');
        slots.forEach(slot => {
            if (slot.getAttribute('data-skill') === this.selectedSkill) {
                slot.classList.add('selected', 'active');
            } else {
                slot.classList.remove('selected');
                if (slot.getAttribute('data-skill') !== 'gatling') {
                    slot.classList.remove('active'); // only Gatling stays active if selected
                }
            }
        });
    }

    /**
     * Setup Big Shoot Button
     */
    setupShootButton() {
        const btn = document.getElementById('shoot-btn');
        if (!btn) return;

        btn.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            audio.init();
            this.isShooting = true;
        });

        btn.addEventListener('mouseup', (e) => {
            e.stopPropagation();
            this.isShooting = false;
        });

        btn.addEventListener('mouseleave', () => {
            this.isShooting = false;
        });

        btn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            audio.init();
            this.isShooting = true;
        }, { passive: true });

        btn.addEventListener('touchend', (e) => {
            e.stopPropagation();
            this.isShooting = false;
        }, { passive: true });
    }

    /**
     * Frame-by-frame updates for cooldown overlay visual animations
     */
    updateCooldowns() {
        // Keyboard Aim overrides (WASD/Arrows)
        let keysAimX = 0;
        let keysAimY = 0;

        if (this.keys.KeyW || this.keys.ArrowUp) keysAimY -= 1;
        if (this.keys.KeyS || this.keys.ArrowDown) keysAimY += 1;
        if (this.keys.KeyA || this.keys.ArrowLeft) keysAimX -= 1;
        if (this.keys.KeyD || this.keys.ArrowRight) keysAimX += 1;

        if (keysAimX !== 0 || keysAimY !== 0) {
            const dist = Math.sqrt(keysAimX * keysAimX + keysAimY * keysAimY);
            this.aimDir.x = keysAimX / dist;
            this.aimDir.y = keysAimY / dist;
            this.isAiming = true;
        }

        // Tick down skill cooldowns
        for (let key in this.cooldowns) {
            const skill = this.cooldowns[key];
            if (skill.current > 0) {
                skill.current--;
                
                // Update CSS Overlay height percentage
                const overlay = document.getElementById(`cooldown-${key}`);
                if (overlay) {
                    const percent = (skill.current / skill.max) * 100;
                    overlay.style.height = `${percent}%`;
                }
            }
        }
    }

    /**
     * Resets skill charges for restarting the game
     */
    reset() {
        this.isShooting = false;
        this.selectedSkill = 'gatling';
        
        // Reset charges
        this.cooldowns.grenade.count = 3;
        this.cooldowns.arrows.count = 2;
        this.cooldowns.heal.count = 2;
        
        // Clear cooldown overlay timers
        for (let key in this.cooldowns) {
            this.cooldowns[key].current = 0;
            const overlay = document.getElementById(`cooldown-${key}`);
            if (overlay) overlay.style.height = '0%';
            
            const countText = document.getElementById(`count-${key}`);
            if (countText) {
                countText.textContent = this.cooldowns[key].count;
            }
        }

        this.updateSkillUI();
    }
}

// Global Controls Instance
const controls = new ControlsManager();
