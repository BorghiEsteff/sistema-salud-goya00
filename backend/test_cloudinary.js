require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function probar() {
  console.log('Probando conexión con Cloudinary...');
  try {
    // Escribir un archivo temporal
    fs.writeFileSync('test.txt', 'Prueba de subida desde Sistema Goya');
    
    // Subir
    const result = await cloudinary.uploader.upload('test.txt', {
      resource_type: 'raw',
      folder: 'salud-goya/adjuntos'
    });
    
    console.log('✅ ÉXITO! El archivo se subió correctamente.');
    console.log('🔗 URL:', result.secure_url);
    
  } catch (error) {
    console.error('❌ ERROR AL SUBIR:', error.message);
  } finally {
    if (fs.existsSync('test.txt')) fs.unlinkSync('test.txt');
    process.exit(0);
  }
}

probar();
