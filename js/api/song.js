// 歌曲相关接口：搜索、榜单、歌手、播放地址、歌词、MV
// 所有音乐接口都在 /api/music/* 下，source 作为参数而不是路径的一部分；
// request.js 已完成信封解包，这里返回的直接是 data 实体（不再是信封）。
import { get } from './request.js';

// 音乐源 -> 显示名
const SOURCE_LABELS = {
	kuwo: '酷我音乐',
	netease: '网易云音乐',
	qq: 'QQ音乐'
};

// 音乐源显示名
export function getsource(source) {
	return SOURCE_LABELS[source];
}

// 是否为受支持的音源
export function isSource(source) {
	return Object.prototype.hasOwnProperty.call(SOURCE_LABELS, source);
}

// 搜索：返回 { source, keyword, page, pageSize, total, hasMore, list }
export function searchMusic(source, keyword, page, opts) {
	return get('/api/music/search', {
		source: source,
		keyword: keyword,
		page: page
	}, opts);
}

// 榜单：bangid 为 1/2/3/4，返回 { type, total, hasMore, list }
export function loadChart(bangid, opts) {
	return get('/api/music/chart', { type: bangid }, opts);
}

// 歌手歌曲：返回 { artistId, total, hasMore, list }
export function loadArtistSongs(artistid, opts) {
	return get('/api/music/artist', { id: artistid }, opts);
}

// 播放地址：返回 { url, bitrate, format, isFragment, expireAt }
export function getPlayUrl(source, id, opts) {
	return get('/api/music/url', { source: source, id: id }, opts);
}

// 歌词：返回 { format, count, lines: [{ time: Number, text: String }] }
export function getLyric(source, id, opts) {
	return get('/api/music/lyric', { source: source, id: id }, opts);
}

// MV：返回 { title, url, expireAt }，前端自行弹层播放
export function getMvUrl(source, mvid, name, artist, opts) {
	return get('/api/music/mv', {
		source: source,
		id: mvid,
		name: name,
		artist: artist
	}, opts);
}

// 音源元数据：返回 { list: [{ source, label, supportsMv }] }
export function getSources(opts) {
	return get('/api/music/sources', null, opts);
}
