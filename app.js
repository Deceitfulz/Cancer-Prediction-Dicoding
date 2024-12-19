const express = require("express");
const multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const admin = require("firebase-admin");
const tf = require("@tensorflow/tfjs-node");
const uuid = require("uuid");

// Inisialisasi Firebase Admin SDK
const serviceAccount = require("./submissionmlgc-ihsankamil-af6ff229624d.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Inisialisasi Cloud Storage
const storage = new Storage();
const bucketName = "skin-cancer-model-bucket-ihsankamil"; 

// Konfigurasi multer untuk upload file
const upload = multer({
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("File harus berupa gambar."));
    }
    cb(null, true);
  },
});

const app = express();

// Load model dari Cloud Storage
let model;
async function loadModel() {
  const modelUrl = `gs://${bucketName}/model.json`;
  model = await tf.loadGraphModel(modelUrl);
  console.log("Model berhasil dimuat.");
}
loadModel();

// Endpoint prediksi
app.post("/predict", upload.single("image"), async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;
    const image = tf.node.decodeImage(fileBuffer, 3);
    const resizedImage = tf.image.resizeBilinear(image, [224, 224]);
    const normalizedImage = resizedImage.div(255).expandDims(0);

    // Prediksi menggunakan model
    const predictions = model.predict(normalizedImage);
    const result = predictions.dataSync()[0] > 0.5 ? "Cancer" : "Non-cancer";
    const suggestion =
      result === "Cancer" ? "Segera periksa ke dokter!" : "Penyakit kanker tidak terdeteksi.";

    // Simpan hasil prediksi ke Firestore
    const id = uuid.v4();
    const createdAt = new Date().toISOString();
    await db.collection("predictions").doc(id).set({
      id,
      result,
      suggestion,
      createdAt,
    });

    res.status(200).json({
      status: "success",
      message: "Model is predicted successfully",
      data: { id, result, suggestion, createdAt },
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      status: "fail",
      message: "Terjadi kesalahan dalam melakukan prediksi",
    });
  }
});

// Error handler untuk file size
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      status: "fail",
      message: "Payload content length greater than maximum allowed: 1000000",
    });
  }
  next(err);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
