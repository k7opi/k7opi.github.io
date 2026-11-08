// 极简事件总线，用于解耦 feature 模块之间的相互调用
const listeners = Object.create(null);

export function on(type, fn) {
	if (typeof fn !== 'function') return function () {};
	if (!listeners[type]) listeners[type] = [];
	listeners[type].push(fn);
	return function off() {
		var arr = listeners[type];
		if (!arr) return;
		var i = arr.indexOf(fn);
		if (i > -1) arr.splice(i, 1);
	};
}

export function emit(type, payload) {
	var arr = listeners[type];
	if (!arr || !arr.length) return;
	// 复制一份，避免回调内 on/off 修改数组影响本次遍历
	arr.slice().forEach(function (fn) {
		try {
			fn(payload);
		} catch (e) {
			console.error('[events] handler error:', type, e);
		}
	});
}

// 事件名常量，避免拼写错误
export const EVENTS = {
	PLAY: 'play',                   // 请求播放指定索引
	PLAY_RELATIVE: 'play:relative', // 相对当前曲目播放（上一首/下一首，循环处理在 player 内）
	TOGGLE: 'play:toggle',          // 播放/暂停切换
	SEARCH_BOX: 'ui:searchbox',     // 打开搜索弹窗
	SHOW_SHEET: 'ui:sheet',         // 切到播放列表页并刷新登录态
	ADD_MYLIST: 'mylist:add',       // 添加到我的歌单
	DEL_MYLIST: 'mylist:del',       // 从我的歌单删除
	TRACK_CHANGE: 'trackchange'     // 当前曲目变更（歌词等模块监听）
};
