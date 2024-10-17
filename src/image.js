const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// An array of your fonts
const fonts = [
    { file: '../fonts/Tahoma.ttf', family: 'Tahoma' },
    { file: '../fonts/Tahoma-Bold.ttf', family: 'Tahoma-Bold' },
];
fonts.forEach(font => registerFont(path.join(__dirname, font.file), { family: font.family }));


const createImage = async (id, text, avatar, img) => {
    return new Promise(async (resolve, reject) => {
        avatar = avatar?.replace('webp', 'png');
        Promise.all([
            loadImage(img),
            loadImage(avatar || "https://crawleydistrictscouts.co.uk/wp-content/uploads/2021/06/413-4139803_unknown-profile-profile-picture-unknown.jpg")  // Load the overlay image
        ]).then(async (images) => {
            const [baseImage, avatarImg] = images;

            const canvas = createCanvas(baseImage.width, baseImage.height);
            const context = canvas.getContext('2d');

            context.drawImage(baseImage, 0, 0, baseImage.width, baseImage.height);

            text.forEach(item => {
                context.font = `${item.size}px "${item.font}"`;
                context.fillStyle = item.colour;
                context.fillText(item.text, item.x, item.y);
            });


            const circleX = 2466;
            const circleY = 1343;
            const circleRadius = 60;

            context.beginPath();
            context.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
            context.closePath();
            context.clip();
            context.drawImage(avatarImg, circleX - circleRadius, circleY - circleRadius, circleRadius * 2, circleRadius * 2);
            const dir = '../images';

            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(`${dir}/${id}.png`, buffer);
            return resolve(`${dir}/${id}.png`);
        }).catch((err) => {
            console.log(err);
        });
    })

}

module.exports = {
    createImage
}

