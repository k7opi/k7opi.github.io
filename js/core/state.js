// 全局共享状态（单例）
// 原先的 rem / playlist / audio / lrcobj 等全局变量全部收敛到这里，
// 其它模块只允许通过本模块导出的 state 与方法来读写，避免隐式全局。
import { isMobile } from './utils.js';
import { emit, EVENTS } from './events.js';

export const state = {
	isMobile: isMobile.any(),   // 是否移动设备
	webTitle: document.title,   // 页面原始标题
	listMode: 'sheet',          // 当前列表模式：'sheet' 搜索/榜单 | 'mylist' 我的歌单
	playid: undefined,          // 正在播放的歌曲在 playlist 中的索引
	paused: undefined,          // 是否暂停
	order: undefined,           // 循环模式：1 单曲循环 2 列表循环 3 随机播放
	page: 1,                    // 搜索结果页码
	source: undefined,          // 当前列表实际的音乐源（翻页依赖它）
	searchSource: undefined,    // 搜索弹窗上次点选的音乐源（仅用于回显）
	keyword: undefined,         // 搜索关键词
	lyric: undefined,           // 解析后的歌词 { 秒: 文本 }
	lastLyric: undefined,       // 上一次高亮的歌词时间点
	errCount: 0,                // 连续播放失败的歌曲数
	mvPlaying: false,           // 是否正在播放 MV（期间音乐被接管）
	fadingOut: false,           // 是否处于暂停淡出中（此时不应触发自动下一首）
	isload: null,               // layer.load 返回的句柄
	titflash: undefined,        // 标题滚动定时器
	interval_volume_up: undefined,
	interval_volume_down: undefined,
	mainList: null,             // 列表容器 jQuery 对象
	sheetList: null,            // 歌单容器 jQuery 对象
	userloginbox: null          // 登录状态栏 DOM
};

// 播放列表（数组引用保持不变，清空请用 resetPlaylist）
export const playlist = [];

// 清空播放列表：保持数组引用稳定，避免其它模块持有旧引用
export function resetPlaylist() {
	playlist.length = 0;
}

// 批量追加歌曲
export function pushSongs(songs) {
	for (var i = 0; i < songs.length; i++) {
		playlist.push(songs[i]);
	}
	return playlist;
}

// 按索引移除（保持 delete 语义，不 splice，避免 playid 索引错位）
export function removeSong(index) {
	delete playlist[index];
	emit(EVENTS.TRACK_CHANGE, { removed: index });
}

// 当前播放的歌曲对象
export function currentSong() {
	if (state.playid === undefined) return undefined;
	return playlist[state.playid];
}

// 按索引取歌（越界返回 undefined）
export function songAt(index) {
	return playlist[index];
}

// 音频元素（index.html 中的 <audio>）
export const audio = document.getElementsByTagName('audio')[0];
