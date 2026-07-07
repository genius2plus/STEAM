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
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.08);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  },

  playSuccess() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 -> E5 -> G5 -> C6
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.09);
      gain.gain.setValueAtTime(0.12, now + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.005, now + index * 0.09 + 0.18);

      osc.start(now + index * 0.09);
      osc.stop(now + index * 0.09 + 0.18);
    });
  },

  playFail() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.35);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);

    osc.start();
    osc.stop(now + 0.35);
  }
};

// Web Speech API 語音朗讀系統（斷句與流暢度優化）
const SpeechReader = {
  currentUtterance: null,
  activeBtn: null,
  speechQueue: [],
  queueIndex: 0,
  isPlaying: false,

  speak(text, button) {
    this.initVoice();

    // 如果正在播放且點選同一個按鈕，則停止
    if (this.isPlaying && this.activeBtn === button) {
      this.stop();
      return;
    }

    // 停止之前的播放
    this.stop();

    this.activeBtn = button;
    this.activeBtn.classList.add('playing');
    this.activeBtn.textContent = '⏸️';
    this.isPlaying = true;

    // 清理與優化朗讀內容（口語化）
    let cleanText = text
      .replace(/v2\.0/gi, '第二版')
      .replace(/v3\.0/gi, '第三版')
      .replace(/PRINT/g, ' 印出 ')
      .replace(/GOTO/g, ' 跳轉到 ')
      .replace(/ROBOT/g, ' 機器人 ')
      .replace(/FORWARD/g, ' 前進 ')
      .replace(/TURN_LEFT/g, ' 左轉 ')
      .replace(/10|20|30|40|50/g, (m) => m + '行 ')
      .replace(/0/g, '零')
      .replace(/1/g, '一');

    // 斷句切分（逗號、句號、驚嘆號、問號、分號）
    this.speechQueue = cleanText.split(/[，。！；？,;!?\n]+/).map(s => s.trim()).filter(s => s.length > 0);
    this.queueIndex = 0;

    this.playNextChunk();
  },

  playNextChunk() {
    if (!this.isPlaying || this.queueIndex >= this.speechQueue.length) {
      this.clearActive();
      return;
    }

    const chunkText = this.speechQueue[this.queueIndex];
    this.currentUtterance = new SpeechSynthesisUtterance(chunkText);
    
    // 設置台灣/中文語音（優先選擇高品質的線上神經網路自然語音 Neural/Online/Natural）
    const voices = window.speechSynthesis.getVoices();
    
    // 篩選所有中文語音 (台灣優先，其次香港、大陸)
    const chineseVoices = voices.filter(v => 
      v.lang.includes('zh-TW') || v.lang.includes('zh-HK') || v.lang.includes('zh-CN')
    );

    // 優先排序：包含 'Natural' > 'Online' > 'Neural' > 'Google' > 其他
    chineseVoices.sort((a, b) => {
      const getScore = (voice) => {
        let score = 0;
        const name = voice.name.toLowerCase();
        if (voice.lang.includes('zh-TW')) score += 100; // 台灣腔優先
        if (name.includes('natural')) score += 50;
        if (name.includes('online')) score += 40;
        if (name.includes('neural')) score += 30;
        if (name.includes('google')) score += 20;
        return score;
      };
      return getScore(b) - getScore(a);
    });

    const bestVoice = chineseVoices[0];
    if (bestVoice) {
      this.currentUtterance.voice = bestVoice;
    }

    // 語速設置（1.0 為標準正常語速）
    this.currentUtterance.rate = 1.0;
    this.currentUtterance.pitch = 1.05; // 稍微高亢活潑一點

    this.currentUtterance.onend = () => {
      this.queueIndex++;
      // 短暫停頓，使語音更流暢自然
      setTimeout(() => {
        this.playNextChunk();
      }, 120);
    };

    this.currentUtterance.onerror = () => {
      this.clearActive();
    };

    window.speechSynthesis.speak(this.currentUtterance);
  },

  stop() {
    window.speechSynthesis.cancel();
    this.clearActive();
    this.speechQueue = [];
    this.queueIndex = 0;
    this.isPlaying = false;
  },

  clearActive() {
    if (this.activeBtn) {
      this.activeBtn.classList.remove('playing');
      this.activeBtn.textContent = '📢';
      this.activeBtn = null;
    }
    this.isPlaying = false;
  },

  initVoice() {
    // 確保語音列表已加載（解決某些瀏覽器非同步加載問題）
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {};
    }
  }
};

// 簡報 (PPT) 控制核心
const Presentation = {
  currentSlide: 0,
  slides: [],
  dotsContainer: null,

  init() {
    this.slides = document.querySelectorAll('.slide');
    this.dotsContainer = document.getElementById('ppt-dots');
    
    // 建立底部小圓點
    this.dotsContainer.innerHTML = '';
    this.slides.forEach((_, idx) => {
      const dot = document.createElement('span');
      dot.className = 'dot' + (idx === 0 ? ' active' : '');
      dot.onclick = () => this.goToSlide(idx);
      this.dotsContainer.appendChild(dot);
    });

    this.updateButtons();

    // 監聽鍵盤左右鍵
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        this.nextSlide();
      } else if (e.key === 'ArrowLeft') {
        this.prevSlide();
      }
    });
  },

  updateButtons() {
    document.getElementById('btn-prev').disabled = this.currentSlide === 0;
    document.getElementById('btn-next').disabled = this.currentSlide === this.slides.length - 1;
    document.getElementById('page-num').textContent = `${this.currentSlide + 1} / ${this.slides.length}`;
    
    // 更新小圓點
    const dots = this.dotsContainer.querySelectorAll('.dot');
    dots.forEach((dot, idx) => {
      dot.className = 'dot' + (idx === this.currentSlide ? ' active' : '');
    });
  },

  goToSlide(index, direction = 'next') {
    if (index < 0 || index >= this.slides.length || index === this.currentSlide) return;
    
    // 換頁時自動中斷語音
    SpeechReader.stop();
    AudioPlayer.playBeep();

    const oldSlide = this.slides[this.currentSlide];
    const newSlide = this.slides[index];

    oldSlide.classList.remove('active');
    
    // 設定滑入方向
    if (direction === 'prev') {
      newSlide.classList.add('slide-prev');
    } else {
      newSlide.classList.remove('slide-prev');
    }

    newSlide.classList.add('active');
    this.currentSlide = index;
    this.updateButtons();
  },

  nextSlide() {
    this.goToSlide(this.currentSlide + 1, 'next');
  },

  prevSlide() {
    this.goToSlide(this.currentSlide - 1, 'prev');
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
    const btn = document.getElementById(`preset-${key}`);
    if (btn) btn.classList.add('active');
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
        const printMatch = line.match(/^\d+\s+PRINT\s+"([^"]+)"/);
        if (printMatch) {
          this.terminal.textContent += printMatch[1] + '\n';
        } else {
          this.terminal.textContent += line + '\n';
        }
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
    [0, 0, 0, 0, 0]
  ],
  robot: {
    x: 0,
    y: 4,
    dir: 'up'
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
      listDiv.innerHTML = '<span style="color: #94a3b8; font-size: 0.8rem; padding: 0.3rem;">未加入指令，請點選按鈕！</span>';
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
        
        if (this.map[r][c] === 1) {
          cell.className += ' obstacle';
          cell.textContent = '🌲';
        } else if (this.map[r][c] === 2) {
          cell.className += ' target';
          cell.textContent = '🏁';
        }

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

        if (nextX < 0 || nextX >= 5 || nextY < 0 || nextY >= 5 || this.map[nextY][nextX] === 1) {
          AudioPlayer.playFail();
          alert('💥 哎呀！機器人撞到牆壁或樹木了！請重新排列指令！');
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

      if (this.map[this.robot.y][this.robot.x] === 2) {
        AudioPlayer.playSuccess();
        alert('🎉 太棒了！機器人成功到達終點🏁！你真是程式小達人！');
        this.resetGame();
        return;
      }
    }

    AudioPlayer.playFail();
    alert('🤖 指令執行完了，但機器人還沒走到終點喔，再試試看！');
    this.running = false;
  }
};

// 頁面初始化
window.addEventListener('DOMContentLoaded', () => {
  Presentation.init();
  BasicSimulator.init();
  RobotGame.init();
  showScratchBridge('print');
});
