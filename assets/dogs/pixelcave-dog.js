// Pixelcave dog sprite-sheet player (800×512 grids, 8 animation rows).
// Fleet copy: static/assets/dogs/pixelcave-dog.js
window.PixelcaveDog = (() => {
  const ROW_H = 64;
  const SHEET_W = 800;
  const SHEET_H = 512;

  const ANIMS = {
    jump: { row: 0, frames: 11, fps: 10 },
    idle1: { row: 1, frames: 5, fps: 4 },
    idle2: { row: 2, frames: 5, fps: 4 },
    sit: { row: 3, frames: 9, fps: 6 },
    walk: { row: 4, frames: 5, fps: 8 },
    run: { row: 5, frames: 8, fps: 12 },
    sniff: { row: 6, frames: 8, fps: 6 },
    sniffWalk: { row: 7, frames: 8, fps: 8 },
  };

  function mount(host, opts) {
    if (!host) return null;
    opts = opts || {};
    const scale = opts.scale || 4;
    const animName = opts.anim || "idle1";
    const anim = ANIMS[animName] || ANIMS.idle1;
    const canvas = document.createElement("canvas");
    canvas.className = "pixelcave-dog-canvas";
    canvas.style.imageRendering = "pixelated";
    host.innerHTML = "";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;

    const img = new Image();
    img.decoding = "async";
    let raf = 0;
    let running = true;
    let frame = 0;
    let acc = 0;
    let last = 0;
    let frameW = 32;
    let frameH = 32;

    function resizeCanvas() {
      canvas.width = Math.ceil(frameW * scale);
      canvas.height = Math.ceil(frameH * scale);
    }

    function draw(at) {
      const rowY = anim.row * ROW_H;
      const sliceW = SHEET_W / anim.frames;
      const sx = Math.floor(at * sliceW);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sx, rowY, sliceW, ROW_H, 0, 0, canvas.width, canvas.height);
    }

    function tick(now) {
      if (!running) return;
      if (!last) last = now;
      const dt = (now - last) / 1000;
      last = now;
      acc += dt;
      const step = 1 / anim.fps;
      while (acc >= step) {
        acc -= step;
        frame = (frame + 1) % anim.frames;
      }
      draw(frame);
      raf = requestAnimationFrame(tick);
    }

    img.onload = () => {
      frameW = Math.floor(SHEET_W / anim.frames);
      frameH = ROW_H;
      resizeCanvas();
      draw(0);
      raf = requestAnimationFrame(tick);
    };
    img.onerror = () => {
      host.textContent = "Dog sheet failed to load";
    };
    img.src = opts.sheet || "pixelcave/pomeranianasset-grid.png";

    return {
      destroy() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
      },
      setAnim(name) {
        const next = ANIMS[name];
        if (!next) return;
        Object.assign(anim, next);
        frame = 0;
        acc = 0;
        frameW = Math.floor(SHEET_W / anim.frames);
        resizeCanvas();
      },
      canvas,
      img,
      ANIMS,
    };
  }

  return { mount, ANIMS, ROW_H, SHEET_W, SHEET_H };
})();
