const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourceDir = 'C:\\Users\\kmin4_5rpzh73\\OneDrive\\문서\\ogam';
const destDir = path.join(process.cwd(), 'monster-reservation', 'public', 'images');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

async function optimizeAndCopyImages() {
  try {
    const files = fs.readdirSync(sourceDir).filter(file => /\.(jpg|jpeg|png)$/i.test(file));
    console.log(`Found ${files.length} images in ${sourceDir}`);

    const filesToCopy = files.slice(0, 30); 

    for (let index = 0; index < filesToCopy.length; index++) {
      const file = filesToCopy[index];
      const ext = path.extname(file).toLowerCase();
      const srcPath = path.join(sourceDir, file);
      const destPath = path.join(destDir, `theme${index + 1}${ext}`);
      
      try {
        const isPng = ext === '.png';
        const outputPath = isPng 
          ? destPath // PNG는 PNG로 유지
          : destPath.replace(/\.(jpg|jpeg)$/i, '.jpg'); // JPG는 JPG로
        
        let pipeline = sharp(srcPath)
          .resize(800, null, { 
            withoutEnlargement: true, // 원본보다 크게 만들지 않음
            fit: 'inside' // 비율 유지하면서 안쪽에 맞춤
          });
        
        // 포맷별 최적화
        if (isPng) {
          pipeline = pipeline.png({ 
            quality: 80, 
            compressionLevel: 9,
            adaptiveFiltering: true
          });
        } else {
          pipeline = pipeline.jpeg({ 
            quality: 80,
            mozjpeg: true // 더 나은 압축
          });
        }
        
        await pipeline.toFile(outputPath);
        
        const stats = fs.statSync(outputPath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        console.log(`✓ Optimized ${file} → theme${index + 1}${path.extname(outputPath)} (${sizeKB}KB)`);
      } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
        // 실패 시 원본 복사
        fs.copyFileSync(srcPath, destPath);
        console.log(`  (Fell back to copying original)`);
      }
    }
    console.log('\n✅ Image optimization complete!');
  } catch (err) {
    console.error('Error:', err);
  }
}

optimizeAndCopyImages();
