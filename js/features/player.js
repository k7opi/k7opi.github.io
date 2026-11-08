// 播放器：播放控制、循环模式、进度条、封面、下载
/* global $, layer */
import { state, playlist, audio } from '../core/state.js';
import { mkPlayer } from '../core/config.js';
import { isMobile } from '../core/utils.js';
import { playerSavedata, playerReaddata } from '../core/storage.js';
import { isloading, closeload } from '../core/loading.js';
import { on, emit, EVENTS } from '../core/events.js';
import { getPlayUrl, getMvContent } from '../api/song.js';
import { Mkpgb, bars } from '../ui/progress-bar.js';
import { getlrc, clearLyric, scrollLyric, refreshLyric } from './lyric.js';
import { refreshListMarker } from '../ui/list-render.js';

// 播放列表中的指定歌曲
export function playList(id) {
	// 没有歌曲，跳出
	if (playlist.length <= 0) return true;

	// ID 范围限定
	if (id >= playlist.length) id = 0;
	if (id < 0) id = playlist.length - 1;
	if (!playlist[id]) {
		autoNextMusic();
		return;
	}

	// 记录正在播放的歌曲在列表中的 id
	state.playid = id;

	// MV 播放期间用户切歌：只更新选中项，关闭 MV 后仍保持暂停
	if (state.mvPlaying) {
		state.paused = true;
	}

	// ajax 获取播放链接
	getmusicurl(id);
	var msg = ' 正在播放: ' + playlist[id].name + ' - ' + playlist[id].artist;
	if (state.titflash !== undefined) {
		clearInterval(state.titflash);
	}
	titleFlash(msg);            // 标题滚动
	refreshListMarker(id);      // 更新列表样式
	clearLyric();
	getlrc(id);                 // 更新歌词
	bindAudioEvents();
	audio.volume = bars.volume ? bars.volume.percent : mkPlayer.volume;   // 初始化音量
	emit(EVENTS.TRACK_CHANGE, { index: id });
}

// 音频事件只绑定一次，避免重复 addEventListener 累积
var audioBound = false;
function bindAudioEvents() {
	if (audioBound) return;
	audioBound = true;
	audio.addEventListener('timeupdate', updateProgress);
	audio.addEventListener('error', audioErr);
}

// 音频错误处理
function audioErr() {
	if (state.playid === undefined) return true;
	if (state.errCount >= 5) {
		state.errCount = 0;
		layer.msg('似乎出了点问题~播放已停止');
		return;
	}
	setTimeout(function () {
		state.errCount++;
		layer.msg('当前歌曲播放失败，自动播放下一首');
		autoNextMusic();
	}, 500);
}

// 获取播放地址并播放
export function getmusicurl(id) {
	if (!playlist[id]) {
		autoNextMusic();
		return;
	}
	var song = playlist[id];
	isloading();
	getPlayUrl(song.source, song.musicrid)
		.then(function (url) {
			if (!url) {
				closeload();
				layer.msg('获取播放地址失败');
				return;
			}
			song.musicurl = url;
			audio.src = url;
			changeCover(id);
			// MV 播放中切歌：只装载新地址，保持暂停，由用户手动开始播放
			if (state.mvPlaying) return;
			audio.play();
			state.paused = false;
			$('.btn-play').addClass('btn-state-paused');
		})
		.catch(function (err) {
			console.error('[player] url error:', err);
			layer.msg('获取播放地址失败');
		})
		.then(function () {
			closeload();
		});
}

// MV 抢占音频：停掉音乐并进入暂停态（state.paused 一并置 true，
// 保证按钮样式与状态一致，用户点一次播放即可继续）
function suspendForMv() {
	state.mvPlaying = true;
	state.paused = true;
	stopTitflash();
	clearInterval(state.interval_volume_down);
	clearInterval(state.interval_volume_up);
	audio.pause();
	$('.list-playing').removeClass('list-playing');
	$('.btn-play').removeClass('btn-state-paused');
	$('#music-progress .dot-move').removeClass('dot-move');
}

// MV 弹窗关闭：统一保持音乐暂停，不自动续播
function onMvClosed() {
	if (!state.mvPlaying) return;
	state.mvPlaying = false;
	audio.pause();
	state.paused = true;
	$('.list-playing').removeClass('list-playing');
	$('.btn-play').removeClass('btn-state-paused');
	$('#music-progress .dot-move').removeClass('dot-move');
	stopTitflash();
}

// 播放 MV
export function playmv(id) {
	var song = playlist[id];
	if (!song) return;
	if (!song.mvid) {
		layer.msg('该歌曲无MV');
		return;
	}
	getMvContent(song.source, song.mvid, song.name, song.artist)
		.then(function (html) {
			suspendForMv();
			layer.open({
				title: song.name + ' - ' + song.artist,
				type: 1,
				skin: 'layui-layer-rim',
				area: ['80%', 'auto'],
				content: html,
				end: onMvClosed     // 关闭弹窗（含右上角 ×、遮罩、ESC）都会走这里
			});
			setTimeout(function () {
				var video = document.getElementsByTagName('video')[0];
				if (video) video.play();
			}, 1000);
		})
		.catch(function (err) {
			console.error('[player] mv error:', err);
			layer.msg('MV 加载失败');
		});
}

// 播放/暂停切换
export function audiocontrol() {
	// MV 播放期间音频被接管，不响应音乐播放/暂停
	if (state.mvPlaying) return;
	if (state.paused == false) audioPause();
	else audioPlay();
}

// 暂停
export function audioPause() {
	state.paused = true;
	$('.list-playing').removeClass('list-playing');
	$('.btn-play').removeClass('btn-state-paused');
	$('#music-progress .dot-move').removeClass('dot-move');

	layer.msg('暂停');
	stopTitflash();
	// 先停掉递增，避免与递减同时跑导致音量抖动
	clearInterval(state.interval_volume_up);
	if (isMobile.iOS() != true) {
		state.interval_volume_down = setInterval(VolumeDown, 30);
	} else {
		audio.pause();
	}
}

// 播放
export function audioPlay() {
	if (playlist.length <= 0) {
		layer.msg('列表中无音乐');
		return;
	}
	if (state.playid == undefined) {
		layer.msg('请从列表中选择要播放的音乐');
		return;
	}
	state.paused = false;
	$('.btn-play').addClass('btn-state-paused');
	refreshListMarker(state.playid);
	var song = playlist[state.playid];
	var msg = ' 正在播放: ' + song.name + ' - ' + song.artist;
	layer.msg('播放');
	stopTitflash();
	titleFlash(msg);

	// 先停掉可能残留的音量渐变定时器，避免恢复时音量被继续压低
	clearInterval(state.interval_volume_down);
	clearInterval(state.interval_volume_up);

	// 音量已被暂停流程淡到 0，恢复前先还原到设定值
	var vol = bars.volume ? bars.volume.percent : mkPlayer.volume;
	if (audio.volume <= 0.01) audio.volume = vol;

	// 无论什么平台都必须真正调用 play()，
	// 否则只切了按钮样式，音频不会开始（曾导致退出 MV 后点播放无反应）
	var p = audio.play();
	if (p && typeof p.catch === 'function') {
		p.catch(function (err) {
			// 浏览器自动播放策略限制（缺少用户手势）时给出提示并回滚状态
			console.warn('[player] play rejected:', err && err.name);
			state.paused = true;
			$('.btn-play').removeClass('btn-state-paused');
			$('.list-playing').removeClass('list-playing');
			stopTitflash();
			clearInterval(state.interval_volume_up);
			layer.msg('播放失败，请再点击一次播放');
		});
	}
	if (isMobile.iOS() != true) {
		state.interval_volume_up = setInterval(VolumeUp, 30);
	}
}

// 音量递减到 0 然后暂停
function VolumeDown() {
	if (audio === undefined) return;
	var tmp_vol = bars.volume ? bars.volume.percent : mkPlayer.volume;
	var num = audio.volume - tmp_vol / 30;
	if (num <= 0) {
		audio.volume = 0;
		clearInterval(state.interval_volume_down);
		audio.pause();
	} else {
		audio.volume = num;
	}
}

// 开始播放然后音量递增
function VolumeUp() {
	if (audio === undefined) return;
	var tmp_vol = bars.volume ? bars.volume.percent : mkPlayer.volume;
	var num = audio.volume + tmp_vol / 30;
	if (num >= tmp_vol) {
		audio.volume = tmp_vol;   // 已到设定值，结束渐变
		clearInterval(state.interval_volume_up);
	} else {
		audio.volume = num;
	}
}

// 播放模式按钮：单曲循环 -> 列表循环 -> 随机播放
export function orderChange() {
	var orderDiv = $('.btn-order');
	orderDiv.removeClass();
	switch (state.order) {
		case 1:     // 单曲循环 -> 列表循环
			orderDiv.addClass('player-btn btn-order btn-order-list');
			orderDiv.attr('title', '列表循环');
			layer.msg('列表循环');
			state.order = 2;
			break;

		case 3:     // 随机播放 -> 单曲循环
			orderDiv.addClass('player-btn btn-order btn-order-single');
			orderDiv.attr('title', '单曲循环');
			layer.msg('单曲循环');
			state.order = 1;
			break;

		default:    // 列表循环 -> 随机播放
			orderDiv.addClass('player-btn btn-order btn-order-random');
			orderDiv.attr('title', '随机播放');
			layer.msg('随机播放');
			state.order = 3;
	}
}

// 自动播放时的下一首歌
export function autoNextMusic() {
	if (state.order && state.order === 1) {
		playList(state.playid);
	} else {
		nextMusic();
	}
}

// 播放下一首歌
export function nextMusic() {
	switch (state.order ? state.order : 1) {
		case 1:
		case 2:
			playList(state.playid + 1);
			break;
		case 3:
			if (playlist && playlist.length) {
				var id = parseInt(Math.random() * playlist.length);
				playList(id);
			}
			break;
		default:
			playList(state.playid + 1);
			break;
	}
}

// 播放上一首歌
export function prevMusic() {
	playList(state.playid - 1);
}

// 停止标题滚动（恢复原始标题）
function stopTitflash() {
	if (state.titflash !== undefined) {
		clearInterval(state.titflash);
		state.titflash = undefined;
	}
	document.title = state.webTitle;
}

// 标题滚动
export function titleFlash(msg) {
	var tit = function () {
		msg = msg.substring(1, msg.length) + msg.substring(0, 1);
		document.title = msg;
	};
	state.titflash = setInterval(tit, 300);
}

// 歌曲时间变动回调
export function updateProgress() {
	if (state.paused !== false) return true;
	if (bars.music && audio.duration) {
		bars.music.goto(audio.currentTime / audio.duration);
	}
	scrollLyric(audio.currentTime);
}

// 音量条变动回调
export function vBcallback(newVal) {
	audio.volume = newVal;

	if ($('.btn-quiet').is('.btn-state-quiet')) {
		$('.btn-quiet').removeClass('btn-state-quiet');
	}
	if (newVal === 0) $('.btn-quiet').addClass('btn-state-quiet');

	playerSavedata('volume', newVal);
}

// 音乐进度条拖动回调
export function mBcallback(newVal) {
	var newTime = audio.duration * newVal;
	audio.currentTime = newTime;
	refreshLyric(newTime);
}

// 进度条初始化
export function initProgress() {
	// 初始化播放进度条
	if (bars.music) {
		bars.music.goto(0);
	} else {
		bars.music = new Mkpgb('#music-progress', 0, mBcallback);
		bars.music.lock(false);   // 未播放时锁定不让拖动
	}

	// 初始化音量设定
	var tmp_vol = playerReaddata('volume');
	tmp_vol = (tmp_vol != null) ? tmp_vol : (state.isMobile ? 1 : mkPlayer.volume);
	if (tmp_vol < 0) tmp_vol = 0;
	if (tmp_vol > 1) tmp_vol = 1;
	if (tmp_vol == 0) $('.btn-quiet').addClass('btn-state-quiet');

	if (bars.volume) {
		bars.volume.goto(tmp_vol);
	} else {
		bars.volume = new Mkpgb('#volume-progress', tmp_vol, vBcallback);
	}
	return bars;
}

// 改变右侧封面图像
export function changeCover(id) {
	var song = playlist[id];
	if (!song) return;
	var img = song.pic;

	var animate = false, imgload = false;

	if (!img) {
		img = 'images/player_cover.png';
	} else if (state.isMobile) {          // 移动端封面
		$('#music-cover').off('load').on('load', function () {
			$('#mobile-blur').css('background-image', 'url("' + img + '")');
		});
	} else {                              // PC 端封面
		$('#music-cover').off('load').on('load', function () {
			if (animate) {
				$('#blur-img').backgroundBlur(img);
				$('#blur-img').animate({ opacity: '1' }, 2000);
			} else {
				imgload = true;
			}
		});

		$('#blur-img').animate({ opacity: '0.1' }, 1000, function () {
			if (imgload) {
				$('#blur-img').backgroundBlur(img);
				$('#blur-img').animate({ opacity: '0.6' }, 2000);
			} else {
				animate = true;
			}
		});
	}

	$('#music-cover').attr('src', img);   // 改变右侧封面
	$(".sheet-item[data-no='1'] .sheet-cover").attr('src', img);
}

// 下载歌曲
export function thisDownload(id) {
	var song = playlist[id];
	if (!song) return;
	if (song.musicurl) {
		openDownloadDialog(song.musicurl, song.name + ' - ' + song.artist);
		return;
	}
	getPlayUrl(song.source, song.musicrid)
		.then(function (url) {
			if (!url) {
				layer.msg('无法获取下载链接！');
				return;
			}
			song.musicurl = url;
			openDownloadDialog(url, song.name + ' - ' + song.artist);
		})
		.catch(function (err) {
			console.error('[player] download error:', err);
			layer.msg('无法获取下载链接！');
		});
}

// 通用下载对话框
export function openDownloadDialog(url, saveName) {
	if (typeof url == 'object' && url instanceof Blob) {
		url = URL.createObjectURL(url);
	}
	var aLink = document.createElement('a');
	aLink.href = url;
	aLink.target = '_blank';
	aLink.download = saveName || '';
	var event;
	if (window.MouseEvent) event = new MouseEvent('click');
	else {
		event = document.createEvent('MouseEvents');
		event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
	}
	aLink.dispatchEvent(event);
}

export function init() {
	on(EVENTS.PLAY, playList);
	on(EVENTS.PLAY_RELATIVE, function (delta) {
		if (state.playid === undefined) return;
		playList(state.playid + delta);
	});
	on(EVENTS.TOGGLE, audiocontrol);
	initProgress();
	audio.onended = autoNextMusic;   // 自动播放下一首
}
