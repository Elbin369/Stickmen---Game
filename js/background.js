/**
 * BackgroundManager - Renders gamebackground.jpeg as the full game scene.
 * The image already contains: forest, grass, ground line — all-in-one.
 */
class BackgroundManager {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;

        // Parallax scroll offset (for screen shake)
        this.cameraX = 0;
        this.cameraY = 0;

        // Full scene background image
        this.bgImg = new Image();
        this.bgImg.src = 'gamebackground.jpeg';
        this.bgImgLoaded = false;
        this.bgImg.onload = () => {
            this.bgImgLoaded = true;
        };

        this.initialized = false;
    }

    init() {
        this.initialized = true;
    }

    update(w, h) {}

    /**
     * Render gamebackground.jpeg filling the full gameplay canvas.
     * The image already has the forest, grass, and dark ground — no overlays needed.
     */
    render(w, h) {
        if (!this.initialized) this.init();

        const ctx = this.ctx;

        if (this.bgImgLoaded) {
            // Draw the full scene image covering the entire canvas
            ctx.drawImage(this.bgImg, 0, 0, w, h);
        } else {
            // Dark fallback while image loads
            ctx.fillStyle = '#06070a';
            ctx.fillRect(0, 0, w, h);
        }
    }
}
