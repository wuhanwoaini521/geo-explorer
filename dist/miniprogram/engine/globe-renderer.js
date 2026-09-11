"use strict";
/**
 * 地球入口的轻量 Canvas 2D 渲染器。
 *
 * 纹理是构建期生成的离线 Natural Earth 等距矩形贴图。运行时只做球面切片、
 * 光照和经纬度投影，不连接在线地图服务，也不把地点 Marker 当成独立 UI 图层。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobeRenderer = void 0;
exports.projectGlobePoint = projectGlobePoint;
const DEG = Math.PI / 180;
const TEXTURE_SRC = "/assets/world/globe-texture-realistic-2048.png";
const STAR_FIELD = [
    [0.08, 0.12, 1.4], [0.19, 0.24, 0.9], [0.31, 0.08, 1.1], [0.47, 0.18, 0.8],
    [0.63, 0.1, 1.2], [0.78, 0.22, 0.9], [0.91, 0.09, 1.4], [0.12, 0.48, 0.8],
    [0.27, 0.56, 1.1], [0.73, 0.48, 0.8], [0.88, 0.58, 1.2], [0.05, 0.78, 0.9],
    [0.18, 0.88, 1.2], [0.41, 0.76, 0.8], [0.57, 0.9, 1.1], [0.84, 0.82, 0.8],
];
function projectGlobePoint(latitude, longitude, rotation, pitch, centerX, centerY, radius) {
    const lat = latitude * DEG;
    const relativeLongitude = longitude * DEG - rotation;
    const cosLat = Math.cos(lat);
    const x3 = cosLat * Math.sin(relativeLongitude);
    const y3 = Math.sin(lat);
    const z3 = cosLat * Math.cos(relativeLongitude);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const pitchedY = y3 * cosPitch - z3 * sinPitch;
    const pitchedZ = y3 * sinPitch + z3 * cosPitch;
    return {
        x: centerX + x3 * radius,
        y: centerY - pitchedY * radius,
        z: pitchedZ,
        visible: pitchedZ > 0,
    };
}
class GlobeRenderer {
    constructor(canvas, width, height, pixelRatio, variant = "half", selectedMode = false) {
        this.markers = [];
        this.renderedMarkers = [];
        this.rotation = 1.5;
        this.selectedId = "";
        this.timer = null;
        this.focusTimer = null;
        this.momentumTimer = null;
        this.resumeTimer = null;
        this.rotating = true;
        this.pitch = 0;
        this.texture = null;
        this.textureReady = false;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.width = width;
        this.height = height;
        this.pixelRatio = Math.max(1, pixelRatio);
        const legacyCenterX = width * 0.5;
        const legacyCenterY = height * 0.43;
        const legacyRadius = Math.min(width * 0.50, height * 0.48);
        // 默认地图状态必须让球体轮廓落在 Canvas 内部。此前把球心和半径
        // 放到视口外，真实贴图被 Canvas 矩形边界截断，产生明显的“裁剪图”感。
        this.centerX = selectedMode ? legacyCenterX : variant === "third" ? width * 0.56 : variant === "low" ? width * 0.56 : width * 0.5;
        this.centerY = selectedMode ? legacyCenterY : variant === "third" ? height * 1.26 : variant === "low" ? height * 1.16 : height * 0.6;
        this.radius = selectedMode ? legacyRadius : variant === "third"
            ? Math.min(width * 0.50, height * 0.48)
            : variant === "low"
                ? Math.min(width * 0.8, height * 0.9)
                : Math.min(width * 0.52, height * 0.56);
        this.canvas.width = Math.round(width * this.pixelRatio);
        this.canvas.height = Math.round(height * this.pixelRatio);
        // Canvas 2D defaults vary between WeChat simulator versions. Set these
        // after resizing because changing the backing store resets the context.
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = "high";
        this.ctx.scale(this.pixelRatio, this.pixelRatio);
        this.loadTexture();
        this.draw();
    }
    setMarkers(markers) {
        this.markers = markers;
        this.draw();
    }
    setSelected(id) {
        this.selectedId = id !== null && id !== void 0 ? id : "";
        this.draw();
    }
    start() {
        if (this.timer !== null)
            return;
        this.timer = setInterval(() => {
            if (this.rotating) {
                this.rotation += 0.006;
                this.draw();
            }
        }, 80);
    }
    stop() {
        if (this.timer !== null)
            clearInterval(this.timer);
        this.timer = null;
        this.cancelMotion();
    }
    pauseRotation() {
        this.rotating = false;
    }
    resumeRotation() {
        this.rotating = true;
    }
    reset() {
        this.cancelMotion();
        this.rotation = 1.5;
        this.pitch = 0;
        this.selectedId = "";
        this.draw();
    }
    dragBy(deltaX, deltaY = 0) {
        this.cancelFocus();
        this.rotation += (deltaX / Math.max(1, this.width)) * 2.2;
        this.pitch = Math.max(-0.38, Math.min(0.38, this.pitch - (deltaY / Math.max(1, this.height)) * 1.2));
        this.draw();
    }
    release(velocityX, velocityY) {
        this.cancelMotion();
        let momentumX = velocityX;
        let momentumY = velocityY;
        if (Math.abs(momentumX) < 0.8 && Math.abs(momentumY) < 0.8) {
            this.scheduleAutoResume();
            return;
        }
        this.rotating = false;
        this.momentumTimer = setInterval(() => {
            this.rotation += (momentumX / Math.max(1, this.width)) * 0.42;
            this.pitch = Math.max(-0.38, Math.min(0.38, this.pitch - (momentumY / Math.max(1, this.height)) * 0.16));
            momentumX *= 0.86;
            momentumY *= 0.86;
            this.draw();
            if (Math.abs(momentumX) < 0.25 && Math.abs(momentumY) < 0.25) {
                if (this.momentumTimer !== null)
                    clearInterval(this.momentumTimer);
                this.momentumTimer = null;
                this.scheduleAutoResume();
            }
        }, 80);
    }
    focusOnMarker(id) {
        const marker = this.markers.find((item) => item.id === id);
        if (!marker)
            return;
        this.cancelMotion();
        this.rotating = false;
        const from = this.rotation;
        const rawTarget = marker.longitude * DEG;
        const target = from + Math.atan2(Math.sin(rawTarget - from), Math.cos(rawTarget - from));
        const startedAt = Date.now();
        const duration = 760;
        this.focusTimer = setInterval(() => {
            const progress = Math.min(1, (Date.now() - startedAt) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            this.rotation = from + (target - from) * eased;
            this.draw();
            if (progress >= 1) {
                if (this.focusTimer !== null)
                    clearInterval(this.focusTimer);
                this.focusTimer = null;
                this.scheduleAutoResume(2600);
            }
        }, 16);
    }
    hitTest(x, y) {
        var _a;
        const candidates = [...this.renderedMarkers].sort((a, b) => b.z - a.z);
        const hitRadius = Math.max(20, this.radius * 0.075);
        const hit = candidates.find((marker) => Math.hypot(marker.x - x, marker.y - y) <= hitRadius);
        return (_a = hit === null || hit === void 0 ? void 0 : hit.id) !== null && _a !== void 0 ? _a : null;
    }
    draw() {
        const ctx = this.ctx;
        const { centerX, centerY, radius } = this;
        ctx.clearRect(0, 0, this.width, this.height);
        this.drawStars();
        ctx.save();
        ctx.shadowColor = "rgba(28, 180, 226, .45)";
        ctx.shadowBlur = 26;
        ctx.fillStyle = "rgba(4, 29, 51, .72)";
        ctx.beginPath();
        ctx.ellipse(centerX + radius * 0.04, centerY + radius * 0.86, radius * 0.72, radius * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        const ocean = ctx.createRadialGradient(centerX - radius * 0.44, centerY - radius * 0.52, radius * 0.06, centerX, centerY, radius * 1.1);
        ocean.addColorStop(0, "#2e819b");
        ocean.addColorStop(0.32, "#0f526e");
        ocean.addColorStop(0.72, "#07354f");
        ocean.addColorStop(1, "#011a30");
        ctx.fillStyle = ocean;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
        ctx.clip();
        if (this.textureReady && this.texture) {
            this.drawTexture();
            // 等距矩形贴图在两极会把多个经度压到同一个像素区域。兜底
            // Canvas 无法像 WebGL 一样在极点做 UV 平均，因此用柔和的极冠
            // 过渡压掉切片形成的 V 形条带，避免出现“破碎地球”。
            this.drawPolarCaps();
        }
        this.drawGrid();
        this.drawDirectionalLight();
        this.drawLimbDarkening();
        ctx.restore();
        this.drawAtmosphere();
        this.renderedMarkers = this.markers
            .map((marker) => {
            const point = projectGlobePoint(marker.latitude, marker.longitude, this.rotation, this.pitch, centerX, centerY, radius);
            return { ...marker, x: point.x, y: point.y, z: point.z };
        })
            .filter((marker) => marker.z > 0.015)
            .sort((a, b) => a.z - b.z);
        this.renderedMarkers.forEach((marker) => this.drawMarker(marker));
    }
    drawStars() {
        const ctx = this.ctx;
        STAR_FIELD.forEach(([x, y, size]) => {
            ctx.globalAlpha = 0.46 + size * 0.18;
            ctx.fillStyle = "#c5f4ff";
            ctx.beginPath();
            ctx.arc(this.width * x, this.height * y, size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
    loadTexture() {
        if (!this.canvas.createImage)
            return;
        const image = this.canvas.createImage();
        image.onload = () => {
            this.texture = image;
            this.textureReady = true;
            this.draw();
        };
        image.onerror = () => {
            this.textureReady = false;
            this.draw();
        };
        image.src = TEXTURE_SRC;
    }
    drawTexture() {
        const ctx = this.ctx;
        const texture = this.texture;
        if (!texture || texture.width <= 0 || texture.height <= 0)
            return;
        // 以更细的逻辑像素切片采样。兜底 Canvas 没有 WebGL 的球面 UV，
        // 切片过宽会把经线和云层看成明显的条带，尤其是两极区域。
        const step = Math.max(2, Math.min(3, Math.round(this.radius / 180)));
        const pitchScale = Math.cos(this.pitch);
        for (let localX = -this.radius; localX < this.radius; localX += step) {
            const localXEnd = Math.min(this.radius, localX + step);
            const sampleX = (localX + localXEnd) / 2;
            const normalizedX = sampleX / this.radius;
            const edge = Math.sqrt(Math.max(0, 1 - normalizedX * normalizedX));
            if (edge < 0.01)
                continue;
            const longitudeStart = this.rotation + Math.asin(Math.max(-1, Math.min(1, localX / this.radius)));
            const longitudeEnd = this.rotation + Math.asin(Math.max(-1, Math.min(1, localXEnd / this.radius)));
            const latEdge = Math.asin(edge) / DEG;
            const sourceY = Math.max(0, ((90 - latEdge) / 180) * texture.height);
            const sourceHeight = Math.max(1, ((latEdge * 2) / 180) * texture.height);
            const longitudeSpan = Math.max(0, longitudeEnd - longitudeStart);
            const sourceWidth = Math.max(1, Math.min(texture.width * 0.08, longitudeSpan * texture.width / (2 * Math.PI)));
            const sourceX = ((longitudeStart / (2 * Math.PI) + 0.5) * texture.width) % texture.width;
            const safeSourceX = sourceX < 0 ? sourceX + texture.width : sourceX;
            const destinationHeight = edge * this.radius * 2 * pitchScale;
            const destinationY = this.centerY - destinationHeight / 2 + Math.sin(this.pitch) * this.radius * 0.12;
            const destinationX = this.centerX + localX;
            const destinationWidth = localXEnd - localX + 0.75;
            ctx.globalAlpha = 0.94;
            if (safeSourceX + sourceWidth <= texture.width) {
                ctx.drawImage(texture, safeSourceX, sourceY, sourceWidth, sourceHeight, destinationX, destinationY, destinationWidth, destinationHeight);
            }
            else {
                const firstWidth = texture.width - safeSourceX;
                const firstDestinationWidth = destinationWidth * firstWidth / sourceWidth;
                ctx.drawImage(texture, safeSourceX, sourceY, firstWidth, sourceHeight, destinationX, destinationY, firstDestinationWidth, destinationHeight);
                ctx.drawImage(texture, 0, sourceY, sourceWidth - firstWidth, sourceHeight, destinationX + firstDestinationWidth, destinationY, destinationWidth - firstDestinationWidth, destinationHeight);
            }
        }
        ctx.globalAlpha = 1;
    }
    drawPolarCaps() {
        const ctx = this.ctx;
        const { centerX, centerY, radius } = this;
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
        ctx.clip();
        const north = ctx.createLinearGradient(0, centerY - radius, 0, centerY - radius * 0.58);
        north.addColorStop(0, "rgba(236, 247, 247, .82)");
        north.addColorStop(.58, "rgba(128, 184, 199, .18)");
        north.addColorStop(1, "rgba(20, 66, 84, 0)");
        ctx.fillStyle = north;
        ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 0.48);
        const south = ctx.createLinearGradient(0, centerY + radius, 0, centerY + radius * 0.58);
        south.addColorStop(0, "rgba(236, 247, 247, .76)");
        south.addColorStop(.58, "rgba(128, 184, 199, .16)");
        south.addColorStop(1, "rgba(20, 66, 84, 0)");
        ctx.fillStyle = south;
        ctx.fillRect(centerX - radius, centerY + radius * 0.52, radius * 2, radius * 0.48);
        ctx.restore();
    }
    drawDirectionalLight() {
        const ctx = this.ctx;
        const light = ctx.createRadialGradient(this.centerX - this.radius * 0.48, this.centerY - this.radius * 0.56, this.radius * 0.04, this.centerX, this.centerY, this.radius * 1.15);
        light.addColorStop(0, "rgba(182, 239, 237, .18)");
        light.addColorStop(0.35, "rgba(85, 171, 183, .08)");
        light.addColorStop(0.75, "rgba(5, 27, 43, .16)");
        light.addColorStop(1, "rgba(0, 8, 18, .46)");
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    drawLimbDarkening() {
        const ctx = this.ctx;
        const edge = ctx.createRadialGradient(this.centerX, this.centerY, this.radius * 0.48, this.centerX, this.centerY, this.radius * 1.02);
        edge.addColorStop(0, "rgba(0, 0, 0, 0)");
        edge.addColorStop(0.72, "rgba(0, 7, 15, .08)");
        edge.addColorStop(1, "rgba(0, 5, 14, .68)");
        ctx.fillStyle = edge;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = "rgba(150, 224, 236, .085)";
        ctx.lineWidth = 0.45;
        [-45, 0, 45].forEach((latitude) => this.drawGeoLine(Array.from({ length: 25 }, (_, index) => [latitude, -180 + index * 15])));
        for (let longitude = -180; longitude < 180; longitude += 45) {
            this.drawGeoLine(Array.from({ length: 25 }, (_, index) => [-90 + index * 7.5, longitude]));
        }
    }
    drawGeoLine(points) {
        const ctx = this.ctx;
        let open = false;
        points.forEach(([latitude, longitude]) => {
            const point = projectGlobePoint(latitude, longitude, this.rotation, this.pitch, this.centerX, this.centerY, this.radius);
            if (point.visible) {
                if (!open) {
                    ctx.beginPath();
                    ctx.moveTo(point.x, point.y);
                    open = true;
                }
                else {
                    ctx.lineTo(point.x, point.y);
                }
            }
            else if (open) {
                ctx.stroke();
                open = false;
            }
        });
        if (open)
            ctx.stroke();
    }
    drawAtmosphere() {
        const ctx = this.ctx;
        ctx.strokeStyle = "rgba(126, 229, 255, .44)";
        ctx.lineWidth = 1.8;
        ctx.shadowColor = "rgba(66, 206, 255, .38)";
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius - 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    drawMarker(marker) {
        const ctx = this.ctx;
        const selected = marker.id === this.selectedId;
        const explored = marker.state === "explored";
        const color = selected ? "#ff8264" : explored ? "#b2e4c1" : "#66e4ef";
        const depth = Math.max(0, Math.min(1, marker.z));
        const markerRadius = selected ? 7 : explored ? 4.5 + depth : 3.4 + depth * 1.6;
        ctx.save();
        ctx.globalAlpha = Math.max(0.34, Math.min(1, marker.z * 0.7 + 0.3));
        ctx.shadowColor = color;
        ctx.shadowBlur = selected ? 18 : 10;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, markerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#effcff";
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, 2, 0, Math.PI * 2);
        ctx.fill();
        const showLabel = selected || explored || marker.featured || marker.z > 0.48;
        if (showLabel) {
            const label = marker.nameEn || marker.name;
            ctx.font = selected || explored ? "600 12px sans-serif" : "500 10px sans-serif";
            const labelWidth = Math.max(ctx.measureText(label).width, marker.metricText.length * 5.2) + 18;
            const labelX = Math.max(5, Math.min(this.width - labelWidth - 5, marker.x + 12));
            const labelY = Math.max(8, Math.min(this.height - 38, marker.y - 31));
            ctx.fillStyle = "rgba(3, 23, 39, .82)";
            ctx.fillRect(labelX, labelY, labelWidth, 30);
            ctx.fillStyle = "#f2fcff";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(label, labelX + 9, labelY + 5);
            ctx.font = "500 9px sans-serif";
            ctx.fillStyle = "rgba(165, 224, 237, .85)";
            ctx.fillText(marker.metricText, labelX + 9, labelY + 18);
        }
        ctx.restore();
    }
    cancelFocus() {
        if (this.focusTimer !== null)
            clearInterval(this.focusTimer);
        this.focusTimer = null;
    }
    cancelMotion() {
        this.cancelFocus();
        if (this.momentumTimer !== null)
            clearInterval(this.momentumTimer);
        this.momentumTimer = null;
        if (this.resumeTimer !== null)
            clearTimeout(this.resumeTimer);
        this.resumeTimer = null;
    }
    scheduleAutoResume(delay = 1400) {
        if (this.resumeTimer !== null)
            clearTimeout(this.resumeTimer);
        this.resumeTimer = setTimeout(() => {
            this.resumeTimer = null;
            this.rotating = true;
        }, delay);
    }
}
exports.GlobeRenderer = GlobeRenderer;
