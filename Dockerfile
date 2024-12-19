# Gunakan image Node.js sebagai base
FROM node:16

# Set direktori kerja di dalam container
WORKDIR /usr/src/app

# Salin file package.json dan install dependensi
COPY package*.json ./
RUN npm install

# Salin seluruh kode aplikasi ke dalam container
COPY . .

# Expose port 8080 untuk aplikasi
EXPOSE 8080

# Jalankan aplikasi
CMD ["node", "app.js"]
