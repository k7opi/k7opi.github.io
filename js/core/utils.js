// 通用工具函数

// 判断是否为移动设备
export const isMobile = {
	Android: function () {
		return navigator.userAgent.match(/Android/i) ? true : false;
	},
	BlackBerry: function () {
		return navigator.userAgent.match(/BlackBerry/i) ? true : false;
	},
	iOS: function () {
		return navigator.userAgent.match(/iPhone|iPad|iPod/i) ? true : false;
	},
	Windows: function () {
		return navigator.userAgent.match(/IEMobile/i) ? true : false;
	},
	any: function () {
		return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Windows());
	}
};

// 转义 HTML 特殊字符，防止歌曲名/歌手等外部数据注入 DOM
export function escapeHtml(str) {
	if (str === null || str === undefined) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// 将时间格式化为 00:00 / 00:00:00
export function formatTime(time) {
	var hour, minute, second;
	hour = String(parseInt(time / 3600, 10));
	if (hour.length == 1) hour = '0' + hour;

	minute = String(parseInt((time % 3600) / 60, 10));
	if (minute.length == 1) minute = '0' + minute;

	second = String(parseInt(time % 60, 10));
	if (second.length == 1) second = '0' + second;

	if (hour > 0) {
		return hour + ':' + minute + ':' + second;
	}
	return minute + ':' + second;
}

// 邮箱格式校验（注册页使用）
// 注意：本正则必须与后端 utils/validate.js 的 EMAIL_RE 完全一致，改动需两端同步。
// 顶级域名支持 2-63 位（.online / .tech 之类不再被误判），域名标签不允许首尾为连字符。
var EMAIL_RE = /^[A-Za-z0-9]+([._%+-][A-Za-z0-9]+)*@([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

export function testEmail(mail) {
	if (typeof mail !== 'string') return false;
	var str = mail.trim();
	if (str === '' || str.length > 254) return false;
	return EMAIL_RE.test(str);
}
