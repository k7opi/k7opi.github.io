// 播放器本地存储封装，键统一加 'mkPlayer2_' 前缀
import { STORAGE_PREFIX } from './config.js';

// 参数：键值、数据
export function playerSavedata(key, data) {
	key = STORAGE_PREFIX + key;
	data = JSON.stringify(data);
	if (window.localStorage) {
		localStorage.setItem(key, data);
	}
}

// 参数：键值，返回：数据
// 存储值可能被外部写入成非 JSON（手工调试、旧版本数据、其它脚本污染），
// 直接 JSON.parse 会抛异常并中断整个调用链，因此这里做兜底：解析失败返回原始字符串
export function playerReaddata(key) {
	if (!window.localStorage) return '';
	key = STORAGE_PREFIX + key;
	var raw = localStorage.getItem(key);
	if (raw === null) return null;
	try {
		return JSON.parse(raw);
	} catch (e) {
		return raw;
	}
}

// 参数：键值
export function playerRemovedata(key) {
	if (!window.localStorage) return '';
	key = STORAGE_PREFIX + key;
	return localStorage.removeItem(key);
}
