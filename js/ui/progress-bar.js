// mk 进度条插件（音量条 / 播放进度条）
// 原 mainfunction.js 886-967 行原样搬迁为 class，行为保持不变
/* global $ */

export class Mkpgb {
	// 进度条框 id，初始量，回调函数
	constructor(bar, percent, callback) {
		this.bar = bar;
		this.percent = percent;
		this.callback = callback;
		this.locked = false;
		this.init();
	}

	// 进度条初始化
	init() {
		var mk = this;
		var mdown = false;
		$(mk.bar).html('<div class="mkpgb-bar"></div><div class="mkpgb-cur"></div><div class="mkpgb-dot"></div>');
		mk.minLength = $(mk.bar).offset().left;
		mk.maxLength = $(mk.bar).width() + mk.minLength;

		$(window).resize(function () {
			mk.minLength = $(mk.bar).offset().left;
			mk.maxLength = $(mk.bar).width() + mk.minLength;
		});

		$(mk.bar + ' .mkpgb-dot').mousedown(function (e) {
			e.preventDefault();
		});

		$(mk.bar).mousedown(function (e) {
			if (!mk.locked) mdown = true;
			barMove(e);
		});

		$('html').mousemove(function (e) {
			barMove(e);
		});

		$('html').mouseup(function () {
			mdown = false;
		});

		function barMove(e) {
			if (!mdown) return;
			var percent = 0;
			if (e.clientX < mk.minLength) {
				percent = 0;
			} else if (e.clientX > mk.maxLength) {
				percent = 1;
			} else {
				percent = (e.clientX - mk.minLength) / (mk.maxLength - mk.minLength);
			}
			mk.callback(percent);
			mk.goto(percent);
			return true;
		}

		mk.goto(mk.percent);
		return true;
	}

	// 跳转至某处
	goto(percent) {
		if (percent > 1) percent = 1;
		if (percent < 0) percent = 0;
		this.percent = percent;
		$(this.bar + ' .mkpgb-dot').css('left', (percent * 100) + '%');
		$(this.bar + ' .mkpgb-cur').css('width', (percent * 100) + '%');
		return true;
	}

	// 锁定进度条
	lock(islock) {
		if (islock) {
			this.locked = true;
			$(this.bar).addClass('mkpgb-locked');
		} else {
			this.locked = false;
			$(this.bar).removeClass('mkpgb-locked');
		}
		return true;
	}
}

// 进度条实例（原 volume_bar / music_bar 全局变量）
export const bars = {
	volume: null,
	music: null
};
