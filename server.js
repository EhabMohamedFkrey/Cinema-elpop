const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path'); // مكتبة عشان مسارات الملفات

const app = express();
app.use(cors());

// إعدادات التخفي
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://a.asd.homes/'
};

// هنا التغيير: لما حد يفتح الموقع الرئيسي، ابعتله ملف الواجهة
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ده API القناص زي ما هو
app.get('/get-video', async (req, res) => {
    const movieUrl = req.query.url; 
    if (!movieUrl) return res.status(400).json({ error: 'Missing URL' });

    try {
        console.log(`Checking: ${movieUrl}`);
        const { data: pageHtml } = await axios.get(movieUrl, { headers });
        const $ = cheerio.load(pageHtml);

        let foundLink = null;
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && (src.includes('mp4') || src.includes('embed') || src.includes('watch'))) foundLink = src;
        });

        if (!foundLink) {
            const mp4Match = pageHtml.match(/https?:\/\/[^"']+\.mp4/);
            if (mp4Match) foundLink = mp4Match[0];
        }

        if (foundLink) {
            if (foundLink.startsWith('//')) foundLink = 'https:' + foundLink;
            res.json({ success: true, stream_url: foundLink });
        } else {
            res.json({ success: false, message: "No video found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(3000, () => console.log('Cinema Elpop Ready! 🍿'));
