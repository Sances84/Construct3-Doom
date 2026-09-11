// doom-c3.js
(function () {
  "use strict";

  const DOOM_W = 640; // 320 * 2
  const DOOM_H = 400; // 200 * 2

  const memory = new WebAssembly.Memory({ initial: 108 });
  let doomInstance = null;
  let targetCanvasInstance = null;

  // Doom keycode converter
  function toDoomKey(keyCode) {
    switch (keyCode) {
      case 8:  return 127;         // Backspace
      case 13: return 13;          // Enter
      case 17: return 0x80 + 0x1d; // RCTRL (Fire)
      case 18: return 0x80 + 0x38; // RALT (Strafe)
      case 32: return 32;          // Space (Open/Use)
      case 37: return 0xac;        // Left
      case 38: return 0xad;        // Up
      case 39: return 0xae;        // Right
      case 40: return 0xaf;        // Down
      default:
        if (keyCode >= 65 && keyCode <= 90) return keyCode + 32; // A-Z -> a-z
        if (keyCode >= 112 && keyCode <= 123) return keyCode + 75; // F1-F12
        return keyCode;
    }
  }

  // Blits WASM pixel buffer directly to Construct 3's DrawingCanvas
  function drawCanvas(ptr) {
    if (!targetCanvasInstance) return;

    const doom_screen = new Uint8ClampedArray(
      memory.buffer,
      ptr,
      DOOM_W * DOOM_H * 4
    );
    const render_screen = new ImageData(doom_screen, DOOM_W, DOOM_H);

    // Official Construct 3 method to load raw ImageData into the GPU
    if (typeof targetCanvasInstance.loadImagePixelData === "function") {
      targetCanvasInstance.loadImagePixelData(render_screen, false);
    }
  }

  // WASM Imports
  const importObject = {
    js: {
      js_console_log: () => {},
      js_stdout: () => {},
      js_stderr: () => {},
      js_milliseconds_since_start: () => performance.now(),
      js_draw_screen: drawCanvas,
    },
    env: {
      memory,
    },
  };

  window.C3Doom = {
    isReady: false,

    async init(wasmUrl = "doom.wasm") {
      console.log("[DOOM] Booting WASM engine...");
      const response = await fetch(wasmUrl);
      const { instance } = await WebAssembly.instantiateStreaming(response, importObject);
      
      doomInstance = instance;
      doomInstance.exports.main(); // Start DOOM core
      this.isReady = true;
      console.log("[DOOM] Ready!");
    },

    bindCanvas(c3Canvas) {
      targetCanvasInstance = c3Canvas;
    },

    step() {
      if (this.isReady && doomInstance) {
        doomInstance.exports.doom_loop_step();
      }
    },

    keyDown(keyCode) {
      if (this.isReady) {
        doomInstance.exports.add_browser_event(0 /*KeyDown*/, toDoomKey(keyCode));
      }
    },

    keyUp(keyCode) {
      if (this.isReady) {
        doomInstance.exports.add_browser_event(1 /*KeyUp*/, toDoomKey(keyCode));
      }
    }
  };
})();