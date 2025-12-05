const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');
const path = require('path');

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());

// تقديم ملفات الواجهة
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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
        
        // متغير هنخزن فيه الرابط
        let foundVideo = null;

        // 1. تفعيل نظام مراقبة الشبكة (Network Sniffer)
        await page.setRequestInterception(true);
        
        page.on('request', (req) => {
            const url = req.url();
            const type = req.resourceType();

            // لو لقينا رابط فيديو صريح
            if (url.endsWith('.mp4') || url.includes('.m3u8') || (type === 'media')) {
                console.log('🎯 تم اصطياد الفيديو:', url);
                foundVideo = url;
                req.abort(); // وقف التحميل فوراً عشان نوفر وقت
            } 
            // منع تحميل الصور والخطوط لتسريع العملية
            else if (['image', 'stylesheet', 'font', 'other'].includes(type)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // 2. فتح الصفحة (نعطيها مهلة 45 ثانية)
        try {
            await page.goto(movieUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        } catch (e) {
            console.log("⚠️ الصفحة تقيلة، بس هنكمل يمكن لقينا الرابط.");
        }

        // 3. لو الشبكة ملقطتش حاجة، ندور جوه الـ HTML (خطة ب)
        if (!foundVideo) {
            foundVideo = await page.evaluate(() => {
                const video = document.querySelector('video');
                if (video && video.src) return video.src;
                const iframe = document.querySelector('iframe');
                if (iframe && iframe.src && (iframe.src.includes('mp4') || iframe.src.includes('m3u8'))) return iframe.src;
                return null;
            });
        }

        if (foundVideo) {
            res.json({ success: true, stream_url: foundVideo });
        } else {
            res.json({ success: false, message: "مش قادر أوصل لملف الفيديو المباشر، الموقع ده حمايته قوية." });
        }

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

// تشغيل السيرفر
app.listen(3000, () => console.log('🎬 السيرفر جاهز!'));
