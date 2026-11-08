// 布局：tab 切换、数据区显示、关于/APP 弹窗、列表公共事件、滚动条与背景模糊初始化
/* global $, layer */
import { state, playlist, audio } from '../core/state.js';
import { mkPlayer } from '../core/config.js';
import { escapeHtml, formatTime } from '../core/utils.js';
import { emit, EVENTS } from '../core/events.js';
import { getsource } from '../api/song.js';

// 显示右侧播放器面板（保持原 togglePlayer 逻辑）
function togglePlayer() {
	if ($(".btn[data-action='player']").css('display') !== 'none') {
		$('#player').hide();
	} else if ($('#player').css('display') == 'none') {
		$('#player').fadeIn();
	}
}

// 选择要显示哪个数据区
// 参数：要显示的数据区（list、sheet、player）
export function dataBox(choose) {
	$('.btn-box .active').removeClass('active');
	switch (choose) {
		case 'list':    // 显示播放列表
			togglePlayer();
			$('#main-list').fadeIn();
			$('#sheet').fadeOut();
			$(".btn[data-action='playing']").addClass('active');
			break;

		case 'sheet':   // 显示专辑
			togglePlayer();
			$('#sheet').fadeIn();
			$('#main-list').fadeOut();
			$(".btn[data-action='sheet']").addClass('active');
			break;

		case 'player':  // 显示播放器
			$('#player').fadeIn();
			$('#sheet').fadeOut();
			$('#main-list').fadeOut();
			$(".btn[data-action='player']").addClass('active');
			break;
	}
}

// 跳转正在播放
export function jumplist() {
	$('.btn-box .active').removeClass('active');
	togglePlayer();
	$('#main-list').fadeIn();
	$('#sheet').fadeOut();
	$(".btn[data-action='playing']").addClass('active');
}

// 显示关于窗口
export function showabout() {
	var tmpHtml = '<p style="padding: 20px 20px;display: block;line-height: 25px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Gameclub全网音乐在线播放器，' +
		'一款开源的基于网易云音乐、酷我音乐、QQ音乐api的在线音乐播放器。具有音乐搜索、播放、下载、歌词同步显示、MV视频播放、个人音乐播放列表等功能，本项目已开源。<br>github链接:<a href="https://github.com/k7opi/MusicPlayer">https://github.com/k7opi/MusicPlayer</a>' +
		'<br>有问题请联系站长，QQ：2026314667<br>Tips:感谢孟坤<a href="https://mkblog.cn/">https://mkblog.cn/</a>提供的前端样式源码。</p>';
	layer.open({
		type: 1,
		shade: 0.5,
		title: '关于本站',
		shadeClose: true,
		content: tmpHtml
	});
}

// 展现 app 下载二维码
export function appcode() {
	var tmpHtml = '<div style="padding: 25px 30px;display: block;text-align: center;">' +
		'<p style="margin-bottom: 10px;">全网音乐播放器安卓客户端</p>' +
		'<img src="images/download.png" style="width:190px;height:190px;" draggable="false">' +
		'<p style="margin-top: 10px;">提取码：219q</p>' +
		'</div>';
	layer.open({
		type: 1,
		shade: 0.5,
		title: false,
		shadeClose: true,
		content: tmpHtml
	});
}

// 展现列表中任意首歌的歌曲信息
// 歌曲名/歌手/专辑来自外部接口，必须转义
export function musicInfo(id, index) {
	var song = playlist[index];
	if (!song) return;
	var tempStr = '<span class="info-title">歌名：</span>' + escapeHtml(song.name) +
		'<br><span class="info-title">歌手：</span>' + escapeHtml(song.artist) +
		'<br><span class="info-title">专辑：</span>' + escapeHtml(song.album) +
		'<br><span class="info-title">来源：</span>' + escapeHtml(getsource(song.source) || '');

	if (index == id) {   // 当前正在播放这首歌，顺便显示时长
		tempStr += '<br><span class="info-title">时长：</span>' + formatTime(audio.duration);
	}
	tempStr += '<br><span class="info-btn" onclick="thisDownload(' + index + ')">下载</span>';
	if (song.mvid) {
		tempStr += '<span onclick="playmv(' + index + ')" class="info-btn" style="margin-left: 10px">播放MV</span>';
	}
	layer.open({
		type: 0,
		shade: false,
		title: false,
		btn: false,
		content: tempStr
	});
}

// 事件注册：tab 按钮、歌曲信息、图片兜底、移动端列表按钮、快捷键
// 播放/歌单相关动作通过事件总线转发，避免 ui 层反向依赖 feature 模块
export function init() {
	$('.btn').click(function () {
		switch ($(this).data('action')) {
			case 'search':  // 搜索
				emit(EVENTS.SEARCH_BOX);
				break;
			case 'playing': // 正在播放
				dataBox('list');
				break;
			case 'sheet':   // 播放列表
				emit(EVENTS.SHOW_SHEET);
				dataBox('sheet');
				break;
			case 'player':  // 显示播放器
				dataBox('player');
				break;
			case 'app':     // 显示 app 下载二维码
				appcode();
				break;
		}
	});

	// 歌曲信息按钮点击
	$('#music-info').click(function () {
		if (state.playid !== undefined) {
			musicInfo(state.playid, state.playid);
		}
	});

	// 图片加载失败兜底
	$('img').on('error', function () {
		$(this).attr('src', 'images/player_cover.png');
	});

	// 小屏幕点击右侧小点查看歌曲详细信息
	$('.music-list').on('click', '.list-mobile-menu', function () {
		var num = parseInt($(this).parent().data('no'));
		musicInfo(state.playid, num);
		return false;
	});

	// 小屏幕点击右侧加号添加歌曲到我的歌单
	$('.music-list').on('click', '.list-mobile-love', function () {
		var num = parseInt($(this).parent().data('no'));
		emit(EVENTS.ADD_MYLIST, num);
		return false;
	});

	// 小屏幕点击右侧删除按钮
	$('.music-list').on('click', '.list-mobile-del', function () {
		var num = parseInt($(this).parent().data('no'));
		emit(EVENTS.DEL_MYLIST, num);
		return false;
	});

	// 列表项双击播放
	$('.music-list').on('dblclick', '.list-item', function () {
		var num = parseInt($(this).data('no'));
		if (isNaN(num)) return false;
		emit(EVENTS.PLAY, num);
	});

	// 移动端列表项单击播放
	$('.music-list').on('click', '.list-item', function () {
		if (!state.isMobile) return;
		var num = parseInt($(this).data('no'));
		if (isNaN(num)) return false;
		emit(EVENTS.PLAY, num);
	});

	// 快捷键切歌，代码来自 @茗血(https://www.52benxi.cn/)
	document.onkeydown = function (e) {
		var key = e.keyCode || e.which || e.charCode;
		var ctrl = e.ctrlKey || e.metaKey;
		var isFocus = $('input').is(':focus');
		if (ctrl && key == 37) emit(EVENTS.PLAY_RELATIVE, -1);  // Ctrl+左方向键 切换上一首歌
		if (ctrl && key == 39) emit(EVENTS.PLAY_RELATIVE, 1);   // Ctrl+右方向键 切换下一首歌
		if (key == 32 && isFocus == false) emit(EVENTS.TOGGLE); // 空格键 播放/暂停歌曲
	};
}

// 初始化滚动条与背景模糊
export function initLayout() {
	// 初始化滚动条
	if (state.isMobile) {   // 加了滚动条插件和没加滚动条插件所操作的对象是不一样的
		state.sheetList = $('#sheet');
		state.mainList = $('#main-list');
	} else {
		$('#main-list,#sheet').mCustomScrollbar({
			theme: 'minimal',
			advanced: {
				updateOnContentResize: true // 数据更新后自动刷新滚动条
			}
		});
		state.sheetList = $('#sheet .mCSB_container');
		state.mainList = $('#main-list .mCSB_container');
	}

	// 初始化背景模糊
	if ((mkPlayer.coverbg === true && !state.isMobile) || (mkPlayer.mcoverbg === true && state.isMobile)) {
		if (state.isMobile) {   // 移动端采用另一种模糊方案
			$('#blur-img').html('<div class="blured-img" id="mobile-blur"></div><div class="blur-mask mobile-mask"></div>');
		} else {
			$('#blur-img').backgroundBlur({
				blurAmount: 50,      // 模糊度
				imageClass: 'blured-img',
				overlayClass: 'blur-mask',
				endOpacity: 1        // 图像最终的不透明度
			});
		}
		$('.blur-mask').fadeIn(1000);   // 遮罩层淡出
	}
}
