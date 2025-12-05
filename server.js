const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

// بنعمل نفسنا متصفح عشان الموقع ميكشفناش
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://a.asd.homes/'
};

app.get('/', (req, res) => res.send('السيرفر شغال وزي الفل! 🚀'));

app.get('/get-video', async (req, res) => {
    const movieUrl = req.query.url; 

    if (!movieUrl) return res.status(400).json({ error: 'فين رابط الفيلم؟' });

    try {
        console.log(`جاري فحص: ${movieUrl}`);
        const { data: pageHtml } = await axios.get(movieUrl, { headers });
        const $ = cheerio.load(pageHtml);

        let foundLink = null;

        // 1. التدوير في الـ iframes
        $('iframe').each((i, element) => {
            const src = $(element).attr('src');
            // بندور على سيرفرات المشاهدة المشهورة
            if (src && (src.includes('dls4all') || src.includes('embed') || src.includes('watch') || src.includes('.mp4'))) {
                foundLink = src;
            }
        });

        // 2. لو ملقناش، ندور على أي رابط mp4 في الصفحة
        if (!foundLink) {
            const mp4Match = pageHtml.match(/https?:\/\/[^"']+\.mp4/);
            if (mp4Match) foundLink = mp4Match[0];
        }

        if (foundLink) {
            if (foundLink.startsWith('//')) foundLink = 'https:' + foundLink;
            res.json({ success: true, stream_url: foundLink });
        } else {
            res.json({ success: false, message: "مش قادر أجيب الرابط، ممكن الموقع محتاج Puppeteer" });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// تشغيل السيرفر
app.listen(3000, () => console.log('القناص جاهز على بورت 3000..'));
