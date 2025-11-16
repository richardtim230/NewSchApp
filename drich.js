// Responsive Navbar: Burger toggle
const burger = document.getElementById('burger');
const navbar = document.querySelector('.navbar');
burger.onclick = function () {
  navbar.classList.toggle('responsive');
};

// Hero Carousel
const heroImgs = document.querySelectorAll('#heroCarousel img');
let heroIdx = 0;
function showHero(idx) {
  heroImgs.forEach((img,i)=>img.classList.toggle('active',i===idx));
}
document.getElementById('heroPrev').onclick = function() {
  heroIdx = (heroIdx - 1 + heroImgs.length) % heroImgs.length;
  showHero(heroIdx);
};
document.getElementById('heroNext').onclick = function() {
  heroIdx = (heroIdx + 1) % heroImgs.length;
  showHero(heroIdx);
};
showHero(heroIdx);
setInterval(()=>{
  heroIdx = (heroIdx+1)%heroImgs.length;showHero(heroIdx);
}, 6500);

// Gallery Carousel
const galleryImgs = document.querySelectorAll('#galleryCarousel img');
let galleryIdx = 0;
function showGallery(idx){galleryImgs.forEach((img,i)=>img.classList.toggle('active',i===idx));}
document.getElementById('galleryPrev').onclick=function(){
  galleryIdx=(galleryIdx-1+galleryImgs.length)%galleryImgs.length;showGallery(galleryIdx);
};
document.getElementById('galleryNext').onclick=function(){
  galleryIdx=(galleryIdx+1)%galleryImgs.length;showGallery(galleryIdx);
};
showGallery(galleryIdx);
setInterval(()=>{galleryIdx=(galleryIdx+1)%galleryImgs.length;showGallery(galleryIdx);},7200);

// FAQ Toggle
const faqBtns = document.querySelectorAll('.faq-q');
faqBtns.forEach(btn => {
  btn.onclick = function() {
    faqBtns.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('show'));
    btn.classList.add('active');
    btn.nextElementSibling.classList.add('show');
  };
});
