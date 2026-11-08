// 播放器入口
// type="module" 天然 defer，执行时 DOM 已解析完成，无需再包 $(function)
/* global $, layer */
import { state } from './core/state.js';
import { addListhead, addListbar } from './ui/list-render.js';
import * as layout from './features/layout.js';
import * as search from './features/search.js';
import * as lyric from './features/lyric.js';
import * as player from './features/player.js';
import * as sheet from './features/sheet.js';
import * as auth from './features/auth.js';
import './core/globals.js';   // 全局桥接放在最后：此时各 feature 模块已求值完毕

function boot() {
	layout.initLayout();    // 滚动条 + 背景模糊
	layout.init();          // tab 与列表公共事件
	search.init();
	lyric.init();
	player.init();          // 进度条初始化 + audio.onended
	sheet.init();
	auth.init();            // 登录状态栏引用 + 播放列表页刷新登录态

	auth.getcaptoken();     // 检查验证码 token
	addListhead();          // 添加列表头
	addListbar('nodata');   // 添加列表尾
}

try {
	boot();
} catch (e) {
	console.error('[main] 初始化失败:', e);
	if (window.layer) layer.msg('页面初始化失败，请刷新重试');
}

// 页面卸载时清理定时器，避免残留
window.addEventListener('pagehide', function () {
	if (state.titflash !== undefined) clearInterval(state.titflash);
	if (state.interval_volume_up !== undefined) clearInterval(state.interval_volume_up);
	if (state.interval_volume_down !== undefined) clearInterval(state.interval_volume_down);
});
