const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');
const axios = require('axios'); // مكتبة عشان الكوبري
const path = require('path');

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. القناص: بيجيب الرابط السري
app.get('/get-video', async (req, res) => {
    const movieUrl = req.query.url;
    if (!movieUrl) return res.status(400).json({ error: 'فين الرابط؟' });

    let browser = null;
    try {
        console.log(`🚀 جاري فحص: ${movieUrl}`);
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
        });

        const page = await browser.newPage();
        let foundVideo = null;

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const url = req.url();
            // بندور على mp4 أو m3u8 (عشان الجودات)
            if (url.endsWith('.mp4') || url.includes('.m3u8')) {
                console.log('🎯 تم اصطياد الفيديو:', url);
                foundVideo = url;
                req.abort();
            } else if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        try {
            await page.goto(movieUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        } catch (e) { console.log("⚠️ كملنا بحث رغم التأخير..."); }

        if (foundVideo) {
            res.json({ success: true, stream_url: foundVideo });
        } else {
            // محاولة أخيرة لو ملقاش في الشبكة
            const frameSrc = await page.evaluate(() => {
                 const iframe = document.querySelector('iframe');
                 return iframe ? iframe.src : null;
            });
            if(frameSrc) return res.json({ success: true, stream_url: frameSrc });
            
            res.json({ success: false, message: "حماية عالية، حاول تاني!" });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

// 2. الكوبري: بيعدي الفيديو من الحماية (Proxy)
app.get('/proxy-video', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).end();

    try {
        const response = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://a.asd.homes/' // كلمة السر
            }
        });

        // تمرير البيانات للمتصفح بتاعك
        res.set('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
    } catch (error) {
        console.error("Proxy Error:", error.message);
        res.status(500).send("فشل تحميل الفيديو");
    }
});

app.listen(3000, () => console.log('🎬 السيرفر جاهز!'));
