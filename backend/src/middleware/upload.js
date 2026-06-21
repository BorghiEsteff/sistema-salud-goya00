const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const path = require('path');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Los PDFs deben ir como 'raw' o 'image' si Cloudinary los convierte. 
    // Usamos 'auto' para que Cloudinary decida en base al contenido.
    return {
      folder: 'salud-goya/adjuntos',
      resource_type: 'auto'
    };
  },
});

const fileFilter = (req, file, cb) => {
  // REGLA CRÍTICA: Validación estricta HÍBRIDA (MIME type + Extensión real)
  // Requerido por el Plan Maestro para evitar spoofing
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  // Doble verificación: que tenga la extensión esperada Y que el MIME lo confirme
  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo o extensión no permitidos. Solo se aceptan archivos reales JPG, PNG y PDF.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB máximo para cuidar el Free Tier
  }
});

module.exports = upload;
