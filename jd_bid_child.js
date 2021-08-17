/* 大小孩考场
    说明：
        1、只做助力部分，因为助力有京豆，而抽奖api似乎有问题，也就是没水。
        2、活动是邀请制，每个人每天可以助力很多人（未测上限），但直到活动结束都只能助力一个人一次。
        3、活动时间，2021年6月13日 0:00 - 2022年6月15日 23:59。
*/
const $ = new Env("大小孩考场");
const notify = $.isNode() ? require('./sendNotify') : '';
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
const maxBeHelp = 5
const maxHelpFail = 5
var cookiesArr = [];
$.appid = "2a679256e7cd6b44234ce590faab81cf"
$.activeId = "bigChildf21ddd9c"
$.shareIds = []
$.AuthArr = []

if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item])
    })
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
} else {
    cookiesArr = [
        $.getdata("CookieJD"),
        $.getdata("CookieJD2"),
        ...$.toObj($.getdata("CookiesJD") || "[]").map((item) => item.cookie)].filter((item) => !!item);
}
!(async () => {
    if (!cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
        return;
    }
    $.wxUA = `Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.10(0x18000a27) NetType/WIFI Language/zh_CN miniProgram`
    for (let i = 0; i < cookiesArr.length; i++) {
        $.index = i + 1;
        $.cookie = cookiesArr[i];
        $.isLogin = true;
        $.nickName = '';
        $.UA = `jdapp;iPhone;10.1.0;14.7.1;${randomWord(40)};network/wifi;model/iPhone11,1;addressid/847332746;appBuild/167774;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1`;
        $.shareId = ""
        $.lkEPin = ""
        $.lkToken = ""
        $.Authorization = ""
        await TotalBean();
        $.UserName = decodeURIComponent($.cookie.match(/pt_pin=([^; ]+)(?=;?)/) && $.cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]);
        console.log(`\n*****开始【京东账号${$.index}】${$.nickName || $.UserName}*****\n`);
        if (!$.isLogin) {
            $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });

            if ($.isNode()) {
                await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
            }
            cookiesArr.splice(i, 1)
            i--
            continue
        }

        $.Authorization = await getAuthorization()
        await bigChild()
        $.AuthArr.push({
            nickName: $.nickName || $.UserName,
            lkEPin: $.lkEPin,
            lkToken: $.lkToken,
            Authorization: $.Authorization,
            joinId: $.joinId
        })
    }
    for (let i = 0; i < cookiesArr.length; i++) {
        if ($.shareIds.length === 0) break
        $.index = i + 1;
        $.cookie = cookiesArr[i];
        $.nickName = $.AuthArr[i].nickName;
        $.Authorization = $.AuthArr[i].Authorization
        $.joinId = $.AuthArr[i].joinId
        $.lkEPin = $.AuthArr[i].lkEPin
        $.lkToken = $.AuthArr[i].lkToken
        console.log(`\n*****【京东账号${$.index}】${$.nickName}开始助力*****\n`);
        await helpFriends()
    }
})()
    .catch((e) => {
        $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
        $.done();
    })

async function bigChild() {
    // 获取所有信息
    let res = await api("post", "https://www.kmg-jd.com/api/bigChild/active", {
        "attributes": {
            "activeId": $.activeId,
            "shareId": null
        }
    })
    // console.log(res?.data?.userVO)
    if (res?.data?.userVO?.joinId) {
        $.joinId = res.data.userVO.joinId
        console.log(`你的Id(互助码)：${$.joinId}`)
    }
    res = await api("post", "https://www.kmg-jd.com/api/interact/common/shareByDay", {
        "attributes": {
            "activeId": $.activeId,
            "joinId": $.joinId
        }
    })
    let helpInfo = res?.data || []
    console.log(`今天帮助你的用户：${helpInfo.map(x=>x?.nick || "").join("，")}`)
    if (helpInfo.length < maxBeHelp) {
        $.shareIds.push({
            shareId: $.joinId,
            helpNum: helpInfo.length,
            usrName: $.nickName || $.UserName
        })
    }
    
}

async function helpFriends() {
    for (let i = 0; i < $.shareIds.length; i++) {
        $.shareId = $.shareIds[i].shareId
        if ($.shareId === $.joinId) continue
        let maxFail = 0
        let res = await api("post", "https://www.kmg-jd.com/api/bigChild/active", {
            "attributes": {
                "activeId": $.activeId,
                "shareId": $.shareId
            }
        }, true)
        switch (res?.data?.userVO?.helpStatus) {
            case 1:
                console.log(`助力${$.shareIds[i].usrName}成功`)
                $.shareIds[i].helpNum++
                if ($.shareIds[i].helpNum === maxBeHelp) {
                    $.shareIds.splice(i, 1)
                    i--
                }
                break
            case 2:
                console.log(`助力${$.shareIds[i].usrName}失败：已经助力过该用户`)
                break
            case 5:
                console.log(`助力${$.shareIds[i].usrName}失败：该用户今日获得京豆已达上限`)
                $.shareIds.splice(i, 1)
                i--
                break
            default:
                maxFail++
                console.log(`助力${$.shareIds[i].usrName}失败：${JSON.stringify(res?.data?.userVO ?? res?.data ?? res)}`)
        }
        // 助力最多异常失败${maxHelpFail}次
        if (maxFail === maxHelpFail) break
        await $.wait(2000)
    }
}

async function getAuthorization() {
    const encryptPin = await new Promise(resolve => {
        $.post(baseUrlOption(
            `https://jdjoy.jd.com/saas/framework/encrypt/pin?appId=${$.appid}`,
            {
                'Accept': `application/json, text/plain, */*`,
                Cookie: $.cookie,
                Origin: `https://prodev.m.jd.com`,
                Referer: `https://prodev.m.jd.com`,
                "User-Agent": $.UA,
            }
        ), (err, resp, data) => {
            try {
                if (err) {
                    console.log(err);
                }
            } catch (e) {
                console.log(e);
            } finally {
                resolve(JSON.parse(data));
            }
        });
    });
    $.lkEPin = encryptPin?.data?.lkEPin || "";
    $.lkToken = encryptPin?.data?.lkToken || "";
    // const { errorCode, data: { $.lkEPin, $.lkToken } } = encryptPin
    if (!$.lkEPin || !$.lkToken) {
        console.log(`没有获取到lkEPin或lkToken`)
        console.log(encryptPin)
        return Promise.resolve();
    }
    return new Promise(resolve => {
        $.post(baseUrlOption(
            "https://www.kmg-jd.com/api/user/verify",
            {
                'Accept': `application/json, text/plain, */*`,
                'Content-Type': `application/json`,
                Authorization: $.Authorization,
                Referer: `https://www.kmg-jd.com/bigChild/index.html?lkEPin=${$.lkEPin}&lkToken=${$.lkToken}/`,
                'User-Agent': $.UA,
            },
            {
                parameters: {
                    userId: $.lkEPin,
                    lkToken: $.lkToken,
                    username: "sdfas"
                }
            }
        ), (err, resp, data) => {
            try {
                if (err) {
                    console.log(err);
                }
                const { code, token } = JSON.parse(data);
                if (code === 200) {
                    resolve(token);
                } else {
                    console.log(data);
                }
            } catch (e) {
                console.log(e);
            } finally {
                resolve();
            }
        });
    })
}

/**
 * 
 * @param {String} method
 * @param {String} url 
 * @param {JSON} body 
 * @param {Boolean} isWx 
 * @returns {JSON} {}
 */
function api(method, url, body = {}, isWx = false) {
    let headers = {
        'Accept': `application/json, text/plain, */*`,
        'Accept-Language': `zh-cn`,
        'Content-Type': `application/json;charset=UTF-8`,
        Cookie: $.cookie,
        Authorization: $.Authorization,
        Referer: `https://www.kmg-jd.com`,
        'User-Agent': isWx ? $.wxUA : $.UA
    }
    return new Promise(resolve => {
        $[method](baseUrlOption(
            url,
            headers,
            body
        ), (err, resp, data) => {
            try {
                if (err) {
                    console.log(err)
                }
                resolve(JSON.parse(data))
            } catch (e) {
                console.log(e)
            } finally {
                resolve()
            }
        })
    })
}

function TotalBean() {
    return new Promise(async resolve => {
        const options = {
            url: "https://me-api.jd.com/user_new/info/GetJDUserInfoUnion",
            headers: {
                Host: "me-api.jd.com",
                Accept: "*/*",
                Connection: "keep-alive",
                Cookie: $.cookie,
                "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
                "Accept-Language": "zh-cn",
                "Referer": "https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&",
                "Accept-Encoding": "gzip, deflate, br"
            }
        }
        $.get(options, (err, resp, data) => {
            try {
                if (err) {
                    $.logErr(err)
                } else {
                    if (data) {
                        data = JSON.parse(data);
                        if (data['retcode'] === "1001") {
                            $.isLogin = false; //cookie过期
                            return;
                        }
                        if (data['retcode'] === "0" && data.data && data.data.hasOwnProperty("userInfo")) {
                            $.nickName = data.data.userInfo.baseInfo.nickname;
                        }
                    } else {
                        $.log('京东服务器返回空数据');
                    }
                }
            } catch (e) {
                $.logErr(e)
            } finally {
                resolve();
            }
        })
    })
}

function baseUrlOption(url, headers = {}, body) {
    let res = {}
    if (!/^https?:\/\//.test(url)) url = `https://${url}`
    let init = {
        'Accept': `*/*`,
        'Accept-Encoding': `gzip, deflate, br`,
        'Accept-Language': `zh-CN,zh-Hans;q=0.9`,
        'Connection': `keep-alive`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: url.match(/^(http(s)?:\/\/.*?)($|\/)/)[1],
        Host: url.match(/^http(s)?:\/\/(.*?)($|\/)/)[2],
        Referer: ``,
    }
    for (let key in init) {
        if (headers[key] === undefined) {
            headers[key] = init[key]
        }
    }
    res.url = url
    if (![null, undefined].includes(body)) res.body = JSON.stringify(body)
    res.headers = headers
    return res
}

function randomWord(min, max = 0) {
    var str = "", range = min, arr = [...Array(35).keys()].map(k => k.toString(36));

    if (max) {
        range = Math.floor(Math.random() * (max - min + 1) + min);
    }

    for (let i = 0; i < range;) {
        let randomString = Math.random().toString(36).substring(2)
        if ((range - i) > randomString.length) {
            str += randomString
            i += randomString.length
        } else {
            str += randomString.slice(i - range)
            i += randomString.length
        }
    }
    return str;
}

// prettier-ignore
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
