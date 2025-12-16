
import fs from 'fs';
import pdf from 'pdf-parse';

const dataBuffer = fs.readFileSync('C:\\Users\\kmin4_5rpzh73\\Downloads\\오감몬스터 예약 시스템.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(function(error) {
    console.error('Error parsing PDF:', error);
});


