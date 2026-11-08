// 我的歌单：添加、获取、删除
/* global $, layer */
import { state, playlist, resetPlaylist, removeSong } from '../core/state.js';
import { isloading, closeload } from '../core/loading.js';
import { on, EVENTS } from '../core/events.js';
import * as authApi from '../api/auth.js';
import { addItem, addListhead } from '../ui/list-render.js';
import { jumplist } from './layout.js';
import { initProgress } from './player.js';
import { loginBox } from './auth.js';

// 添加到我的歌单
export function addMylist(i) {
	var song = playlist[i];
	if (!song) return;
	isloading();
	return authApi.addToList(song)
		.then(function (jsonData) {
			if (jsonData && jsonData.code == 1) {
				layer.msg(jsonData.status);
				return true;
			}
			if (jsonData && jsonData.code == 0) {
				layer.msg(jsonData.status);
				loginBox();
				return false;
			}
			layer.msg('操作失败');
			return false;
		})
		.catch(function (err) {
			console.error('[mylist] add error:', err);
			layer.msg('操作失败，请稍后重试');
			return false;
		})
		.then(function (result) {
			closeload();
			return result;
		});
}

// 获取我的歌单
export function getMylist() {
	isloading();
	return authApi.fetchMyList()
		.then(function (jsonData) {
			if (jsonData && jsonData.code == 1) {
				layer.msg(jsonData.status);
				resetPlaylist();
				state.listMode = 'mylist';
				var songs = jsonData.songinfo || [];
				for (var j = 0; j < songs.length; j++) {
					playlist.push({
						musicrid: songs[j].musicrid,
						name: songs[j].name,
						artist: songs[j].artist,
						album: songs[j].album,
						pic: songs[j].pic,
						source: songs[j].source,
						mvid: songs[j].mvid
					});
				}
				initProgress();  // 初始化进度条
				if (state.mainList) state.mainList.html('');
				addListhead();
				for (var i = 0; i < playlist.length; i++) {
					addItem(i, playlist[i].name, playlist[i].artist, playlist[i].album, playlist[i].mvid, 'mylist');
				}
				jumplist();
				return true;
			}
			if (jsonData && jsonData.code == 0) {
				layer.msg(jsonData.status);
				loginBox();
				return false;
			}
			layer.msg((jsonData && jsonData.status) || '获取歌单失败');
			return false;
		})
		.catch(function (err) {
			console.error('[mylist] fetch error:', err);
			layer.msg('获取歌单失败，请稍后重试');
			return false;
		})
		.then(function (result) {
			closeload();
			return result;
		});
}

// 从歌单中删除（带确认框）
export function delMylist(i) {
	var song = playlist[i];
	if (!song) return;
	layer.confirm('<div>确认删除吗？</div>', { btn: ['确定', '取消'], title: '提示' }, function () {
		layer.close(layer.index);
		isloading();
		var index = i;
		removeSong(index);  // 保持 delete 语义，不移位
		$('.list-item[data-no=' + index + ']').remove();
		authApi.removeFromList(song)
			.then(function (jsonData) {
				if (jsonData && jsonData.code == 1) {
					layer.msg(jsonData.status);
				} else if (jsonData && jsonData.code == 0) {
					layer.msg(jsonData.status);
					loginBox();
				} else {
					layer.msg('删除失败');
				}
			})
			.catch(function (err) {
				console.error('[mylist] delete error:', err);
				layer.msg('删除失败，请稍后重试');
			})
			.then(function () {
				closeload();
			});
	});
}

export function init() {
	on(EVENTS.ADD_MYLIST, addMylist);
	on(EVENTS.DEL_MYLIST, delMylist);
}
