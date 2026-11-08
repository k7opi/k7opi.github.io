// 播放列表面板渲染
// 模板保持原有字符串拼接 + 转义方式，行内 onclick 保留以兼容现有调用方式
/* global $ */
import { state, playlist } from '../core/state.js';
import { escapeHtml } from '../core/utils.js';

// 向列表中加入列表头
export function addListhead() {
	var html = '<div class="list-item list-head">' +
		'    <span class="music-album">' +
		'        专辑' +
		'    </span>' +
		'    <span class="auth-name">' +
		'        歌手' +
		'    </span>' +
		'    <span class="music-name">' +
		'        歌曲' +
		'    </span>' +
		'</div>';
	if (state.mainList) state.mainList.append(html);
}

// 加载列表中的提示条
// 参数：类型（more、nomore、nodata）
export function addListbar(types) {
	var html;
	switch (types) {
		case 'more':    // 还可以加载更多
			html = '<div class="list-item text-center list-loadmore list-clickable" title="点击加载更多数据" id="list-foot" onclick="ajaxMore();">点击加载更多...</div>';
			break;

		case 'nomore':  // 数据加载完了
			html = '<div class="list-item text-center" id="list-foot">全都加载完了</div>';
			break;

		case 'nodata':  // 列表中没有内容
			html = '<div class="list-item text-center" id="list-foot">可能是个假列表，什么也没有</div>';
			break;
	}
	if (html && state.mainList) state.mainList.append(html);
}

// 移除列表尾
export function removeListfoot() {
	$('#list-foot').remove();
}

// 刷新列表中的“正在播放”样式（原 refreshList）
export function refreshListMarker(index) {
	$('.list-playing').removeClass('list-playing');
	if (state.paused === true) return;
	if (playlist[index] === undefined) return;
	$(".list-item[data-no='" + index + "']").addClass('list-playing');
}

// 列表中新增一项
// 参数：编号（data-no，用于定位播放/删除）、名字、歌手、专辑、mvid
// mode: 'sheet'（默认，带“添加到我的歌单”按钮）| 'mylist'（我的歌单，带删除按钮）
// displayNo: 列表序号（从 0 开始），我的歌单分页追加时 data-no 与序号会错开，需单独传入
export function addItem(no, name, auth, album, mvid, mode) {
	var displayNo = arguments.length > 6 ? arguments[6] : no;
	var html = '';
	name = escapeHtml(name);
	auth = escapeHtml(auth);
	album = escapeHtml(album);
	var isMylist = mode === 'mylist';

	if (isMylist) {
		// 我的歌单：点击从歌单删除
		if (mvid && !state.isMobile) {
			html = '<div class="list-item" data-no="' + no + '">' +
				'<span class="list-num">' + (displayNo + 1) + '</span>' +
				'<span class="list-mobile-menu"></span>' +
				'<span class="music-album">' + album + '</span>' +
				'<span class="auth-name">' + auth + '</span>' +
				'<span class="music-name">' +
					'<span class="music-name-cult">' + name + '<span class="songlist__icon songlist__icon_mv sprite" data-function="share" title="MV" onclick="playmv(' + no + ')"></span></span>' +
					'<div class="list-menu" data-no="' + no + '">' +
						'<span class="list-icon icon-play" onclick="playList(' + no + ')" data-function="play" title="点击播放这首歌"></span>' +
						'<span class="list-icon icon-delete" onclick="delMylist(' + no + ')" data-function="share" title="点击从我的歌单删除"></span>' +
					'</div>' +
				'</span>' +
			'</div>';
		} else {
			html = '<div class="list-item" data-no="' + no + '">' +
				'<span class="list-num">' + (displayNo + 1) + '</span>' +
				'<span class="list-mobile-del"></span>' +
				'<span class="list-mobile-menu"></span>' +
				'<span class="music-album">' + album + '</span>' +
				'<span class="auth-name">' + auth + '</span>' +
				'<span class="music-name">' +
					'<span class="music-name-cult">' + name + '</span>' +
					'<div class="list-menu" data-no="' + no + '">' +
						'<span class="list-icon icon-play" onclick="playList(' + no + ')" data-function="play" title="点击播放这首歌"></span>' +
						'<span class="list-icon icon-delete" onclick="delMylist(' + no + ')" data-function="share" title="点击从我的歌单删除"></span>' +
					'</div>' +
				'</span>' +
			'</div>';
		}
	} else if (mvid && !state.isMobile) {
		html = '<div class="list-item" data-no="' + no + '">' +
			'<span class="list-num">' + (displayNo + 1) + '</span>' +
			'<span class="list-mobile-menu"></span>' +
			'<span class="music-album">' + album + '</span>' +
			'<span class="auth-name">' + auth + '</span>' +
			'<span class="music-name">' +
				'<span class="music-name-cult">' + name + '<span class="songlist__icon songlist__icon_mv sprite" data-function="share" title="MV" onclick="playmv(' + no + ')"></span></span>' +
				'<div class="list-menu" data-no="' + no + '">' +
					'<span class="list-icon icon-play" onclick="playList(' + no + ')" data-function="play" title="点击播放这首歌"></span>' +
					'<span class="list-icon icon-share" onclick="addMylist(' + no + ')" data-function="share" title="点击添加到我的歌单"></span>' +
				'</div>' +
			'</span>' +
		'</div>';
	} else {
		html = '<div class="list-item" data-no="' + no + '">' +
			'<span class="list-num">' + (displayNo + 1) + '</span>' +
			'<span class="list-mobile-love"></span>' +
			'<span class="list-mobile-menu"></span>' +
			'<span class="music-album">' + album + '</span>' +
			'<span class="auth-name">' + auth + '</span>' +
			'<span class="music-name">' +
				'<span class="music-name-cult">' + name + '</span>' +
				'<div class="list-menu" data-no="' + no + '">' +
					'<span class="list-icon icon-play" onclick="playList(' + no + ')" data-function="play" title="点击播放这首歌"></span>' +
					'<span class="list-icon icon-share" onclick="addMylist(' + no + ')" data-function="share" title="点击添加到我的歌单"></span>' +
				'</div>' +
			'</span>' +
		'</div>';
	}
	if (state.mainList) state.mainList.append(html);
}
