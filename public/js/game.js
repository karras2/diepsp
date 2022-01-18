(function() {
    const world = {
        camera: {
            x: 0,
            y: 0,
            rawRatio: 1,
            ratio: 1,
            rx: 0,
            ry: 0
        },
        room: {
            width: 6600,
            height: 6600
        },
        inputs: {
            up: false,
            down: false,
            left: false,
            right: false,
            lmb: false,
            mouse: {
                x: 0,
                y: 0,
                angle: 0
            },
            target: {
                x: 0,
                y: 0
            }
        },
        screenWidth: 1,
        screenHeight: 1,
        screenRatio: 1,
        getSpawnPos: function(nest = false) {
            if (nest) {
                return [Math.random() * world.room.width * .2 + world.room.width * .4, Math.random() * world.room.height * .2 + world.room.height * .4];
            } else {
                let x = Math.random() * world.room.width,
                    y = Math.random() * world.room.height;
                while (x > this.room.width * .4 && this.x < this.room.width * .6 && y > this.room.height * .4 && this.y < this.room.height * .6) {
                    x = Math.random() * world.room.width;
                    y = Math.random() * world.room.height;
                }
                return [x, y];
            }
        }
    };
    Math.clamp = (num, max = 1, min = 0) => num > max ? max : num < min ? min : num;
    // Initialize the canvas
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const tankCanvas = document.createElement("canvas");
    const tankCtx = tankCanvas.getContext("2d");
    // Create a function to make everything look pretty.
    function resetCanvas() {
        // Make it fit
        canvas.width = tankCanvas.width = world.screenWidth = innerWidth * devicePixelRatio;
        canvas.height = tankCanvas.height = world.screenHeight = innerHeight * devicePixelRatio;
        canvas.focus();
        // Make it pretty
        ctx.lineJoin = tankCtx.lineJoin = "round";
        ctx.lineCap = tankCtx.lineCap = "round";
        ctx.filter = tankCtx.filter = "none";
    }
    resetCanvas();
    // Resize the canvas when needed
    window.addEventListener("resize", resetCanvas);
    function lerp(start, to, strength = 0.05) {
        return start + strength * (to - start);
    }
    function lerpAngle(is, to, amount = 0.1) {
        var normal = {
            x: Math.cos(is),
            y: Math.sin(is)
        };
        var normal2 = {
            x: Math.cos(to),
            y: Math.sin(to)
        };
        var res = {
            x: lerp(normal.x, normal2.x, amount),
            y: lerp(normal.y, normal2.y, amount)
        };
        return Math.atan2(res.y, res.x);
    }
    function getDistance(a, b) {
        return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    }
    const tankConfig = (function() {
        const g = { // Reload, Health, Damage, Speed, Range, Size, Spread, Recoil
            bullet: [20, 1, 1, 1, 1, 1, 1, .02],
            twin: [1, .8, .8, 1, 1, 1, 1, .5],
            destroyer: [4, 3, 2, .6, 1.2, 1, 1, 7],
            drone: [75, 1, 1, 1, 1, .65, 1, 0],
            battleship: [.2, .25, .25, 1.5, 1, .725, 1, 0],
            skimmerMissile: [.6, .6, .6, .6, .6, 1, 1.5, 0],
            skimmer: [.8, 1, .6, .8, 1.6, 1, 1, .5],
            rocketMissile: [.3, .3, .3, .3, .5, 1, 2, 5]
        };
        function getStats(...array) {
            let base = JSON.parse(JSON.stringify(array.shift()));
            for (let i = 0; i < array.length; i ++) {
                for (let j = 0; j < array[i].length; j ++) {
                    base[j] *= array[i][j];
                }
            }
            return {
                reload: base[0],
                health: base[1],
                damage: base[2],
                speed: base[3],
                range: base[4],
                size: base[5],
                spread: base[6],
                recoil: base[7]
            };
        };
        const exports = {
            "Square": {
                health: 25,
                damage: 3,
                speed: 1,
                engine: .05,
                type: 3,
                shape: 4,
                score: 20,
                size: 25,
                color: "square",
                motionType: "spinInCircles",
                hitsOwnType: "bounce"
            },
            "Triangle": {
                health: 50,
                damage: 3,
                speed: 1,
                engine: .05,
                type: 3,
                shape: 3,
                score: 60,
                motionType: "moveInCircles",
                size: 30,
                color: "triangle"
            },
            "Pentagon": {
                health: 100,
                damage: 4,
                speed: 1,
                engine: .05,
                type: 3,
                shape: 5,
                score: 150,
                motionType: "moveInCircles",
                size: 50,
                color: "pentagon"
            },
            "Alpha Pentagon": {
                health: 1000,
                damage: 5,
                speed: 1,
                engine: .02,
                type: 3,
                shape: 5,
                score: 1500,
                motionType: "moveInCircles",
                size: 125,
                color: "pentagon"
            },
            "Bullet": {
                health: 25,
                damage: 5,
                speed: 8,
                engine: 1,
                range: 100,
                type: 2,
                shape: 0,
                pushability: .1,
                persistAfterDeath: true
            },
            "Drone": {
                health: 30,
                damage: 3,
                speed: 7.5,
                engine: .025,
                type: 2,
                shape: 3,
                range: Infinity,
                motionType: "toMasterTarget",
                hitsOwnType: "bounce",
                pushability: .15
            },
            "Swarm": {
                health: 27,
                damage: 3,
                speed: 6,
                engine: .05,
                type: 2,
                shape: 3,
                range: 300,
                motionType: "toMasterTarget",
                hitsOwnType: "bounce",
                pushability: .2
            },
            "Missile": {
                health: 25,
                damage: 5,
                speed: 8,
                engine: 1,
                range: 100,
                type: 2,
                shape: 0,
                pushability: .1,
                facingType: "spin",
                guns: [{
                    position: [.6, .4, 1, 0, 0, 0, 0],
                    properties: {
                        stats: getStats(g.bullet, g.skimmerMissile),
                        alwaysShoot: true
                    }
                }, {
                    position: [.6, .4, 1, 0, 0, 180, 0],
                    properties: {
                        stats: getStats(g.bullet, g.skimmerMissile),
                        alwaysShoot: true
                    }
                }]
            },
            "Rocket": {
                health: 25,
                damage: 5,
                speed: 8,
                engine: .175,
                range: 125,
                type: 2,
                shape: 0,
                pushability: .1,
                guns: [{
                    position: [.6, .4, 1.5, 0, 0, 180, 5],
                    properties: {
                        stats: getStats(g.bullet, g.rocketMissile),
                        alwaysShoot: true
                    }
                }]
            },
            "Tank": {
                guns: [{
                    position: [.9, .35, 1, 0, 0, 0, 0],
                    properties: {
                        stats: getStats(g.bullet)
                    }
                }]
            },
            "Twin": {
                guns: [{
                    position: [.9, .4, 1, 0, -.25, 0, .5],
                    properties: {
                        stats: getStats(g.bullet, g.twin)
                    }
                }, {
                    position: [.9, .4, 1, 0, .25, 0, 0],
                    properties: {
                        stats: getStats(g.bullet, g.twin)
                    }
                }]
            },
            "Destroyer": {
                guns: [{
                    position: [.825, .65, 1, 0, 0, 0, 0],
                    properties: {
                        stats: getStats(g.bullet, g.destroyer)
                    }
                }]
            },
            "Skimmer": {
                guns: [{
                    position: [.175, .55, 1.1, .7, 0, 0, 0],
                    properties: {
                        prop: true
                    }
                }, {
                    position: [.75, .65, 1, 0, 0, 0, 0],
                    properties: {
                        stats: getStats(g.bullet, g.destroyer, g.skimmer),
                        ammo: "Missile"
                    }
                }]
            },
            "Rocketeer": {
                guns: [{
                    position: [.15, .65 * .8, 1.1, .8, 0, 0, 0],
                    properties: {
                        stats: getStats(g.bullet, g.destroyer, g.skimmer),
                        ammo: "Rocket"
                    }
                }, {
                    position: [.8, .65, .8, 0, 0, 0, 0],
                    properties: {
                        prop: true
                    }
                }]
            },
            "Overseer": {
                guns: [{
                    position: [.3, .6, 1.2, .4, 0, 90, 1],
                    properties: {
                        stats: getStats(g.drone),
                        ammo: "Drone",
                        childCap: 4,
                        alwaysShoot: true
                    }
                }, {
                    position: [.3, .6, 1.2, .4, 0, 270, 1],
                    properties: {
                        stats: getStats(g.drone),
                        ammo: "Drone",
                        childCap: 4,
                        alwaysShoot: true
                    }
                }]
            },
            "Battleship": {
                guns: [{
                    position: [.7, .425, .6, 0, -.225, 90, 0],
                    properties: {
                        stats: getStats(g.drone, g.battleship),
                        ammo: "Swarm"
                    }
                }, {
                    position: [.7, .425, .6, 0, .225, 90, .5],
                    properties: {
                        stats: getStats(g.drone, g.battleship),
                        ammo: "Swarm"
                    }
                }, {
                    position: [.7, .425, .6, 0, -.225, 270, .25],
                    properties: {
                        stats: getStats(g.drone, g.battleship),
                        ammo: "Swarm"
                    }
                }, {
                    position: [.7, .425, .6, 0, .225, 270, .75],
                    properties: {
                        stats: getStats(g.drone, g.battleship),
                        ammo: "Swarm"
                    }
                }]
            }
        };
        exports.playableTanks = ["Tank", "Twin", "Destroyer", "Skimmer", "Rocketeer", "Overseer", "Battleship"];
        return exports;
    })();
    class Vector {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
        update() {
            this.len = this.length;
            this.dir = this.direction;
        }
        nullify() {
            this.x = 0;
            this.y = 0;
        }
        isShorterThan(d) {
            return (this.x ** 2) + (this.y ** 2) <= (d * 2);
        }
        get length() {
            return Math.sqrt((this.x ** 2) + (this.y ** 2));
        }
        get direction() {
            return Math.atan2(this.y, this.x);
        }
    }
    class Health {
        constructor(amount) {
            this.amount = amount;
            this.max = amount;
            this.lastHit = 0;
            this.regenRate = .01;
            this.regenTime = 5000;
        }
        setMaximum(amount) {
            this.max = amount;
            if (this.amount > amount) {
                this.amount = amount;
            }
        }
        damage(amount) {
            this.amount -= amount;
            this.lastHit = Date.now();
        }
        regenerate() {
            if (Date.now() - this.lastHit < this.regenTime || this.amount <= 0) {
                return;
            }
            let amount = this.max * this.regenRate;
            if (this.amount + amount > this.max) {
                amount = this.max - this.amount;
            }
            this.amount += amount;
        }
        heal(value, raw = false) {
            if (!raw) {
                value = this.max * value;
            }
            if (this.amount + value > this.max) {
                value = this.max - this.amount;
            }
            this.amount += value;
        }
    }
    const QuadTree = (function() {
        class QuadTree {
            constructor(bounds, max_objects, max_levels, level) {
                this.maxObjects = max_objects || 10;
                this.maxLevels = max_levels || 4;
                this.level = level || 0;
                this.bounds = bounds;
                this.objects = [];
                this.branches = [];
            }
            split() {
                let nextLevel = this.level + 1;
                let subWidth = this.bounds.width / 2;
                let subHeight = this.bounds.height / 2;
                let x = this.bounds.x;
                let y = this.bounds.y;
                this.branches[0] = (new QuadTree({
                    x: x + subWidth,
                    y: y,
                    width: subWidth,
                    height: subHeight
                }, this.maxObjects, this.maxLevels, nextLevel));
                this.branches[1] = (new QuadTree({
                    x: x,
                    y: y,
                    width: subWidth,
                    height: subHeight
                }, this.maxObjects, this.maxLevels, nextLevel));
                this.branches[2] = (new QuadTree({
                    x: x,
                    y: y + subHeight,
                    width: subWidth,
                    height: subHeight
                }, this.maxObjects, this.maxLevels, nextLevel));
                this.branches[3] = (new QuadTree({
                    x: x + subWidth,
                    y: y + subHeight,
                    width: subWidth,
                    height: subHeight
                }, this.maxObjects, this.maxLevels, nextLevel));
            }
            getBranches(object) {
                let width = object.width || object.size;
                let height = object.height || object.size;
                let output = [];
                let midY = this.bounds.x + (this.bounds.width / 2);
                let midX = this.bounds.y + (this.bounds.height / 2);
                let north = object.y - height <= midX;
                let west = object.x - width <= midY;
                let east = object.x + width >= midY;
                let south = object.y + height >= midX;
                if (north && east) output.push(0);
                if (west && north) output.push(1);
                if (west && south) output.push(2);
                if (east && south) output.push(3);
                return output;
            }
            remove(object) {
                if (this.branches.length) {
                    for (let i = 0; i < this.branches.length; i++) {
                        this.branches[i].remove(object);
                    }
                } else {
                    const index = this.objects.indexOf(object);
                    if (index > -1) {
                        this.objects.splice(index, 1);
                    }
                }
            }
            insert(object) {
                let i = 0;
                let cells;
                if (this.branches.length) {
                    cells = this.getBranches(object);
                    for (i = 0; i < cells.length; i++) this.branches[cells[i]].insert(object);
                    return;
                }
                this.objects.push(object);
                if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
                    if (!this.branches.length) this.split();
                    for (let i in this.objects) {
                        cells = this.getBranches(this.objects[i]);
                        for (let j = 0; j < cells.length; j++) this.branches[cells[j]].insert(this.objects[i]);
                    }
                    this.objects = [];
                }
            }
            retrieve(object) {
                let cells = this.getBranches(object);
                let output = this.objects;
                if (this.branches.length)
                    for (let i = 0; i < cells.length; i++) output = output.concat(this.branches[cells[i]].retrieve(object));
                output = output.filter(function(item, index) {
                    return output.indexOf(item) >= index;
                });
                return output;
            }
            hitDetection(object, other) {
                const rect1 = {
                    x: object.x - object.width / 2,
                    y: object.y - object.height / 2,
                    width: object.width,
                    height: object.height
                };
                const rect2 = {
                    x: other.x - other.width / 2,
                    y: other.y - other.height / 2,
                    width: other.width,
                    height: other.height
                };
                return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y);
                //return Math.sqrt(Math.pow(other.x - object.x, 2) + Math.pow(other.y - object.y, 2)) <= (object.size + other.size);
            }
            queryForCollisionPairs(object) {
                let closeBy = this.retrieve(object);
                let collisions = [];
                for (let other of closeBy) {
                    let hit = this.hitDetection(object, other);
                    if (hit && !collisions.includes(other.id) && object.id !== other.id) collisions.push(other.id);
                }
                return collisions;
            }
            clear() {
                this.objects = [];
                if (this.branches.length) {
                    for (let i = 0; i < this.branches.length; i++) this.branches[i].clear();
                    this.branches = [];
                }
            }
        }
        class Node {
            constructor(x, y, width, height, id) {
                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;
                this.id = id;
            }
        }
        return {
            Node,
            QuadTree
        };
    })();
    const collisionGrid = new QuadTree.QuadTree({
        x: 0,
        y: 0,
        width: world.room.width,
        height: world.room.height
    }, 16, 16, 0);
    const entities = {};
    let entityID = 0;
    class Bot {
        constructor() {
            this.name = "BOT_" + Math.random().toString().slice(2);
            this.spawn();
            this.target = null;
            this.inputs = {
                target: {
                    x: 0,
                    y: 0
                }
            }
        }
        spawn() {
            this.body = new Entity(Math.random() * world.room.width, Math.random() * world.room.height);
            this.body.setTank(tankConfig.playableTanks[Math.random() * tankConfig.playableTanks.length | 0]);
            this.body.color = "red";
            this.body.name = this.name;
        }
        findTarget() {
            return Object.values(entities).filter((entry) => {
                return !entry.isDead && entry.id !== this.body.id && entry.master.id !== this.body.id && getDistance(entry, this.body) < 1000 && entry.type === 1;
            }).sort((a, b) => {
                return getDistance(this.body, a) - getDistance(this.body, b);
            })[0];
        }
        update() {
            if (this.body == null || this.body.isDead) {
                this.spawn();
            }
            if (this.target == null || this.target.isDead) {
                this.target = this.findTarget();
            }
            if (this.target != null) {
                const angle = Math.atan2(this.target.y - this.body.y, this.target.x - this.body.x);
                const dist = getDistance(this.target, this.body);
                this.inputs.target = {
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist
                };
                this.body.accel.x = Math.cos(angle);
                this.body.accel.y = Math.sin(angle);
                this.body.shooting = true;
                this.body.facing = angle;
                this.body.inputs = this.inputs;
            } else {
                this.body.shooting = false;
                this.body.accel.x = 0;
                this.body.accel.y = 0;
            }
        }
    }
    class Gun {
        constructor(tank, position, properties) {
            this.body = tank;
            this.length = position[0] / 2;
            this.width = position[1];
            this.scale = position[2];
            const offset = new Vector(position[3], position[4]);
            this.angle = position[5] * Math.PI / 180;
            this.delay = position[6];
            this.direction = offset.direction;
            this.offset = offset.length;
            this.properties = properties;
            this.reloadTime = 0;
            if (this.properties.stats != null) {
                this.reloadTime = this.properties.stats.reload * this.delay
            }
            this.motion = 1;
            this.motionDir = 0;
            this.childCap = properties.childCap == null ? -1 : properties.childCap;
            this.positionData = {
                length: position[0],
                width: position[1],
                open: position[2],
                x: position[3],
                y: position[4],
                angle: position[5] * Math.PI / 180
            };
            this.children = [];
        }
        getMotion() {
            this.motion -= this.motionDir * this.length * .05;
            if (this.motionDir === 1 && this.motion <= .85) this.motionDir *= -1;
            if (this.motionDir === -1 && this.motion >= 1) {
                this.motion = 1;
                this.motionDir = 0;
            }
        }
        update() {
            if (this.properties.prop) {
                return;
            }
            this.getMotion();
            if (this.body.isDead) {
                return;
            }
            this.reloadTime --;
            this.recoil = lerp(this.recoil, 0, .1);
            if (this.recoil > 0) {
                this.body.velocity.x += Math.cos(this.recoilAngle + Math.PI) * this.properties.stats.recoil * (this.recoil / 10);
                this.body.velocity.y += Math.sin(this.recoilAngle + Math.PI) * this.properties.stats.recoil * (this.recoil / 10);
            }
            if (this.childCap > -1) {
                this.children = this.children.filter(entry => !!entities[entry]);
            }
            if (this.body.shooting || this.properties.alwaysShoot) {
                if (this.reloadTime <= 0) {
                    this.shoot();
                }
            } else if (this.reloadTime <= this.properties.stats.reload * this.delay) {
                this.reloadTime = this.properties.stats.reload * this.delay;
            }
        }
        shoot() {
            if (this.childCap > -1 && this.children.length >= this.childCap) {
                return;
            }
            this.reloadTime = this.properties.stats.reload;
            const sx = this.offset * Math.cos(this.direction + this.angle + this.body.facing) + (1.5 * this.length - this.width * this.scale) * Math.cos(this.angle + this.body.facing);
            const sy = this.offset * Math.sin(this.direction + this.angle + this.body.facing) + (1.5 * this.length - this.width * this.scale) * Math.sin(this.angle + this.body.facing);
            const shell = new Entity(this.body.x + (sx  * this.body.size), this.body.y + (sy  * this.body.size), this.body);
            const spread = (Math.random() * this.properties.stats.spread) * .116667 * (Math.random() > .5 ? -1 : 1);
            shell.velocity.x = Math.cos(this.body.facing + this.angle + spread);
            shell.velocity.y = Math.sin(this.body.facing + this.angle + spread);
            if (this.body.velocity.length) {
                const extraBoost = Math.max(0, shell.velocity.x * this.body.velocity.x + shell.velocity.y * this.body.velocity.y) / this.body.velocity.length / shell.velocity.length;
                if (extraBoost) {
                    shell.velocity.x += this.body.velocity.length * extraBoost * shell.velocity.x / shell.velocity.length;
                    shell.velocity.y += this.body.velocity.length * extraBoost * shell.velocity.y / shell.velocity.length;
                }
            }
            shell.accel.x = shell.velocity.x;
            shell.accel.y = shell.velocity.y;
            shell.color = this.body.color;
            shell.size = this.width * this.body.size * 1.1 * this.properties.stats.size;
            shell.facing = shell.velocity.direction;
            shell.setTank(this.properties.ammo || "Bullet");
            if (this.properties.stats.health != null) {
                shell.health.max *= this.properties.stats.health;
                shell.health.amount *= this.properties.stats.health;
            }
            if (this.properties.stats.damage != null) {
                shell.damage *= this.properties.stats.damage;
            }
            if (this.properties.stats.speed != null) {
                shell.speed *= this.properties.stats.speed;
            }
            if (this.properties.stats.range != null) {
                shell.range *= this.properties.stats.range;
            }
            this.recoil = 20;
            this.recoilAngle = this.body.facing + this.angle;
            this.motion = 1;
            this.motionDir = 1;
            shell.refOffAngle = shell.velocity.direction;
            this.children.push(shell.id);
        }
    }
    class Entity {
        constructor(x, y, master) {
            this.id = entityID ++;
            this.x = x;
            this.y = y;
            this.master = master || this;
            this.source = this.master.master.master.master.master; // should be enough lol
            this.facing = 0;
            this.speed = 3.5;
            this.engine = .075;
            this.size = 50;
            this.score = 5;
            this.velocity = new Vector(0, 0);
            this.accel = new Vector(0, 0);
            this.health = new Health(100);
            this.damage = 10;
            this.range = 1;
            this.type = 1;
            this.shooting = false;
            this.alpha = 1;
            this.facingType = "none";
            this.density = 1;
            this.pushability = 1;
            this.guns = [];
            entities[this.id] = this;
        }
        setTank(tank) {
            if (typeof tank === "string") {
                this.label = tank;
                tank = tankConfig[tank];
                this.guns = []; // only clear guns when we have to
            }
            if (!tank) {
                console.log("Cannot set entity.");
                return;
            }
            if (tank.mockupID != null) {
                this.mockup = tank.mockupID;
            }
            if (tank.guns != null) {
                tank.guns.forEach(gun => {
                    this.guns.push(new Gun(this, gun.position, gun.properties));
                });
            }
            if (tank.health != null) {
                this.health.setMaximum(tank.health);
            }
            if (tank.damage != null) {
                this.damage = tank.damage;
            }
            if (tank.speed != null) {
                this.speed = tank.speed;
            }
            if (tank.engine != null) {
                this.engine = tank.engine;
            }
            if (tank.type != null) {
                this.type = tank.type;
            }
            if (tank.range != null) {
                this.range = tank.range;
            }
            if (tank.size != null) {
                this.size = tank.size;
            }
            if (tank.facingType != null) {
                this.facingType = tank.facingType;
            }
            if (tank.motionType != null) {
                this.motionType = tank.motionType;
            }
            if (tank.shape != null) {
                this.shape = tank.shape;
            }
            if (tank.score != null) {
                this.score = tank.score;
            }
            if (tank.color != null) {
                this.color = tank.color;
            }
            if (tank.hitsOwnType != null) {
                this.hitsOwnType = tank.hitsOwnType;
            }
            if (tank.pushability != null) {
                this.pushability = tank.pushability;
            }
            if (tank.persistAfterDeath != null) {
                this.persistAfterDeath = tank.persistAfterDeath;
            }
        }
        update() {
            if (this.health.amount <= 0 || this.range <= 0 || (this.persistAfterDeath ? (this.source == null || this.source.isDead) : (this.master == null || this.master.isDead))) {
                this.kill();
            }
            if (this.isDead) {
                this.alpha -= .06;
                this.size *= 1.05;
                if (this.alpha < 0) {
                    this.destroy();
                    return false;
                }
            }
            switch (this.type) {
                case 1: case 3: {
                    this.health.regenerate();
                    this.velocity.x = lerp(this.velocity.x, this.accel.x, this.engine);
                    this.velocity.y = lerp(this.velocity.y, this.accel.y, this.engine);
                    this.velocity.x -= Math.min(this.x - this.size + 50, 0) * .001;
                    this.velocity.x -= Math.max(this.x + this.size - 50 - world.room.width, 0) * .001;
                    this.velocity.y -= Math.min(this.y - this.size + 50, 0) * .001;
                    this.velocity.y -= Math.max(this.y + this.size - 50 - world.room.height, 0) * .001;
                } break;
                case 2: {
                    this.range --;
                    if (this.facingType == "none") {
                        this.facing = lerpAngle(this.facing, this.velocity.direction, .1);
                    }
                    this.velocity.x = lerp(this.velocity.x, this.accel.x, this.engine);
                    this.velocity.y = lerp(this.velocity.y, this.accel.y, this.engine);
                } break;
            }
            if (this.motionType) {
                switch (this.motionType) {
                    case "toMasterTarget": {
                        this.roamAngle = (this.roamAngle || this.refOffAngle || 0) + .05;
                        let target;
                        if (this.master.inputs && this.master.shooting) {
                            target = {
                                x: this.master.inputs.target.x + this.master.x,
                                y: this.master.inputs.target.y + this.master.y
                            };
                        } else {
                            target = {
                                x: this.master.x + this.master.size * 1.25 * Math.cos(this.roamAngle),
                                y: this.master.y + this.master.size * 1.25 * Math.sin(this.roamAngle)
                            };
                        }
                        this.accel.x = Math.cos(Math.atan2(target.y - this.y, target.x - this.x));
                        this.accel.y = Math.sin(Math.atan2(target.y - this.y, target.x - this.x));
                    } break;
                    case "spinInCircles": {
                        this.facing += .01 * (this.id % 2 ? 1 : -1);
                        this.accel.x = Math.cos(this.facing);
                        this.accel.y = Math.sin(this.facing);
                    } break;
                }
            }
            if (this.facingType != "none") {
                switch (this.facingType) {
                    case "spin": {
                        this.facing += .025;
                    } break;
                }
            }
            this.x += this.velocity.x * this.speed;
            this.y += this.velocity.y * this.speed;
            for (let gun of this.guns) {
                gun.update();
            }
            this.facing += .01;
            if (!this.isDead) {
                collisionGrid.insert({
                    x: this.x,
                    y: this.y,
                    width: this.size,
                    height: this.size,
                    id: this.id
                });
            }
            return true;
        }
        destroy() {
            delete entities[this.id];
            delete this;
        }
        kill() {
            this.isDead = true;
            if (this.onDead instanceof Function) {
                this.onDead();
            }
        }
        get gunData() {
            return this.guns.map(r => r.motion);
        }
    }
    const me = new Entity(0, 0);
    me.setTank(tankConfig.playableTanks[Math.random() * tankConfig.playableTanks.length | 0]);
    me.name = window.playerName;
    const drawings = {
        drawBackground: function() {
            ctx.fillStyle = colors.background[1];
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = colors.background[0];
            ctx.fillRect(-(world.camera.x / world.camera.ratio) + canvas.width / 2, -(world.camera.y / world.camera.ratio) + canvas.height / 2, world.room.width / world.camera.ratio, world.room.height / world.camera.ratio);
            ctx.save();
            ctx.lineWidth = 1.175 / world.camera.ratio;
            ctx.beginPath();
            ctx.globalAlpha = .06;
            ctx.strokeStyle = "black";
            const gridsize = 30 / world.camera.ratio;
            let px = world.camera.x / world.camera.ratio;
            let py = world.camera.y / world.camera.ratio;
            for (let x = -canvas.width + (canvas.width / 2 - px) % gridsize; x < canvas.width; x += gridsize) {
                ctx.moveTo(x, -canvas.width);
                ctx.lineTo(x, canvas.height);
            }
            for (let y = -canvas.height + (canvas.height / 2 - py) % gridsize; y < canvas.height; y += gridsize) {
                ctx.moveTo(-canvas.height, y);
                ctx.lineTo(canvas.width, y);
            }
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        },
        leaderboard: (function() {
            let list = [];
            class Entry {
                constructor(id, name) {
                    this.id = id;
                    this.name = name;
                    this.realScore = 0;
                    this.lerpedScore = 0;
                    this.color = "blue";
                }
                update(score, color) {
                    this.realScore = score;
                    this.color = color;
                }
                get score() {
                    this.lerpedScore = lerp(this.lerpedScore, this.realScore, .005);
                    return Math.abs(this.lerpedScore);
                }
            }
            function update() {
                let current = [];
                for (const id in entities) {
                    if (entities[id].type === 1) {
                        const entry = (list.find(listEntry => listEntry.id === entities[id].id) || new Entry(entities[id].id, entities[id].name));
                        entry.update(entities[id].score, entities[id].color || "blue");
                        current.push(entry);
                    }
                }
                list = current.sort((a, b) => b.score - a.score);
                list.length = Math.clamp(list.length, 10);
            }
            setInterval(update, 1000 / 3);
            function draw() {
                const width = 37.5;
                const x = world.screenWidth - width - 60;
                const y = 5;
                ctx.globalAlpha = .5;
                ctx.fillStyle = "#7F7F7F";
                ctx.lineWidth = 5;
                ctx.globalAlpha = .875;
                drawings.drawText(ctx, "Scoreboard:", x, y + 35, 8);
                let yy = y + 60;
                for (let i = 0; i < list.length; i ++) {
                    if (i >= 10) {
                        break;
                    }
                    yy += 16;
                    const entry = list[i];
                    drawings.drawBar(ctx, x, yy - 30, width * 3, 15, entry.score / list[0].score, colors[entry.color][0], "#373834", 5);
                    drawings.drawText(ctx, `${entry.name} - ${entry.score + .5 | 0}`, x , yy - 22.5, 5, "center");
                }
                ctx.lineWidth = 1;
            }
            return {
                draw: draw,
                getList() {
                    return list;
                }
            };
        })(),
        minimap: (function() {
            let list = [];
            class Entry {
                constructor(id,x, y) {
                    this.id = id;
                    this.x = x;
                    this.y = y;
                    this.rx = x;
                    this.ry = y;
                    this.color = "blue";
                }
                update(x, y, color) {
                    this.rx = x;
                    this.ry = y;
                    this.color = color;
                }
                get position() {
                    this.x = lerp(this.x, this.rx, .2);
                    this.y = lerp(this.y, this.ry, .2);
                    return {
                        x: this.x,
                        y: this.y
                    }
                }
            }
            function update() {
                let current = [];
                for (const id in entities) {
                    if (entities[id].type === 1 && id != me.id) {
                        const entry = (list.find(listEntry => listEntry.id === entities[id].id) || new Entry(entities[id].id, entities[id].x, entities[id].y));
                        entry.update(entities[id].x, entities[id].y, entities[id].color || "blue");
                        current.push(entry);
                    }
                }
                list = current;
            }
            setInterval(update, 1000 / 5);
            function draw() {
                let s = 110;
                ctx.save();
                ctx.globalAlpha = .75;
                ctx.translate((world.screenWidth - 20) - s, (world.screenHeight - 20) - s);
                ctx.fillStyle = window.colors.background[0];
                ctx.strokeStyle = window.colors.black[0];
                ctx.lineWidth = 3;
                ctx.fillRect(0, 0, s, s);
                ctx.strokeRect(0, 0, s, s);
                ctx.save();
                ctx.translate((me.x / world.room.width) * s, (me.y / world.room.height) * s);
                drawings.drawPolygon(ctx, [[1, 0], [-1, .5], [-1, -.5]], (s / 25), me.facing, colors.black[0], null);
                ctx.restore();
                list.forEach(entry => {
                    const { x, y } = entry.position;
                    ctx.beginPath();
                    ctx.arc((x / world.room.width) * s, (y / world.room.height) * s, (s / 75), 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.fillStyle = colors[entry.color][0];
                    ctx.fill();
                })
                ctx.globalAlpha = 1;
                drawings.drawText(ctx, "Diep.sp", s, -5, 6, "right");
                drawings.drawText(ctx, (world.fps || 0 + 1).toFixed(0) + " FPS", 0, -5, 6, "left");
                ctx.restore();
            }
            return draw;
        })(),
        nameplate: (function() {
            const levels = (function() {
                const lvlScores = [4, 9, 15, 22, 28, 35, 44, 54, 64, 75, 87, 101, 113, 132, 151, 171, 192, 215, 241, 269, 299, 333, 368, 407, 450, 496, 546, 600, 659, 723, 791, 839, 889, 942, 999, 1059, 1123, 1190, 1261, 1337, 1417, 1502, 1593, 1687, Infinity];
                function getTotalScore(i) {
                    let t = 0;
                    for (let k = 0; k < i; k ++) {
                        t += lvlScores[k];
                    }
                    return t;
                }
                const output = [];
                for (let i = 0; i < lvlScores.length; i ++) {
                    output.push({
                        level: i + 1,
                        score: getTotalScore(i),
                        lvlScore: lvlScores[i]
                    });
                }
                return output;
            })();
            const myLevel = {
                display: {
                    score: 0,
                    level: 0,
                    levelPct: 0
                },
                real: {
                    level: 1,
                    score: 0,
                    lvlScore: 4
                }
            };
            function update(score) {
                myLevel.real = levels.find(level => score >= level.score && score < level.score + level.lvlScore) || levels[0];
                myLevel.display.score = lerp(myLevel.display.score, score, .01);
                myLevel.display.level = lerp(myLevel.display.level, myLevel.real.level, .01);
                myLevel.display.levelPct = lerp(myLevel.display.levelPct, Number.isFinite(myLevel.real.lvlScore) ? (score - myLevel.real.score) / myLevel.real.lvlScore : 1, .01);
            }
            return function() {
                update(me.score);
                ctx.save();
                ctx.translate(world.screenWidth / 2, world.screenHeight - 20);
                drawings.drawBar(ctx, 0, 0, 275, 15, myLevel.display.levelPct, ...colors.levelBar);
                drawings.drawBar(ctx, 0, -15, 225, 12.5, me.score / (drawings.leaderboard.getList().length ? drawings.leaderboard.getList()[0].score : me.score), ...colors.healthBar);
                drawings.drawText(ctx, `Level: ${Math.round(myLevel.display.level)} ${(me.label || "Unknown Class")}`, 0, 12, 8);
                drawings.drawText(ctx, "Score: " + Math.round(myLevel.display.score), 0, -6, 6);
                drawings.drawText(ctx, me.name, 0, -13, 12);
                ctx.restore();
            }
        })(),
        drawBar: function(ctx, x, y, width, height, progress, color1, color2, borderSize = 3, drawBackground = true) {
            ctx.save();
            ctx.translate(x - width / 2, y);
            if (drawBackground) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(width, 0);
                ctx.closePath();
                ctx.lineWidth = height;
                ctx.strokeStyle = color2;
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(width * Math.clamp(progress, 1), 0);
            ctx.closePath();
            ctx.lineWidth = height - borderSize;
            ctx.strokeStyle = color1;
            ctx.stroke();
            ctx.restore();
        },
        drawText: function(ctx, text, x, y, size, align = "center", fill = "#ffffff", stroke = "#000000") {
            ctx.save();
            ctx.font = "bold " + (size * (canvas.width / canvas.height)) + "px Ubuntu";
            ctx.lineWidth = size / 3;
            let offX = align === "center" ? ctx.measureText(text).width / 2 : align === "right" ? ctx.measureText(text).width : 0;
            let offY = ctx.measureText("M").width / 2;
            ctx.fillStyle = fill;
            ctx.strokeStyle = stroke;
            ctx.strokeText(text, x - offX, y - offY);
            ctx.fillText(text, x - offX, y - offY);
            ctx.restore();
        },
        drawPolygon: function(ctx, sides, radius, angle, fill, stroke) {
            ctx.save();
            ctx.rotate(angle - (sides % 2 ? 0 : Math.PI / 2));
            ctx.fillStyle = fill;
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 5;
            if (typeof s === "string") {
                let path = new Path2D(sides);
                ctx.save();
                ctx.scale(radius, radius);
                ctx.lineWidth /= radius;
                if (stroke != null) {
                    ctx.stroke(path);
                }
                ctx.fill(path);
                ctx.restore();
            } else if (sides instanceof Array) {
                ctx.beginPath();
                ctx.rotate(Math.PI / 2);
                for (let point of sides) {
                    let x = point[0] * radius,
                        y = point[1] * radius;
                    ctx.lineTo(x, y);
                }
                ctx.closePath();
                if (stroke != null) {
                    ctx.stroke();
                }
                ctx.fill();
            } else switch (true) {
                case sides === 0:
                    ctx.beginPath();
                    ctx.arc(0, 0, radius, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.fillStyle = ctx.strokeStyle;
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(0, 0, radius - ctx.lineWidth / 2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.fillStyle = fill;
                    ctx.fill();
                    break;
                case (sides < 0 && sides > -17): {
                    ctx.beginPath();
                    angle += sides % 2 ? 0 : Math.PI / sides;
                    let dip = 1 - 6 / sides / sides;
                    sides = -sides;
                    ctx.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
                    for (let i = 0; i < sides; i++) {
                        var theta = ((i + 1) / sides) * 2 * Math.PI;
                        var htheta = ((i + 0.5) / sides) * 2 * Math.PI;
                        var c = {
                            x: radius * dip * Math.cos(htheta + angle),
                            y: radius * dip * Math.sin(htheta + angle)
                        };
                        var p = {
                            x: radius * Math.cos(theta + angle),
                            y: radius * Math.sin(theta + angle)
                        };
                        ctx.quadraticCurveTo(c.x, c.y, p.x, p.y);
                    }
                    ctx.closePath();
                    if (stroke != null) {
                        ctx.stroke();
                    }
                    ctx.fill();
                } break;
                case (sides > 100 && sides < 150): {
                    sides -= 100;
                    sides = -sides;
                    ctx.beginPath();
                    angle += sides % 2 ? 0 : Math.PI / sides;
                    let dip = 1 + 12.5 / sides / sides;
                    sides = -sides;
                    ctx.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
                    for (let i = 0; i < sides; i++) {
                        var theta = ((i + 1) / sides) * 2 * Math.PI;
                        var htheta = ((i + 0.5) / sides) * 2 * Math.PI;
                        var c = {
                            x: radius * dip * Math.cos(htheta + angle),
                            y: radius * dip * Math.sin(htheta + angle)
                        };
                        var p = {
                            x: radius * Math.cos(theta + angle),
                            y: radius * Math.sin(theta + angle)
                        };
                        ctx.quadraticCurveTo(c.x, c.y, p.x, p.y);
                    }
                    ctx.closePath();
                    if (stroke != null) {
                        ctx.stroke();
                    }
                    ctx.fill();
                } break;
                case (sides < 17 && sides > 2): {
                    ctx.beginPath();
                    angle += (sides % 2 ? 0 : Math.PI / sides);
                    for (let i = 0; i < sides; i++) {
                        let theta = (i / sides) * (2 * Math.PI);
                        let x = (radius * 1.25) * Math.cos(theta + angle);
                        let y = (radius * 1.25) * Math.sin(theta + angle);
                        ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    if (stroke != null) {
                        ctx.stroke();
                    }
                    ctx.fill();
                } break;
            }
            ctx.restore();
        },
        entity: function(e) {
            const assignedCtx = e.alpha < 1 ? tankCtx : ctx;
            assignedCtx.save();
            if (assignedCtx === tankCtx) {
                tankCanvas.width = e.size * 10;
                tankCanvas.height = e.size * 10;
                assignedCtx.translate(tankCanvas.width / 2, tankCanvas.height / 2);
            } else {
                assignedCtx.translate((e.x - world.camera.x) / world.camera.ratio + canvas.width / 2, (e.y - world.camera.y) / world.camera.ratio + canvas.height / 2);
            }
            assignedCtx.rotate(e.facing);
            assignedCtx.lineWidth = 5;
            assignedCtx.fillStyle = colors.gray[0];
            assignedCtx.strokeStyle = colors.gray[1];
            for (let i = 0; i < e.guns.length; i ++) {
                const gun = e.guns[i].positionData;
                assignedCtx.rotate(gun.angle);
                assignedCtx.beginPath();
                assignedCtx.moveTo(gun.x * e.size, gun.y * e.size - (gun.width * 0.5 * e.size));
                assignedCtx.lineTo(gun.x * e.size + ((gun.length * e.gunData[i]) * e.size), gun.y * e.size - ((gun.width * gun.open) * 0.5 * e.size));
                assignedCtx.lineTo(gun.x * e.size + ((gun.length * e.gunData[i]) * e.size), gun.y * e.size + ((gun.width * gun.open) * 0.5 * e.size));
                assignedCtx.lineTo(gun.x * e.size, gun.y * e.size + (gun.width * 0.5 * e.size));
                assignedCtx.closePath();
                assignedCtx.stroke();
                assignedCtx.fill();
                assignedCtx.rotate(-gun.angle);
            }
            drawings.drawPolygon(assignedCtx, e.shape || 0, e.size / 2, 0, ...colors[e.color || "blue"]);
            assignedCtx.rotate(-e.facing);
            if (e.type === 1 || e.type === 3) {
                if ((e.health.amount / e.health.max) < .995 && (e.health.amount / e.health.max) > .001) {
                    drawings.drawBar(assignedCtx, 0, e.size, e.size, 7.5, e.health.amount / e.health.max, ...colors.healthBar);
                }
                if (e.type === 1) {
                    if (e.name != null && e.id != me.id) {
                        drawings.drawText(assignedCtx, e.name, 0, -e.size, e.size / 5);
                    }
                    if (e.score != null && e.id != me.id) {
                        drawings.drawText(assignedCtx, e.score, 0, -e.size * .7, e.size / 6.75);
                    }
                }
            }
            assignedCtx.restore();
            if (assignedCtx === tankCtx) {
                ctx.save();
                ctx.globalAlpha = e.alpha;
                ctx.drawImage(tankCanvas, (e.x - world.camera.x) / world.camera.ratio + canvas.width / 2 - tankCanvas.width / 2, (e.y - world.camera.y) / world.camera.ratio + canvas.height / 2 - tankCanvas.height / 2);
                ctx.restore();
            }
        }
    };
    document.body.addEventListener("keydown", function(event) {
        switch (event.keyCode) {
            case 87: case 38: {
                world.inputs.up = true;
            } break;
            case 83: case 40: {
                world.inputs.down = true;
            } break;
            case 65: case 37: {
                world.inputs.left = true;
            } break;
            case 68: case 39: {
                world.inputs.right = true;
            } break;
        }
    });
    document.body.addEventListener("keyup", function(event) {
        switch (event.keyCode) {
            case 87: case 38: {
                world.inputs.up = false;
            } break;
            case 83: case 40: {
                world.inputs.down = false;
            } break;
            case 65: case 37: {
                world.inputs.left = false;
            } break;
            case 68: case 39: {
                world.inputs.right = false;
            } break;
        }
    });
    document.body.addEventListener("mousedown", function(event) {
        if (event.which === 1) {
            world.inputs.lmb = true;
        }
    });
    document.body.addEventListener("mouseup", function(event) {
        if (event.which === 1) {
            world.inputs.lmb = false;
        }
    });
    document.body.addEventListener("mousemove", function(event) {
        world.inputs.mouse = {
            x: event.clientX * devicePixelRatio,
            y: event.clientY * devicePixelRatio
        };
        world.inputs.target = {
            x: (world.inputs.mouse.x - (canvas.width / 2 + (world.camera.rx - world.camera.x))) * world.camera.ratio,
            y: (world.inputs.mouse.y - (canvas.height / 2 + (world.camera.ry - world.camera.y))) * world.camera.ratio
        };
        world.inputs.mouse.angle = Math.atan2(world.inputs.target.y, world.inputs.target.x);
    });
    function collide(instance, other) {
        const angle = Math.atan2(instance.y - other.y, instance.x - other.x);
        let doMotion = true;
        let doDamage = true;
        if (instance.master.master.master.id === other.id || instance.id === other.master.master.master.id || instance.master.master.master.id === other.master.master.master.id) {
            doDamage = false;
            if (instance.hitsOwnType !== other.hitsOwnType || instance.hitsOwnType == null) {
                return;
            }
        }
        if (instance.type === other.type) {
            if (instance.hitsOwnType === other.hitsOwnType && instance.hitsOwnType != null) {
                switch (instance.hitsOwnType) {
                    case "bounce": {
                        instance.velocity.x += (Math.cos(angle) / 10) * instance.pushability * other.density;
                        instance.velocity.y += (Math.sin(angle) / 10) * instance.pushability * other.density;
                        other.velocity.x -= (Math.cos(angle) / 10) * other.pushability * instance.density;
                        other.velocity.y -= (Math.sin(angle) / 10) * other.pushability * instance.density;
                        doMotion = false;
                    } break;
                }
            } else {
                switch (instance.type) {
                    case 3: {
                        instance.velocity.x += (Math.cos(angle) / 3) * instance.pushability * other.density;
                        instance.velocity.y += (Math.sin(angle) / 3) * instance.pushability * other.density;
                        other.velocity.x -= (Math.cos(angle) / 3) * other.pushability * instance.density;
                        other.velocity.y -= (Math.sin(angle) / 3) * other.pushability * instance.density;
                        doMotion = false;
                        doDamage = false;
                    } break;
                }
            }
        }
        if (doMotion) {
            instance.velocity.x += (Math.cos(angle) / 4) * instance.pushability * other.density;
            instance.velocity.y += (Math.sin(angle) / 4) * instance.pushability * other.density;
            other.velocity.x -= (Math.cos(angle) / 4) * other.pushability * instance.density;
            other.velocity.y -= (Math.sin(angle) / 4) * other.pushability * instance.density;
        }
        if (doDamage) {
            instance.health.damage(other.damage);
            other.health.damage(instance.damage);
        }
        if ((instance.type === 1 || instance.type === 3) && instance.health.amount <= 0) {
            other.source.score += Math.round(instance.score / 2) + 1;
        }
        if ((other.type === 1 || other.type === 3) && other.health.amount <= 0) {
            instance.source.score += Math.round(other.score / 2) + 1;
        }
    }
    const bots = [];
    for (let i = 0; i < 10; i ++) {
        bots.push(new Bot());
    }
    const getFps = (function() {
        let lastCalledTime;
        let fps;
        let delta = 0;
        return function() {
            if (!lastCalledTime) {
                lastCalledTime = Date.now();
                fps = 0;
                return fps;
            }
            delta = (Date.now() - lastCalledTime) / 1000;
            lastCalledTime = Date.now();
            fps = 1 / delta;
            return fps;
        }
    })();
    const npcLoop = (function() {
        const census = {
            shape: 0,
            nest: 0
        };
        function spawnShape() {
            const shape = new Entity(...world.getSpawnPos());
            shape.setTank(Math.random() > .8 ? "Pentagon" : Math.random() > .55 ? "Triangle" : "Square");
            shape.onDead = function() {
                census.shape --;
            }
            census.shape ++;
        }
        function spawnNestShape() {
            const shape = new Entity(...world.getSpawnPos(true));
            shape.setTank(Math.random() > .95 ? "Alpha Pentagon" : "Pentagon");
            shape.onDead = function() {
                census.nest --;
            }
            census.nest ++;
        }
        return function() {
            if (census.shape < 125) {
                spawnShape();
            }
            if (census.nest < 30) {
                spawnNestShape();
            }
        }
    })();
    let loops = 0;
    function gameLoop() {
        collisionGrid.clear();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        world.camera.rx = me.x;
        world.camera.ry = me.y;
        world.camera.x = lerp(world.camera.x, world.camera.rx, .075);
        world.camera.y = lerp(world.camera.y, world.camera.ry, .075);
        world.camera.ratio = 1 * ((canvas.width + canvas.height) / 2175);
        world.screenRatio = ((canvas.width + canvas.height) / 2000);
        world.inputs.target = {
            x: (world.inputs.mouse.x - (canvas.width / 2 + (world.camera.rx - world.camera.x))) * world.camera.ratio,
            y: (world.inputs.mouse.y - (canvas.height / 2 + (world.camera.ry - world.camera.y))) * world.camera.ratio
        };
        world.inputs.mouse.angle = Math.atan2(world.inputs.target.y, world.inputs.target.x);
        me.accel.x = -world.inputs.left + world.inputs.right;
        me.accel.y = -world.inputs.up + world.inputs.down;
        me.shooting = world.inputs.lmb;
        me.facing = world.inputs.mouse.angle;
        me.inputs = world.inputs;
        ctx.save();
        drawings.drawBackground();
        for (let id in entities) {
            if (entities[id].update()) {
                drawings.entity(entities[id]);
            }
        }
        for (let id in entities) {
            let instance = entities[id];
            if (!instance.isDead) {
                collisionGrid.queryForCollisionPairs({
                    x: instance.x,
                    y: instance.y,
                    width: instance.size,
                    height: instance.size,
                    id: instance.id
                }).forEach(function(collision) {
                    if (entities[collision] && instance.id !== entities[collision].id) {
                        collide(instance, entities[collision]);
                    }
                });
            }
        }
        bots.forEach(bot => bot.update());
        ctx.restore();
        ctx.save();
        ctx.scale(world.screenRatio, world.screenRatio);
        world.screenWidth /= world.screenRatio;
        world.screenHeight /= world.screenRatio;
        drawings.leaderboard.draw();
        drawings.minimap();
        drawings.nameplate();
        world.screenWidth *= world.screenRatio;
        world.screenHeight *= world.screenRatio;
        ctx.restore();
        if (++loops % 10 === 0) {
            world.fps = getFps();
        } else {
            getFps();
        }
    }
    setInterval(gameLoop, 1000 / 60);
    setInterval(npcLoop, 1000 / 3);
})();