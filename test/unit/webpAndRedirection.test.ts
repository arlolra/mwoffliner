import execa from 'execa';
import { join } from 'path';
import test from 'blue-tape';
import { execute } from '../../src/mwoffliner.lib';
import { writeFilePromise, mkdirPromise } from '../../src/util';
import { ZimReader } from '@openzim/libzim'
import fs from 'fs';
import Downloader from '../../src/Downloader';
import MediaWiki from '../../src/MediaWiki';
import FileType from 'file-type'
import { isWebpCandidateImageUrl } from '../../src/util/misc';
import logger from '../../src/Logger';

const now = new Date();
const testId = join(process.cwd(), `mwo-test-${+now}`);

const articleListUrl = join(testId, '/articleList');

test('Webp Option check', async (t) => {
    await execa.command(`redis-cli flushall`);
    await mkdirPromise(testId);

    const articleList = `
Animation
Real-time computer graphics`;

    await writeFilePromise(articleListUrl, articleList, 'utf8');

    const outFiles = await execute({
        mwUrl: `https://en.wikipedia.org`,
        adminEmail: `test@kiwix.org`,
        articleList: articleListUrl,
        outputDirectory: testId,
        redis: process.env.REDIS,
        webp: true,
    });
    const zimFile = new ZimReader(outFiles[0].outFile);

    const mw = new MediaWiki({
        base: 'https://en.wikipedia.org',
        getCategories: true,
    } as any)

    const downloader = new Downloader({ mw, uaString: '', speed: 1, reqTimeout: 1000 * 60, noLocalParserFallback: false, forceLocalParser: false, webp: false, optimisationCacheUrl: '' });

    t.assert(isWebpCandidateImageUrl('../I/m/osm-intl%2C9%2C52.2789%2C8.0431%2C300x300.png%3Flang.svg'),
        'adding webp to fileName having png before arguments');
    t.assert(isWebpCandidateImageUrl('../I/m/osm-intl%2C9%2C52.2789%2C8.0431%2C300x300.jpg%3Flang.svg'),
        'adding webp to fileName having jpg before arguments');
    t.assert(isWebpCandidateImageUrl('../I/m/osm-intl%2C9%2C52.2789%2C8.0431%2C300x300.jpeg%3Flang.svg'),
        'adding webp to fileName having jpeg before arguments');
    t.assert(isWebpCandidateImageUrl('../I/m/osm-intl%2C9%2C52.2789%2C8.0431%2C300x300.png'),
        'adding webp to fileName having png at last');
    t.assert(isWebpCandidateImageUrl('../I/m/osm-intl%2C9%2C52.2789%2C8.0431%2C300x300.jpg'),
        'adding webp to fileName having jpg at last');
    t.assert(isWebpCandidateImageUrl('../I/m/osm-intl%2C9%2C52.2789%2C8.0431%2C300x300.jpeg'),
        'adding webp to fileName having jpeg at last');
    t.assert(await isWebpPresent('I/m/Animexample3edit.png.webp', zimFile), 'passed test for png')
    t.assert(await isWebpPresent('I/m/Claychick.jpg.webp', zimFile), 'passed test for jpg')
    t.assert(await isRedirectionPresent(`href="Real-time_rendering"`,
        zimFile), 'redirection check successful')
    fs.rmdirSync(testId, {recursive: true});
})

async function isWebpPresent(path: string, zimFile: ZimReader) {
    return await zimFile.getArticleByUrl(path)
    .then(async (result) => {
        return (await FileType.fromBuffer(result.data)).mime === 'image/webp';
    })
    .catch(err => {
        return false;
    })
}

async function isRedirectionPresent(path: string, zimFile: ZimReader) {
    return await zimFile.getArticleByUrl('A/Animation')
    .then((result) => {
        return result.data.toString().includes(path);
    })
}
