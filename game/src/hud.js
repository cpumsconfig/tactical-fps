import { catalog } from './weapon.js';

export class HUD {
  constructor() {
    this.$ = selector => document.querySelector(selector);
    this.overlay = this.$('#overlay');
    this.buy = this.$('#buy');
    this.mode = 'start';
    this.$('#play').onclick = () => {
      this.onDeploy?.();
      this.overlay.hidden = true;
    };
    this.$('#buy').innerHTML = '<h3>FIELD REQUISITIONS</h3><div id="moneyline"></div>' +
      catalog.map((item, index) => `<button data-buy="${index}">${item.name.toUpperCase()} &nbsp; ¢${item.price}<br>DMG ${item.damage} / MAG ${item.mag}</button>`).join('');
    this.buy.querySelectorAll('[data-buy]').forEach(button => {
      button.onclick = () => this.onBuy?.(+button.dataset.buy);
    });
  }

  setMode(mode) {
    this.mode = mode;
    // Shot mode chooses presentation once; update() never restores the briefing panel.
    this.overlay.hidden = mode !== 'start';
    this.overlay.classList.toggle('result-mode', mode === 'end');
    if (mode === 'end') {
      this.text('#title', 'PLATFORM HELD');
      this.text('#copy', 'Amber Line secured the valve before the furnace cycle.');
      this.text('#play', 'ROUND COMPLETE');
    }
  }

  text(selector, value) { this.$(selector).textContent = value; }

  update(game) {
    this.text('#health', Math.max(0, Math.ceil(game.player.health)));
    this.text('#mag', game.weapon.mag);
    this.text('#reserve', game.weapon.reserve);
    this.text('#weaponName', game.weapon.def.name.toUpperCase());
    this.text('#round', String(game.round).padStart(2, '0'));
    this.text('#amberScore', game.score[0]);
    this.text('#blueScore', game.score[1]);
    this.text('#cash', `¢ ${game.money}`);
    this.text('#phase', game.phase === 'buy' ? 'BUY PHASE' : game.phase === 'combat' ? 'LIVE ROUND' : 'ROUND RESULT');
    this.text('#clock', game.phase === 'buy' ? `DEPLOY ${Math.ceil(game.phaseTime)}s` :
      `${String(Math.floor(game.time / 60)).padStart(2, '0')}:${String(Math.floor(game.time % 60)).padStart(2, '0')}`);
    this.text('#objective', game.objectiveState === 'armed' ? 'CORE VALVE // DISARM' :
      game.objectiveState === 'secured' ? 'CORE VALVE // SECURED' : 'CORE VALVE // SECURE');
    this.buy.hidden = !(game.phase === 'buy' && game.buyOpen);
    const moneyline = this.$('#moneyline');
    if (moneyline) moneyline.textContent = `CREDITS ¢${game.money} · B TO CLOSE`;
    this.$('#hit').classList.toggle('on', game.hit > 0);
    this.text('#toast', game.toast || '');
    this.overlay.hidden = this.mode === 'play';
  }
}
