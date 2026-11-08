// 歌词：获取、解析、滚动高亮
// 只依赖 core 与 api，不反向依赖 player，避免循环引用
/* global $ */
import { state, playlist } from '../core/state.js';
import { escapeHtml } from '../core/utils.js';
import { getLyric } from '../api/song.js';
import { createSignal, isAbort } from '../api/request.js';

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
// 后端已把三个源的歌词统一解析成 lines: [{ time: 秒, text }]，
// 这里只需转成 { 秒: 文本 } 供滚动高亮使用，不再按源分支、不再 JSON.parse 猜测
var activeLyricSignal = null;

export function getlrc(id) {
	var song = playlist[id];
	if (!song) return;
	var mid = song.musicrid;
	var source = song.source;

	// 快速切歌时取消上一首的歌词请求，避免旧歌词盖到新歌上
	if (activeLyricSignal) activeLyricSignal.cancel();
	activeLyricSignal = createSignal();
	var signal = activeLyricSignal;

	getLyric(source, mid, { signal: signal })
		.then(function (data) {
			if (id !== state.playid) return;   // 过程中已切歌，丢弃
			var lines = (data && data.lines) || [];
			if (!lines.length) {
				area().html('');
				lyricTip('没有歌词');
				return;
			}
			var lrcobj = {};
			for (var j = 0; j < lines.length; j++) {
				var line = lines[j];
				var sec = parseInt(line.time, 10);
				if (isNaN(sec)) continue;
				// 同一秒可能有多行（如中英双语），拼接而不是覆盖
				lrcobj[sec] = lrcobj[sec] ? lrcobj[sec] + ' / ' + line.text : line.text;
			}
			state.lyric = lrcobj;
			lyricCallback(id);
		})
		.catch(function (err) {
			if (isAbort(err)) return;
			if (id !== state.playid) return;
			area().html('');
			if (err && err.code === 4004) {
				lyricTip('没有歌词');
				return;
			}
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
