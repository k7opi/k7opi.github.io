// 歌词：获取、解析、滚动高亮
// 只依赖 core 与 api，不反向依赖 player，避免循环引用
/* global $ */
import { state, playlist } from '../core/state.js';
import { escapeHtml } from '../core/utils.js';
import { getLyricRaw } from '../api/song.js';

var lyricArea = null;

// 歌词容器（index.html 中的 #lyric）
function area() {
	if (lyricArea) return lyricArea;
	lyricArea = $('#lyric');
	return lyricArea;
}

// 在歌词区显示提示语（如歌词加载中、无歌词等）
export function lyricTip(str) {
	area().html("<li class='lyric-tip'>" + escapeHtml(str) + '</li>');
}

// 解析 LRC 文本
// 这一函数来自 https://github.com/TivonJJ/html5-music-player
export function parseLyric(lrc) {
	if (!lrc) return '';
	var lyrics = lrc.split('\n');
	var lrcObj = {};
	for (var i = 0; i < lyrics.length; i++) {
		var lyric = lyrics[i];
		// LRC 里出现裸 % 时 decodeURIComponent 会抛 URIError，逐行兜底
		try {
			lyric = decodeURIComponent(lyric);
		} catch (e) {
			// 保持原文
		}
		var timeReg = /\[\d*:\d*((\.|\:)\d*)*\]/g;
		var timeRegExpArr = lyric.match(timeReg);
		if (!timeRegExpArr) continue;
		var clause = lyric.replace(timeReg, '');
		for (var k = 0, h = timeRegExpArr.length; k < h; k++) {
			var t = timeRegExpArr[k];
			var min = Number(String(t.match(/\[\d*/i)).slice(1)),
				sec = Number(String(t.match(/\:\d*/i)).slice(1));
			var time = min * 60 + sec;
			lrcObj[time] = clause;
		}
	}
	return lrcObj;
}

// 歌曲加载完后的回调函数
function lyricCallback(id) {
	if (id !== state.playid) return;   // 返回的歌词不是当前这首歌的，跳过

	if (state.lyric === '') {
		lyricTip('没有歌词');
		return false;
	}

	area().html('');     // 清空歌词区域的内容
	area().scrollTop(0); // 滚动到顶部

	state.lastLyric = -1;

	// 显示全部歌词
	var i = 0;
	for (var k in state.lyric) {
		var txt = state.lyric[k];
		if (!txt) txt = '&nbsp;';
		var li = $("<li data-no='" + i + "' class='lrc-item'>" + txt + '</li>');
		area().append(li);
		i++;
	}
}

// 解析并获取歌词
// 参数：歌曲在 playlist 中的索引
export function getlrc(id) {
	var song = playlist[id];
	if (!song) return;
	var mid = song.musicrid;
	var source = song.source;
	if (source !== 'kuwo' && source !== 'netease' && source !== 'qq') return;

	getLyricRaw(source, mid)
		.then(function (raw) {
			area().html('');
			if (!raw) {
				lyricTip('歌词加载失败');
				return;
			}
			if (source === 'kuwo') {
				// 酷我返回 [{time, lineLyric}] 的 JSON 文本
				var list = null;
				try {
					list = JSON.parse(raw);
				} catch (e) {
					list = null;
				}
				if (!list || list.code == -1 || !list.length) {
					lyricTip('歌词加载失败');
					return;
				}
				var lrcobj = {};
				for (var j = 0; j < list.length; j++) {
					lrcobj[parseInt(list[j].time)] = list[j].lineLyric;
				}
				state.lyric = lrcobj;
			} else {
				// 网易云 / QQ 返回 LRC 原始文本，失败时返回 {"code":-1}
				var text = String(raw);
				if (text.indexOf('"code"') !== -1 && text.indexOf('-1') !== -1 && text.indexOf('[') === -1) {
					lyricTip('歌词加载失败');
					return;
				}
				state.lyric = parseLyric(text);
			}
			lyricCallback(id);
		})
		.catch(function (err) {
			console.error('[lyric] error:', err);
			lyricTip('歌词加载失败');
		});
}

// 强制刷新当前时间点的歌词
// 参数：当前播放时间（单位：秒）
export function refreshLyric(time) {
	if (state.lyric === '' || state.lyric === undefined) return false;

	time = parseInt(time);  // 时间取整
	var i = 0;
	for (var k in state.lyric) {
		if (k >= time) break;
		i = k;      // 记录上一句的
	}

	scrollLyric(i);
}

// 滚动歌词到指定句
// 参数：当前播放时间（单位：秒）
export function scrollLyric(time) {
	if (state.lyric === '' || state.lyric === undefined) return false;

	time = parseInt(time);  // 时间取整

	if (state.lyric[time] === undefined) return false;   // 当前时间点没有歌词

	if (state.lastLyric == time) return true;   // 歌词没发生改变

	var i = 0;  // 获取当前歌词是在第几行
	for (var k in state.lyric) {
		if (k == time) break;
		i++;
	}
	state.lastLyric = time;  // 记录方便下次使用
	$('.lplaying').removeClass('lplaying');     // 移除其余句子的正在播放样式
	$(".lrc-item[data-no='" + i + "']").addClass('lplaying');    // 加上正在播放样式

	var scroll = (area().children().height() * i) - ($('.lyric').height() / 2);
	area().stop().animate({ scrollTop: scroll }, 1000);   // 平滑滚动到当前歌词位置
}

// 清空歌词区域（切歌时调用）
export function clearLyric() {
	state.lyric = undefined;
	state.lastLyric = undefined;
	area().html('');
}

export function init() {
	area();
}
