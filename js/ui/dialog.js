// layer 弹层/消息/加载动画的封装
// layer 仍以全局 <script> 引入，这里只做统一出口，便于将来替换实现
/* global layer */

export { isloading, closeload } from '../core/loading.js';

// 轻提示
export function msg(text) {
	layer.msg(text);
}

// 关闭所有 page 层（弹窗）
export function closeAll() {
	layer.closeAll('page');
}

// 确认框
export function confirm(text, onOk) {
	layer.confirm(text, { btn: ['确定', '取消'], title: '提示' }, function () {
		layer.close(layer.index);
		onOk();
	});
}

// 通用弹窗
export function open(options) {
	return layer.open(options);
}

// 提示框 + 回调
export function alert(text, cb) {
	layer.alert(text, cb);
}
