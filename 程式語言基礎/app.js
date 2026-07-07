// Web Audio API 音效播放器
const AudioPlayer = {
  ctx: null,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  playBeep() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  },

  playSuccess() {
    this.init();
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.1);
      gain.gain.setValueAtTime(0.15, now + index * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.2);

      osc.start(now + index * 0.1);
      osc.stop(now + index * 0.1 + 0.2);
    });
  },

  playFail() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, now); // E4
    osc.frequency.linearRampToValueAtTime(110, now + 0.4); // Slide down to A2
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.start();
    osc.stop(now + 0.4);
  }
};

// Web Speech API 語音朗讀系統
const SpeechReader = {
  currentUtterance: null,
  activeBtn: null,

  speak(text, button) {
    // 如果正在播放且點擊同一個，就停止
    if (window.speechSynthesis.speaking && this.activeBtn === button) {
      window.speechSynthesis.cancel();
      this.clearActive();
      return;
    }

    // 停止之前的播放
    window.speechSynthesis.cancel();
    this.clearActive();

    this.activeBtn = button;
    this.activeBtn.classList.add('playing');
    this.activeBtn.textContent = '⏸️';

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.lang = 'zh-TW';
    this.currentUtterance.rate = 1.0;

    this.currentUtterance.onend = () => {
      this.clearActive();
    };

    this.currentUtterance.onerror = () => {
      this.clearActive();
    };

    window.speechSynthesis.speak(this.currentUtterance);
  },

  clearActive() {
    if (this.activeBtn) {
      this.activeBtn.classList.remove('playing');
      this.activeBtn.textContent = '📢';
      this.activeBtn = null;
    }
  }
};

// BASIC 語言模擬器
const BasicSimulator = {
  terminal: null,
  presets: {
    hello: `10 PRINT "哈囉！小朋友！"\n20 PRINT "歡迎來到程式冒險！"\n30 PRINT "電腦非常聽你的話喔！"`,
    stars: `10 PRINT "⭐️"\n20 PRINT "⭐️ ⭐️"\n30 PRINT "⭐️ ⭐️ ⭐️"\n40 PRINT "✨ 亮晶晶的星星牆！ ✨"`,
    loop: `10 PRINT "準備起跑！"\n20 PRINT "跑第 1 圈！"\n30 PRINT "跑第 2 圈！"\n40 PRINT "跑第 3 圈！"\n50 PRINT "到達終點！歡呼！🎉"`
  },

  init() {
    this.terminal = document.getElementById('basic-terminal');
    this.selectPreset('hello');
  },

  selectPreset(key) {
    document.querySelectorAll('.demo-code-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`preset-${key}`).classList.add('active');
    this.currentCode = this.presets[key];
    this.clearTerminal();
    this.terminal.textContent = this.currentCode + '\n\n(點選下方「執行程式」來看看結果吧！)';
  },

  clearTerminal() {
    this.terminal.textContent = '';
  },

  run() {
    AudioPlayer.playBeep();
    this.clearTerminal();
    this.terminal.textContent = 'LOADING BASIC v2.0...\nRUN\n\n';

    const lines = this.currentCode.split('\n');
    let delay = 0;

    lines.forEach((line) => {
      setTimeout(() => {
        // 解析簡單的 PRINT 指令
        const printMatch = line.match(/^\d+\s+PRINT\s+"([^"]+)"/);
        if (printMatch) {
          this.terminal.textContent += printMatch[1] + '\n';
        } else {
          this.terminal.textContent += line + '\n';
        }
        // 滾動到最底
        this.terminal.scrollTop = this.terminal.scrollHeight;
      }, delay);
      delay += 300;
    });

    setTimeout(() => {
      this.terminal.textContent += '\nREADY.\n■';
      AudioPlayer.playSuccess();
    }, delay);
  }
};

// Scratch 銜接對照
function showScratchBridge(mode) {
  AudioPlayer.playBeep();
  const basicDisplay = document.getElementById('bridge-basic');
  const scratchDisplay = document.getElementById('bridge-scratch');

  if (mode === 'print') {
    basicDisplay.innerHTML = `<pre>10 PRINT "哈囉！"</pre>`;
    scratchDisplay.innerHTML = `
      <div class="scratch-block block-stack">
        說出 [ 哈囉！ ] 2 秒
      </div>
    `;
  } else if (mode === 'loop') {
    basicDisplay.innerHTML = `<pre>10 PRINT "安安"
20 GOTO 10</pre>`;
    scratchDisplay.innerHTML = `
      <div class="scratch-block block-control">
        <div class="block-control-header">重複無限次</div>
        <div class="block-control-body">
          <div class="scratch-block block-stack" style="margin: 0; width: 100%;">
            說出 [ 安安 ] 2 秒
          </div>
        </div>
      </div>
    `;
  } else if (mode === 'robot') {
    basicDisplay.innerHTML = `<pre>10 ROBOT.FORWARD
20 ROBOT.TURN_LEFT</pre>`;
    scratchDisplay.innerHTML = `
      <div class="scratch-block block-stack">
        移動 [ 1 ] 步
      </div>
      <br>
      <div class="scratch-block block-stack" style="background: #855cd6;">
        左轉 ↺ [ 90 ] 度
      </div>
    `;
  }
}

// 機器人控制遊戲
const RobotGame = {
  // 5x5 地圖定義 (0: 空地, 1: 障礙物🌲, 2: 終點旗子🏁, 3: 星星⭐️)
  map: [
    [0, 0, 0, 0, 2],
    [0, 1, 1, 0, 0],
    [0, 0, 0, 1, 0],
    [1, 1, 0, 0, 0],
    [0, 0, 0, 0, 0] // 機器人起點在 (0, 4) 即左下角
  ],
  robot: {
    x: 0,
    y: 4,
    dir: 'up' // up, right, down, left
  },
  commands: [],
  running: false,

  init() {
    this.resetGame();
  },

  resetGame() {
    this.robot.x = 0;
    this.robot.y = 4;
    this.robot.dir = 'up';
    this.commands = [];
    this.running = false;
    this.renderMap();
    this.renderCommands();
  },

  addCommand(cmd) {
    if (this.running) return;
    AudioPlayer.playBeep();
    this.commands.push(cmd);
    this.renderCommands();
  },

  removeCommand(index) {
    if (this.running) return;
    AudioPlayer.playBeep();
    this.commands.splice(index, 1);
    this.renderCommands();
  },

  renderCommands() {
    const listDiv = document.getElementById('robot-cmd-list');
    listDiv.innerHTML = '';
    
    if (this.commands.length === 0) {
      listDiv.innerHTML = '<span style="color: #94a3b8; font-size: 0.9rem; padding: 0.5rem;">尚未加入指令，請點選上方按鈕！</span>';
      return;
    }

    const cmdNames = {
      forward: '前進 ⬆️',
      left: '左轉 ↺',
      right: '右轉 ↻'
    };

    this.commands.forEach((cmd, idx) => {
      const badge = document.createElement('div');
      badge.className = 'command-badge';
      badge.innerHTML = `${cmdNames[cmd]} <button onclick="RobotGame.removeCommand(${idx})">×</button>`;
      listDiv.appendChild(badge);
    });
  },

  renderMap() {
    const grid = document.getElementById('robot-grid');
    grid.innerHTML = '';
    
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = document.createElement('div');
        cell.className = 'map-cell';
        
        // 渲染地圖元素
        if (this.map[r][c] === 1) {
          cell.className += ' obstacle';
          cell.textContent = '🌲';
        } else if (this.map[r][c] === 2) {
          cell.className += ' target';
          cell.textContent = '🏁';
        } else if (this.map[r][c] === 3) {
          cell.textContent = '⭐️';
        }

        // 渲染機器人
        if (this.robot.x === c && this.robot.y === r) {
          const rob = document.createElement('div');
          rob.className = `robot-sprite face-${this.robot.dir}`;
          rob.textContent = '🤖';
          cell.appendChild(rob);
        }

        grid.appendChild(cell);
      }
    }
  },

  async runProgram() {
    if (this.running || this.commands.length === 0) return;
    this.running = true;
    
    for (let i = 0; i < this.commands.length; i++) {
      if (!this.running) break;
      const cmd = this.commands[i];
      
      // 移動/轉向邏輯
      if (cmd === 'left') {
        const dirs = ['up', 'left', 'down', 'right'];
        const idx = dirs.indexOf(this.robot.dir);
        this.robot.dir = dirs[(idx + 1) % 4];
        AudioPlayer.playBeep();
      } else if (cmd === 'right') {
        const dirs = ['up', 'right', 'down', 'left'];
        const idx = dirs.indexOf(this.robot.dir);
        this.robot.dir = dirs[(idx + 1) % 4];
        AudioPlayer.playBeep();
      } else if (cmd === 'forward') {
        let nextX = this.robot.x;
        let nextY = this.robot.y;

        if (this.robot.dir === 'up') nextY--;
        else if (this.robot.dir === 'right') nextX++;
        else if (this.robot.dir === 'down') nextY++;
        else if (this.robot.dir === 'left') nextX--;

        // 碰撞邊界與障礙物判定
        if (nextX < 0 || nextX >= 5 || nextY < 0 || nextY >= 5 || this.map[nextY][nextX] === 1) {
          AudioPlayer.playFail();
          alert('💥 哎呀！機器人撞到牆壁或樹木了！請重新排程指令。');
          this.resetGame();
          return;
        } else {
          this.robot.x = nextX;
          this.robot.y = nextY;
          AudioPlayer.playBeep();
        }
      }

      this.renderMap();
      await new Promise(resolve => setTimeout(resolve, 600));

      // 抵達終點判定
      if (this.map[this.robot.y][this.robot.x] === 2) {
        AudioPlayer.playSuccess();
        alert('🎉 太棒了！機器人成功到達終點🏁！你真是程式小達人！');
        this.resetGame();
        return;
      }
    }

    // 跑完指令卻沒到終點
    AudioPlayer.playFail();
    alert('🤖 咦？指令執行完了，但機器人還沒走到終點旗子喔，再試試看！');
    this.running = false;
  }
};

// 頁面初始化
window.addEventListener('DOMContentLoaded', () => {
  BasicSimulator.init();
  RobotGame.init();
  showScratchBridge('print');
});
