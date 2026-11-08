// 全局桥接：把 HTML 内联 onclick 与动态模板里引用的函数挂到 window
// 这是唯一保留“全局函数”的地方，将来若改为事件委托可整文件删除
import { state, playlist } from './state.js';

import { showabout, appcode, jumplist } from '../features/layout.js';
import { searchSubmit, ajaxMore, ajaxList } from '../features/search.js';
import { playList, playmv, audiocontrol, nextMusic, prevMusic, orderChange, thisDownload } from '../features/player.js';
import { addMylist, getMylist, delMylist, ajaxMylistMore } from '../features/sheet.js';
import { loginBox, reloadcapt, LoginAction, loginout } from '../features/auth.js';

const GLOBALS = {
	// index.html 静态内联
	showabout,
	jumplist,
	getMylist,
	ajaxMylistMore,
	ajaxList,
	prevMusic,
	audiocontrol,
	nextMusic,
	orderChange,
	// 动态模板内联
	playList,
	playmv,
	addMylist,
	delMylist,
	thisDownload,
	ajaxMore,
	searchSubmit,
	loginBox,
	reloadcapt,
	LoginAction,
	loginout
};

export function mountGlobals() {
	Object.keys(GLOBALS).forEach(function (name) {
		window[name] = GLOBALS[name];
	});
	// 调试用只读快照：window.__playerState.playlist / window.__playerState.state
	window.__playerState = { state: state, playlist: playlist };
}

mountGlobals();
