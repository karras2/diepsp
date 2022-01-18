window.colors = {
    blue: ["#00b0e1", "#0083a8"],
    red: ["#f04f54", "#b33b3f"],
    green: ["#00e06c", "#00a851"],
    purple: ["#be7ff5", "#8f5fb7"],
    gray: ["#999999", "#727272"],
    black: ["#4a4a50", "#1a1a1a"],
    white: ["#f2f2f2", "#e1e1e1"],
    pink: ["#e0bbe4", "#957dad"],
    gold: ["#fcc276", "#bd9158"],
    background: ["#d1d1d1", "#c0c0c0"],
    hit: ["#d82626", "#d82626"],
    healthBar: ["#3ae791", "#333333"],
    levelBar: ["#ffe46b", "#333333"],
    square: ["#ffe46b", "#bfae4e"],
    triangle: ["#fc7676", "#bd585a"],
    pentagon: ["#768cfc", "#5869bd"],
    crasher: ["#f177dd", "#b459a5"],
};
function lerp(a, b, x) {
    return a + x * (b - a);
}
const animations = ((module) => {
    class Animation {
        constructor(start, to, smoothness = 0.05) {
            this.ogStart = start;
            this.ogTo = to;
            this.start = start;
            this.to = to;
            this.value = start;
            this.smoothness = smoothness;
        }
        reset() {
            this.value = this.start;
            return this.value;
        }
        fullReset() {
            this.start = this.ogStart;
            this.to = this.ogTo;
            this.value = this.start;
        }
        getLerp() {
            this.value = lerp(this.value, this.to, this.smoothness, true);
            return this.value;
        }
        getNoLerp() {
            this.value = this.to;
            return this.value;
        }
        get() {
            return this.getLerp();
        }
        flip() {
            const start = this.to;
            const to = this.start;
            this.start = start;
            this.to = to;
        }
        ehGoodEnough(precision = .5) {
            return Math.abs(this.to - this.value) < precision;
        }
    }
    let library = {};
    library.start = new Animation(60, 0, .05);
    module.animations = library;
    return library;
})(window);
window.onload = function() {
    const playerNameInput = document.getElementById("textInput");
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    let frameInterval = -1;
    function drawGrid() {
        ctx.fillStyle = colors.background[0];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const gridSize = 25;
        for (let i = gridSize; i < canvas.width; i += gridSize) {
            ctx.strokeStyle = colors.background[1];
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.width);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.closePath();
            ctx.stroke();
        }
    }
    function resize() {
        canvas.width = innerWidth * devicePixelRatio;
        canvas.height = innerHeight * devicePixelRatio;
        animations.start.fullReset();
        clearInterval(frameInterval);
        frameInterval = setInterval(frame, 1000 / 60);
    }
    function keyEvent(event) {
        if (event.keyCode == 13) {
            frameInterval = setInterval(frame, 1000 / 60);
            startGame(playerNameInput.value);
        }
    }
    let onDone = function() {
        playerNameInput.addEventListener("keydown", keyEvent);
        animations.start.flip();
    }
    resize();
    window.addEventListener("resize", resize);
    document.getElementById("loading").style.display = "none";
    function frame() {
        const thing = animations.start.get();
        document.getElementById("textInputContainer").style.top = (50 - thing) + "%";
        drawGrid();
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            ctx[i ? "lineTo" : "moveTo"](Math.cos(Math.PI / 3 * i) * canvas.width / 1.5, Math.sin(Math.PI / 3 * i) * canvas.width / 1.5);
        }
        ctx.closePath();
        ctx.strokeStyle = "white";
        ctx.lineWidth = canvas.width * 1.5 * (thing / 60);
        ctx.stroke();
        ctx.restore();
        if (animations.start.ehGoodEnough()) {
            clearInterval(frameInterval);
            onDone();
        }
    }
    function startGame(playerName) {
        window.playerName = playerName;
        window.removeEventListener("resize", resize);
        playerNameInput.removeEventListener("keydown", keyEvent);
        onDone = function() {
            const gameScript = document.getElementById("gameScript");
            if (gameScript) {
                document.body.removeChild(gameScript);
            }
            const script = document.createElement("script");
            script.id = "gameScript";
            script.src = "./js/game.js";
            document.body.appendChild(script);
            clearInterval(frameInterval);
        }
    }
}