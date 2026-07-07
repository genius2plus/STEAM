// Web Audio API 震撼音效合成器 2.0
const AudioPlayer = {
  ctx: null,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  // 1. 移動指令音效：具備頻率上揚的電子嗶聲
  playBeep() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08); // 快速上揚
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.08);
  },

  // 2. 撞牆爆炸音效：利用白雜訊加上低通濾波器調變，模擬強烈的低音轟鳴爆炸
  playFail() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.55; // 0.55秒的爆炸聲
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // 填充白雜訊
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // 濾波器：控制爆炸的低沈感
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + 0.5); // 快速降低頻率，營造低音下沉衝擊

    // 增益節點控制爆炸振幅包絡 (Envelope)
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    // 額外加上一個低頻正弦波，強化超低音轟鳴 (Sub-bass drop)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, now);
    subOsc.frequency.linearRampToValueAtTime(30, now + 0.4);
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    // 啟動音效
    noiseNode.start(now);
    subOsc.start(now);
    
    noiseNode.stop(now + 0.55);
    subOsc.stop(now + 0.55);
  },

  // 3. 勝利過關音效：多個振盪器疊加，播放史詩級的大三和弦上升琶音與和弦共鳴
  playSuccess() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // C和弦組合音高 (C4, E4, G4, C5, E5, G5, C6)
    const chordNotes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    
    chordNotes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      // 使用鋸齒波與正弦波混合感 (Sawtooth + lowpass filter) 營造復古街機風
      osc.type = 'sawtooth';
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(600, now + 0.6);

      osc.disconnect(gainNode);
      osc.connect(filter);
      filter.connect(gainNode);

      // 每個音有些微的時間延遲，形成琶音 (Arpeggio)
      const startTime = now + index * 0.08;
      const duration = 0.8 - index * 0.04;

      osc.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(0.0, now);
      gainNode.gain.setValueAtTime(0.12, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }
};

// Web Speech API 語音朗讀系統
const SpeechReader = {
  currentUtterance: null,
  activeBtn: null,
  speechQueue: [],
  queueIndex: 0,
  isPlaying: false,

  speak(text, button) {
    this.initVoice();

    if (this.isPlaying && this.activeBtn === button) {
      this.stop();
      return;
    }

    this.stop();

    this.activeBtn = button;
    this.activeBtn.classList.add('playing');
    this.activeBtn.textContent = '⏸️';
    this.isPlaying = true;

    // 清理與優化口語朗讀
    let cleanText = text
      .replace(/ROBOT/g, ' 機器人 ')
      .replace(/FORWARD/g, ' 前進 ')
      .replace(/TURN_LEFT/g, ' 左轉 ')
      .replace(/0/g, '零')
      .replace(/1/g, '一');

    // 斷句切分
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
    
    // 設置台灣優先中文語音（優先選擇線上神經網路自然語音）
    const voices = window.speechSynthesis.getVoices();
    const chineseVoices = voices.filter(v => 
      v.lang.includes('zh-TW') || v.lang.includes('zh-HK') || v.lang.includes('zh-CN')
    );

    chineseVoices.sort((a, b) => {
      const getScore = (voice) => {
        let score = 0;
        const name = voice.name.toLowerCase();
        if (voice.lang.includes('zh-TW')) score += 100;
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

    this.currentUtterance.rate = 1.0; // 語速回復正常
    this.currentUtterance.pitch = 1.05;

    this.currentUtterance.onend = () => {
      this.queueIndex++;
      setTimeout(() => {
        this.playNextChunk();
      }, 100);
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
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {};
    }
  }
};

// 機器人控制遊戲核心
const RobotGame = {
  currentLevel: 'iron', // 預設為鐵牌
  levels: {
    iron: {
      name: '⚙️ 鐵牌',
      robot: { x: 0, y: 9, dir: 'up' },
      map: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2] // 直線走到右下角
      ]
    },
    bronze: {
      name: '🥉 銅牌',
      robot: { x: 0, y: 9, dir: 'up' },
      map: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 中間被一棵樹擋住，必須繞上去
        [0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2]
      ]
    },
    silver: {
      name: '🥈 銀牌',
      robot: { x: 0, y: 9, dir: 'up' },
      map: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 終點在 (19, 2)
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1], // S型簡單轉折
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
      ]
    },
    gold: {
      name: '🥇 金牌',
      robot: { x: 0, y: 9, dir: 'up' },
      map: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], // 多重折線
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      ]
    },
    diamond: {
      name: '💎 鑽石',
      robot: { x: 0, y: 9, dir: 'up' },
      map: [
        [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 終極大迷宮，極高難度，需要 25 步以上指令
        [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0],
        [0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0],
        [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      ]
    }
  },
  robot: {
    x: 0,
    y: 9,
    dir: 'up'
  },
  commands: [],
  running: false,

  init() {
    this.selectLevel('iron');
  },

  selectLevel(levelKey) {
    if (this.running) return;
    AudioPlayer.playBeep();
    this.currentLevel = levelKey;
    
    // 更新按鈕選取狀態
    document.querySelectorAll('.btn-diff').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`diff-${levelKey}`).classList.add('active');

    this.resetGame();
  },

  resetGame() {
    const lvl = this.levels[this.currentLevel];
    this.robot.x = lvl.robot.x;
    this.robot.y = lvl.robot.y;
    this.robot.dir = lvl.robot.dir;
    this.commands = [];
    this.running = false;
    this.renderMap();
    this.renderCommands();
    this.toggleControlButtons(false);
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
      listDiv.innerHTML = '<span style="color: #647089; font-size: 0.95rem; padding: 0.5rem;">尚未編排指令，請按上方按鈕！</span>';
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
    
    const lvl = this.levels[this.currentLevel];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 20; c++) {
        const cell = document.createElement('div');
        cell.className = 'map-cell';
        
        if (lvl.map[r][c] === 1) {
          cell.className += ' obstacle';
          cell.textContent = '🌲';
        } else if (lvl.map[r][c] === 2) {
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

  toggleControlButtons(disabled) {
    document.querySelectorAll('.command-buttons button, .game-actions button, .difficulty-buttons button').forEach(btn => {
      if (btn.classList.contains('btn-reset')) return; // 重來按鈕不鎖定
      btn.disabled = disabled;
    });
  },

  async runProgram() {
    if (this.running || this.commands.length === 0) return;
    this.running = true;
    this.toggleControlButtons(true);
    
    const lvl = this.levels[this.currentLevel];
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

        if (nextX < 0 || nextX >= 20 || nextY < 0 || nextY >= 10 || lvl.map[nextY][nextX] === 1) {
          AudioPlayer.playFail();
          const gridWrapper = document.querySelector('.game-map-wrapper');
          gridWrapper.style.animation = 'none';
          setTimeout(() => {
            gridWrapper.style.animation = 'shake 0.3s';
          }, 10);
          
          alert('💥 轟隆！！機器人撞毀了！請檢查你的路徑指令！');
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

      if (lvl.map[this.robot.y][this.robot.x] === 2) {
        AudioPlayer.playSuccess();
        alert(`🎉 歐耶！！機器人成功挑戰 ${lvl.name} 關卡🏁！你真是太棒了！`);
        this.resetGame();
        return;
      }
    }

    AudioPlayer.playFail();
    alert('🤖 指令執行完了，但機器人還沒走到終點旗子喔，再試試看！');
    this.running = false;
    this.toggleControlButtons(false);
  }
};

// 加上 CSS 動畫震動
const styleElement = document.createElement('style');
styleElement.innerHTML = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
`;
document.head.appendChild(styleElement);

// 頁面初始化
window.addEventListener('DOMContentLoaded', () => {
  RobotGame.init();
});
