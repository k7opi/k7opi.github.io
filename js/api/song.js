// 歌曲相关接口：搜索、榜单、播放地址、歌词、MV
// 集中维护 source -> 路由映射，避免各模块各写一份 switch
import { get } from './request.js';

// 音乐源 -> 接口路径
const SOURCE_ROUTES = {
	kuwo: {
		search: '/kuworesult',
		url: '/kuwourl',
		lrc: '/kuwolrc',
		mv: '/kuwomv',
		label: '酷我音乐'
	},
	netease: {
		search: '/neteaseresult',
		url: '/neteaseurl',
		lrc: '/neteaselrc',
		mv: '/neteasemv',
		label: '网易云音乐'
	},
	qq: {
		search: '/qqresult',
		url: '/qqurl',
		lrc: '/qqlrc',
		mv: '/qqmv',
		label: 'QQ音乐'
	}
};

// 音乐源显示名
export function getsource(source) {
	var route = SOURCE_ROUTES[source];
	return route ? route.label : undefined;
}

function routeOf(source, key) {
	var route = SOURCE_ROUTES[source];
	return route ? route[key] : '';
}

// 搜索：返回 { songinfo, total, totol, page }，失败时返回 { code: -1 }
export function searchMusic(source, keyword, page) {
	return get(routeOf(source, 'search'), { keyword: keyword, page: page });
}

// 榜单：bangid 为 1/2/3/4，失败时返回 { code: -1 }
export function loadChart(bangid) {
	return get('/list', { type: bangid });
}

// 歌手歌曲
export function loadArtistSongs(artistid) {
	return get('/list', { type: 10, singer: artistid });
}

// 播放地址：返回字符串，失败为空串
// 后端 res.send(url) 返回的是纯文本直链而非 JSON，必须按 text 解析，
// 否则 jQuery 会以 parsererror 失败，前端表现为「获取播放地址失败」
export function getPlayUrl(source, id) {
	return get(routeOf(source, 'url'), { id: id }, { dataType: 'text' });
}

// 歌词：kuwo 返回数组，netease/qq 返回 LRC 文本，失败返回 { code: -1 }
// 响应体类型三种源不一致（数组 JSON / LRC 纯文本 / {code:-1}），
// 统一按 text 取回后在前端自行判定，避免 jQuery 对纯文本报 parsererror
export function getLyricRaw(source, id) {
	return get(routeOf(source, 'lrc'), { id: id }, { dataType: 'text' });
}

// MV：返回渲染好的 HTML 片段或提示文案
export function getMvContent(source, mvid, name, artist) {
	return get(routeOf(source, 'mv'), { id: mvid, name: name, artist: artist }, { dataType: 'html' });
}
