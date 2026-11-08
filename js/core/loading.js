// 加载动画统一入口（依赖 layer 全局与 state）
import { state } from './state.js';

export function isloading() {
	state.isload = layer.load(1, {
		shade: [0.1, 'transparent'] // 0.1 透明度的白色背景
	});
}

export function closeload() {
	if (state.isload === null || state.isload === undefined) return;
	layer.close(state.isload);
	state.isload = null;
}
