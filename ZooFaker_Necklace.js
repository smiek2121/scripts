const https = require('https');
const fs = require('fs/promises');
const { R_OK } = require('fs').constants;
const vm = require('vm');
const UA = require('./USER_AGENTS.js').USER_AGENT;

const URL = 'https://h5.m.jd.com/babelDiy/Zeus/41Lkp7DumXYCFmPYtU3LTcnTTXTX/index.html';
const REG_SCRIPT = /<script src="([^><]+\/(main\.\w+\.js))\?t=\d+">/gm;
const REG_ENTRY = /^(.*?\.push\(\[)(\d+,\d+)/;
const REG_PIN = /pt_pin=(.+?);/m;
const KEYWORD_MODULE = 'get_risk_result:';
const DATA = {appid:'50082',sceneid:'DDhomePageh5'};
let smashUtils;

class ZooFakerNecklace {
    constructor(cookie, action) {
        this.cookie = cookie;
        this.action = action;
    }

    async run(data) {
        if (!smashUtils) {
            await this.init();
        }

        const t = Math.floor(1e+6 * Math.random()).toString().padEnd(6, '8');
        const mpin = this.cookie.match(REG_PIN)
        let pin = '-1'
        // if(mpin) pin = mpin[1];
        if(mpin) pin = decodeURIComponent(mpin[1]);
        const { log } = smashUtils.get_risk_result({
            id: this.action,
            data: {
                ...data,
                pin,
                random: t,
            }
        });
        const body = {
            ...data,
            random: t,
            extraData: { log, sceneid: DATA.sceneid },
        };

        // console.log(body);
        return body;
    }

    async init() {
        console.time('ZooFakerNecklace');
        process.chdir(__dirname);
        const html = await ZooFakerNecklace.httpGet(URL);
        const script = REG_SCRIPT.exec(html);

        if (script) {
            const [, scriptUrl, filename] = script;
            const jsContent = await this.getJSContent(filename, scriptUrl);
            const fnMock = new Function;
            const ctx = {
                window: { addEventListener: fnMock },
                document: {
                    addEventListener: fnMock,
                    removeEventListener: fnMock,
                    cookie: this.cookie,
                },
                navigator: { userAgent: UA },
            };
            const _this = this;
            Object.defineProperty(ctx.document,'cookie',{
                get() {
                    return _this.cookie;
                },
            });

            vm.createContext(ctx);
            vm.runInContext(jsContent, ctx);

            smashUtils = ctx.window.smashUtils;
            smashUtils.init(DATA);

            // console.log(ctx);
        }

        // console.log(html);
        // console.log(script[1],script[2]);
        console.timeEnd('ZooFakerNecklace');
    }

    async getJSContent(cacheKey, url) {
        try {
            await fs.access(cacheKey, R_OK);
            const rawFile = await fs.readFile(cacheKey, { encoding: 'utf8' });

            return rawFile;
        } catch (e) {
            let jsContent = await ZooFakerNecklace.httpGet(url);
            const findEntry = REG_ENTRY.test(jsContent);
            const ctx = {
                moduleIndex: 0,
            };
            const injectCode = `moduleIndex=arguments[0].findIndex(s=>s&&s.toString().indexOf('${KEYWORD_MODULE}')>0);return;`;
            const injectedContent = jsContent.replace(/^(!function\(\w\){)/, `$1${injectCode}`);

            vm.createContext(ctx);
            vm.runInContext(injectedContent, ctx);

            if (!(ctx.moduleIndex && findEntry)) {
                throw new Error('Module not found.');
            }
            jsContent = jsContent.replace(REG_ENTRY, `$1${ctx.moduleIndex},1`);
            // Fix device info (actually insecure, make less sense)
            jsContent = jsContent.replace(/\w+\.getDefaultArr\(7\)/, '["a","a","a","a","a","a","1"]');
            fs.writeFile(cacheKey, jsContent);
            return jsContent;

            REG_ENTRY.lastIndex = 0;
            const entry = REG_ENTRY.exec(jsContent);

            console.log(ctx.moduleIndex);
            console.log(entry[2]);
        }
    }

    static httpGet(url) {
        return new Promise((resolve, reject) => {
            const protocol = url.indexOf('http') !== 0 ? 'https:' : '';
            const req = https.get(protocol + url, (res) => {
                res.setEncoding('utf-8');

                let rawData = '';

                res.on('error', reject);
                res.on('data', chunk => rawData += chunk);
                res.on('end', () => resolve(rawData));
            });

            req.on('error', reject);
            req.end();
        });
    }
}

async function getBody($ = {}) {
    let riskData;
    switch ($.action) {
        case 'startTask':
            riskData = { taskId: $.id };
            break;
        case 'chargeScores':
            riskData = { bubleId: $.id };
            break;
        case 'sign':
            riskData = {};
        default:
            break;
    }
    const zf = new ZooFakerNecklace($.cookie, $.action);
    const log = await zf.run(riskData);

    // return `body=${encodeURIComponent(JSON.stringify(log))}`;
    return log;
}

ZooFakerNecklace.getBody = getBody;
module.exports = ZooFakerNecklace;
