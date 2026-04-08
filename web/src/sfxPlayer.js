export class SfxPlayer {
  constructor() {
    this.fadeTimer = null;
    this.audio = {
      sfx_card_flip: new Audio("./assets/media/sfx_card_flip.mp3"),
      sfx_score_up: new Audio("./assets/media/sfx_score_up.mp3"),
      sfx_score_down: new Audio("./assets/media/sfx_score_down.mp3"),
      sfx_open_sheet: new Audio("./assets/media/sfx_open_sheet.mp3"),
      sfx_answer_select: new Audio("./assets/media/sfx_answer_select.mp3"),
      sfx_time_ticking: new Audio("./assets/media/sfx_time_ticking.mp3"),
    };
    this.audio.sfx_time_ticking.loop = false;
  }

  playByName(name) {
    const clip = this.audio[name];
    if (!clip) return;
    clip.currentTime = 0;
    clip.play().catch(() => {});
  }

  startTimeoutTicking() {
    const clip = this.audio.sfx_time_ticking;
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    clip.volume = 1;
    if (!clip.paused) return;
    clip.currentTime = 0;
    clip.play().catch(() => {});
  }

  stopTimeoutTicking() {
    const clip = this.audio.sfx_time_ticking;
    if (clip.paused) return;
    if (this.fadeTimer) clearInterval(this.fadeTimer);

    const step = clip.volume / 6;
    this.fadeTimer = setInterval(() => {
      const next = Math.max(0, clip.volume - step);
      clip.volume = next;
      if (next <= 0.01) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = null;
        clip.pause();
        clip.currentTime = 0;
        clip.volume = 1;
      }
    }, 60);
  }
}
