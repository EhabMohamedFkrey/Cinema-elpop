const express = require('express');
const puppeteer = require('puppeteer-extra'); // النسخة الذكية
const StealthPlugin = require('puppeteer-extra-plugin-stealth'); // التخفي من الحماية
const cors = require('cors');
const path = require('path');

// تفعيل وضع التخفي عشان الموقع ميعرفش إننا روبوت
puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/get-video', async (req, res) => {
    const movieUrl = req.query.url;
    if (!movieUrl) return res.status(400).json({ error: 'فين الرابط؟' });

    let browser = null;
    try {
        console.log(`🚀 جاري فتح المتصفح للرابط: ${movieUrl}`);

        // تشغيل المتصفح بإعدادات خاصة لسيرفر Render
        browser = await puppeteer.launch({
            headless: 'new', // تشغيل في الخلفية
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // توفير الذاكرة
                '--single-process' 
            ]
        });

        const page = await browser.newPage();

        // تسريع التحميل عن طريق منع الصور والخطوط
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // الذهاب للموقع وانتظار التحميل
        // timeout 60 ثانية عشان لو الموقع بطيء
        await page.goto(movieUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // البحث الذكي عن الفيديو داخل الصفحة
        const videoData = await page.evaluate(() => {
            // 1. تدوير على أي iframe فيه كلمة video أو embed
            const iframes = Array.from(document.querySelectorAll('iframe'));
            for (let iframe of iframes) {
                if (iframe.src && (iframe.src.includes('embed') || iframe.src.includes('watch') || iframe.src.includes('mp4'))) {
                    return iframe.src;
                }
            }
            
            // 2. تدوير على عنصر video مباشر
            const video = document.querySelector('video');
            if (video && video.src) return video.src;

            return null; 
        });

        if (videoData) {
            console.log('✅ تم العثور على الفيديو:', videoData);
            res.json({ success: true, stream_url: videoData });
        } else {
            console.log('❌ لم يتم العثور على فيديو مباشر.');
            res.json({ success: false, message: "الموقع فتح بس مش لاقيين الفيديو، جرب رابط المشاهدة المباشر (watch) مش صفحة الفيلم." });
        }

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ success: false, error: "حدث خطأ أثناء التصفح: " + error.message });
    } finally {
        if (browser) await browser.close(); // قفل المتصفح ضروري عشان الرامات
    }
});

app.listen(3000, () => console.log('🎬 سينما البوب (نسخة المتصفح) جاهزة!'));
